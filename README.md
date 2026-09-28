<p align="center">
  <img src="https://www.webvoidtechnologies.com/webvoid_logo_tm.png" alt="Webvoid Technologies" width="220">
</p>

<h1 align="center">AI Travel Planner</h1>

<p align="center">
  An AI-powered travel planning assistant built with Flask + Groq.<br/>
  Final-year CSE project POC.
</p>

<p align="center">
  <sub>Developed by <b>Webvoid Technologies</b></sub>
</p>

---

## What it does

Enter your trip preferences (destination, days, budget, interests, food, transport) and the app generates:

- Day-by-day itinerary
- Recommended places & hidden gems
- Budget breakdown
- Travel schedule
- Packing checklist
- Food recommendations
- Travel tips
- Alternate plans (rainy day / budget / luxury / family)

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Add your Groq API key
cp .env.example .env       # then edit .env and set GROQ_API_KEY

# 3. Run
cd app
python app.py
```

Open **http://localhost:5000** in your browser.

## Stack

Flask · Jinja2 · Tailwind CSS · Vanilla JS · Groq API (`openai/gpt-oss-120b`)

No database. No authentication. No React.

## Documentation

For internal architecture and implementation details, see [PROJECT_DOC.md](PROJECT_DOC.md).

## Support

For questions or issues, contact:

**Email:** [studentprogram@webvoidtechnologies.com](mailto:studentprogram@webvoidtechnologies.com)

---

<p align="center">
  <sub>Developed by <b>Webvoid Technologies</b></sub>
</p>
