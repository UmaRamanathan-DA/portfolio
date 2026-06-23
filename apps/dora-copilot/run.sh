#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r requirements.txt

export FLASK_ENV=development
echo "DORA DevOps Copilot → http://127.0.0.1:5000"
python run.py
