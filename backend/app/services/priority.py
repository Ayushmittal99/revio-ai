"""Interpretable 0-100 priority score. A transparent heuristic, not a validated or calibrated prediction."""
from app.services.text_utils import find_terms

SENTIMENT_POINTS = {"Negative": 40, "Neutral": 10, "Positive": 0}
RATING_POINTS = {1: 25, 2: 18, 3: 8, 4: 2, 5: 0}
URGENCY = ["urgent", "immediately", "asap", "unacceptable", "worst", "terrible", "horrible", "never again",
           "lawyer", "scam", "fraud", "furious", "disgusted", "waste of money", "cancel"]
REFUND_PAYMENT = ["refund", "money back", "charged twice", "double charged", "chargeback", "overcharg", "payment"]
REPEATED = ["again!", "third time", "second time", "still not", "still waiting", "every time", "repeatedly",
            "multiple times", "several times"]
SAFETY = ["burn", "fire!", "smoke", "spark", "injur", "allerg", "unsafe", "hazard", "choking", "poison",
          "hospital", "rash!", "electric shock", "overheat"]
CAPS = {"urgency": 15, "refund_payment": 12, "repeated": 8, "safety": 20}
HIGH, MEDIUM = 70, 40


def score_priority(text: str, sentiment: str, rating) -> dict:
    factors = []

    def add(name, points, detail):
        if points:
            factors.append({"factor": name, "points": int(points), "detail": detail})

    add("Negative sentiment", SENTIMENT_POINTS.get(sentiment, 0), f"Sentiment is {sentiment}")
    if rating is not None:
        add("Low star rating", RATING_POINTS[min(5, max(1, round(rating)))], f"Rating {rating:g}/5")
    urgent = find_terms(text, URGENCY)
    add("Urgency language", min(5 * len(urgent), CAPS["urgency"]), "Matched: " + ", ".join(urgent))
    refund = find_terms(text, REFUND_PAYMENT)
    add("Refund / payment concern", min(6 * len(refund), CAPS["refund_payment"]), "Matched: " + ", ".join(refund))
    repeated = find_terms(text, REPEATED)
    add("Repeated problem", CAPS["repeated"] if repeated else 0, "Matched: " + ", ".join(repeated))
    safety = find_terms(text, SAFETY)
    add("Possible safety concern", CAPS["safety"] if safety else 0, "Matched: " + ", ".join(safety))
    score = min(100, sum(f["points"] for f in factors))
    level = "High" if score >= HIGH else "Medium" if score >= MEDIUM else "Low"
    return {
        "priority_score": score, "priority_level": level, "priority_factors": factors,
        "safety_flag": bool(safety),
        "needs_human_review": bool(safety) or level == "High",
        "priority_explanation": "; ".join(f"{f['factor']} +{f['points']}" for f in factors) or "No risk factors detected",
    }
