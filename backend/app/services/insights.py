"""Deterministic aggregation. Every number comes from the active dataset; nothing is invented."""
import re
from collections import Counter

STOP = set("""the and for was were with this that have has had but not you your are its it's from they them their
very just all can get got out our too than then when what which would could should will one two been being into
after before about over only also more most some any each other such per while still even much many really
i'm i've don't didn't doesn't isn't wasn't""".split()) | {"product", "item", "bought", "purchase", "order", "ordered"}

REC_TEMPLATES = {
    "Product Quality": "Review the affected product batches and quality checks; consider adding inspection before dispatch.",
    "Delivery": "Review carrier performance and packaging for the affected orders; check tracking-update reliability.",
    "Pricing": "Check whether pricing and fee information is shown clearly before purchase or renewal.",
    "Customer Support": "Review support response times and escalation handling for the affected tickets.",
    "User Experience": "Triage the reported app/website problems with the product team and reproduce them.",
    "Refunds and Returns": "Review the refund and cancellation flow for the affected customers and its clarity.",
    "Other": "Read these reviews manually to decide whether a new category is needed.",
}


def _pct(n, d):
    return round(100 * n / d, 1) if d else 0.0


def kpis_and_charts(reviews: list) -> dict:
    total = len(reviews)
    sent = Counter(r["sentiment"] for r in reviews)
    ratings = Counter(int(round(r["rating"])) for r in reviews if r["rating"] is not None)
    months = {}
    for r in reviews:
        if r["date"]:
            m = months.setdefault(r["date"][:7], {"month": r["date"][:7], "Positive": 0, "Neutral": 0, "Negative": 0})
            m[r["sentiment"]] += 1
    neg_cats = Counter(r["category"] for r in reviews if r["sentiment"] == "Negative")
    pos_cats = Counter(r["category"] for r in reviews if r["sentiment"] == "Positive")
    attention = sorted((r for r in reviews if r["needs_human_review"]), key=lambda r: -r["priority_score"])
    return {
        "kpis": {"total": total, "positive_pct": _pct(sent["Positive"], total), "negative_pct": _pct(sent["Negative"], total),
                 "high_priority": sum(r["priority_level"] == "High" for r in reviews),
                 "needs_human_review": len(attention)},
        "sentiment_distribution": [{"name": k, "value": sent.get(k, 0)} for k in ("Positive", "Neutral", "Negative")],
        "category_distribution": [{"name": k, "value": v} for k, v in Counter(r["category"] for r in reviews).most_common()],
        "rating_distribution": [{"rating": i, "count": ratings.get(i, 0)} for i in range(1, 6)] if ratings else [],
        "missing_rating_count": sum(r["rating"] is None for r in reviews),
        "trend": [months[k] for k in sorted(months)],
        "top_negative_theme": {"category": neg_cats.most_common(1)[0][0], "count": neg_cats.most_common(1)[0][1]} if neg_cats else None,
        "top_positive_theme": {"category": pos_cats.most_common(1)[0][0], "count": pos_cats.most_common(1)[0][1]} if pos_cats else None,
        "attention": [{k: r[k] for k in ("review_id", "review_text", "priority_score", "priority_level", "category", "safety_flag")}
                      for r in attention[:5]],
    }


def _keywords(subset: list, top: int = 8) -> list:
    doc_freq = Counter()
    for r in subset:
        words = {w for w in re.findall(r"[a-z']+", r["review_text"].lower().replace("\u2019", "'")) if len(w) > 3 and w not in STOP}
        doc_freq.update(words)
    out = []
    for word, n in doc_freq.most_common(top * 2):
        if n < 2 and len(subset) > 3:
            continue
        ex = next((r for r in subset if re.search(rf"\b{re.escape(word)}\b", r["review_text"].lower())), None)
        out.append({"keyword": word, "reviews": n,
                    "example": {"review_id": ex["review_id"], "snippet": ex["review_text"][:140]} if ex else None})
        if len(out) == top:
            break
    return out


def build_insights(reviews: list) -> dict:
    if not reviews:
        return {"has_data": False}
    neg = [r for r in reviews if r["sentiment"] == "Negative"]
    pos = [r for r in reviews if r["sentiment"] == "Positive"]
    recs = []
    for cat, n in Counter(r["category"] for r in neg).most_common():
        if n >= 2 and len(recs) < 4:
            ids = [r["review_id"] for r in neg if r["category"] == cat][:5]
            recs.append({"category": cat, "review_ids": ids,
                         "measured": f"{n} of {len(neg)} negative reviews ({_pct(n, len(neg))}%) fall under {cat}.",
                         "suggestion": REC_TEMPLATES.get(cat, REC_TEMPLATES["Other"])})
    safety = [r for r in reviews if r["safety_flag"]]
    if safety:
        recs.insert(0, {"category": "Safety", "review_ids": [r["review_id"] for r in safety][:5],
                        "measured": f"{len(safety)} review(s) contain possible safety wording (keyword match, may include false positives).",
                        "suggestion": "Route these to a human reviewer first and follow your own safety escalation process."})
    cat_month = {}
    for r in neg:
        if r["date"]:
            cat_month.setdefault(r["date"][:7], Counter())[r["category"]] += 1
    return {
        "has_data": True, "total_reviews": len(reviews), "negative_count": len(neg), "positive_count": len(pos),
        "sufficient_for_themes": len(reviews) >= 5,
        "negative_themes": _keywords(neg), "positive_themes": _keywords(pos),
        "negative_category_counts": [{"name": k, "value": v} for k, v in Counter(r["category"] for r in neg).most_common()],
        "category_trend": [{"month": m, **dict(c)} for m, c in sorted(cat_month.items())],
        "recommendations": recs,
        "note": "Themes are word counts from your reviews. 'measured' lines are counts; 'suggestion' lines are generic ideas, not findings.",
    }
