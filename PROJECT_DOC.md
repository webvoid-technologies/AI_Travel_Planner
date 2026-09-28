# AI Travel Planner — Internal Project Documentation

Implementation reference for developers. For a quick start guide, see [README.md](README.md).

---

## 1. Architecture Overview

```
Browser (Jinja2 + Tailwind + Vanilla JS)
        │  fetch() → JSON
        ▼
Flask App (app.py)
        │  registers 8 Blueprints
        ▼
Routes (app/routes/*.py)  ──►  normalize form JSON → prompt variables
        │
        ▼
Groq Service (app/services/groq_service.py)
        │  load prompt template → str.format() → Groq chat completion
        ▼
Groq API (model: openai/gpt-oss-120b, configurable via GROQ_MODEL)
        │
        ▼
Response ──► JSON modules: parsed via _extract_json()
             Itinerary module: raw Markdown returned as-is
```

**Design decisions**

- **No database / no auth** — every request is stateless. The preference payload is sent to every endpoint; nothing is persisted server-side.
- **No React** — a single Jinja2 page (`index.html`) + one JS bundle (`app.js`). All dynamic rendering happens client-side via `document.createElement` / `innerHTML`.
- **Prompt files, not code** — prompts live as `.txt` templates in `app/prompts/` so they can be iterated on without touching Python.
- **Two response modes** — itinerary returns Markdown (rendered client-side with `marked`); all other modules return JSON (the prompt enforces the schema).

---

## 2. Request Flow

1. User submits `#travelForm` → `app.js` `getFormData()` builds the canonical payload:

```json
{
  "destination": "Goa, India",
  "starting_city": "Mumbai",
  "days": 3,
  "travelers": 2,
  "budget": "Medium",
  "transportation": "Flight",
  "accommodation": "Resort",
  "food": "Veg",
  "special_requirements": "Friends trip",
  "interests": ["Beaches", "Food"]
}
```

2. `POST /generate-itinerary` is called **first** (sequential) so the user sees the main result as early as possible.
3. The remaining 7 endpoints are then fired **in parallel** via `Promise.all`.
4. Each response is dispatched to its renderer (`renderPlaces`, `renderBudget`, …) which builds DOM inside `#resultsContainer`.

Failure in any single call aborts the batch (`Promise.all` rejects). Currently an alert is shown; per-module fault isolation is a known improvement.

---

## 3. Backend — File-by-File

### `app/app.py`
- `create_app()` factory; registers all 8 blueprints.
- Loads `.env` from the project root (`Path(__file__).parent.parent`) **and** CWD — works whether run from `app/` or the repo root.
- `GET /` renders `index.html`.
- Entry: `app.run(host, port)`; port defaults to `5000`, overridable via `PORT` env var.

### `app/services/groq_service.py`
| Function | Purpose |
|---|---|
| `get_client()` | Reads `GROQ_API_KEY` **lazily** (call-time, not import-time — critical because `load_dotenv` runs after route imports). Raises if missing. |
| `_load_prompt(name, vars)` | Reads `app/prompts/{name}.txt`, applies `str.format(**vars)`. |
| `_extract_json(text)` | Tolerant JSON extraction: tries fenced code block first, then first `{...}`/`[...]` span, then raw parse. Returns `None` on failure. |
| `generate_text(name, vars, temp=0.7)` | Chat completion → raw text (used by itinerary). |
| `generate_json(name, vars, temp=0.5)` | `generate_text` → `_extract_json`. Falls back to `{"raw": ..., "error": ...}` if unparseable. |

Model resolution: `os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")` — read per-request so `.env` edits take effect on reload.

### `app/routes/*.py`
Each blueprint is identical in shape:

```python
data = request.get_json(silent=True) or {}
variables = { ...mapped fields with defaults... }
result = generate_text/generate_json("<module>", variables)
return jsonify({"success": True, "<module>": result})
```

- `interests` arrives as a list → joined to CSV string for the prompt.
- All routes return `{"success": False, "error": msg}` with HTTP 500 on exception.
- No auth, no rate limiting, no input validation beyond defaults — acceptable for POC only.

---

## 4. Prompt Engineering (`app/prompts/`)

| File | Output contract | Notes |
|---|---|---|
| `itinerary.txt` | Free Markdown (headings, tables, lists) | Only module allowed to return Markdown — consumed by `marked`. |
| `places.txt` | JSON: 7 category arrays of `{name, description, type}` | Ends with "Return ONLY the JSON object" — critical instruction. |
| `budget.txt` | JSON: `daily_breakdown[]` + `summary{}` + `notes` | Escaped braces `{{ }}` required in `.format()` templates. |
| `schedule.txt` | JSON: `departure`, `arrival`, `daily_schedule[]` | |
| `packing.txt` | JSON: 5 category arrays + `notes` | |
| `food.txt` | JSON: dishes/restaurants/street/veg/non-veg/desserts | Instructs model to respect `food` preference. |
| `tips.txt` | JSON: 6 tip categories + `general_notes` | |
| `alternatives.txt` | JSON: 4 plan objects `{title, activities[], notes}` | |

**Gotcha:** any literal `{`/`}` in a prompt (e.g., example JSON schema) must be doubled (`{{ }}`) or `str.format` raises `KeyError` — `_load_prompt` wraps this in a `ValueError` naming the missing key.

---

## 5. Frontend (`app/static/js/app.js`)

### Rendering pipeline
- `parseMarkdown()` → `marked.parse()` (GFM tables enabled) → `DOMPurify.sanitize()` → injected into `#itineraryContent`.
- JSON modules map response keys to card configs (icon, color classes, section title) and build DOM imperatively — no templating engine client-side.
- Budget renders into a real `<table>` (`#budgetTableBody` + totals row in `tfoot`).

### UX plumbing
- **Loading overlay** — `#loadingOverlay` toggles; button spinner + label swap.
- **Scroll-spy** — `IntersectionObserver` on `.section` elements highlights the matching sidebar button.
- **Copy** — `navigator.clipboard.writeText(currentItineraryMarkdown)` (raw Markdown, not HTML).
- **Download** — Markdown → `Blob` → object URL → `<a download>` click.
- **Clear form** — `form.reset()` + hides results + resets nav state.

### Styling (`app/static/css/style.css`)
- `.glass` — glassmorphism (translucent bg + `backdrop-filter` blur).
- `.itinerary-markdown *` — full Markdown element styling: GFM tables (gradient `thead`, hover rows), headings, lists, `hr`, `blockquote`, `code`, links.
- Tailwind is the **CDN build** (`cdn.tailwindcss.com`) — JIT-in-browser; fine for POC, swap for a built stylesheet in production.

### CDNs used
| Library | Version | Purpose |
|---|---|---|
| Tailwind | latest CDN | utility CSS |
| marked | 12.0.2 | Markdown → HTML |
| DOMPurify | 3.2.4 | sanitize AI HTML before injection |

---

## 6. API Contract (all `POST`, JSON in/out)

| Endpoint | Response shape |
|---|---|
| `/generate-itinerary` | `{success, itinerary: "<markdown>"}` |
| `/places` | `{success, places: {7 category arrays}}` |
| `/budget` | `{success, budget: {daily_breakdown, summary, notes}}` |
| `/schedule` | `{success, schedule: {departure, arrival, daily_schedule}}` |
| `/packing` | `{success, packing: {5 categories, notes}}` |
| `/food` | `{success, food: {dishes, restaurants[], ...}}` |
| `/tips` | `{success, tips: {6 categories, general_notes}}` |
| `/alternatives` | `{success, alternatives: {4 plan objects}}` |

All failures: `{success: false, error: "<message>"}` + HTTP 500.

---

## 7. Environment

| Var | Required | Default |
|---|---|---|
| `GROQ_API_KEY` | yes | — |
| `GROQ_MODEL` | no | `openai/gpt-oss-120b` |
| `PORT` | no | `5000` |

**Model note:** `llama-3.3-70b-versatile` was deprecated by Groq (shutdown 2026-08-16). Live models on free tier: `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `qwen/qwen3.8-27b`. Verify current list:
```bash
curl https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"
```

---

## 8. Known Limitations & Extension Points

| Limitation | Fix path |
|---|---|
| `Promise.all` — one module failure aborts all | switch to `Promise.allSettled`, render per-module errors |
| AI latency is synchronous per request | add per-module `Generate` buttons or SSE streaming |
| Free-tier Groq rate limits (RPM/TPM) | catch 429, honor `retry-after`, single retry |
| AI output occasionally breaks JSON schema | `_extract_json` fallback returns `raw`; could add json-repair pass |
| No history/persistence | add SQLite or localStorage cache |
| No session concept for multi-user | out of scope for POC |

---

## 9. Repo Layout

```
AI_Travel_Planner/
├── app/
│   ├── app.py                 # factory + blueprint registration + entry point
│   ├── routes/                # 8 blueprints, one per module
│   ├── services/groq_service.py
│   ├── prompts/               # 8 .txt templates ({var} substitution)
│   ├── templates/index.html   # single-page dashboard
│   └── static/
│       ├── css/style.css      # glass theme + markdown element styles
│       └── js/app.js          # fetch + rendering + UX plumbing
├── .env / .env.example
├── .gitignore
├── requirements.txt
├── README.md                  # quick start (public-facing)
└── PROJECT_DOC.md             # this file
```
