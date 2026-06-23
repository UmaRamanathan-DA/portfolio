import os
import uuid

from flask import Blueprint, current_app, jsonify, render_template, request, session

from agent.metrics_parser import parse_metrics_file
from agent.orchestrator import run_agent

bp = Blueprint("main", __name__)


def _sample_path():
    return os.path.join(os.path.dirname(os.path.dirname(__file__)), "sample_dora_metrics.csv")


def _ensure_session():
    if "session_id" not in session:
        session["session_id"] = str(uuid.uuid4())
    if "agent_context" not in session:
        session["agent_context"] = {}
    session.modified = True


def _load_df():
    if "file_content" not in session:
        return None
    df = parse_metrics_file(session["file_content"])
    return df if not df.empty else None


@bp.route("/")
def index():
    _ensure_session()
    return render_template(
        "index.html",
        file_loaded="file_content" in session,
        file_name=session.get("file_name", ""),
        row_count=session.get("row_count", 0),
    )


@bp.route("/api/health")
def health():
    return jsonify({"status": "ok", "app": "dora-devops-copilot", "version": "1.0.0"})


@bp.route("/api/upload", methods=["POST"])
def upload():
    _ensure_session()
    uploaded = request.files.get("file")
    if not uploaded or uploaded.filename == "":
        return jsonify({"error": "No file provided"}), 400
    try:
        content = uploaded.read().decode("utf-8")
        df = parse_metrics_file(content)
        if df.empty:
            return jsonify({"error": "Could not parse CSV. Expected: Date, Deployment Frequency, Lead Time, Change Failure Rate, MTTR"}), 400
        session["file_content"] = content
        session["file_name"] = uploaded.filename
        session["row_count"] = len(df)
        session["agent_context"] = {}
        session.modified = True
        return jsonify({
            "message": f"Loaded {len(df)} rows from {uploaded.filename}.",
            "file_name": uploaded.filename,
            "row_count": len(df),
        })
    except UnicodeDecodeError:
        return jsonify({"error": "File must be UTF-8 CSV."}), 400


@bp.route("/api/sample", methods=["POST"])
def sample():
    _ensure_session()
    path = _sample_path()
    if not os.path.isfile(path):
        return jsonify({"error": "Sample file missing."}), 404
    with open(path, encoding="utf-8") as f:
        content = f.read()
    df = parse_metrics_file(content)
    session.update({
        "file_content": content,
        "file_name": "sample_dora_metrics.csv",
        "row_count": len(df),
        "agent_context": {},
    })
    session.modified = True
    return jsonify({
        "message": f"Loaded sample data ({len(df)} rows).",
        "file_name": "sample_dora_metrics.csv",
        "row_count": len(df),
    })


@bp.route("/api/agent", methods=["POST"])
def agent():
    _ensure_session()
    payload = request.get_json(silent=True) or {}
    message = (payload.get("message") or "").strip()
    if not message:
        return jsonify({"error": "Message is required"}), 400
    df = _load_df()
    if df is None:
        return jsonify({"error": "Upload a CSV or load sample data first."}), 400
    try:
        result = run_agent(message, df, session.get("agent_context", {}))
        session["agent_context"] = {
            "last_intent": result["intent"],
            "last_message": message,
            "last_metric": result.get("last_metric"),
        }
        session.modified = True
        return jsonify(result)
    except Exception as exc:
        current_app.logger.exception("Agent error")
        return jsonify({"error": str(exc)}), 500


@bp.route("/api/reset", methods=["POST"])
def reset():
    session.clear()
    session.modified = True
    return jsonify({"message": "Session cleared."})
