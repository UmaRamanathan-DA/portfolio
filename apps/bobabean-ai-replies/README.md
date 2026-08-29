# bobabean AI Review Replies

Automates the AI review-reply pipeline behind the [bobabean case study](../../project_pages/bobabean.html)'s Staff Tools panel. This is the "real" backend the demo's rule-based reply drafts stand in for — a script version of what was originally a manual, cell-by-cell Colab notebook (`Build with AI.ipynb`).

## What it does

```
bobabean-app.html (Staff Tools)          generate_replies.py                bobabean-app.html (Staff Tools)
  "Download reviews + replies"  --->  reviews_export.json  --->  Claude  --->  manager_responses.json  --->  "Import replies"
```

1. Reads `reviews_export.json` (exported from the live demo's Staff Tools panel).
2. Sends each review's text to Claude with a prompt that returns aspect-level sentiment (Food Quality / Service / Ambience) *and* a drafted manager reply in one call.
3. Writes `manager_responses.json` in the exact shape the demo's "Import replies (JSON)" button expects — drop it back in and the feed updates with real, model-written replies instead of the page's local heuristic drafts.

## Setup

```bash
cd apps/bobabean-ai-replies
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then edit .env with your key, or export it directly
export ANTHROPIC_API_KEY=sk-ant-...
```

## Usage

```bash
python generate_replies.py --input reviews_export.json --output manager_responses.json
```

Useful flags:

| Flag | Purpose |
|---|---|
| `--limit N` | Only process the first N reviews — cheap way to sanity-check before running the full batch |
| `--skip-existing` | Skip reviews that already carry a `manager_response` in the input file |
| `--model` | Override the default model (`claude-haiku-4-5-20251001`) |
| `--api-key` | Pass a key directly instead of using `ANTHROPIC_API_KEY` |

## Files

- `generate_replies.py` — the CLI entry point: loads reviews, calls Claude, writes results, retries transient failures, and keeps going if one review fails rather than aborting the batch.
- `prompts.py` — the prompt library. Tasks 1–4 are kept as a visible record of the prompt-engineering iteration (each one exists because the last failed in a specific way); only Task 5 is called in production. `clean_text()` normalizes raw review text before it reaches the model.

## Why this is a separate script, not wired into the page live

`bobabean-app.html` is a static page with no backend — there's nowhere to hold an API key that wouldn't be visible to anyone viewing the page source. This script is the honest boundary: the browser demo shows the *interaction design* (bulk-draft, export, import, review), and this script is where a real model actually runs, offline, with a key that never touches the client. Wiring a live "click and it just happens" version would mean standing up a small backend (or a serverless function) to hold the key and proxy the request — a natural next step, not done here on purpose.
