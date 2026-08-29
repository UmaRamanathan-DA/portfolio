"""
Prompt library for bobabean's AI review-reply pipeline.

Tasks 1-4 are kept exactly as they were in the original prompt-engineering
exploration (see the companion notebook, "Build with AI.ipynb") so the
iteration history stays visible: each one exists because the previous
version failed in a specific, observable way. Only Task 5 is called by the
production pipeline in generate_replies.py — the rest are reference/narrative.

Task 1 -> Task 2:  free-text output isn't parseable; force strict JSON.
Task 2 -> Task 3:  a single "sentiment" is too coarse for a café to act on;
                   break it out by aspect (Food Quality / Service / Ambience).
Task 3 -> Task 4:  a label alone doesn't say *why*; extract short supporting
                   phrases per aspect so a human can sanity-check the label.
Task 4 -> Task 5:  analysis alone doesn't close the loop; have the model also
                   draft the manager's reply, grounded in the same analysis.
"""

import json
import re
import unicodedata


def clean_text(text: str) -> str:
    """Normalize raw review text before it reaches the model."""
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"https?://\S+|www\.\S+", "", text)
    text = re.sub(r"<.*?>", "", text)
    text = re.sub(r"\S+@\S+", "", text)

    contractions = {
        "won't": "will not", "can't": "cannot", "n't": " not",
        "'re": " are", "'ve": " have", "'ll": " will",
        "'d": " would", "'m": " am",
    }
    for k, v in contractions.items():
        text = text.replace(k, v)

    text = re.sub(r"[^a-z0-9\s.!?,'-]", "", text)
    text = re.sub(r"([.!?,])\1+", r"\1", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def task1_prompt(review: str) -> str:
    """Zero-shot, free-text classification. Prompt-iteration step 1."""
    return f"""
You are analyzing restaurant reviews.
Classify the sentiment of the review below as one of:
- Positive
- Negative
- Neutral

Review:
{review}
"""


def task2_prompt(review: str) -> str:
    """Same task, forced into strict JSON. Prompt-iteration step 2."""
    return f"""
You are analyzing restaurant reviews.
Classify the sentiment of the review below.

Return ONLY a JSON object in this exact format — no explanation, no extra text:
{{"sentiment": "Positive" or "Negative" or "Neutral"}}

Review:
{review}
"""


def task3_prompt(review: str) -> str:
    """Per-aspect sentiment labels. Prompt-iteration step 3."""
    return f"""
You are analyzing restaurant reviews.

For the review below, classify the sentiment for each category.
Use ONLY these labels: "Positive", "Negative", "Neutral", "Not Applicable"
Use "Not Applicable" if a category is not mentioned in the review.

Return ONLY a JSON object in this exact format — no explanation:
{{
  "Overall":      "label",
  "Food Quality": "label",
  "Service":      "label",
  "Ambience":     "label"
}}

Review:
{review}
"""


def task4_prompt(review: str) -> str:
    """Adds extracted supporting phrases per aspect. Prompt-iteration step 4."""
    return f"""
You are analyzing restaurant reviews for a food delivery platform.

For the review below:
1. Classify the overall sentiment.
2. For each aspect (Food Quality, Service, Ambience):
   - Classify its sentiment (Positive / Negative / Neutral / Not Applicable)
   - Extract short phrases (3-6 words) that describe what was liked or disliked
   - If the aspect is not mentioned, return an empty list []

Return ONLY a JSON object in this exact format:
{{
  "Overall":      "label",
  "Food Quality": {{
    "sentiment": "label",
    "features":  ["phrase 1", "phrase 2"]
  }},
  "Service": {{
    "sentiment": "label",
    "features":  ["phrase 1"]
  }},
  "Ambience": {{
    "sentiment": "label",
    "features":  []
  }}
}}

Review:
{review}
"""


def task5_prompt(review: str) -> str:
    """
    Production prompt: Task 4's aspect analysis plus a drafted manager reply.
    This is the only prompt generate_replies.py actually calls.
    """
    return f"""
You are an AI assistant for a restaurant management team.

STEP 1 — ANALYSE the review and return:
- Overall sentiment
- Aspect sentiments (Food Quality, Service, Ambience)
- Key features (short phrases) for each aspect

STEP 2 — WRITE a professional manager response (max 3 sentences):
- Acknowledge the customer's experience specifically (not generically)
- If negative: apologise for the specific issue and state one action
- If positive: thank them and highlight what they praised
- Tone: warm, professional, specific. Never say "We apologise for any inconvenience."

Return ONLY a JSON object in this exact format:
{{
  "Overall":      "label",
  "Food Quality": {{"sentiment": "label", "features": []}},
  "Service":      {{"sentiment": "label", "features": []}},
  "Ambience":     {{"sentiment": "label", "features": []}},
  "manager_response": "Your drafted response here."
}}

Review:
{review}
"""


def parse_json_response(text: str) -> dict:
    """Extract and parse the first JSON object found in a model response."""
    try:
        start = text.find("{")
        end = text.rfind("}") + 1
        return json.loads(text[start:end])
    except Exception:
        return {}
