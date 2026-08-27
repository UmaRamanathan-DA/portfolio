import math

from flask import Blueprint, jsonify, render_template, request

from . import data_service

bp = Blueprint("main", __name__)


@bp.route("/")
def index():
    return render_template(
        "index.html",
        summary=data_service.get_summary(),
        grades=data_service.distinct_grades(),
    )


@bp.route("/applicant/<app_id>")
def applicant_detail(app_id):
    applicant = data_service.get_applicant(app_id)
    if applicant is None:
        return render_template("not_found.html", app_id=app_id), 404
    return render_template("detail.html", a=applicant)


@bp.route("/api/health")
def health():
    return jsonify({"status": "ok", "app": "credit-risk-staff-tool", "version": "1.0.0"})


@bp.route("/api/summary")
def api_summary():
    return jsonify(data_service.get_summary())


@bp.route("/api/applicants")
def api_applicants():
    q = request.args.get("q", "").strip()
    tier = request.args.get("tier", "").strip()
    grade = request.args.get("grade", "").strip()
    sort = request.args.get("sort", "risk_score_desc")
    page = max(1, request.args.get("page", 1, type=int))
    page_size = min(100, max(1, request.args.get("page_size", 25, type=int)))

    result = data_service.search_applicants(
        q=q, tier=tier, grade=grade, page=page, page_size=page_size, sort=sort
    )
    result["total_pages"] = max(1, math.ceil(result["total"] / page_size))
    return jsonify(result)


@bp.route("/api/applicants/<app_id>")
def api_applicant_detail(app_id):
    applicant = data_service.get_applicant(app_id)
    if applicant is None:
        return jsonify({"error": "Applicant not found"}), 404
    return jsonify(applicant)
