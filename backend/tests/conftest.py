import os

os.environ["SENTIMENT_MODE"] = "heuristic"  # deterministic, offline
os.environ["LLM_ENABLED"] = "false"

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.store import store


@pytest.fixture()
def client():
    store.clear()
    return TestClient(app)


def upload(client, content: bytes, name="t.csv", url="/api/reviews/analyze"):
    return client.post(url, files={"file": (name, content, "text/csv")})
