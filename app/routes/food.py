from flask import Blueprint, request, jsonify

from services.groq_service import generate_json

food_bp = Blueprint("food", __name__, url_prefix="/")


@food_bp.route("/food", methods=["POST"])
def recommend_food():
    data = request.get_json(silent=True) or {}
    variables = {
        "destination": data.get("destination", "Unknown destination"),
        "days": data.get("days", 3),
        "food": data.get("food", "Mixed"),
        "interests": ", ".join(data.get("interests", [])) or "General sightseeing",
        "special_requirements": data.get("special_requirements", "None"),
    }
    try:
        result = generate_json("food", variables)
        return jsonify({"success": True, "food": result})
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500
