# Technical Approach: Revio AI — Customer Review Intelligence Copilot

**Prepared for:** Cynbit Technologies — AI/ML Engineer Intern assessment  
**Date:** 18 October 2026  
**Status:** Technical note for an independent proof of concept; not an official Cynbit product.

## 1. Overview

Revio AI is a small full-stack prototype for analysing customer reviews. The frontend is built with React, Vite, TypeScript, Tailwind CSS, React Router, and Recharts. The backend is a Python FastAPI service. The frontend calls the API to preview or analyse CSV files, browse results, view summary insights, request a suggested reply, and export analysed data.

The prototype is designed for local demonstration and experimentation. It is not yet a production multi-user system: the active dataset is held in server memory, authentication is not implemented, and deployment/security hardening has not been completed.

## 2. Architecture

```text
Browser (React / Vite / TypeScript)
        |
        | HTTP requests to configured API base URL
        v
FastAPI backend
  ├── CSV validation and ingestion
  ├── Sentiment service
  ├── Rule-based category service
  ├── Explainable priority scoring
  ├── KPI and insight aggregation
  ├── Reply-draft generation
  └── CSV export
        |
        v
In-memory active dataset
```

The backend exposes interactive API documentation through FastAPI's `/docs` route. The frontend uses `VITE_API_BASE_URL` to configure the API address; use the provided `.env.example` files as templates and never commit real secrets.

## 3. Data flow

1. The user selects a CSV file or loads the bundled synthetic demo dataset.
2. The backend validates and parses the CSV, checks required columns and row limits, and reports parsing issues where applicable.
3. Each usable review is analysed for sentiment, category, and priority. The service derives aggregate KPIs and chart data.
4. The active dataset is held in memory for the current backend process. API endpoints return filtered/paginated reviews, summary statistics, and insights.
5. A user requests a reply draft for a selected review and chooses a tone. The draft is returned for manual editing and approval.
6. The user can export analysed results to CSV.

The expected review text field is `review_text`. Optional fields include `review_id`, `date`, `rating`, `product`, and `customer`. The README documents default upload limits of 5 MB and 5,000 rows, configurable through settings. Blank or duplicate records can be rejected or reported during ingestion.

## 4. AI/ML and rules used

### 4.1 Sentiment analysis

The service supports an optional Hugging Face text-classification pipeline using `cardiffnlp/twitter-roberta-base-sentiment-latest`. When configured and dependencies/model loading are successful, it predicts Positive, Neutral, or Negative and returns the model confidence score.

An offline heuristic fallback uses positive/negative word lists and a small negation window. This makes local demos possible without downloading a model, but it is not a trained classifier and does not return a meaningful probability. The pretrained model was trained on tweets; performance on customer reviews must be measured before relying on it. Model availability, dependency installation, licence, and inference behaviour should be checked in the target environment.

### 4.2 Category assignment

Categories are assigned with keyword rules rather than a trained multi-class model. The prototype includes Product Quality, Delivery, Pricing, Customer Support, User Experience, Refunds and Returns, and Other. The implementation intentionally favours a transparent baseline. It can misclassify ambiguous reviews and typically assigns one category even when a review discusses several topics.

### 4.3 Priority score

The service calculates a transparent heuristic score from 0 to 100. Its current components are:

- Negative sentiment: 40 points; Neutral: 10; Positive: 0.
- Rating: 1 star = 25, 2 = 18, 3 = 8, 4 = 2, 5 = 0.
- Urgency terms: 5 points per matched term, capped at 15.
- Refund/payment terms: 6 points per matched term, capped at 12.
- Repeated-problem wording: 8 points when detected.
- Possible safety wording: 20 points when detected.

The total is capped at 100. Scores of 70 or higher are High priority; scores of 40–69 are Medium; lower scores are Low. Safety-term matches trigger a human-review flag. This is an explainable rule-based ranking—not a calibrated probability, trained risk model, or guarantee that every urgent review will be found. Keyword matching may produce false positives and false negatives.

### 4.4 Reply drafting

The default reply service selects a template based on sentiment, review category, and tone (Professional, Friendly, or Empathetic). An optional LLM integration exists in code but is off by default and was not verified against a live provider for this assessment. Replies are drafts only: they are not sent automatically and should not promise refunds, discounts, or dates. If an external LLM is enabled, review text may leave the server, so provider terms, consent, data minimisation, and secret handling must be reviewed first.

## 5. API surface

The current API includes:

| Endpoint | Purpose |
|---|---|
| `GET /health` | Health check |
| `POST /api/reviews/preview` | Preview CSV structure and sample rows |
| `POST /api/reviews/analyze` | Analyse an uploaded CSV |
| `POST /api/reviews/analyze-sample` | Load and analyse synthetic sample data |
| `GET /api/sample-csv` | Download the sample CSV |
| `GET /api/summary` | Summary of the active dataset |
| `GET /api/reviews` | Search, filter, sort, and paginate reviews |
| `GET /api/reviews/{review_id}` | Fetch one review from the active dataset |
| `POST /api/reviews/{review_id}/reply` | Generate a reply draft |
| `GET /api/insights` | Aggregate insights for the active dataset |
| `GET /api/reviews/export` | Export analysed reviews as CSV |
| `DELETE /api/reviews` | Clear the active dataset |

See the FastAPI `/docs` page for request schemas and response examples.

## 6. Testing and verification

The project README records 25 passing backend tests, 10 frontend tests, and a successful frontend type-check/production build in the original build environment. In a separate review environment, the backend suite was independently run and passed **25/25 tests**. The frontend tests could not be independently rerun there because frontend dependencies were not installed, so the frontend test/build result is reported from the project README rather than claimed as independently reproduced in that environment.

Recommended local verification from the repository root:

```powershell
# Backend (activate its virtual environment first, if used)
cd backend
python -m pytest -q
cd ..

# Frontend
cd frontend
npm ci
npm test
npm run build
```

If `npm ci` fails due to network or environment issues, do not claim the frontend tests/build passed in that environment. Manually check the main flows in the browser: load demo data, upload CSV, filter/search reviews, open insights, generate a reply draft, and export results.

## 7. Security, privacy, and operational limitations

- **No authentication/authorisation:** do not expose this prototype publicly with real customer data until access control is implemented.
- **In-memory data:** data is lost when the backend restarts; this is not durable storage.
- **Sensitive information:** customer reviews may include personal or confidential details. Use synthetic/de-identified data for demos and establish retention/access policies before a pilot.
- **Secrets:** keep API keys and credentials in local environment variables, use `.env.example` for placeholders, and exclude real `.env` files from Git.
- **CSV safety:** review upload validation and exported values; the current export service neutralises formula-leading characters to reduce spreadsheet formula-injection risk.
- **Resource limits:** enforce upload size and row limits; monitor memory and request time when scaling.
- **Model transparency:** distinguish model output from heuristic fallback and do not show a confidence value for the heuristic.
- **Human oversight:** require a human to review safety flags and approve reply drafts.
- **Observability:** logs should avoid raw review text; monitor failures and aggregate counts without collecting unnecessary personal data.

## 8. Production-readiness roadmap

Before real customer use, prioritise:

1. Add authentication, role-based access, tenant isolation, and secure deployment configuration.
2. Replace process memory with an appropriately secured persistence layer and define retention/deletion controls.
3. Evaluate sentiment/category models on a representative, labelled dataset; report per-class precision, recall, F1, and error examples.
4. Calibrate or redesign prioritisation with stakeholders; measure safety-related recall and false-negative risk.
5. Add auditability for label corrections and reply approval; preserve the human-in-the-loop workflow.
6. Validate LLM-provider data handling before enabling external inference; add prompt-injection and output-quality tests if applicable.
7. Add rate limits, monitoring, structured error handling, dependency scanning, and deployment/backup procedures.
8. Conduct accessibility and browser-level UI checks, including chart rendering and failure states.

## 9. Conclusion

The prototype demonstrates a coherent end-to-end review-analysis workflow using a React frontend and FastAPI backend. It combines an optional pretrained sentiment model, transparent rule-based categorisation and prioritisation, aggregate insights, draft replies, and CSV export. The next engineering step is not to claim production readiness, but to validate the workflow with representative data, test failure cases, and address authentication, persistence, evaluation, and deployment requirements before real-world use.
