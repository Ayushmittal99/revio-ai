import logging
from pathlib import Path

from fastapi import APIRouter, File, Query, UploadFile
from fastapi.responses import FileResponse, Response

from app.core.config import get_settings
from app.core.errors import AppError
from app.schemas.models import ReplyRequest, ReplyResponse
from app.services.analysis import analyze_records
from app.services.export import to_csv
from app.services.ingest import parse_csv
from app.services.insights import build_insights, kpis_and_charts
from app.services.reply import generate_reply
from app.services.sentiment import engine
from app.services.store import store

log = logging.getLogger("revio.api")
router = APIRouter(prefix="/api")
SAMPLE = Path(__file__).resolve().parents[3] / "data" / "sample_reviews.csv"


async def _read_upload(file: UploadFile, limit: int) -> bytes:
    raw = await file.read(limit + 1)
    if len(raw) > limit:
        raise AppError("file_too_large", f"File exceeds the {limit // (1024 * 1024)} MB limit.", 413)
    return raw


def _run(raw: bytes, filename: str, is_demo: bool) -> dict:
    s = get_settings()
    parsed = parse_csv(raw, s.max_upload_mb * 1024 * 1024, s.max_rows)
    if not parsed.records:
        raise AppError("no_valid_rows", "No usable rows: every row was blank or a duplicate.")
    reviews = analyze_records(parsed.records)
    status = engine.status()
    store.set(reviews, parsed, filename, is_demo, status)
    log.info("Analyzed dataset: %s rows", len(reviews))  # counts only; never review text
    return {"filename": filename, "is_demo": is_demo, "stats": parsed.stats, "issues": parsed.issues,
            "sentiment_engine": status, "summary": kpis_and_charts(reviews)}


@router.post("/reviews/preview")
async def preview(file: UploadFile = File(...)):
    s = get_settings()
    parsed = parse_csv(await _read_upload(file, s.max_upload_mb * 1024 * 1024), s.max_upload_mb * 1024 * 1024, s.max_rows)
    return {"columns": parsed.columns, "stats": parsed.stats, "issues": parsed.issues,
            "rows": parsed.records[:10], "encoding": parsed.encoding}


@router.post("/reviews/analyze")
async def analyze(file: UploadFile = File(...)):
    raw = await _read_upload(file, get_settings().max_upload_mb * 1024 * 1024)
    return _run(raw, file.filename or "upload.csv", False)


@router.post("/reviews/analyze-sample")
def analyze_sample():
    return _run(SAMPLE.read_bytes(), "sample_reviews.csv (synthetic demo data)", True)


@router.get("/sample-csv")
def sample_csv():
    return FileResponse(SAMPLE, media_type="text/csv", filename="sample_reviews.csv")


@router.delete("/reviews")
def clear():
    store.clear()
    return {"cleared": True}


@router.get("/summary")
def summary():
    ds = store.dataset
    if not ds:
        return {"has_data": False}
    return {"has_data": True, "filename": ds["filename"], "is_demo": ds["is_demo"], "analyzed_at": ds["analyzed_at"],
            "stats": ds["stats"], "sentiment_engine": ds["sentiment"], **kpis_and_charts(ds["reviews"])}


def _require(review_id: str) -> dict:
    ds = store.dataset
    if not ds or review_id not in ds["by_id"]:
        raise AppError("not_found", "Review not found in the active dataset.", 404)
    return ds["by_id"][review_id]


@router.get("/reviews/export")
def export():
    if not store.dataset:
        raise AppError("no_data", "Nothing to export: analyze a dataset first.", 404)
    return Response(to_csv(store.dataset["reviews"]), media_type="text/csv",
                    headers={"Content-Disposition": 'attachment; filename="revio_analyzed_reviews.csv"'})


@router.get("/reviews")
def list_reviews(q: str = "", sentiment: str = "", category: str = "", priority: str = "",
                 min_rating: float = Query(None, ge=1, le=5), max_rating: float = Query(None, ge=1, le=5),
                 sort: str = Query("priority_score", pattern="^(priority_score|date|rating|review_id)$"),
                 order: str = Query("desc", pattern="^(asc|desc)$"),
                 page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    ds = store.dataset
    if not ds:
        return {"has_data": False, "items": [], "total": 0, "page": 1, "page_size": page_size, "pages": 0}
    items = ds["reviews"]
    if q:
        items = [r for r in items if q.lower() in r["review_text"].lower()]
    if sentiment:
        items = [r for r in items if r["sentiment"].lower() == sentiment.lower()]
    if category:
        items = [r for r in items if r["category"].lower() == category.lower()]
    if priority:
        items = [r for r in items if r["priority_level"].lower() == priority.lower()]
    if min_rating is not None:
        items = [r for r in items if r["rating"] is not None and r["rating"] >= min_rating]
    if max_rating is not None:
        items = [r for r in items if r["rating"] is not None and r["rating"] <= max_rating]
    # rows missing the sort field always go last
    present = [r for r in items if r.get(sort) is not None]
    missing = [r for r in items if r.get(sort) is None]
    present.sort(key=lambda r: r[sort], reverse=(order == "desc"))
    items = present + missing
    total = len(items)
    start = (page - 1) * page_size
    return {"has_data": True, "items": items[start:start + page_size], "total": total, "page": page,
            "page_size": page_size, "pages": -(-total // page_size)}


@router.get("/reviews/{review_id}")
def get_review(review_id: str):
    return _require(review_id)


@router.post("/reviews/{review_id}/reply", response_model=ReplyResponse)
def reply(review_id: str, body: ReplyRequest):
    return generate_reply(_require(review_id), body.tone, body.variant)


@router.get("/insights")
def insights():
    ds = store.dataset
    return build_insights(ds["reviews"]) if ds else {"has_data": False}
