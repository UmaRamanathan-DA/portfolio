#!/usr/bin/env python3
"""
generate_replies.py — automates the bobabean AI review-reply pipeline.

This replaces the manual, run-each-cell-by-hand "Build with AI.ipynb" Colab
notebook with a single command:

    python generate_replies.py --input reviews_export.json --output manager_responses.json

What it does:
  1. Reads reviews_export.json, exported from bobabean-app.html's
     "Staff Tools -> Download reviews + replies (JSON)" button.
  2. Cleans each review's text and sends it to Claude with the Task 5 prompt
     (aspect-level sentiment + a drafted manager reply) from prompts.py.
  3. Writes manager_responses.json in the exact shape the Staff Tools
     "Import replies (JSON)" button expects: review_id + manager_response
     (plus the Overall/Food Quality/Service/Ambience aspect labels).

Requires an Anthropic API key in the ANTHROPIC_API_KEY environment variable
(or pass --api-key). Get one at https://console.anthropic.com.
"""

import argparse
import json
import os
import sys
import time

import anthropic

from prompts import clean_text, parse_json_response, task5_prompt

DEFAULT_MODEL = "claude-haiku-4-5-20251001"
MAX_RETRIES = 3
RETRY_BACKOFF_SECONDS = 2


def ask_claude(client: anthropic.Anthropic, model: str, prompt: str) -> str:
    """Send one prompt to Claude, retrying on transient failures."""
    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            message = client.messages.create(
                model=model,
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}],
            )
            return message.content[0].text.strip()
        except Exception as exc:  # noqa: BLE001 - surface any API/network failure to the caller
            last_error = exc
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_BACKOFF_SECONDS * attempt)
    raise RuntimeError(f"Claude call failed after {MAX_RETRIES} attempts: {last_error}")


def load_reviews(path: str) -> list:
    with open(path, "r", encoding="utf-8") as f:
        records = json.load(f)
    if not isinstance(records, list):
        raise ValueError("Expected reviews_export.json to contain a JSON array.")
    return records


def review_text_of(record: dict) -> str:
    """Support both the bobabean export schema (review_text) and the
    notebook's original demo-review shape (review)."""
    return record.get("review_text") or record.get("review") or ""


def aspect_sentiment(parsed: dict, key: str) -> str:
    val = parsed.get(key, {})
    if isinstance(val, dict):
        return val.get("sentiment", "")
    return val if isinstance(val, str) else ""


def process_review(client: anthropic.Anthropic, model: str, record: dict) -> dict:
    review_id = record.get("review_id")
    cleaned = clean_text(review_text_of(record))

    result = {
        "review_id": review_id,
        "Overall": "",
        "Food Quality": "",
        "Service": "",
        "Ambience": "",
        "manager_response": "",
    }

    if not cleaned:
        return result

    try:
        raw_response = ask_claude(client, model, task5_prompt(cleaned))
        parsed = parse_json_response(raw_response)
    except Exception as exc:  # noqa: BLE001 - keep the batch going even if one review fails
        print(f"  ⚠️  review_id {review_id}: {exc}", file=sys.stderr)
        return result

    result["Overall"] = parsed.get("Overall", "")
    result["Food Quality"] = aspect_sentiment(parsed, "Food Quality")
    result["Service"] = aspect_sentiment(parsed, "Service")
    result["Ambience"] = aspect_sentiment(parsed, "Ambience")
    result["manager_response"] = parsed.get("manager_response", "")
    return result


def main():
    parser = argparse.ArgumentParser(description="Bulk-generate AI review replies for bobabean.")
    parser.add_argument("--input", default="reviews_export.json", help="Path to reviews_export.json")
    parser.add_argument("--output", default="manager_responses.json", help="Where to write the results")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Claude model id")
    parser.add_argument("--api-key", default=None, help="Anthropic API key (defaults to the ANTHROPIC_API_KEY env var)")
    parser.add_argument("--limit", type=int, default=None, help="Only process the first N reviews (useful while testing)")
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="Skip reviews that already carry a manager_response in the input file",
    )
    args = parser.parse_args()

    api_key = args.api_key or os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        sys.exit("Set ANTHROPIC_API_KEY (or pass --api-key) before running this script.")

    client = anthropic.Anthropic(api_key=api_key)

    records = load_reviews(args.input)
    if args.skip_existing:
        records = [r for r in records if not r.get("manager_response")]
    if args.limit:
        records = records[: args.limit]

    if not records:
        print("Nothing to process.")
        return

    print(f"Processing {len(records)} review(s) with {args.model}...")

    results = []
    failures = 0
    for i, record in enumerate(records, start=1):
        print(f"  [{i}/{len(records)}] review_id {record.get('review_id')}...")
        outcome = process_review(client, args.model, record)
        if not outcome["manager_response"]:
            failures += 1
        results.append(outcome)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    ok = len(results) - failures
    print(f"✅ Wrote {len(results)} result(s) to {args.output} ({ok} drafted, {failures} failed/empty).")


if __name__ == "__main__":
    main()
