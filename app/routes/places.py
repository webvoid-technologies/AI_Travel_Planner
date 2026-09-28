from flask import Blueprint, request, jsonify

from services.groq_service import generate_json

places_bp = Blueprint("places", __name__, url_prefix="/")


@places_bp.route("/places", methods=["POST"])
def recommend_places():
    data = request.get_json(silent=True) or {}
    variables = {
        "destination": data.get("destination", "Unknown destination"),
        "days": data.get("days", 3),
        "interests": ", ".join(data.get("interests", [])) or "General sightseeing",
        "food": data.get("food", "Mixed"),
        "special_requirements": data.get("special_requirements", "None"),
    }
    try:
        result = generate_json("places", variables)
        return jsonify({"success": True, "places": result})
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500
