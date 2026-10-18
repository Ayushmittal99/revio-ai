import csv
import io

COLUMNS = ["review_id", "date", "product", "customer", "rating", "review_text", "sentiment", "confidence",
           "sentiment_source", "category", "priority_score", "priority_level", "needs_human_review", "priority_explanation"]


def sanitize_cell(value):
    """Neutralise spreadsheet formula injection by prefixing risky text with an apostrophe."""
    if isinstance(value, str) and value.lstrip()[:1] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + value
    return value


def to_csv(reviews: list) -> str:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(COLUMNS)
    for r in reviews:
        writer.writerow([sanitize_cell("" if r.get(c) is None else r.get(c)) for c in COLUMNS])
    return buf.getvalue()
