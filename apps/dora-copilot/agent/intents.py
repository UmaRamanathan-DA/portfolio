from typing import Dict, List, Optional, Tuple

from agent.constants import DORA_METRICS, INTENT_LABELS, METRIC_ALIASES


def match_metrics(text: str) -> List[str]:
    matched = []
    for metric in DORA_METRICS:
        aliases = METRIC_ALIASES.get(metric, [metric.lower()])
        if any(a in text for a in aliases):
            matched.append(metric)
    return matched


def classify_intent(message: str, session_context: Optional[Dict] = None) -> Tuple[str, List[str]]:
    text = message.lower().strip()
    matched = match_metrics(text)
    ctx = session_context or {}

    if any(k in text for k in ["fix first", "biggest problem", "bottleneck", "priority", "what should we"]):
        return "bottleneck_diagnosis", matched

    if any(k in text for k in ["elite", "benchmark", "compare to", "compare with", " tier", "industry standard"]) or (
        "compare" in text and matched
    ):
        return "benchmark_compare", matched if matched else list(DORA_METRICS)

    if any(k in text for k in ["best practice", "how do teams", "how can we", "reduce lead", "improve", "recommend", "tips"]):
        return "best_practice", matched if matched else [ctx.get("last_metric", "Lead Time")]

    if any(k in text for k in ["q1", "q2", "q3", "q4", "quarter", "review", "perform", "how did we", "overall", "trend", "progress"]):
        return "performance_review", matched if matched else list(DORA_METRICS)

    if matched and any(k in text for k in ["what is", "what's", "what are", "show", "current", "status", "tell me about"]):
        return "metric_status", matched

    if ctx.get("last_intent") and any(k in text for k in ["break down", "more detail", "by team", "explain", "yes", "tell me more", "why"]):
        return "follow_up", matched if matched else [ctx.get("last_metric", "Lead Time")]

    if matched:
        return "metric_status", matched
    return "general", list(DORA_METRICS)


def intent_display_name(intent: str) -> str:
    return INTENT_LABELS.get(intent, intent)
