<img width="1366" height="768" alt="Screenshot (934)" src="https://github.com/user-attachments/assets/1404983d-335f-47b8-a08e-ea95c37ebb24" />
# Revio AI: Customer Review Intelligence Copilot (prototype)

> **Independent proposed prototype.** Inspired by a publicly described product category (an "AI review assistant").
> It is **not** an official Cynbit Technologies feature, uses no Cynbit systems or data, and makes no claims about Cynbit internals.

## Status (honest)
| Part | State |
|---|---|
| Backend (FastAPI): CSV import, sentiment, categories, priority, insights, replies, export | Built, 25 automated tests pass (offline) |
| Sample data (`data/sample_reviews.csv`, **synthetic**) | Done |
| Frontend (React/Vite/TS/Tailwind, Recharts, React Router): 6 pages wired to the API | Built. 10 automated tests pass, type-check and production build succeed. **Not visually inspected in a browser** here; chart rendering is not covered by tests (jsdom has no layout) |
| `reports/ai_opportunity_report.md`, `reports/technical_approach.md` | **Not written yet** |
| Pretrained HF model path | Code written, **not run here** (no model download in test env); fallback path tested |
| Optional LLM replies | Code written, **not tested against a live provider**; off by default |
| Deployment / GitHub push | Not done |

## How analysis works
- **Sentiment:** pretrained `cardiffnlp/twitter-roberta-base-sentiment-latest` if `transformers` is installed (labels negative/neutral/positive, confidence shown). Otherwise a **word-list heuristic** (negation-aware, no confidence reported). Check the model card for licence and limits; it was trained on tweets, so reviews may differ.
- **Categories:** keyword rules, **not a trained model**. Refund keywords count double (a documented choice). Known weakness: multi-topic reviews get one category.
- **Priority (0-100):** negative sentiment (40/10/0) + low rating (25/18/8/2/0) + urgency words (5 each, max 15) + refund/payment words (6 each, max 12) + repeated problem (8) + possible safety wording (20), capped at 100. High >= 70, Medium >= 40. It is a transparent heuristic, **not** a calibrated probability. Safety keyword matches always flag the review for human review (may include false positives).
- **Replies:** rule-based templates, always labeled as drafts for human review; never sent automatically; no promises of refunds/discounts/dates.

## Run the backend
Windows PowerShell:
```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
$env:SENTIMENT_MODE="heuristic"   # offline mode; omit to use the HF model (pip install -r requirements-ml.txt first)
uvicorn app.main:app --reload --port 8000
```
macOS/Linux:
```bash
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && cp .env.example .env
SENTIMENT_MODE=heuristic uvicorn app.main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

## Run the frontend (second terminal)
```bash
cd frontend
npm install
copy .env.example .env      # Windows (use cp on macOS/Linux); sets VITE_API_BASE_URL
npm run dev                 # http://localhost:5173
```
Quick demo: open the app, click **Load synthetic demo data** on Overview.

## Tests and checks
```bash
cd backend && python -m pytest -q          # 25 tests
cd frontend && npm test                    # 10 tests
cd frontend && npm run build               # type-check + production build
```
Last verified result in the build environment: backend 25 passed, frontend 10 passed, build succeeded (one bundle-size warning, bundle is ~628 kB / ~179 kB gzip).

## API
`GET /health` | `POST /api/reviews/preview` | `POST /api/reviews/analyze` | `POST /api/reviews/analyze-sample` | `GET /api/sample-csv` | `GET /api/summary` | `GET /api/reviews` (q, sentiment, category, priority, min_rating, max_rating, sort, order, page, page_size) | `GET /api/reviews/{id}` | `POST /api/reviews/{id}/reply` | `GET /api/insights` | `GET /api/reviews/export` | `DELETE /api/reviews`

CSV: required `review_text`; optional `review_id, date, rating, product, customer`. Limits: 5 MB, 5000 rows (configurable). Export neutralises formula injection (`= + - @`).

## Privacy and limits
Data lives only in server memory (single session, lost on restart). Review text leaves the server only if you enable an LLM (`LLM_ENABLED=true` plus base URL, model and key in backend `.env`). Logs contain counts, not review text. No authentication is implemented.

## Git
```bash
git init && git add . && git commit -m "feat: Revio AI backend"
git branch -M main
git remote add origin <your-repo-url> && git push -u origin main
```
