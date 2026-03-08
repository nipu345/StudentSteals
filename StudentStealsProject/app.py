from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import requests
import os
import math
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# -------------------------------------------------------------------
# STUDENT DEALS DATABASE
# -------------------------------------------------------------------
STUDENT_DEALS = {
    "cafe": {
        "deal": "50% off any drink with student ID",
        "saving": "$3.50",
        "emoji": "☕",
        "category": "coffee"
    },
    "coffee": {
        "deal": "50% off any drink with student ID",
        "saving": "$3.50",
        "emoji": "☕",
        "category": "coffee"
    },
    "restaurant": {
        "deal": "BOGO entree with .edu email",
        "saving": "$8.00",
        "emoji": "🍽️",
        "category": "food"
    },
    "meal_takeaway": {
        "deal": "Free delivery on orders over $10",
        "saving": "$4.99",
        "emoji": "🥡",
        "category": "food"
    },
    "fast_food": {
        "deal": "10% student discount at checkout",
        "saving": "$2.00",
        "emoji": "🍔",
        "category": "food"
    },
    "book_store": {
        "deal": "10% off + free textbook price match",
        "saving": "varies",
        "emoji": "📚",
        "category": "textbooks"
    },
    "grocery_or_supermarket": {
        "deal": "Student discount every Tuesday",
        "saving": "$5–15",
        "emoji": "🛒",
        "category": "groceries"
    },
    "gym": {
        "deal": "First month free with student ID",
        "saving": "$40",
        "emoji": "💪",
        "category": "fitness"
    },
    "movie_theater": {
        "deal": "Student tickets every day",
        "saving": "$6",
        "emoji": "🎬",
        "category": "entertainment"
    },
    "subway_station": {
        "deal": "Student transit pass — 50% off monthly",
        "saving": "$40/mo",
        "emoji": "🚌",
        "category": "transport"
    },
}

DEFAULT_DEAL = {
    "deal": "Ask about student discount",
    "saving": "varies",
    "emoji": "🎓",
    "category": "other"
}

# -------------------------------------------------------------------
# HELPER: Calculate distance in miles
# -------------------------------------------------------------------
def calculate_distance(lat1, lon1, lat2, lon2):
    R = 3958.8
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return round(R * c, 2)

# -------------------------------------------------------------------
# HELPER: Enrich Google Places results with student deals
# -------------------------------------------------------------------
def enrich_with_deals(places, user_lat, user_lng):
    results = []
    for place in places:
        place_types = place.get("types", [])

        matched_deal = DEFAULT_DEAL
        for t in place_types:
            if t in STUDENT_DEALS:
                matched_deal = STUDENT_DEALS[t]
                break

        place_lat = place["geometry"]["location"]["lat"]
        place_lng = place["geometry"]["location"]["lng"]
        distance = calculate_distance(user_lat, user_lng, place_lat, place_lng)

        results.append({
            "id": place.get("place_id"),
            "name": place.get("name"),
            "address": place.get("vicinity", ""),
            "distance_miles": distance,
            "distance_label": f"{distance} mi",
            "rating": place.get("rating", None),
            "open_now": place.get("opening_hours", {}).get("open_now", None),
            "deal": matched_deal["deal"],
            "saving": matched_deal["saving"],
            "emoji": matched_deal["emoji"],
            "category": matched_deal["category"],
            "types": place_types[:3],
        })

    results.sort(key=lambda x: x["distance_miles"])
    return results


# -------------------------------------------------------------------
# ROUTE 1: GET NEARBY DEALS
# -------------------------------------------------------------------
@app.route("/deals", methods=["POST"])
def get_deals():
    data = request.json
    lat = data.get("lat")
    lng = data.get("lng")
    radius = data.get("radius", 1000)

    if not lat or not lng:
        return jsonify({"error": "lat and lng are required"}), 400

    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "location": f"{lat},{lng}",
        "radius": radius,
        "type": "restaurant|cafe|book_store|gym|movie_theater|grocery_or_supermarket",
        "key": GOOGLE_API_KEY
    }

    try:
        response = requests.get(url, params=params, timeout=5)
        places_data = response.json()

        if places_data.get("status") not in ["OK", "ZERO_RESULTS"]:
            return jsonify({"error": f"Google Places error: {places_data.get('status')}"}), 500

        places = places_data.get("results", [])
        enriched = enrich_with_deals(places, lat, lng)

        return jsonify({
            "deals": enriched,
            "total": len(enriched),
            "location": {"lat": lat, "lng": lng}
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -------------------------------------------------------------------
# ROUTE 2: AI COACH
# -------------------------------------------------------------------
@app.route("/coach", methods=["POST"])
def ai_coach():
    data = request.json
    user_message = data.get("message", "")
    spending = data.get("spending", {})

    if not user_message:
        return jsonify({"error": "message is required"}), 400

    spending_context = ""
    if spending:
        spending_context = f"\n\nStudent's current spending this month: {spending}"

    nearby_context = ""
    if "lat" in data and "lng" in data:
        url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
        params = {
            "location": f"{data['lat']},{data['lng']}",
            "radius": 1000,
            "type": "restaurant|cafe|grocery_or_supermarket",
            "key": GOOGLE_API_KEY
        }
        places_resp = requests.get(url, params=params).json()
        places = places_resp.get("results", [])[:5]
        place_names = [f"{p['name']} (rating: {p.get('rating', 'N/A')})" for p in places]
        nearby_context = f"\n\nNearby places within walking distance: {', '.join(place_names)}"

    prompt = f"""You are StudentSteals' AI financial coach for college students.
Be friendly and practical. Format responses with **bold** headers and bullet points.
When suggesting food options always give TWO choices:
1. A cheap recipe they can cook with ingredients and estimated cost
2. A nearby restaurant from the list below that fits their budget
Always mention specific nearby places by name when relevant.

{nearby_context}
{spending_context}

Student's question: {user_message}"""

    try:
        response = model.generate_content(prompt)
        return jsonify({"response": response.text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# -------------------------------------------------------------------
# ROUTE 3: AI SWAPS
# -------------------------------------------------------------------
@app.route("/swaps", methods=["POST"])
def get_swaps():
    data = request.json
    spending = data.get("spending", {})

    if not spending:
        return jsonify({"error": "spending data is required"}), 400

    prompt = f"""A college student has these monthly expenses: {spending}

Suggest exactly 3 specific money-saving swaps for this student.
Respond ONLY with valid JSON in this exact format, nothing else, no markdown:
{{
  "swaps": [
    {{
      "from": "what they currently do",
      "to": "cheaper alternative",
      "save": "how much they save",
      "emoji": "relevant emoji"
    }}
  ]
}}"""

    try:
        response = model.generate_content(prompt)
        raw = response.text.strip().replace("```json", "").replace("```", "").strip()
        import json
        swaps_data = json.loads(raw)
        return jsonify(swaps_data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -------------------------------------------------------------------
# HEALTH CHECK
# -------------------------------------------------------------------
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "DormDeal API"})


if __name__ == "__main__":
    app.run(port=8080, debug=True)
