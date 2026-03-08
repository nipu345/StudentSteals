from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import requests
import os
import math
import json
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

EMOJI_MAP = {
    "cafe": "☕", "coffee_shop": "☕", "restaurant": "🍽️", "fast_food": "🍔",
    "meal_takeaway": "🥡", "food": "🍴", "bar": "🍺", "bakery": "🥐",
    "book_store": "📚", "grocery_or_supermarket": "🛒", "supermarket": "🛒",
    "gym": "💪", "fitness": "💪", "movie_theater": "🎬", "shopping_mall": "🛍️",
    "clothing_store": "👕", "pharmacy": "💊", "convenience_store": "🏪",
    "pizza": "🍕", "subway_station": "🚌",
}

def get_emoji(types):
    for t in types:
        if t in EMOJI_MAP:
            return EMOJI_MAP[t]
    return "🎓"

def calculate_distance(lat1, lon1, lat2, lon2):
    R = 3958.8
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    return round(R * 2 * math.asin(math.sqrt(a)), 2)

@app.route("/deals", methods=["POST"])
def get_deals():
    data = request.json
    lat = data.get("lat")
    lng = data.get("lng")
    radius = data.get("radius", 1500)

    if not lat or not lng:
        return jsonify({"error": "lat and lng are required"}), 400

    try:
        # ONE Google Places call — no detail fetches
        nearby_url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
        params = {
            "location": f"{lat},{lng}",
            "radius": radius,
            "type": "restaurant|cafe|book_store|gym|movie_theater|grocery_or_supermarket",
            "key": GOOGLE_API_KEY
        }
        resp = requests.get(nearby_url, params=params, timeout=5).json()
        if resp.get("status") not in ["OK", "ZERO_RESULTS"]:
            return jsonify({"error": f"Google Places error: {resp.get('status')}"}), 500

        places = resp.get("results", [])[:10]
        if not places:
            return jsonify({"deals": [], "total": 0})

        # Build a compact summary for Gemini — name + type only, no reviews
        places_info = []
        for i, p in enumerate(places):
            distance = calculate_distance(lat, lng,
                p["geometry"]["location"]["lat"],
                p["geometry"]["location"]["lng"])
            places_info.append({
                "index": i + 1,
                "name": p.get("name"),
                "types": p.get("types", [])[:3],
                "rating": p.get("rating"),
                "distance": distance,
                "open_now": p.get("opening_hours", {}).get("open_now"),
                "place_id": p.get("place_id"),
            })

        summary = "\n".join([
            f"{p['index']}. {p['name']} | types: {', '.join(p['types'])} | rating: {p['rating']} | {p['distance']} mi away"
            for p in places_info
        ])

        # ONE Gemini call for all 10 places
        prompt = f"""You are a student deals assistant. Given these 10 nearby places, generate one realistic money-saving tip for a college student at each place.

Rules:
- Base the tip on the place TYPE (restaurant, cafe, gym, etc.) — suggest realistic ways students commonly save there
- Examples: "happy hour", "student ID discount", "order lunch special", "split with a friend", "bring your own cup"
- Give a realistic estimated saving like "$2-4" or "up to $6"
- Keep each tip to one punchy sentence
- Return ONLY valid JSON, no markdown

Places:
{summary}

Return exactly this JSON format:
{{
  "deals": [
    {{"index": 1, "tip": "...", "saving": "$X-Y", "category": "food|coffee|fitness|entertainment|groceries|other"}},
    {{"index": 2, "tip": "...", "saving": "$X-Y", "category": "..."}},
    {{"index": 3, "tip": "...", "saving": "$X-Y", "category": "..."}},
    {{"index": 4, "tip": "...", "saving": "$X-Y", "category": "..."}},
    {{"index": 5, "tip": "...", "saving": "$X-Y", "category": "..."}},
    {{"index": 6, "tip": "...", "saving": "$X-Y", "category": "..."}},
    {{"index": 7, "tip": "...", "saving": "$X-Y", "category": "..."}},
    {{"index": 8, "tip": "...", "saving": "$X-Y", "category": "..."}},
    {{"index": 9, "tip": "...", "saving": "$X-Y", "category": "..."}},
    {{"index": 10, "tip": "...", "saving": "$X-Y", "category": "..."}}
  ]
}}"""

        ai_resp = model.generate_content(prompt)
        raw = ai_resp.text.strip().replace("```json", "").replace("```", "").strip()
        ai_data = json.loads(raw)
        ai_tips = {item["index"]: item for item in ai_data.get("deals", [])}

        # Merge places + AI tips
        final_deals = []
        for p in places_info:
            tip = ai_tips.get(p["index"], {})
            final_deals.append({
                "id": p["place_id"],
                "name": p["name"],
                "deal": tip.get("tip", "Ask about student discounts"),
                "saving": tip.get("saving", "varies"),
                "category": tip.get("category", "other"),
                "emoji": get_emoji(p["types"]),
                "rating": p["rating"],
                "open_now": p["open_now"],
                "distance_miles": p["distance"],
                "distance_label": f"{p['distance']} mi",
                "lat": places[p["index"]-1]["geometry"]["location"]["lat"],
                "lng": places[p["index"]-1]["geometry"]["location"]["lng"],
            })

        final_deals.sort(key=lambda x: x["distance_miles"])

        return jsonify({"deals": final_deals, "total": len(final_deals)})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/coach", methods=["POST"])
def ai_coach():
    data = request.json
    user_message = data.get("message", "")
    spending = data.get("spending", {})
    if not user_message:
        return jsonify({"error": "message is required"}), 400

    spending_context = f"\n\nStudent's current spending this month: {spending}" if spending else ""
    nearby_context = ""
    if "lat" in data and "lng" in data:
        url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
        params = {"location": f"{data['lat']},{data['lng']}", "radius": 1000,
                  "type": "restaurant|cafe|grocery_or_supermarket", "key": GOOGLE_API_KEY}
        places_resp = requests.get(url, params=params).json()
        places = places_resp.get("results", [])[:5]
        place_names = [f"{p['name']} (rating: {p.get('rating', 'N/A')})" for p in places]
        nearby_context = f"\n\nNearby places: {', '.join(place_names)}"

    prompt = f"""You are StudentSteals' AI financial coach for college students.
Be friendly and practical. Format responses with **bold** headers and bullet points.
When suggesting food options give TWO choices: a cheap recipe AND a nearby restaurant.
{nearby_context}{spending_context}
Student's question: {user_message}"""

    try:
        response = model.generate_content(prompt)
        return jsonify({"response": response.text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/insights", methods=["POST"])
def get_insights():
    data = request.json
    budgets = data.get("budgets", {})
    spending = data.get("spending", {})
    transactions = data.get("transactions", [])

    lines = []
    for cat, budget in budgets.items():
        spent = spending.get(cat, 0)
        diff = spent - budget
        status = f"OVER by ${diff:.2f}" if diff > 0 else f"under by ${abs(diff):.2f}"
        lines.append(f"- {cat}: spent ${spent:.2f} of ${budget:.2f} ({status})")

    tx_list = "\n".join([f"  • {t['name']} — ${t['amount']:.2f} ({t['category']})"
                         for t in transactions]) or "No transactions synced."

    prompt = f"""You are a personal finance coach for college students. Analyze this student's spending.

BUDGET VS ACTUAL:
{chr(10).join(lines)}

RECENT TRANSACTIONS:
{tx_list}

Write a short conversational spending report (4-6 sentences). Be specific with category names and dollar amounts. Point out overspending, room to grow, and 1-2 actionable tips. Friendly but direct tone. Use markdown bold for numbers and categories."""

    try:
        response = model.generate_content(prompt)
        return jsonify({"insights": response.text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "StudentSteals API"})

if __name__ == "__main__":
    app.run(port=8080, debug=True)