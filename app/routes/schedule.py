from flask import Blueprint, request, jsonify

from services.groq_service import generate_json

schedule_bp = Blueprint("schedule", __name__, url_prefix="/")


@schedule_bp.route("/schedule", methods=["POST"])
def generate_schedule():
    data = request.get_json(silent=True) or {}
    variables = {
        "destination": data.get("destination", "Unknown destination"),
        "starting_city": data.get("starting_city", ""),
        "days": data.get("days", 3),
        "travelers": data.get("travelers", 1),
        "transportation": data.get("transportation", "Car"),
        "interests": ", ".join(data.get("interests", [])) or "General sightseeing",
        "special_requirements": data.get("special_requirements", "None"),
    }
    try:
        result = generate_json("schedule", variables)
        return jsonify({"success": True, "schedule": result})
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500
