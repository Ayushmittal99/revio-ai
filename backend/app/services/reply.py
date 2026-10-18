"""Reply drafting. Template fallback by default; optional LLM only if explicitly configured."""
import logging

import httpx

from app.core.config import get_settings

log = logging.getLogger("revio.reply")
TONES = ("Professional", "Friendly", "Empathetic")

OPEN = {
    "Negative": {"Professional": ["Thank you for your feedback, and we're sorry your experience fell short.",
                                  "Thank you for letting us know about this. We apologise for the trouble."],
                 "Friendly": ["Hi there, thanks for telling us about this, and we're sorry it wasn't a good experience!",
                              "Hi there, thanks for the honest feedback. Sorry things went wrong!"],
                 "Empathetic": ["We're truly sorry to hear this, and we understand how frustrating it must have been.",
                                "We're sorry this happened. We can understand why you're upset."]},
    "Neutral": {"Professional": ["Thank you for sharing your feedback.", "Thank you for taking the time to review us."],
                "Friendly": ["Hi there, thanks for sharing your thoughts!", "Hi there, thanks for the review!"],
                "Empathetic": ["Thank you for sharing your honest experience with us.", "We appreciate you taking the time to tell us how it went."]},
    "Positive": {"Professional": ["Thank you for your positive feedback.", "We appreciate you taking the time to review us."],
                 "Friendly": ["Hi there, thanks so much for the kind words!", "Hi there, so glad you enjoyed it!"],
                 "Empathetic": ["Thank you, it means a lot to hear this.", "We're really glad it worked well for you."]},
}
BODY = {
    "Product Quality": "We take product quality seriously and will pass your comments to the relevant team.",
    "Delivery": "We will share your delivery experience with the team responsible.",
    "Pricing": "We will share your comments about pricing with the team.",
    "Customer Support": "We will share your support experience with the team so we can improve.",
    "User Experience": "We will pass your comments about the app or website to our product team.",
    "Refunds and Returns": "We would like to look into your refund or return request in line with our policy.",
    "Other": "We will share your comments with the team.",
}
CLOSE = {"Professional": ["Please contact our support team so we can follow up with you.", "A team member will review this and may follow up."],
         "Friendly": ["Feel free to reach out to our team so we can help further!", "Thanks again, we really appreciate it."],
         "Empathetic": ["Please reach out to our team; we'd like to understand more and help where we can.", "Thank you for giving us the chance to improve."]}
SAFETY_LINE = "Because you mentioned a possible safety concern, we would like a team member to look at this personally."
DISCLAIMER = "AI-generated draft. A human must review and edit it before anything is sent. Nothing is sent automatically."


def template_reply(review: dict, tone: str, variant: int = 0) -> str:
    sent = review["sentiment"]
    parts = [OPEN[sent][tone][variant % 2]]
    if sent != "Positive":
        parts.append(BODY.get(review["category"], BODY["Other"]))
    if review.get("safety_flag"):
        parts.append(SAFETY_LINE)
    if sent != "Positive" or variant % 2:
        parts.append(CLOSE[tone][(variant // 2 + (0 if sent != "Positive" else 1)) % 2])
    return " ".join(parts)


def _llm_reply(review: dict, tone: str, s) -> str:
    system = ("You draft short customer-review replies for a human to approve. Do NOT promise refunds, discounts, "
              "delivery dates or any action. Do not include personal data. Under 90 words. Tone: " + tone)
    user = f"Product: {review.get('product') or 'n/a'}\nCategory: {review['category']}\nReview: {review['review_text'][:1000]}"
    resp = httpx.post(s.llm_base_url.rstrip("/") + "/chat/completions", timeout=20,
                      headers={"Authorization": f"Bearer {s.llm_api_key}"},
                      json={"model": s.llm_model, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]})
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


def generate_reply(review: dict, tone: str, variant: int = 0) -> dict:
    s = get_settings()
    source, reason, draft = "template", None, None
    if s.llm_configured:
        try:
            draft, source = _llm_reply(review, tone, s), "llm"
        except Exception as exc:
            reason = f"LLM request failed ({type(exc).__name__}); template used instead."
            log.warning("LLM reply failed, using template")
    else:
        reason = "No LLM configured (default); a rule-based template was used."
    if draft is None:
        draft = template_reply(review, tone, variant)
    return {"review_id": review["review_id"], "tone": tone, "draft": draft, "source": source,
            "fallback_reason": reason, "requires_human_review": True, "disclaimer": DISCLAIMER,
            "safety_note": SAFETY_LINE if review.get("safety_flag") else None}
