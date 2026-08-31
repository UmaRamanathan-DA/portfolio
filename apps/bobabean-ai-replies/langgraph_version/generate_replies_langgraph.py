#!/usr/bin/env python3
"""
generate_replies_langgraph.py — the bobabean review-reply pipeline rebuilt as
a small multi-agent LangGraph, instead of one Claude call per review.

Same job as ../generate_replies.py (read reviews_export.json, write
manager_responses.json), but each review now flows through four small
"agents" — just Python functions, each making one Claude call and updating
a shared state dict:

    triage --> analyst --> drafter <--> critic --> ship
       |                                   |
       v                                   v
   escalate (unsafe to auto-reply)     escalate (still rejected after 2 tries)

  triage    checks for red flags (illness, foreign object, legal threat) and
            skips straight to a human if any are found.
  analyst   the same sentiment/aspect extraction as the original pipeline.
  drafter   writes the manager reply.
  critic    checks the draft against a rubric; approves it, or sends it back
            to drafter with feedback (max 2 revisions before escalating).

This file is the converted, batch-CLI version of Build_with_LangGraph.ipynb
in this same folder — build and test each agent there first, then read this
file to see the same graph wrapped in a loop over a whole JSON file.

Requires an Anthropic API key in the ANTHROPIC_API_KEY environment variable
(or pass --api-key). Get one at https://console.anthropic.com.
"""

import argparse
import json
import os
import sys
from typing import TypedDict

import anthropic
from langgraph.graph import StateGraph, END

DEFAULT_MODEL = "claude-haiku-4-5-20251001"
MAX_REVISIONS = 2

# Set once in main(), then used by every node function below.
client = None
MODEL = DEFAULT_MODEL


# ---------------------------------------------------------------------------
# Two small helpers every agent uses
# ---------------------------------------------------------------------------

def ask_claude(prompt: str) -> str:
    """Send one prompt to Claude and return the text of its reply."""
    message = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text.strip()


def parse_json(text: str) -> dict:
    """Pull the first {...} block out of a Claude response and parse it."""
    start = text.find("{")
    end = text.rfind("}") + 1
    try:
        return json.loads(text[start:end])
    except Exception:
        return {}


# ---------------------------------------------------------------------------
# The state — the one dict LangGraph passes from agent to agent. Each agent
# reads what it needs off it and returns only the fields it wants to update.
# ---------------------------------------------------------------------------

class ReviewState(TypedDict):
    review_text: str
    needs_human: bool
    triage_reason: str
    analysis: dict
    draft_reply: str
    critic_feedback: str
    approved: bool
    revisions: int
    status: str        # "shipped" or "escalated"
    final_reply: str


# ---------------------------------------------------------------------------
# The four agents
# ---------------------------------------------------------------------------

def triage_node(state: ReviewState) -> dict:
    """Agent 1: is this review safe for an AI to draft a reply to at all?"""
    prompt = f"""You are screening a customer review for a boba cafe before an AI drafts a reply.

Flag "needs_human" as true ONLY if the review mentions any of:
- illness or an allergic reaction
- a foreign object or contamination in the drink/food
- a threat of legal action
- a minor's safety

Return ONLY JSON: {{"needs_human": true or false, "reason": "short reason, or empty string"}}

Review:
{state['review_text']}"""
    result = parse_json(ask_claude(prompt))
    return {
        "needs_human": result.get("needs_human", False),
        "triage_reason": result.get("reason", ""),
    }


def analyst_node(state: ReviewState) -> dict:
    """Agent 2: the original pipeline's aspect-sentiment extraction."""
    prompt = f"""Analyze this boba cafe review. For Overall, Food Quality, Service, and
Ambience, give a sentiment ("Positive"/"Negative"/"Neutral"/"Not Applicable")
and up to 2 short supporting phrases (empty list if the aspect isn't mentioned).

Return ONLY JSON in this shape:
{{
  "Overall": "label",
  "Food Quality": {{"sentiment": "label", "features": []}},
  "Service": {{"sentiment": "label", "features": []}},
  "Ambience": {{"sentiment": "label", "features": []}}
}}

Review:
{state['review_text']}"""
    return {"analysis": parse_json(ask_claude(prompt))}


def drafter_node(state: ReviewState) -> dict:
    """Agent 3: writes the manager reply from the analyst's findings.

    If the critic rejected an earlier attempt, its feedback is included so
    this is a revision, not a fresh guess.
    """
    revision_note = ""
    if state.get("critic_feedback"):
        revision_note = f"\nYour last draft was rejected for this reason — fix it: {state['critic_feedback']}"

    prompt = f"""Write a manager reply (max 3 sentences) to this boba cafe review, based on
the analysis below. Be warm, professional, and specific. Never say
"we apologize for any inconvenience."

Review:
{state['review_text']}

Analysis:
{json.dumps(state['analysis'])}
{revision_note}

Return ONLY JSON: {{"reply": "your drafted reply"}}"""
    result = parse_json(ask_claude(prompt))
    return {"draft_reply": result.get("reply", "")}


def critic_node(state: ReviewState) -> dict:
    """Agent 4: checks the draft before it ships. Approves it, or sends it
    back to the drafter with specific feedback."""
    prompt = f"""You are a brand/compliance reviewer for a boba cafe. Check this draft
manager reply against 3 rules:
1. It does not promise a refund, free item, or compensation.
2. It does not admit legal fault.
3. It actually responds to the specific thing the customer said (not generic).

Review: {state['review_text']}
Draft reply: {state['draft_reply']}

Return ONLY JSON: {{"approved": true or false, "feedback": "what to fix, or empty string if approved"}}"""
    result = parse_json(ask_claude(prompt))
    return {
        "approved": result.get("approved", False),
        "critic_feedback": result.get("feedback", ""),
        "revisions": state.get("revisions", 0) + 1,
    }


def ship_node(state: ReviewState) -> dict:
    return {"status": "shipped", "final_reply": state["draft_reply"]}


def escalate_node(state: ReviewState) -> dict:
    return {"status": "escalated", "final_reply": ""}


# ---------------------------------------------------------------------------
# The two decision points. A routing function just looks at the state and
# returns the name of the next node to run.
# ---------------------------------------------------------------------------

def after_triage(state: ReviewState) -> str:
    return "escalate" if state["needs_human"] else "analyst"


def after_critic(state: ReviewState) -> str:
    if state["approved"]:
        return "ship"
    if state["revisions"] < MAX_REVISIONS:
        return "drafter"
    return "escalate"


# ---------------------------------------------------------------------------
# Wire the agents and routing functions into a graph.
# ---------------------------------------------------------------------------

def build_graph():
    graph = StateGraph(ReviewState)

    graph.add_node("triage", triage_node)
    graph.add_node("analyst", analyst_node)
    graph.add_node("drafter", drafter_node)
    graph.add_node("critic", critic_node)
    graph.add_node("ship", ship_node)
    graph.add_node("escalate", escalate_node)

    graph.set_entry_point("triage")
    graph.add_conditional_edges("triage", after_triage, {"analyst": "analyst", "escalate": "escalate"})
    graph.add_edge("analyst", "drafter")
    graph.add_edge("drafter", "critic")
    graph.add_conditional_edges("critic", after_critic, {"ship": "ship", "drafter": "drafter", "escalate": "escalate"})
    graph.add_edge("ship", END)
    graph.add_edge("escalate", END)

    return graph.compile()


# ---------------------------------------------------------------------------
# Batch loop — same shape as the original generate_replies.py
# ---------------------------------------------------------------------------

def review_text_of(record: dict) -> str:
    return record.get("review_text") or record.get("review") or ""


def process_review(app, record: dict) -> dict:
    review_id = record.get("review_id")
    text = review_text_of(record).strip()

    result = {
        "review_id": review_id,
        "Overall": "",
        "Food Quality": "",
        "Service": "",
        "Ambience": "",
        "manager_response": "",
        "status": "",
    }
    if not text:
        return result

    initial_state: ReviewState = {
        "review_text": text,
        "needs_human": False,
        "triage_reason": "",
        "analysis": {},
        "draft_reply": "",
        "critic_feedback": "",
        "approved": False,
        "revisions": 0,
        "status": "",
        "final_reply": "",
    }

    try:
        final_state = app.invoke(initial_state)
    except Exception as exc:  # noqa: BLE001 - keep the batch going even if one review fails
        print(f"  ⚠️  review_id {review_id}: {exc}", file=sys.stderr)
        return result

    analysis = final_state.get("analysis", {})

    def aspect(key: str) -> str:
        val = analysis.get(key, {})
        return val.get("sentiment", "") if isinstance(val, dict) else ""

    result["Overall"] = analysis.get("Overall", "")
    result["Food Quality"] = aspect("Food Quality")
    result["Service"] = aspect("Service")
    result["Ambience"] = aspect("Ambience")
    result["manager_response"] = final_state.get("final_reply", "")
    result["status"] = final_state.get("status", "")
    if result["status"] == "escalated":
        result["escalation_reason"] = final_state.get("triage_reason") or "rejected by brand/compliance review twice"
    return result


def main():
    parser = argparse.ArgumentParser(
        description="Bulk-generate bobabean review replies with a triage/analyst/drafter/critic LangGraph."
    )
    parser.add_argument("--input", default="reviews_export.json", help="Path to reviews_export.json")
    parser.add_argument("--output", default="manager_responses.json", help="Where to write the results")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Claude model id")
    parser.add_argument("--api-key", default=None, help="Anthropic API key (defaults to the ANTHROPIC_API_KEY env var)")
    parser.add_argument("--limit", type=int, default=None, help="Only process the first N reviews")
    parser.add_argument("--skip-existing", action="store_true", help="Skip reviews that already have a manager_response")
    args = parser.parse_args()

    api_key = args.api_key or os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        sys.exit("Set ANTHROPIC_API_KEY (or pass --api-key) before running this script.")

    global client, MODEL
    client = anthropic.Anthropic(api_key=api_key)
    MODEL = args.model

    app = build_graph()

    with open(args.input, "r", encoding="utf-8") as f:
        records = json.load(f)
    if args.skip_existing:
        records = [r for r in records if not r.get("manager_response")]
    if args.limit:
        records = records[: args.limit]
    if not records:
        print("Nothing to process.")
        return

    print(f"Processing {len(records)} review(s) with {MODEL} through triage -> analyst -> drafter <-> critic...")

    results = []
    for i, record in enumerate(records, start=1):
        print(f"  [{i}/{len(records)}] review_id {record.get('review_id')}...")
        results.append(process_review(app, record))

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    shipped = sum(1 for r in results if r["status"] == "shipped")
    escalated = sum(1 for r in results if r["status"] == "escalated")
    skipped = len(results) - shipped - escalated
    print(f"✅ Wrote {len(results)} result(s) to {args.output} ({shipped} shipped, {escalated} escalated, {skipped} empty).")


if __name__ == "__main__":
    main()
