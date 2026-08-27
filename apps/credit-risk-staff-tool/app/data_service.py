import os
import threading

import pandas as pd

DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "derived_loan_risk_dataset.csv")

TIER_ORDER = ["REJECT", "REVIEW_MANUAL", "APPROVE_WITH_CONDITIONS", "APPROVE"]

_lock = threading.Lock()
_df = None


def _load():
    global _df
    if _df is None:
        with _lock:
            if _df is None:
                df = pd.read_csv(DATA_PATH)
                df["risk_score"] = df["risk_score"].round(1)
                df["default_probability"] = (df["default_probability"] * 100).round(1)
                df["repayment_probability"] = (df["repayment_probability"] * 100).round(1)
                # Match the model's own preprocessing: median-fill revol_util,
                # zero-fill mortgage/bankruptcy counts and employment length.
                df["revol_util"] = df["revol_util"].fillna(df["revol_util"].median())
                df["mort_acc"] = df["mort_acc"].fillna(0)
                df["pub_rec_bankruptcies"] = df["pub_rec_bankruptcies"].fillna(0)
                df["emp_length"] = df["emp_length"].fillna("Unknown")
                df["title"] = df["title"].fillna("Unknown")
                _df = df
    return _df


def get_summary():
    df = _load()
    tier_counts = df["recommendation"].value_counts().reindex(TIER_ORDER).fillna(0).astype(int)
    charge_off_rate = (
        df.assign(charged_off=(df["actual_outcome"] == "Charged Off").astype(int))
        .groupby("recommendation")["charged_off"]
        .mean()
        .reindex(TIER_ORDER)
        .fillna(0)
        * 100
    )
    return {
        "total_applicants": int(len(df)),
        "avg_risk_score": round(float(df["risk_score"].mean()), 1),
        "tiers": [
            {
                "tier": tier,
                "count": int(tier_counts[tier]),
                "share": round(float(tier_counts[tier]) / len(df) * 100, 1),
                "actual_charge_off_rate": round(float(charge_off_rate[tier]), 1),
            }
            for tier in TIER_ORDER
        ],
    }


def search_applicants(q="", tier="", grade="", page=1, page_size=25, sort="risk_score_desc"):
    df = _load()
    result = df

    if tier:
        result = result[result["recommendation"] == tier]
    if grade:
        result = result[result["grade"] == grade]
    if q:
        q_lower = q.strip().lower()
        mask = (
            result["app_id"].str.lower().str.contains(q_lower)
            | result["purpose"].str.lower().str.contains(q_lower)
            | result["state"].fillna("").str.lower().str.contains(q_lower)
        )
        result = result[mask]

    sort_map = {
        "risk_score_desc": ("risk_score", False),
        "risk_score_asc": ("risk_score", True),
        "annual_inc_desc": ("annual_inc", False),
        "annual_inc_asc": ("annual_inc", True),
        "loan_amnt_desc": ("loan_amnt", False),
    }
    sort_col, ascending = sort_map.get(sort, sort_map["risk_score_desc"])
    result = result.sort_values(sort_col, ascending=ascending)

    total = len(result)
    start = (page - 1) * page_size
    page_df = result.iloc[start:start + page_size]

    columns = [
        "app_id", "risk_score", "recommendation", "confidence", "grade",
        "sub_grade", "purpose", "loan_amnt", "annual_inc", "dti", "state",
        "actual_outcome",
    ]
    return {
        "total": int(total),
        "page": page,
        "page_size": page_size,
        "results": page_df[columns].to_dict(orient="records"),
    }


def get_applicant(app_id):
    df = _load()
    match = df[df["app_id"] == app_id]
    if match.empty:
        return None
    return match.iloc[0].to_dict()


def distinct_grades():
    df = _load()
    return sorted(df["grade"].dropna().unique().tolist())
