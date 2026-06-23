import pandas as pd


def parse_metrics_file(file_content: str) -> pd.DataFrame:
    rows = []
    for line in file_content.splitlines():
        parts = [p.strip() for p in line.strip().split(",")]
        if len(parts) < 5:
            continue
        if parts[0].lower() == "date" or parts[1].lower().startswith("deployment"):
            continue
        try:
            rows.append({
                "Date": parts[0],
                "Deployment Frequency": float(parts[1]),
                "Lead Time": float(parts[2]),
                "Change Failure Rate": float(parts[3]),
                "MTTR": float(parts[4]),
            })
        except ValueError:
            continue
    return pd.DataFrame(rows)
