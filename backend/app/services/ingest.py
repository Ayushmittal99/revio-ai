"""CSV ingestion: decoding, validation, cleaning. Nothing is dropped silently."""
import io
import re
import warnings
from dataclasses import dataclass, field

import pandas as pd

from app.core.errors import AppError

ENCODINGS = ["utf-8-sig", "utf-8", "cp1252", "latin-1"]
MAX_ISSUES = 200


@dataclass
class ParsedDataset:
    records: list = field(default_factory=list)
    stats: dict = field(default_factory=dict)
    issues: list = field(default_factory=list)
    columns: list = field(default_factory=list)
    encoding: str = "utf-8"


def _decode(raw: bytes):
    for enc in ENCODINGS:
        try:
            return raw.decode(enc), enc
        except UnicodeDecodeError:
            continue
    raise AppError("invalid_encoding", "Could not decode the file as text.")


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def _read_frame(raw: bytes, max_bytes: int, max_rows: int):
    if not raw or not raw.strip():
        raise AppError("empty_file", "The file is empty.")
    if len(raw) > max_bytes:
        raise AppError("file_too_large", f"File exceeds the {max_bytes // (1024 * 1024)} MB limit.", 413)
    if b"\x00" in raw:
        raise AppError("invalid_csv", "This does not look like a text CSV file.")
    text, enc = _decode(raw)
    try:
        df = pd.read_csv(io.StringIO(text), dtype=str, keep_default_na=False, skipinitialspace=True)
    except pd.errors.EmptyDataError:
        raise AppError("empty_file", "The file has no content.")
    except (pd.errors.ParserError, ValueError) as exc:
        raise AppError("invalid_csv", f"Could not parse CSV: {str(exc)[:160]}")
    df.columns = [str(c).strip().lower() for c in df.columns]
    if "review_text" not in df.columns:
        raise AppError(
            "missing_column",
            f"Missing required column 'review_text'. Columns found: {', '.join(df.columns) or 'none'}.",
        )
    if len(df) == 0:
        raise AppError("empty_dataset", "The file has a header but no data rows.")
    if len(df) > max_rows:
        raise AppError("too_many_rows", f"File has {len(df)} rows; the limit is {max_rows}.", 413)
    return df, enc


def _parse_date(value: str):
    if not value:
        return None, None
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        ts = pd.to_datetime(value, errors="coerce")
    if pd.isna(ts):
        return None, "invalid_date"
    return ts.strftime("%Y-%m-%d"), None


def _parse_rating(value: str):
    if not value:
        return None, "missing_rating"
    try:
        num = float(value)
    except ValueError:
        return None, "invalid_rating"
    if not 1 <= num <= 5:
        return None, "invalid_rating"
    return num, None


def parse_csv(raw: bytes, max_bytes: int, max_rows: int) -> ParsedDataset:
    df, enc = _read_frame(raw, max_bytes, max_rows)
    out = ParsedDataset(columns=list(df.columns), encoding=enc)
    seen_keys, used_ids = set(), set()
    counts = {"duplicate": 0, "skipped": 0, "missing_rating": 0, "invalid_rating": 0, "invalid_date": 0, "id_reassigned": 0}

    def note(row, kind, message):
        if len(out.issues) < MAX_ISSUES:
            out.issues.append({"row": row, "kind": kind, "message": message})

    def get(row, col):
        return str(row[col]).strip() if col in df.columns else ""

    for idx, row in df.iterrows():
        line = idx + 2  # header is line 1
        text = get(row, "review_text")
        if not text:
            counts["skipped"] += 1
            note(line, "blank_review", "Skipped: review_text is blank.")
            continue
        date_iso, date_err = _parse_date(get(row, "date"))
        rating, rating_err = _parse_rating(get(row, "rating")) if "rating" in df.columns else (None, None)
        for err, label in ((date_err, "date"), (rating_err, "rating")):
            if err:
                counts[err] += 1
                if err != "missing_rating":
                    note(line, err, f"Row kept; {label} could not be used.")
        product, customer = get(row, "product"), get(row, "customer")
        key = (_norm(text), date_iso or get(row, "date"), _norm(customer), _norm(product))
        if key in seen_keys:
            counts["duplicate"] += 1
            note(line, "duplicate", "Skipped: duplicate of an earlier row.")
            continue
        seen_keys.add(key)
        rid = get(row, "review_id")
        if not rid or rid in used_ids:
            if rid:
                counts["id_reassigned"] += 1
                note(line, "id_reassigned", f"review_id '{rid}' already used; new id assigned.")
            n = len(used_ids) + 1
            rid = f"R{n:04d}"
            while rid in used_ids:
                n += 1
                rid = f"R{n:04d}"
        used_ids.add(rid)
        out.records.append(
            {"review_id": rid, "review_text": text, "date": date_iso, "rating": rating,
             "product": product or None, "customer": customer or None}
        )
    valid = len(df) - counts["skipped"]
    out.stats = {
        "imported": len(df), "valid": valid, "duplicate": counts["duplicate"], "skipped": counts["skipped"],
        "processed": len(out.records),
        "warnings": {k: counts[k] for k in ("missing_rating", "invalid_rating", "invalid_date", "id_reassigned")},
    }
    return out
