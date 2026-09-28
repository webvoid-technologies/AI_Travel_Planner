from flask import Blueprint, request, jsonify

from services.groq_service import generate_json

packing_bp = Blueprint("packing", __name__, url_prefix="/")


@packing_bp.route("/packing", methods=["POST"])
def generate_packing():
    data = request.get_json(silent=True) or {}
    variables = {
        "destination": data.get("destination", "Unknown destination"),
        "days": data.get("days", 3),
        "travelers": data.get("travelers", 1),
        "special_requirements": data.get("special_requirements", "None"),
        "interests": ", ".join(data.get("interests", [])) or "General sightseeing",
        "transportation": data.get("transportation", "Car"),
    }
    try:
        result = generate_json("packing", variables)
        return jsonify({"success": True, "packing": result})
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500
