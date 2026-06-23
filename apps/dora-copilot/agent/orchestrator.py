from typing import Any, Dict, List, Optional

import pandas as pd

from agent.constants import ACTIONS, BEST_PRACTICES, BENCHMARKS, DORA_METRICS


def _tier(metric: str, value: float) -> str:
    bench = BENCHMARKS[metric]
    if bench["direction"] == "higher_is_better":
        if value >= bench["elite"]:
            return "Elite"
        if value >= bench["high"]:
            return "High"
        if value >= bench["medium"]:
            return "Medium"
        return "Low"
    if value <= bench["elite"]:
        return "Elite"
    if value <= bench["high"]:
        return "High"
    if value <= bench["medium"]:
        return "Medium"
    return "Low"


def get_dora_metrics(df: pd.DataFrame, metrics: Optional[List[str]] = None) -> Dict[str, Any]:
    if df.empty:
        return {"metrics": {}}
    target = metrics or DORA_METRICS
    latest = df.iloc[-1]
    result = {}
    for metric in target:
        if metric not in df.columns:
            continue
        value = float(latest[metric])
        result[metric] = {
            "value": value,
            "unit": BENCHMARKS[metric]["unit"],
            "date": str(latest.get("Date", "")),
            "tier": _tier(metric, value),
        }
    return {"metrics": result, "row_count": len(df)}


def analyze_trend(df: pd.DataFrame, metric: str) -> Dict[str, Any]:
    series = df[metric].astype(float)
    first, last = float(series.iloc[0]), float(series.iloc[-1])
    delta = last - first
    pct = (delta / first * 100) if first else 0
    bench = BENCHMARKS[metric]
    if delta == 0:
        direction = "flat"
    elif (bench["direction"] == "higher_is_better" and delta > 0) or (
        bench["direction"] == "lower_is_better" and delta < 0
    ):
        direction = "improving"
    else:
        direction = "declining"
    return {
        "metric": metric,
        "start_value": first,
        "end_value": last,
        "pct_change": round(pct, 1),
        "direction": direction,
        "periods": len(series),
    }


def compare_benchmark(df: pd.DataFrame, metrics: Optional[List[str]] = None) -> Dict[str, Any]:
    snapshot = get_dora_metrics(df, metrics)
    comparisons = []
    for metric, data in snapshot["metrics"].items():
        bench = BENCHMARKS[metric]
        gap = (
            max(0, bench["elite"] - data["value"])
            if bench["direction"] == "higher_is_better"
            else max(0, data["value"] - bench["elite"])
        )
        comparisons.append({
            "metric": metric,
            "value": data["value"],
            "tier": data["tier"],
            "elite_threshold": bench["elite"],
            "high_threshold": bench["high"],
            "unit": bench["unit"],
            "gap_to_elite": gap,
        })
    return {"comparisons": comparisons}


def identify_bottleneck(df: pd.DataFrame) -> Dict[str, Any]:
    snapshot = get_dora_metrics(df)
    tier_score = {"Low": 4, "Medium": 3, "High": 2, "Elite": 1}
    ranked = []
    for metric, data in snapshot["metrics"].items():
        trend = analyze_trend(df, metric)
        score = tier_score.get(data["tier"], 3) + (1 if trend["direction"] == "declining" else 0)
        ranked.append({
            "metric": metric,
            "tier": data["tier"],
            "value": data["value"],
            "unit": data["unit"],
            "trend": trend["direction"],
            "priority_score": score,
        })
    ranked.sort(key=lambda x: x["priority_score"], reverse=True)
    return {"ranked_issues": ranked, "primary_bottleneck": ranked[0] if ranked else None}


def rag_best_practices(metrics: Optional[List[str]] = None) -> Dict[str, Any]:
    focus = metrics[0] if metrics else "Lead Time"
    snippets = BEST_PRACTICES.get(focus, BEST_PRACTICES["Lead Time"]) + [
        "DORA research: elite teams deploy frequently with strong automation and fast recovery.",
    ]
    return {"snippets": snippets, "focus": focus}


def generate_action_plan(bottleneck: Dict, focus_metric: Optional[str] = None) -> Dict[str, Any]:
    primary = bottleneck.get("primary_bottleneck") or {}
    metric = focus_metric or primary.get("metric") or "Lead Time"
    return {"focus_metric": metric, "actions": ACTIONS.get(metric, ACTIONS["Lead Time"])[:3]}


def _title_case_intent(intent: str) -> str:
    return intent.replace("_", " ").title()


def _format_metric_status(metrics_result, trends) -> Dict[str, str]:
    lines = ["**Metric status**", ""]
    voice_parts = []
    for name, data in metrics_result["metrics"].items():
        t = trends.get(name)
        lines.append(f"- **{name}:** {data['value']} {data['unit']} ({data['tier']} tier, as of {data['date']})")
        if t:
            lines.append(f"  Trend: {t['direction']} from {t['start_value']} → {t['end_value']} ({t['pct_change']}%)")
        voice_parts.append(f"{name} is {data['value']} {data['unit']}, {data['tier']} tier.")
    return {"answer": "\n".join(lines), "voice": " ".join(voice_parts)}


def _format_benchmark(comparisons) -> Dict[str, str]:
    lines = ["**Benchmark comparison**", ""]
    order = {"Low": 0, "Medium": 1, "High": 2, "Elite": 3}
    for c in comparisons["comparisons"]:
        lines.append(f"- **{c['metric']}:** {c['value']} {c['unit']} → **{c['tier']}** tier")
        lines.append(f"  Elite threshold: {c['elite_threshold']} {c['unit']} · High: {c['high_threshold']} {c['unit']}")
        lines.append("  At or better than Elite threshold." if c["gap_to_elite"] <= 0 else f"  Gap to Elite: {round(c['gap_to_elite'], 2)} {c['unit']}")
    lowest = min(comparisons["comparisons"], key=lambda x: order.get(x["tier"], 0)) if comparisons["comparisons"] else None
    voice = f"Lowest tier metric is {lowest['metric']} at {lowest['tier']} tier." if lowest else "Benchmark comparison complete."
    return {"answer": "\n".join(lines), "voice": voice}


def _format_performance(df, trends) -> Dict[str, str]:
    improving = sum(1 for m in DORA_METRICS if trends.get(m, {}).get("direction") == "improving")
    declining = sum(1 for m in DORA_METRICS if trends.get(m, {}).get("direction") == "declining")
    lines = [f"**Performance review** ({df.iloc[0]['Date']} → {df.iloc[-1]['Date']})", ""]
    for metric in DORA_METRICS:
        t = trends.get(metric)
        if t:
            lines.append(f"- **{metric}:** {t['direction']} ({t['start_value']} → {t['end_value']}, {t['pct_change']}%)")
    lines.extend(["", f"**Summary:** {improving} metrics improving, {declining} declining over {len(df)} periods."])
    return {"answer": "\n".join(lines), "voice": f"{improving} of 4 metrics are improving over the period."}


def _format_bottleneck(bottleneck, action_plan) -> Dict[str, str]:
    primary = bottleneck.get("primary_bottleneck") or {}
    lines = ["**Bottleneck diagnosis**", "", "**Priority ranking:**"]
    for i, item in enumerate(bottleneck["ranked_issues"], 1):
        lines.append(f"{i}. **{item['metric']}** — {item['tier']} tier, trend: {item['trend']} ({item['value']} {item['unit']})")
    lines.extend(["", f"**Recommended actions for {action_plan['focus_metric']}:**"])
    for i, action in enumerate(action_plan["actions"], 1):
        lines.append(f"{i}. {action}")
    return {"answer": "\n".join(lines), "voice": f"Top priority is {primary.get('metric')}. Start with: {action_plan['actions'][0]}"}


def _format_best_practice(rag, action_plan) -> Dict[str, str]:
    lines = [f"**Best practices for {rag['focus']}**", ""]
    lines.extend(f"- {s}" for s in rag["snippets"])
    lines.extend(["", "**Suggested next steps:**"])
    lines.extend(f"{i}. {a}" for i, a in enumerate(action_plan["actions"], 1))
    return {"answer": "\n".join(lines), "voice": f"For {rag['focus']}, try: {action_plan['actions'][0]}"}


def _format_follow_up(metric, metrics_result, trend, action_plan) -> Dict[str, str]:
    d = metrics_result["metrics"][metric]
    lines = [f"**Follow-up: {metric}**", "", f"Current: **{d['value']} {d['unit']}** ({d['tier']} tier)"]
    if trend:
        lines.append(f"Trend: {trend['direction']} — {trend['start_value']} → {trend['end_value']} over {trend['periods']} periods ({trend['pct_change']}%)")
    lines.extend(["", "**Deeper actions:**"])
    lines.extend(f"{i}. {a}" for i, a in enumerate(action_plan["actions"], 1))
    return {"answer": "\n".join(lines), "voice": f"{metric} is {d['value']} {d['unit']} and {trend['direction']}."}


def _format_general(metrics_result, bottleneck) -> Dict[str, str]:
    lines = ["**DORA overview**", ""]
    for name, data in metrics_result["metrics"].items():
        lines.append(f"- {name}: {data['value']} {data['unit']} ({data['tier']})")
    p = bottleneck.get("primary_bottleneck") or {}
    lines.append(f"\nWeakest area: **{p.get('metric')}** ({p.get('tier')} tier). Ask about benchmarks, trends, or best practices.")
    return {"answer": "\n".join(lines), "voice": f"Overview ready. Weakest metric is {p.get('metric')}."}


def _step(name: str, detail: str) -> Dict[str, str]:
    return {"tool": name, "detail": detail, "status": "done"}


def run_agent(message: str, df: pd.DataFrame, session_context: Optional[Dict] = None) -> Dict[str, Any]:
    from agent.constants import FOLLOW_UPS
    from agent.intents import classify_intent, intent_display_name

    ctx = session_context or {}
    intent, matched = classify_intent(message, ctx)
    steps, tools_called, trends = [], [], {}

    steps.append(_step("classify_intent", f"{intent_display_name(intent)} — \"{message[:60]}\""))
    tools_called.append("classify_intent")

    metrics_result = get_dora_metrics(df, matched if matched else None)
    steps.append(_step("get_dora_metrics", f"Loaded {len(metrics_result['metrics'])} metric(s)"))
    tools_called.append("get_dora_metrics")

    metric_keys = matched if matched else DORA_METRICS
    for metric in metric_keys:
        trends[metric] = analyze_trend(df, metric)
        steps.append(_step("analyze_trend", f"{metric}: {trends[metric]['direction']} ({trends[metric]['pct_change']}%)"))
        tools_called.append("analyze_trend")

    benchmark = compare_benchmark(df, matched if matched else None)
    bottleneck = identify_bottleneck(df)
    primary = bottleneck.get("primary_bottleneck") or {}
    focus = matched[0] if matched else primary.get("metric") or "Lead Time"

    if intent == "metric_status":
        briefing = _format_metric_status(metrics_result, trends)
    elif intent == "benchmark_compare":
        steps.append(_step("compare_benchmark", f"Compared {len(benchmark['comparisons'])} metrics"))
        tools_called.append("compare_benchmark")
        briefing = _format_benchmark(benchmark)
    elif intent == "performance_review":
        steps.append(_step("compare_benchmark", "Benchmark context loaded"))
        tools_called.append("compare_benchmark")
        briefing = _format_performance(df, trends)
    elif intent == "bottleneck_diagnosis":
        steps.append(_step("identify_bottleneck", f"Primary: {primary.get('metric')} ({primary.get('tier')})"))
        tools_called.append("identify_bottleneck")
        action_plan = generate_action_plan(bottleneck)
        briefing = _format_bottleneck(bottleneck, action_plan)
        focus = action_plan["focus_metric"]
    elif intent == "best_practice":
        rag = rag_best_practices(matched)
        steps.append(_step("rag_best_practices", f"Retrieved practices for {rag['focus']}"))
        tools_called.append("rag_best_practices")
        action_plan = generate_action_plan(bottleneck, rag["focus"])
        briefing = _format_best_practice(rag, action_plan)
        focus = rag["focus"]
    elif intent == "follow_up":
        action_plan = generate_action_plan(bottleneck, focus)
        briefing = _format_follow_up(focus, metrics_result, trends.get(focus), action_plan)
    else:
        steps.append(_step("identify_bottleneck", f"Weakest: {primary.get('metric')}"))
        tools_called.append("identify_bottleneck")
        briefing = _format_general(metrics_result, bottleneck)

    steps.append(_step("format_briefing", f"Response tailored to: {intent.replace('_', ' ').title()}"))

    return {
        "intent": intent,
        "answer": f"**Intent:** {intent.replace('_', ' ').title()}\n\n{briefing['answer']}",
        "voice_summary": briefing["voice"],
        "steps": steps,
        "tools_called": tools_called,
        "metrics_used": metrics_result["metrics"],
        "bottleneck": bottleneck,
        "follow_ups": FOLLOW_UPS.get(intent, FOLLOW_UPS["general"])(focus),
        "guardrail": "All metric values sourced from uploaded CSV via tools — not LLM-generated numbers.",
        "last_metric": focus,
    }
