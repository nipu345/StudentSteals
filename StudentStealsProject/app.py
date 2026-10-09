from flask import Flask, request, jsonify
from flask_cors import CORS
from concurrent.futures import ThreadPoolExecutor
import google.generativeai as genai
import requests
import os
import math
import json
import time
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
# Comma-separated list of sites allowed to call this API, e.g. https://studentsteals.vercel.app
CORS(app, origins=os.getenv("ALLOWED_ORIGINS", "*").split(","))

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
MODEL_NAME = "gemini-3.8-flash"
model = genai.GenerativeModel(MODEL_NAME)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby"  # Places API (New)
FIELD_MASK = ",".join([
    "places.id", "places.displayName", "places.location", "places.types", "places.rating",
    "places.priceLevel", "places.currentOpeningHours.openNow", "places.shortFormattedAddress", "places.businessStatus",
])
PRICE_LEVELS = {"PRICE_LEVEL_FREE": 0, "PRICE_LEVEL_INEXPENSIVE": 1, "PRICE_LEVEL_MODERATE": 2,
                "PRICE_LEVEL_EXPENSIVE": 3, "PRICE_LEVEL_VERY_EXPENSIVE": 4}

# Nearby Search returns at most 20 places per request, so we search each of
# these types separately and merge the results. Value = (deal category, emoji).
DEAL_TYPES = {
    "restaurant": ("food", "🍽️"),
    "cafe": ("coffee", "☕"),
    "bakery": ("food", "🥐"),
    "meal_takeaway": ("food", "🥡"),
    "grocery_store": ("groceries", "🛒"),
    "book_store": ("books", "📚"),
    "gym": ("fitness", "💪"),
    "movie_theater": ("entertainment", "🎬"),
}
MAX_DEALS = 30
TIP_BATCH = 10
CACHE_SECONDS = 600
_deals_cache = {}  # (lat, lng, radius) rounded to ~100 m -> (timestamp, response)

# The public demo runs on our own API keys, so cap how often anyone can call the paid APIs.
# (max requests, window in seconds) per visitor
RATE_LIMITS = {"/deals": (10, 3600), "/coach": (30, 3600), "/insights": (20, 3600)}
DAILY_PLACES_SEARCHES = 60  # uncached /deals requests per day across all visitors
_hits = {}  # key -> list of request timestamps


def over_limit(key, max_hits, window):
    now = time.time()
    hits = [t for t in _hits.get(key, []) if now - t < window]
    if len(hits) >= max_hits:
        _hits[key] = hits
        return True
    hits.append(now)
    _hits[key] = hits
    return False


@app.before_request
def rate_limit():
    limit = RATE_LIMITS.get(request.path)
    if request.method != "POST" or not limit:
        return None
    ip = (request.headers.get("X-Forwarded-For") or request.remote_addr or "").split(",")[0].strip()
    if over_limit((ip, request.path), *limit):
        return jsonify({"error": "You're going a little fast. Try again in a few minutes."}), 429
    return None


def calculate_distance(lat1, lon1, lat2, lon2):
    R = 3958.8
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    return round(R * 2 * math.asin(math.sqrt(a)), 2)


def search_type(lat, lng, radius, place_type):
    body = {
        "includedTypes": [place_type],
        "maxResultCount": 20,
        "rankPreference": "DISTANCE",
        "locationRestriction": {"circle": {"center": {"latitude": lat, "longitude": lng}, "radius": float(radius)}},
    }
    headers = {"X-Goog-Api-Key": GOOGLE_API_KEY, "X-Goog-FieldMask": FIELD_MASK}
    try:
        resp = requests.post(NEARBY_URL, json=body, headers=headers, timeout=8).json()
    except requests.RequestException:
        resp = requests.post(NEARBY_URL, json=body, headers=headers, timeout=8).json()  # one retry
    if "error" in resp:
        raise RuntimeError(f"Google Places error: {resp['error'].get('status')} {resp['error'].get('message', '')}")
    return place_type, [normalize_place(p) for p in resp.get("places", [])]


def normalize_place(p):
    """Convert a Places API (New) result to the field names the rest of this file uses."""
    return {
        "place_id": p["id"],
        "name": p.get("displayName", {}).get("text"),
        "geometry": {"location": {"lat": p["location"]["latitude"], "lng": p["location"]["longitude"]}},
        "types": p.get("types", []),
        "rating": p.get("rating"),
        "price_level": PRICE_LEVELS.get(p.get("priceLevel")),
        "opening_hours": {"open_now": p.get("currentOpeningHours", {}).get("openNow")},
        "vicinity": p.get("shortFormattedAddress"),
        "business_status": p.get("businessStatus", "OPERATIONAL"),
    }


def search_nearby(lat, lng, radius, place_types):
    """Run one Nearby Search per type in parallel and de-duplicate by place_id.
    Returns a list of (place, searched_type), nearest first."""
    with ThreadPoolExecutor(max_workers=len(place_types)) as pool:
        results = list(pool.map(lambda t: search_type(lat, lng, radius, t), place_types))

    seen = {}
    for place_type, places in results:
        for p in places:
            if p.get("business_status", "OPERATIONAL") != "OPERATIONAL":
                continue
            if p["place_id"] not in seen:
                seen[p["place_id"]] = (p, place_type)

    def dist(item):
        loc = item[0]["geometry"]["location"]
        return calculate_distance(lat, lng, loc["lat"], loc["lng"])

    return sorted(seen.values(), key=dist)


def generate_json(prompt):
    resp = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
    return json.loads(resp.text)


def write_tips(places_info):
    """One Gemini call that writes a money-saving tip for each place in the batch."""
    summary = "\n".join(
        f"{p['index']}. {p['name']} | type: {p['place_type']} | rating: {p['rating']} | "
        f"price level: {p['price_level']} | {p['distance']} mi away"
        for p in places_info
    )
    prompt = f"""You are a student deals assistant. For each of these nearby places, write one realistic money-saving tip for a college student.

Rules:
- Base the tip on the place type and price level. Suggest realistic ways students commonly save there (student ID discount, lunch specials, happy hour, rewards apps, splitting a meal, bringing your own cup, matinee pricing, buying used).
- Never claim a specific promotion is currently running. Phrase tips as things to ask about or try.
- "saving" must be a short dollar estimate like "$2-4" or "up to $6", never words.
- Keep each tip to one punchy sentence.

Places:
{summary}

Return JSON: {{"deals": [{{"index": <place number>, "tip": "...", "saving": "$X-Y"}}, ...]}} with one entry per place."""
    try:
        return {item["index"]: item for item in generate_json(prompt).get("deals", [])}
    except Exception:
        return {}  # still return the places if Gemini fails


@app.route("/deals", methods=["POST"])
def get_deals():
    data = request.json or {}
    lat = data.get("lat")
    lng = data.get("lng")
    radius = min(int(data.get("radius", 1500)), 5000)

    if lat is None or lng is None:
        return jsonify({"error": "lat and lng are required"}), 400

    cache_key = (round(lat, 3), round(lng, 3), radius)
    cached = _deals_cache.get(cache_key)
    if cached and time.time() - cached[0] < CACHE_SECONDS:
        return jsonify(cached[1])

    if over_limit("places-daily", DAILY_PLACES_SEARCHES, 86400):
        return jsonify({"error": "The demo has hit its daily search limit. Try again tomorrow."}), 429

    try:
        found = search_nearby(lat, lng, radius, list(DEAL_TYPES))[:MAX_DEALS]
        if not found:
            return jsonify({"deals": [], "total": 0})

        places_info = []
        for i, (p, place_type) in enumerate(found, start=1):
            loc = p["geometry"]["location"]
            category, emoji = DEAL_TYPES[place_type]
            places_info.append({
                "index": i,
                "id": p["place_id"],
                "name": p.get("name"),
                "place_type": place_type,
                "category": category,
                "emoji": emoji,
                "rating": p.get("rating"),
                "price_level": p.get("price_level"),
                "open_now": p.get("opening_hours", {}).get("open_now"),
                "address": p.get("vicinity"),
                "lat": loc["lat"],
                "lng": loc["lng"],
                "distance": calculate_distance(lat, lng, loc["lat"], loc["lng"]),
            })

        # Gemini writes the tips in parallel batches of 10 to keep latency low
        batches = [places_info[i:i + TIP_BATCH] for i in range(0, len(places_info), TIP_BATCH)]
        ai_tips = {}
        with ThreadPoolExecutor(max_workers=len(batches)) as pool:
            for tips in pool.map(write_tips, batches):
                ai_tips.update(tips)

        final_deals = []
        for p in places_info:
            tip = ai_tips.get(p["index"], {})
            final_deals.append({
                "id": p["id"],
                "name": p["name"],
                "deal": tip.get("tip", "Ask if they offer a student discount"),
                "saving": tip.get("saving", "varies"),
                "category": p["category"],
                "emoji": p["emoji"],
                "rating": p["rating"],
                "open_now": p["open_now"],
                "address": p["address"],
                "distance_miles": p["distance"],
                "distance_label": f"{p['distance']} mi",
                "lat": p["lat"],
                "lng": p["lng"],
            })

        result = {"deals": final_deals, "total": len(final_deals)}
        _deals_cache[cache_key] = (time.time(), result)
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


def spending_profile(budgets, spending, transactions):
    """Plain-text summary of the student's month that Gemini can reason over."""
    lines = []
    for cat, budget in budgets.items():
        spent = spending.get(cat, 0)
        pct = (spent / budget * 100) if budget else 0
        lines.append(f"- {cat}: ${spent:.2f} of ${budget:.2f} budget ({pct:.0f}%)")
    for cat, spent in spending.items():
        if cat not in budgets and spent:
            lines.append(f"- {cat}: ${spent:.2f} (no budget set)")

    merchants = {}
    for t in transactions:
        m = merchants.setdefault(t["name"], {"count": 0, "total": 0.0, "category": t.get("category")})
        m["count"] += 1
        m["total"] += t["amount"]
    top = sorted(merchants.items(), key=lambda kv: -kv[1]["total"])[:10]
    merchant_lines = [f"- {name}: {m['count']}x, ${m['total']:.2f} ({m['category']})" for name, m in top]

    return (
        "BUDGET VS ACTUAL:\n" + ("\n".join(lines) or "No budget set yet.") +
        "\n\nTOP MERCHANTS:\n" + ("\n".join(merchant_lines) or "No transactions yet.")
    )


@app.route("/coach", methods=["POST"])
def ai_coach():
    data = request.json or {}
    history = data.get("messages") or ([{"role": "user", "text": data["message"]}] if data.get("message") else [])
    if not history or history[-1].get("role") != "user" or not history[-1].get("text", "").strip():
        return jsonify({"error": "a user message is required"}), 400

    profile = spending_profile(data.get("budgets", {}), data.get("spending", {}), data.get("transactions", []))

    nearby = data.get("nearby") or []
    if not nearby and data.get("lat") is not None and data.get("lng") is not None:
        try:
            found = search_nearby(data["lat"], data["lng"], 1000, ["restaurant", "grocery_store"])[:8]
            nearby = [{"name": p.get("name"), "rating": p.get("rating")} for p, _ in found]
        except Exception:
            nearby = []
    nearby_text = ", ".join(f"{p['name']} (rating {p.get('rating', 'N/A')})" for p in nearby[:10]) or "unknown"

    system = f"""You are StudentSteals' AI financial coach for college students.
Be friendly, practical and specific. Use the student's real numbers below, referring to categories and merchants by name.
Format responses with **bold** headers and short bullet points. Keep answers under 200 words unless asked for more.
When suggesting food options give TWO choices: a cheap recipe AND a nearby place from the list below.

STUDENT'S MONTH SO FAR
{profile}

NEARBY PLACES: {nearby_text}"""

    contents = [
        {"role": "model" if m["role"] == "assistant" else "user", "parts": [m["text"]]}
        for m in history[-20:]
    ]
    # Gemini requires the conversation to start with a user turn
    while contents and contents[0]["role"] != "user":
        contents.pop(0)

    try:
        coach = genai.GenerativeModel(MODEL_NAME, system_instruction=system)
        response = coach.generate_content(contents)
        return jsonify({"response": response.text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/insights", methods=["POST"])
def get_insights():
    data = request.json or {}
    profile = spending_profile(data.get("budgets", {}), data.get("spending", {}), data.get("transactions", []))

    prompt = f"""You are a personal finance coach for college students. Analyze this student's spending.

{profile}

Write a short conversational spending report (4-6 sentences). Be specific with category names, merchants and dollar amounts. Point out overspending, repeat purchases that add up, room to grow, and 1-2 actionable tips. Friendly but direct tone. Use markdown bold for numbers and categories."""

    try:
        response = model.generate_content(prompt)
        return jsonify({"insights": response.text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "StudentSteals API"})

if __name__ == "__main__":
    # Local development server. In production this runs under gunicorn instead (see README).
    app.run(port=int(os.getenv("PORT", 8080)), debug=os.getenv("FLASK_DEBUG", "1") == "1")
