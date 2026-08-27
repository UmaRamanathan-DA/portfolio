# LoanTap Underwriting Console

A staff-facing risk tool that actually runs on the trained credit-risk model's
output — not a disconnected UI mock. Every applicant in this tool was scored
by the real logistic-regression model from
[LoanTap-Credit-Risk-Prediction](https://github.com/UmaRamanathan-DA/LoanTap-Credit-Risk-Prediction)
(the same model behind the Streamlit dashboard), and each row carries a risk
score, a tiered recommendation (APPROVE / APPROVE_WITH_CONDITIONS /
REVIEW_MANUAL / REJECT), the top factors behind that score, and — because
these are closed historical loans — the outcome that actually happened.

## Run locally

```bash
cd apps/credit-risk-staff-tool
chmod +x run.sh
./run.sh
```

Open **http://127.0.0.1:5002**

- **Console:** `/` — portfolio-level tier breakdown + searchable/filterable applicant table
- **Detail:** `/applicant/<app_id>` — risk score, recommendation, top risk factors, full profile, historical outcome
- **API:** `/api/summary`, `/api/applicants`, `/api/applicants/<app_id>`, `/api/health`

## Data pipeline

The app never scores anything live — it reads a static derived dataset,
`data/derived_loan_risk_dataset.csv`, built once by
`scripts/build_derived_dataset.py`.

That script:
1. Loads the real ~396k-row LoanTap training CSV.
2. Loads the real trained model + preprocessor (`.joblib` files from the model repo).
3. Scores every row (vectorized batch prediction, not row-by-row).
4. Derives risk score, recommendation tier, confidence, and top risk factors
   using the exact same logic as the model's API service.
5. Keeps the historical ground-truth outcome alongside each prediction.
6. Stratified-samples down to ~5,000 rows (min 250 per tier) so the dataset
   stays fast to browse and light to keep in git.

To regenerate it (e.g. after retraining the model), edit `MODEL_REPO` at the
top of the script if your local path differs, then:

```bash
source .venv/bin/activate
python scripts/build_derived_dataset.py
```

### Validation result (full 396k population, at build time)

Actual charge-off rate by recommendation tier — confirms the tiering tracks
real repayment outcomes, not just the training objective:

| Tier | Share of applicants | Actual charge-off rate |
|---|---|---|
| APPROVE | 21.7% | 6.4% |
| APPROVE_WITH_CONDITIONS | 38.2% | 14.3% |
| REVIEW_MANUAL | 29.0% | 27.0% |
| REJECT | 11.1% | 44.4% |

## Stack

Flask + pandas, server-rendered pages with a small fetch-driven table for
search/filter/sort. No database — the derived CSV is loaded once into memory
per process.
