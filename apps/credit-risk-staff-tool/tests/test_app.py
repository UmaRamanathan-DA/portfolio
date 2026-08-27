import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app import create_app


def make_client():
    app = create_app("testing")
    return app.test_client()


def test_health():
    client = make_client()
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.get_json()["status"] == "ok"


def test_index():
    client = make_client()
    res = client.get("/")
    assert res.status_code == 200
    assert b"Underwriting Console" in res.data


def test_summary_has_four_tiers():
    client = make_client()
    res = client.get("/api/summary")
    data = res.get_json()
    assert data["total_applicants"] > 0
    assert len(data["tiers"]) == 4


def test_applicants_search():
    client = make_client()
    res = client.get("/api/applicants?page_size=5")
    data = res.get_json()
    assert data["total"] > 0
    assert len(data["results"]) == 5


def test_applicant_detail_roundtrip():
    client = make_client()
    listing = client.get("/api/applicants?page_size=1").get_json()
    app_id = listing["results"][0]["app_id"]

    detail = client.get(f"/api/applicants/{app_id}")
    assert detail.status_code == 200
    assert detail.get_json()["app_id"] == app_id

    page = client.get(f"/applicant/{app_id}")
    assert page.status_code == 200


def test_applicant_not_found():
    client = make_client()
    res = client.get("/applicant/APP-999999")
    assert res.status_code == 404
