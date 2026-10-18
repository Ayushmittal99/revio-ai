from tests.conftest import upload

GOOD = b"review_id,date,rating,review_text\nA1,2026-01-05,5,Great product and fast delivery\nA2,2026-01-09,1,Terrible. It broke and I want a refund.\nA3,2026-02-01,3,It is okay\n"


def test_health(client):
    body = client.get("/health").json()
    assert body["status"] == "ok" and body["sentiment"]["mode"] == "heuristic" and body["llm"]["configured"] is False


def test_valid_csv(client):
    r = upload(client, GOOD)
    assert r.status_code == 200
    stats = r.json()["stats"]
    assert (stats["imported"], stats["processed"], stats["skipped"], stats["duplicate"]) == (3, 3, 0, 0)
    items = client.get("/api/reviews").json()
    assert items["total"] == 3 and items["items"][0]["review_id"] == "A2"  # highest priority first


def test_empty_file(client):
    assert upload(client, b"").json()["error"]["code"] == "empty_file"


def test_header_only(client):
    assert upload(client, b"review_text\n").json()["error"]["code"] == "empty_dataset"


def test_missing_review_text(client):
    r = upload(client, b"text,rating\nhello,5\n")
    assert r.status_code == 400 and r.json()["error"]["code"] == "missing_column"


def test_binary_rejected(client):
    assert upload(client, b"\x00\x01\x02binary").json()["error"]["code"] == "invalid_csv"


def test_duplicates_blank_missing_rating_invalid_date(client):
    csv = (b"review_text,date,rating\nGood stuff,2026-01-01,5\nGood stuff,2026-01-01,5\n,2026-01-02,4\n"
           b"Bad service,not-a-date,\n")
    s = upload(client, csv).json()["stats"]
    assert s["imported"] == 4 and s["duplicate"] == 1 and s["skipped"] == 1 and s["processed"] == 2
    assert s["warnings"]["invalid_date"] == 1 and s["warnings"]["missing_rating"] == 1


def test_all_blank_gives_error_not_empty_success(client):
    assert upload(client, b"review_text\n\n \n").status_code == 400


def test_latin1_encoding(client):
    r = upload(client, "review_text\nCaf\xe9 was great\n".encode("latin-1"))
    assert r.status_code == 200


def test_sample_endpoint_and_counts(client):
    body = client.post("/api/reviews/analyze-sample").json()
    assert body["is_demo"] is True
    assert body["stats"]["imported"] == 30 and body["stats"]["duplicate"] == 1 and body["stats"]["skipped"] == 1
    assert body["stats"]["processed"] == 28
    assert body["summary"]["kpis"]["total"] == 28


def test_filters_sort_pagination(client):
    client.post("/api/reviews/analyze-sample")
    neg = client.get("/api/reviews", params={"sentiment": "negative", "page_size": 5}).json()
    assert neg["total"] > 0 and all(i["sentiment"] == "Negative" for i in neg["items"]) and len(neg["items"]) <= 5
    assert client.get("/api/reviews", params={"q": "refund"}).json()["total"] >= 1
    assert client.get("/api/reviews", params={"priority": "High"}).json()["total"] >= 1
    assert client.get("/api/reviews", params={"sort": "bad"}).status_code == 422


def test_no_dataset_states(client):
    assert client.get("/api/reviews").json()["has_data"] is False
    assert client.get("/api/insights").json()["has_data"] is False
    assert client.get("/api/summary").json()["has_data"] is False
    assert client.get("/api/reviews/export").status_code == 404
    assert client.get("/api/reviews/nope").status_code == 404


def test_insights_grounded(client):
    client.post("/api/reviews/analyze-sample")
    ins = client.get("/api/insights").json()
    assert ins["has_data"] and ins["total_reviews"] == 28
    ids = {r["review_id"] for r in client.get("/api/reviews", params={"page_size": 100}).json()["items"]}
    for rec in ins["recommendations"]:
        assert set(rec["review_ids"]) <= ids


def test_reply_flow(client):
    client.post("/api/reviews/analyze-sample")
    r = client.post("/api/reviews/R007/reply", json={"tone": "Empathetic"}).json()
    assert r["requires_human_review"] and r["source"] == "template" and r["fallback_reason"]
    assert "safety" in r["draft"].lower()
    for word in ("refund will", "we will refund", "discount", "within 24"):
        assert word not in r["draft"].lower()
    assert client.post("/api/reviews/R007/reply", json={"tone": "Empathetic", "variant": 1}).json()["draft"] != r["draft"]
    assert client.post("/api/reviews/R007/reply", json={"tone": "Rude"}).status_code == 422
    assert client.post("/api/reviews/ZZZ/reply", json={}).status_code == 404


def test_export_and_formula_injection(client):
    upload(client, b'review_text,rating\n"=HYPERLINK(""http://x"")",1\n"+cmd|calc",2\nNormal review,5\n')
    text = client.get("/api/reviews/export").text
    assert "'=HYPERLINK" in text and "'+cmd" in text
    assert "priority_explanation" in text.splitlines()[0]
    assert client.get("/api/reviews/export").headers["content-type"].startswith("text/csv")


def test_clear(client):
    client.post("/api/reviews/analyze-sample")
    client.delete("/api/reviews")
    assert client.get("/api/summary").json()["has_data"] is False
