"""In-memory, single-session dataset store (MVP: one active dataset, lost on restart)."""
from datetime import datetime, timezone


class SessionStore:
    def __init__(self):
        self.dataset = None

    def set(self, reviews, parsed, filename, is_demo, sentiment_status):
        self.dataset = {
            "reviews": reviews, "stats": parsed.stats, "issues": parsed.issues, "columns": parsed.columns,
            "filename": filename, "is_demo": is_demo, "sentiment": sentiment_status,
            "analyzed_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "by_id": {r["review_id"]: r for r in reviews},
        }

    def clear(self):
        self.dataset = None


store = SessionStore()
