# AI-SDLC Accelerator — POC

The working proof behind the [AI-SDLC Accelerator elevator pitch](../../project_pages/ai-sdlc-accelerator-elevator-pitch.html). Three of the pitch's six pillars, built as a runnable CLI instead of described on a slide:

- **Reusable prompt-pattern library** — `prompts/code_review.yaml` and `prompts/test_gen.yaml`, versioned templates instead of hardcoded prompts.
- **Model evaluation harness** — every run calls 2+ Claude models on the same task and logs cost, latency, and token counts side by side.
- **Guardrails + audit trail** — `guardrails.py` redacts secrets/PII before anything reaches an LLM; every model call is appended to `audit_log.jsonl`.

Not built here (and not claimed as built in the pitch): the GitHub Action that wires this into a real PR, and the cloud deployment. Both are one layer of plumbing on top of what's already working below — `review_cli.py`'s `main()` is what a CI job or a Lambda handler would call.

## What it does

```
sample/service.template.py  --->  seed_demo.py (fill placeholders)  --->  sample/service.py (gitignored, local only)
                                                                                    |
                                                                                    v
                                                                     guardrails.py (redact)  --->  prompts/*.yaml  --->  2 Claude models  --->  audit_log.jsonl
                                                                                                                                                        |
                                                                                                                                                        v
                                                                                                                             cost / latency / tokens, printed side by side
```

## Setup

```bash
cd apps/ai-sdlc-accelerator
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

**Providing your API key** — three options, in order of how permanently the key touches disk:

1. **Not at all** — just run `review_cli.py` with no key set. It'll prompt with `getpass` (hidden input), held in memory for that process only, never written anywhere. Pass `--prompt-key` to force this even if `.env`/the env var is also set.
2. **Env var, this shell session only** — `export ANTHROPIC_API_KEY=sk-ant-...`. Gone when the terminal closes; never written to a file.
3. **`.env` file, for repeat local runs** — `cp .env.example .env` and edit it. Convenient for iterating, but it is a real file: it's gitignored so it can't reach GitHub, but treat it like any other credential — don't screenshot it, don't zip/export the folder without excluding it, don't paste it into a notebook cell.

A private GitHub repo does **not** make a committed key safe — see the note in the elevator pitch / below. The key itself should never be committed regardless of repo visibility; option 1 or 2 above are the only ones with zero footprint.

## Usage

```bash
# Guardrails alone — no API key needed, ~10 seconds
python guardrails.py

# Materialize sample/service.py from its template — prompts for each
# placeholder, press Enter to accept the shown fake default. Run this
# once before your first demo, and again anytime you want fresh values.
python sample/seed_demo.py

# Full run: redact -> review sample/service.py with 2 models -> log the audit trail
python review_cli.py --file sample/service.py --task review

# Generate tests instead of a review
python review_cli.py --file sample/service.py --task test-gen

# Benchmark a different model set (any valid Claude model IDs)
python review_cli.py --file sample/service.py --models claude-haiku-4-5
```

`sample/service.py` (once generated) deliberately contains one correctness bug (divide-by-zero on an empty list), one security bug (string-formatted SQL, i.e. injectable), an AWS-shaped fake credential, a Stripe-shaped fake credential, and a fake email address — so a real run demonstrates all four guardrail pattern types plus both bugs in one go.

**Why this file is generated instead of committed.** An earlier version had these values hardcoded directly in `sample/service.py`, which was tracked. GitHub's push-protection secret scanner can't tell a fake AWS/Stripe-shaped key from a real one, so every push got blocked — correctly, since the scanner has no way to know it's fake. The fix isn't to weaken the demo (the guardrail patterns themselves are untouched — `guardrails.py` still detects all four types); it's to keep the *values* out of any committed file entirely:

- `sample/service.template.py` (tracked) — the same file, but with `{{AWS_SECRET_ACCESS_KEY}}`-style placeholders instead of literal values. Safe to commit; nothing in it is secret-shaped.
- `sample/seed_demo.py` (tracked) — fills the placeholders interactively (type your own value, or press Enter for a built-in fake default) and writes the result to `sample/service.py`.
- `sample/service.py` (gitignored) — the actual runnable file, regenerated locally each time. Never committed, so nothing reaches GitHub regardless of what values it holds.

## Files

- `review_cli.py` — the CLI entry point: redacts, loads a prompt template, calls each model, prints a comparison table, appends to the audit log.
- `guardrails.py` — the redaction layer. Runnable standalone (`python guardrails.py`) against a small set of known planted secrets, so the "guardrail catch rate" metric in the pitch is a real, reproducible number instead of an assertion.
- `prompts/code_review.yaml`, `prompts/test_gen.yaml` — the versioned prompt-pattern library.
- `sample/service.template.py` — the tracked template (placeholders only).
- `sample/seed_demo.py` — fills the template interactively; writes `sample/service.py`.
- `sample/service.py` — generated by `seed_demo.py`, gitignored, the file the demo actually runs against.
- `audit_log.jsonl` — generated on first run, gitignored (it's local output, not source). `audit_log.example.jsonl` is a static, illustrative copy showing the schema without needing an API key.

## What this maps to in the pitch's metrics framework

From the elevator pitch's "How success gets measured" section, this POC is what makes these six **Measured** rows real rather than aspirational:

| Metric | Where it comes from here |
|---|---|
| Cost-per-request / cost-per-successful-outcome, per model | `review_cli.py`'s per-call cost calc, from real `response.usage` token counts |
| Latency p50 / p95, per model | `review_cli.py`'s per-call timing (single-run demo; a real p50/p95 needs repeated runs) |
| Acceptance rate per model | Self-graded — read both models' output after a run and judge which one you'd actually merge |
| Time-to-first-value | Time the Setup + Usage steps above on a clean checkout |
| Guardrail catch rate | `python guardrails.py` — live, reproducible, no API key needed |
| Audit coverage | Every model call appends to `audit_log.jsonl` by construction — 100% by design, verifiable by counting lines |

Everything else in that framework (coverage across real repos, cost-vs-baseline at scale, budget adherence, chargeback, zero-incident rate) is out of reach for a single-user CLI and stays labeled "production target" in the pitch — this POC doesn't try to fake that.
