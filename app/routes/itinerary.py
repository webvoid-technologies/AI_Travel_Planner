from flask import Blueprint, request, jsonify

from services.groq_service import generate_text

itinerary_bp = Blueprint("itinerary", __name__, url_prefix="/")


@itinerary_bp.route("/generate-itinerary", methods=["POST"])
def generate_itinerary():
    data = request.get_json(silent=True) or {}
    variables = {
        "destination": data.get("destination", "Unknown destination"),
        "starting_city": data.get("starting_city", ""),
        "days": data.get("days", 3),
        "travelers": data.get("travelers", 1),
        "budget": data.get("budget", "Medium"),
        "transportation": data.get("transportation", "Car"),
        "accommodation": data.get("accommodation", "Budget Hotel"),
        "food": data.get("food", "Mixed"),
        "interests": ", ".join(data.get("interests", [])) or "General sightseeing",
        "special_requirements": data.get("special_requirements", "None"),
    }
    try:
        markdown = generate_text("itinerary", variables)
        return jsonify({"success": True, "itinerary": markdown})
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500
