from flask import Blueprint, request, jsonify

from services.groq_service import generate_json

tips_bp = Blueprint("tips", __name__, url_prefix="/")


@tips_bp.route("/tips", methods=["POST"])
def generate_tips():
    data = request.get_json(silent=True) or {}
    variables = {
        "destination": data.get("destination", "Unknown destination"),
        "days": data.get("days", 3),
        "starting_city": data.get("starting_city", ""),
        "budget": data.get("budget", "Medium"),
        "transportation": data.get("transportation", "Car"),
        "accommodation": data.get("accommodation", "Budget Hotel"),
        "food": data.get("food", "Mixed"),
        "special_requirements": data.get("special_requirements", "None"),
    }
    try:
        result = generate_json("tips", variables)
        return jsonify({"success": True, "tips": result})
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500
