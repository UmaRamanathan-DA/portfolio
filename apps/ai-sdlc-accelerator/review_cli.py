#!/usr/bin/env python3
"""review_cli.py — the AI-SDLC Accelerator's CLI entry point.

Runs a code-review (or test-generation) prompt against 2+ Claude model
tiers, through the guardrails layer first, and logs cost/latency/audit
data for every call — the eval-harness, prompt-library, and audit-trail
pillars from the elevator pitch, made runnable instead of just described.

    python review_cli.py --file sample/service.py --task review
    python review_cli.py --file sample/service.py --task test-gen
    python review_cli.py --file sample/service.py --models claude-haiku-4-5

Reads ANTHROPIC_API_KEY from the environment if it's set (e.g. via .env for
repeat runs during development). If it's not set, prompts for the key with
getpass — hidden input, held only in memory for this process, never written
to any file, .env, log, or audit entry. Use --prompt-key to force the
prompt even when an env var is present, for a key you never want to touch
disk at all.
"""

import argparse
import datetime
import getpass
import json
import os
import sys
import time
from pathlib import Path

import anthropic
import yaml

from guardrails import redact

# $ per 1M tokens — Anthropic first-party API rates, checked 2026-09-01.
# https://docs.claude.com/en/docs/about-claude/pricing
PRICING = {
    "claude-haiku-4-5": {"input": 1.00, "output": 5.00},
    "claude-sonnet-5": {"input": 2.00, "output": 10.00},
}

PROMPTS_DIR = Path(__file__).parent / "prompts"
AUDIT_LOG_PATH = Path(__file__).parent / "audit_log.jsonl"

TASK_PROMPT_FILES = {
    "review": "code_review.yaml",
    "test-gen": "test_gen.yaml",
}


def load_prompt(task: str) -> dict:
    path = PROMPTS_DIR / TASK_PROMPT_FILES[task]
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def call_model(client: anthropic.Anthropic, model: str, prompt_text: str) -> dict:
    start = time.perf_counter()
    response = client.messages.create(
        model=model,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt_text}],
    )
    latency_ms = (time.perf_counter() - start) * 1000

    text = next((b.text for b in response.content if b.type == "text"), "")

    pricing = PRICING.get(model)
    cost_usd = None
    if pricing:
        cost_usd = round(
            response.usage.input_tokens / 1_000_000 * pricing["input"]
            + response.usage.output_tokens / 1_000_000 * pricing["output"],
            6,
        )

    return {
        "model": model,
        "text": text,
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
        "cost_usd": cost_usd,
        "latency_ms": round(latency_ms, 1),
    }


def append_audit_log(entry: dict) -> None:
    with open(AUDIT_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")


def main():
    parser = argparse.ArgumentParser(
        description="AI-SDLC Accelerator: governed AI code review & test generation, benchmarked across models."
    )
    parser.add_argument("--file", required=True, help="Path to the code file to review")
    parser.add_argument("--task", choices=["review", "test-gen"], default="review")
    parser.add_argument(
        "--models",
        default="claude-haiku-4-5,claude-sonnet-5",
        help="Comma-separated model IDs to benchmark side by side",
    )
    parser.add_argument(
        "--prompt-key",
        action="store_true",
        help="Always prompt for the API key (hidden input), even if ANTHROPIC_API_KEY is set — for a key you never want to touch disk.",
    )
    args = parser.parse_args()

    api_key = None if args.prompt_key else os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        api_key = getpass.getpass("Anthropic API key (hidden, held in memory only): ").strip()
    if not api_key:
        sys.exit("No API key provided.")

    file_path = Path(args.file)
    if not file_path.exists():
        sys.exit(f"File not found: {file_path}")
    code = file_path.read_text(encoding="utf-8")

    redacted_code, findings = redact(code)
    print("Guardrails")
    print("-" * 60)
    if findings:
        for finding in findings:
            print(f"  caught: {finding['type']} x{finding['count']}")
    else:
        print("  no secrets or PII detected")
    print()

    prompt_spec = load_prompt(args.task)
    prompt_text = prompt_spec["template"].format(code=redacted_code)

    client = anthropic.Anthropic(api_key=api_key)
    models = [m.strip() for m in args.models.split(",") if m.strip()]

    results = []
    for model in models:
        print(f"Running {model}...")
        result = call_model(client, model, prompt_text)
        results.append(result)

        append_audit_log(
            {
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "file": str(file_path),
                "task": args.task,
                "prompt_id": prompt_spec["id"],
                "prompt_version": prompt_spec["version"],
                "model": model,
                "redactions": findings,
                "input_tokens": result["input_tokens"],
                "output_tokens": result["output_tokens"],
                "cost_usd": result["cost_usd"],
                "latency_ms": result["latency_ms"],
            }
        )

    print("\nModel comparison")
    print("-" * 60)
    print(f"{'model':<22}{'latency (ms)':<16}{'cost ($)':<12}{'tokens in/out'}")
    for r in results:
        cost_display = f"{r['cost_usd']:.6f}" if r["cost_usd"] is not None else "n/a"
        print(f"{r['model']:<22}{r['latency_ms']:<16}{cost_display:<12}{r['input_tokens']}/{r['output_tokens']}")

    for r in results:
        print(f"\n{'=' * 60}\n{r['model']} output\n{'=' * 60}\n{r['text']}")

    print(f"\nAudit log: {AUDIT_LOG_PATH} (+{len(results)} entries)")


if __name__ == "__main__":
    main()
