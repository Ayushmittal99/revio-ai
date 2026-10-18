from app.services.categorizer import categorize, load_categories
from app.services.priority import score_priority
from app.services.sentiment import engine


def analyze_records(records: list) -> list:
    categories = load_categories()
    sentiments = engine.analyze([r["review_text"] for r in records])  # one batched call
    out = []
    for rec, sent in zip(records, sentiments):
        cat, kws = categorize(rec["review_text"], categories)
        pr = score_priority(rec["review_text"], sent.label, rec["rating"])
        out.append({**rec, "sentiment": sent.label, "confidence": sent.confidence,
                    "sentiment_source": sent.source, "category": cat, "category_keywords": kws, **pr})
    return out
