from flask import Blueprint, request, jsonify

from services.groq_service import generate_json

alternatives_bp = Blueprint("alternatives", __name__, url_prefix="/")


@alternatives_bp.route("/alternatives", methods=["POST"])
def generate_alternatives():
    data = request.get_json(silent=True) or {}
    variables = {
        "destination": data.get("destination", "Unknown destination"),
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
        result = generate_json("alternatives", variables)
        return jsonify({"success": True, "alternatives": result})
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500
