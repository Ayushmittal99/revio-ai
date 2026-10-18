"""Sentiment: optional pretrained Hugging Face model, with an honest heuristic fallback."""
import logging
import re
from dataclasses import dataclass
from typing import Optional

from app.core.config import get_settings

log = logging.getLogger("revio.sentiment")

POS = set("""great good excellent love loved amazing fantastic perfect happy satisfied helpful fast quick easy
recommend awesome wonderful smooth impressed friendly best comfortable beautiful reliable worth pleased nice solid
delighted thank thanks sturdy""".split())
NEG = set("""bad poor terrible awful horrible worst broke broken late delay delayed slow disappointed disappointing
rude useless waste defective damaged faulty expensive overpriced confusing crash crashes bug scam unacceptable
missing wrong cracked annoying frustrating frustrated unhelpful ignored difficult stopped failed fail failing issue
problem problems leaked leaks burn burnt smell furious hassle unsafe overheated""".split())
NEGATORS = {"not", "no", "never", "isn't", "wasn't", "don't", "didn't", "doesn't", "won't", "cannot", "can't", "hardly", "without"}

LABEL_MAP = {"negative": "Negative", "neutral": "Neutral", "positive": "Positive",
             "label_0": "Negative", "label_1": "Neutral", "label_2": "Positive"}


@dataclass
class SentimentResult:
    label: str
    confidence: Optional[float]  # None for the heuristic: it has no meaningful probability
    source: str  # "model" | "heuristic"


def heuristic_sentiment(text: str) -> SentimentResult:
    tokens = re.findall(r"[a-z']+", text.lower().replace("\u2019", "'"))
    score = 0
    for i, tok in enumerate(tokens):
        val = 1 if tok in POS else -1 if tok in NEG else 0
        if val and any(t in NEGATORS for t in tokens[max(0, i - 2):i]):
            val = -val
        score += val
    label = "Positive" if score >= 1 else "Negative" if score <= -1 else "Neutral"
    return SentimentResult(label, None, "heuristic")


class SentimentEngine:
    def __init__(self):
        self._pipe = None
        self._loaded_for = None
        self._failure = None

    def _try_load(self, model_name: str):
        if self._loaded_for == model_name:
            return
        self._loaded_for = model_name
        self._pipe, self._failure = None, None
        try:
            from transformers import pipeline  # lazy: optional heavy dependency

            self._pipe = pipeline("text-classification", model=model_name, top_k=None, device=-1)
            log.info("Loaded sentiment model")
        except Exception as exc:
            self._failure = f"{type(exc).__name__}: {str(exc)[:120]}"
            log.warning("Model unavailable, using heuristic fallback")

    def status(self) -> dict:
        s = get_settings()
        using_model = self._pipe is not None and s.sentiment_mode != "heuristic"
        reason = None
        if s.sentiment_mode == "heuristic":
            reason = "SENTIMENT_MODE=heuristic (offline demo mode)."
        elif self._failure:
            reason = f"Model could not be loaded ({self._failure})."
        elif not using_model:
            reason = "Model not loaded yet; it loads on the first analysis."
        return {"mode": "model" if using_model else "heuristic", "model_name": s.model_name,
                "fallback_active": not using_model, "reason": reason, "requested_mode": s.sentiment_mode,
                "note": "Heuristic = word-list rules, not a pretrained model; no confidence is reported."}

    def analyze(self, texts: list) -> list:
        s = get_settings()
        if s.sentiment_mode != "heuristic":
            self._try_load(s.model_name)
        if self._pipe is None or s.sentiment_mode == "heuristic":
            return [heuristic_sentiment(t) for t in texts]
        try:
            raw = self._pipe([t[:2000] for t in texts], batch_size=16, truncation=True, max_length=512)
            results = []
            for scores in raw:
                best = max(scores, key=lambda d: d["score"])
                label = LABEL_MAP.get(best["label"].lower())
                if label is None:
                    raise ValueError("unmapped model label")
                results.append(SentimentResult(label, round(float(best["score"]), 4), "model"))
            return results
        except Exception as exc:
            self._failure = f"inference failed: {type(exc).__name__}"
            self._pipe = None
            log.warning("Inference failed, using heuristic fallback")
            return [heuristic_sentiment(t) for t in texts]


engine = SentimentEngine()
