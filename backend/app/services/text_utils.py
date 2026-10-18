import re


def find_terms(text: str, terms) -> list:
    """Prefix match on word boundaries. A trailing '!' on a term means exact word."""
    low = text.lower().replace("\u2019", "'")
    hits = []
    for term in terms:
        exact = term.endswith("!")
        core = re.escape(term.rstrip("!"))
        pattern = rf"\b{core}\b" if exact else rf"\b{core}"
        if re.search(pattern, low):
            hits.append(term.rstrip("!"))
    return hits
