import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from agent.metrics_parser import parse_metrics_file
from agent.orchestrator import run_agent


def test_parse_sample():
    path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "sample_dora_metrics.csv")
    with open(path, encoding="utf-8") as f:
        df = parse_metrics_file(f.read())
    assert len(df) == 8


def test_different_intents():
    path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "sample_dora_metrics.csv")
    with open(path, encoding="utf-8") as f:
        df = parse_metrics_file(f.read())
    r1 = run_agent("What should we fix first?", df, {})
    r2 = run_agent("What is our lead time?", df, {})
    r3 = run_agent("Compare to Elite benchmarks", df, {})
    assert r1["intent"] == "bottleneck_diagnosis"
    assert r2["intent"] == "metric_status"
    assert r3["intent"] == "benchmark_compare"
    assert r1["answer"] != r2["answer"]


def test_flask_health():
    from app import create_app
    app = create_app("testing")
    client = app.test_client()
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.get_json()["status"] == "ok"
