#!/usr/bin/env python3
"""
Build the derived risk dataset for the underwriting staff tool.

This is an offline data-prep step, run once (and re-run whenever the source
model/dataset changes). It is NOT part of the running Flask app: the app only
ever reads the static CSV this script produces.

What it does:
  1. Loads the real ~396k-row LoanTap training CSV.
  2. Loads the real trained logistic-regression model + preprocessor
     (the same artifacts behind the Streamlit dashboard).
  3. Scores every row with that model (vectorized, not row-by-row).
  4. Derives the same risk score / recommendation tier / confidence logic
     used in the model service (app/model_service.py in the model repo).
  5. Attaches the top contributing risk factors per row, from the logistic
     regression coefficients.
  6. Keeps the historical ground truth (actual loan outcome) alongside the
     model's would-have-been decision, so the staff tool and the case-study
     page can show whether the tiering actually tracks real repayment.
  7. Stratified-samples down to a portfolio-sized CSV (fast to browse, light
     to keep in git) and writes it to ../data/derived_loan_risk_dataset.csv

Source of truth (read-only, not part of this repo):
  /Users/knottrail/Documents/GitHub/LoanTap-Credit-Risk-Prediction
"""

import os
import re
import sys
import joblib
import numpy as np
import pandas as pd

MODEL_REPO = "/Users/knottrail/Documents/GitHub/LoanTap-Credit-Risk-Prediction"
sys.path.insert(0, MODEL_REPO)  # needed to unpickle the custom LoanDataPreprocessor class
CSV_PATH = os.path.join(MODEL_REPO, "input dataset", "logistic_regression.csv")
MODEL_PATH = os.path.join(MODEL_REPO, "models", "loan_risk_model.joblib")
PREPROCESSOR_PATH = os.path.join(MODEL_REPO, "models", "preprocessor.joblib")

OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "derived_loan_risk_dataset.csv")

TARGET_N = 5000
MIN_PER_TIER = 250
RANDOM_STATE = 42

# Human-readable labels for the engineered/encoded features that drive the
# logistic regression, keyed by the column name the preprocessor produces.
FEATURE_LABELS = {
    "loan_amnt": "loan amount",
    "int_rate": "interest rate",
    "installment": "monthly installment",
    "grade": "loan grade",
    "sub_grade": "loan sub-grade",
    "emp_length": "employment length",
    "home_ownership": "home ownership",
    "annual_inc": "annual income",
    "verification_status": "income verification",
    "purpose": "loan purpose",
    "dti": "debt-to-income ratio",
    "open_acc": "open credit lines",
    "pub_rec": "derogatory public records",
    "revol_bal": "revolving balance",
    "revol_util": "revolving utilization",
    "total_acc": "total credit lines",
    "initial_list_status": "initial list status",
    "application_type": "application type",
    "mort_acc": "mortgage accounts",
    "pub_rec_bankruptcies": "public bankruptcies",
    "high_dti_flag": "high DTI flag",
    "high_revol_util_flag": "high revolving utilization flag",
    "pub_rec_flag": "has public record",
    "mort_acc_flag": "has mortgage account",
    "pub_rec_bankruptcies_flag": "has bankruptcy record",
    "open_acc_flag": "many open credit lines",
    "total_acc_flag": "many total credit lines",
    "issue_year": "loan issue year",
    "issue_month": "loan issue month",
    "credit_history_years": "credit history length",
    "term_60_months": "60-month term",
    "high_risk_grade": "high-risk grade (E/F/G)",
    "high_risk_purpose": "high-risk purpose",
    "loan_amount_category": "loan amount tier",
    "income_category": "income tier",
}


def get_recommendation(risk_score: np.ndarray) -> np.ndarray:
    return np.select(
        [risk_score < 30, risk_score < 50, risk_score < 70],
        ["APPROVE", "APPROVE_WITH_CONDITIONS", "REVIEW_MANUAL"],
        default="REJECT",
    )


def get_confidence(probability: np.ndarray) -> np.ndarray:
    return np.select(
        [(probability < 0.3) | (probability > 0.7), (probability < 0.4) | (probability > 0.6)],
        ["High", "Medium"],
        default="Low",
    )


def get_risk_category(probability: np.ndarray) -> np.ndarray:
    return np.select(
        [probability < 0.2, probability < 0.5],
        ["Low", "Medium"],
        default="High",
    )


def parse_state(address: str) -> str:
    if not isinstance(address, str):
        return ""
    match = re.search(r"\b([A-Z]{2})\s+\d{5}\s*$", address.strip())
    return match.group(1) if match else ""


def top_risk_factors(contributions: pd.DataFrame, top_k: int = 3) -> pd.Series:
    """For each row, return the top_k features by |contribution|, human-readable."""
    cols = contributions.columns.to_numpy()
    values = contributions.to_numpy()
    order = np.argsort(-np.abs(values), axis=1)[:, :top_k]

    out = []
    for row_idx in range(values.shape[0]):
        parts = []
        for col_idx in order[row_idx]:
            col = cols[col_idx]
            val = values[row_idx, col_idx]
            label = FEATURE_LABELS.get(col, col)
            direction = "raises risk" if val > 0 else "lowers risk"
            parts.append(f"{label} ({direction})")
        out.append("; ".join(parts))
    return pd.Series(out, index=contributions.index)


def stratified_sample(df: pd.DataFrame, tier_col: str, target_n: int, min_per_tier: int, seed: int) -> pd.DataFrame:
    counts = df[tier_col].value_counts()
    shares = counts / counts.sum()
    frames = []
    for tier, count in counts.items():
        take_n = min(count, max(min_per_tier, round(shares[tier] * target_n)))
        frames.append(df[df[tier_col] == tier].sample(n=take_n, random_state=seed))
    sampled = pd.concat(frames)
    return sampled.sample(frac=1, random_state=seed).reset_index(drop=True)


def main():
    print(f"Loading dataset from {CSV_PATH} ...")
    raw = pd.read_csv(CSV_PATH)
    print(f"Loaded {len(raw):,} rows, {len(raw.columns)} columns")

    raw["actual_outcome"] = raw["loan_status"]
    raw["state"] = raw["address"].apply(parse_state)

    print("Loading trained model + preprocessor ...")
    model = joblib.load(MODEL_PATH)
    preprocessor = joblib.load(PREPROCESSOR_PATH)

    X = raw.drop(columns=["loan_status", "actual_outcome"], errors="ignore")
    print("Transforming full dataset through the trained preprocessor ...")
    X_processed = preprocessor.transform(X)

    print("Scoring with the trained logistic regression model (vectorized) ...")
    default_probability = model.predict_proba(X_processed)[:, 1]
    risk_score = default_probability * 100

    contributions = X_processed * model.coef_[0]

    print("Computing top risk factors per applicant ...")
    factors = top_risk_factors(contributions)

    derived = pd.DataFrame({
        "app_id": [f"APP-{i:06d}" for i in range(len(raw))],
        "default_probability": default_probability,
        "repayment_probability": 1 - default_probability,
        "risk_score": risk_score,
        "recommendation": get_recommendation(risk_score),
        "confidence": get_confidence(default_probability),
        "risk_category": get_risk_category(default_probability),
        "top_risk_factors": factors.values,
        "actual_outcome": raw["actual_outcome"].values,
    })

    original_cols = [
        "loan_amnt", "term", "int_rate", "installment", "grade", "sub_grade",
        "emp_length", "home_ownership", "annual_inc", "verification_status",
        "purpose", "title", "dti", "open_acc", "pub_rec", "revol_bal",
        "revol_util", "total_acc", "initial_list_status", "application_type",
        "mort_acc", "pub_rec_bankruptcies", "issue_d", "state",
    ]
    full = pd.concat([derived, raw[original_cols].reset_index(drop=True)], axis=1)

    print(f"Recommendation distribution (full {len(full):,}-row population):")
    print(full["recommendation"].value_counts(normalize=True).round(3).to_string())

    print("\nActual charge-off rate by recommendation tier (validates the tiering):")
    tier_order = ["APPROVE", "APPROVE_WITH_CONDITIONS", "REVIEW_MANUAL", "REJECT"]
    charge_off_rate = (
        full.assign(charged_off=(full["actual_outcome"] == "Charged Off").astype(int))
        .groupby("recommendation")["charged_off"]
        .mean()
        .reindex(tier_order)
    )
    print((charge_off_rate * 100).round(1).to_string())

    print(f"\nStratified-sampling down to ~{TARGET_N:,} rows (min {MIN_PER_TIER} per tier) ...")
    sampled = stratified_sample(full, "recommendation", TARGET_N, MIN_PER_TIER, RANDOM_STATE)
    print(f"Final derived dataset: {len(sampled):,} rows")

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    sampled.to_csv(OUT_PATH, index=False)
    print(f"Wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
