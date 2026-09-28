import os
from pathlib import Path
from flask import Flask, render_template
from dotenv import load_dotenv

from routes.itinerary import itinerary_bp
from routes.places import places_bp
from routes.budget import budget_bp
from routes.schedule import schedule_bp
from routes.packing import packing_bp
from routes.food import food_bp
from routes.tips import tips_bp
from routes.alternatives import alternatives_bp

# Load .env from the project root (parent of this file)
project_root = Path(__file__).resolve().parent.parent
load_dotenv(project_root / ".env")
load_dotenv()


def create_app() -> Flask:
    app = Flask(
        __name__,
        template_folder="templates",
        static_folder="static",
    )
    app.register_blueprint(itinerary_bp)
    app.register_blueprint(places_bp)
    app.register_blueprint(budget_bp)
    app.register_blueprint(schedule_bp)
    app.register_blueprint(packing_bp)
    app.register_blueprint(food_bp)
    app.register_blueprint(tips_bp)
    app.register_blueprint(alternatives_bp)
    return app


app = create_app()


@app.route("/")
def index():
    return render_template("index.html")


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
