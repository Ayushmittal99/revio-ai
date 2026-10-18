"""Transparent keyword/rule-based categorizer (a baseline, NOT a trained ML model)."""
import json
import os

from app.core.config import get_settings
from app.services.text_utils import find_terms

DEFAULT_CATEGORIES = {
    "Product Quality": ["broke", "broken", "defect", "quality", "cheap", "flimsy", "stopped working", "damaged",
                        "faulty", "malfunction", "cracked", "durable", "material", "stitch", "fell apart",
                        "battery", "scratch", "leak", "sturdy", "overheat", "build", "unsafe", "failed"],
    "Delivery": ["deliver", "shipping", "shipped", "arrived", "courier", "late", "delay", "package", "tracking",
                 "parcel", "dispatch", "missing"],
    "Pricing": ["price", "expensive", "overpriced", "cost", "pricey", "value", "worth", "fee", "invoice",
                "subscription", "discount", "affordable"],
    "Customer Support": ["support", "customer service", "agent", "representative", "helpdesk", "replied",
                         "response", "ticket", "rude", "staff", "contact me"],
    "User Experience": ["app", "website", "interface", "checkout", "login", "navigation", "confusing", "crash",
                        "slow", "design", "layout", "bug", "search", "update", "dark mode", "assemble"],
    "Refunds and Returns": ["refund", "return", "money back", "exchange", "replacement", "cancel",
                            "charged twice", "chargeback", "reimburse"],
}


# Refund/return intent is directly actionable, so each keyword hit counts double (documented baseline choice).
CATEGORY_WEIGHTS = {"Refunds and Returns": 2}


def load_categories() -> dict:
    path = get_settings().category_config_path
    if path and os.path.exists(path):
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    return DEFAULT_CATEGORIES


def categorize(text: str, categories: dict = None):
    """Returns (category, matched_keywords). Highest keyword-hit count wins; ties go to the earlier category."""
    categories = categories or load_categories()
    best, best_hits, best_score = "Other", [], 0
    for name, terms in categories.items():
        hits = find_terms(text, terms)
        score = len(hits) * CATEGORY_WEIGHTS.get(name, 1)
        if score > best_score:
            best, best_hits, best_score = name, hits, score
    return best, best_hits
