from app.services.categorizer import categorize
from app.services.export import sanitize_cell
from app.services.priority import score_priority
from app.services.reply import template_reply
from app.services.sentiment import heuristic_sentiment


def test_sentiment_fallback_is_honest():
    r = heuristic_sentiment("Great product, love it")
    assert r.label == "Positive" and r.confidence is None and r.source == "heuristic"
    assert heuristic_sentiment("Terrible and broken").label == "Negative"
    assert heuristic_sentiment("It arrived on Tuesday").label == "Neutral"


def test_negation():
    assert heuristic_sentiment("not good at all").label == "Negative"
    assert heuristic_sentiment("no problems, works well").label != "Negative"


def test_categories():
    assert categorize("The package was late and tracking never updated")[0] == "Delivery"
    assert categorize("I want a refund, please cancel")[0] == "Refunds and Returns"
    assert categorize("Login keeps failing in the app")[0] == "User Experience"
    assert categorize("Hello world")[0] == "Other"


def test_priority_components_and_explanation():
    p = score_priority("Charged twice, I want my money back. Unacceptable!", "Negative", 1)
    names = {f["factor"] for f in p["priority_factors"]}
    assert {"Negative sentiment", "Low star rating", "Urgency language", "Refund / payment concern"} <= names
    assert p["priority_score"] == sum(f["points"] for f in p["priority_factors"]) <= 100
    assert p["priority_level"] == "High" and "Negative sentiment +40" in p["priority_explanation"]


def test_priority_low_and_missing_rating():
    p = score_priority("Lovely, thank you", "Positive", None)
    assert p["priority_score"] == 0 and p["priority_level"] == "Low" and not p["needs_human_review"]


def test_safety_forces_human_review():
    p = score_priority("It started to smoke, felt unsafe", "Neutral", 4)
    assert p["safety_flag"] and p["needs_human_review"]


def test_score_capped_at_100():
    t = "urgent immediately unacceptable refund money back charged twice third time smoke unsafe"
    assert score_priority(t, "Negative", 1)["priority_score"] == 100


def test_reply_no_promises_and_no_names():
    rev = {"sentiment": "Negative", "category": "Refunds and Returns", "safety_flag": False, "customer": "Jane Doe"}
    for tone in ("Professional", "Friendly", "Empathetic"):
        out = template_reply(rev, tone).lower()
        assert "jane" not in out and "we will refund" not in out and "guarantee" not in out


def test_sanitize():
    assert sanitize_cell("=1+1") == "'=1+1" and sanitize_cell("@SUM") == "'@SUM" and sanitize_cell("ok") == "ok"
    assert sanitize_cell(5) == 5 and sanitize_cell("  =x") == "'  =x"
