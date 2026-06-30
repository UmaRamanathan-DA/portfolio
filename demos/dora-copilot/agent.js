/**
 * DORA DevOps Copilot — client-side agent (GitHub Pages compatible)
 * No backend: runs entirely in the browser.
 */
(function (global) {
  const DORA_METRICS = [
    "Deployment Frequency",
    "Lead Time",
    "Change Failure Rate",
    "MTTR",
  ];

  const METRIC_ALIASES = {
    "Deployment Frequency": ["deployment frequency", "deploy frequency", "deployment rate", "deployments"],
    "Lead Time": ["lead time", "lead-time", "time to deploy", "delivery time"],
    "Change Failure Rate": ["change failure rate", "failure rate", "cfr", "change failure"],
    MTTR: ["mttr", "mean time to recover", "recovery time", "time to restore"],
  };

  const BENCHMARKS = {
    "Deployment Frequency": { direction: "higher_is_better", elite: 1.0, high: 0.5, medium: 0.2, unit: "deployments/day" },
    "Lead Time": { direction: "lower_is_better", elite: 24, high: 168, medium: 720, unit: "hours" },
    "Change Failure Rate": { direction: "lower_is_better", elite: 10, high: 15, medium: 30, unit: "%" },
    MTTR: { direction: "lower_is_better", elite: 1, high: 24, medium: 168, unit: "hours" },
  };

  const INTENT_LABELS = {
    metric_status: "Metric status query",
    performance_review: "Performance review",
    bottleneck_diagnosis: "Bottleneck diagnosis",
    benchmark_compare: "Benchmark comparison",
    best_practice: "Best practice guidance",
    follow_up: "Follow-up / clarification",
    general: "General DORA analysis",
  };

  const BEST_PRACTICES = {
    "Deployment Frequency": [
      "Use trunk-based development and feature flags to ship smaller changes more often.",
      "Automate environment provisioning with IaC to remove deployment bottlenecks.",
    ],
    "Lead Time": [
      "Identify the slowest CI/CD stage and automate manual approval gates.",
      "Reduce batch size so changes flow through the pipeline faster.",
    ],
    "Change Failure Rate": [
      "Expand automated tests on critical paths before merge.",
      "Use canary releases for high-risk services.",
    ],
    MTTR: [
      "Maintain runbooks and on-call escalation paths for common incidents.",
      "Improve observability so teams detect and diagnose issues faster.",
    ],
  };

  function parseMetricsFile(fileContent) {
    const rows = [];
    fileContent.split(/\r?\n/).forEach(function (line) {
      const parts = line.trim().split(",").map(function (p) { return p.trim(); });
      if (parts.length < 5) return;
      if (parts[0].toLowerCase() === "date" || parts[1].toLowerCase().startsWith("deployment")) return;
      const nums = parts.slice(1, 5).map(Number);
      if (nums.some(isNaN)) return;
      rows.push({
        Date: parts[0],
        "Deployment Frequency": nums[0],
        "Lead Time": nums[1],
        "Change Failure Rate": nums[2],
        MTTR: nums[3],
      });
    });
    return rows;
  }

  function matchMetrics(text) {
    const matched = [];
    DORA_METRICS.forEach(function (metric) {
      const aliases = METRIC_ALIASES[metric] || [metric.toLowerCase()];
      if (aliases.some(function (a) { return text.indexOf(a) >= 0; })) {
        matched.push(metric);
      }
    });
    return matched;
  }

  function classifyIntent(message, sessionContext) {
    const text = message.toLowerCase().trim();
    const matched = matchMetrics(text);

    if (["fix first", "biggest problem", "bottleneck", "priority", "what should we"].some(function (k) { return text.indexOf(k) >= 0; })) {
      return { intent: "bottleneck_diagnosis", matched };
    }
    if (["elite", "benchmark", "compare to", "compare with", " tier", "industry standard"].some(function (k) { return text.indexOf(k) >= 0; }) ||
        (text.indexOf("compare") >= 0 && matched.length)) {
      return { intent: "benchmark_compare", matched: matched.length ? matched : DORA_METRICS.slice() };
    }
    if (["best practice", "how do teams", "how can we", "reduce lead", "improve", "recommend", "tips"].some(function (k) { return text.indexOf(k) >= 0; })) {
      return { intent: "best_practice", matched: matched.length ? matched : [sessionContext.last_metric || "Lead Time"] };
    }
    if (["q1", "q2", "q3", "q4", "quarter", "review", "perform", "how did we", "overall", "trend", "progress"].some(function (k) { return text.indexOf(k) >= 0; })) {
      return { intent: "performance_review", matched: matched.length ? matched : DORA_METRICS.slice() };
    }
    if (matched.length && ["what is", "what's", "what are", "show", "current", "status", "tell me about"].some(function (k) { return text.indexOf(k) >= 0; })) {
      return { intent: "metric_status", matched };
    }
    if (sessionContext && sessionContext.last_intent) {
      if (["break down", "more detail", "by team", "explain", "yes", "tell me more", "why"].some(function (k) { return text.indexOf(k) >= 0; })) {
        return { intent: "follow_up", matched: matched.length ? matched : [sessionContext.last_metric || "Lead Time"] };
      }
    }
    if (matched.length) return { intent: "metric_status", matched };
    return { intent: "general", matched: DORA_METRICS.slice() };
  }

  function tierForMetric(metric, value) {
    const bench = BENCHMARKS[metric];
    if (bench.direction === "higher_is_better") {
      if (value >= bench.elite) return "Elite";
      if (value >= bench.high) return "High";
      if (value >= bench.medium) return "Medium";
      return "Low";
    }
    if (value <= bench.elite) return "Elite";
    if (value <= bench.high) return "High";
    if (value <= bench.medium) return "Medium";
    return "Low";
  }

  function getDoraMetrics(rows, metrics) {
    if (!rows.length) return { error: "No metrics data loaded", metrics: {} };
    const target = metrics && metrics.length ? metrics : DORA_METRICS;
    const latest = rows[rows.length - 1];
    const result = {};
    target.forEach(function (metric) {
      if (latest[metric] === undefined) return;
      result[metric] = {
        value: latest[metric],
        unit: BENCHMARKS[metric].unit,
        date: latest.Date || "",
        tier: tierForMetric(metric, latest[metric]),
      };
    });
    return { metrics: result, row_count: rows.length, latest_date: latest.Date || "" };
  }

  function analyzeTrend(rows, metric) {
    if (!rows.length || rows[0][metric] === undefined) return { error: "No data for " + metric };
    const first = rows[0][metric];
    const last = rows[rows.length - 1][metric];
    const delta = last - first;
    const pct = first ? (delta / first) * 100 : 0;
    const bench = BENCHMARKS[metric];
    let direction = "flat";
    if (delta !== 0) {
      const improving = (bench.direction === "higher_is_better" && delta > 0) ||
        (bench.direction === "lower_is_better" && delta < 0);
      direction = improving ? "improving" : "declining";
    }
    return {
      metric: metric,
      start_value: first,
      end_value: last,
      delta: Math.round(delta * 100) / 100,
      pct_change: Math.round(pct * 10) / 10,
      direction: direction,
      periods: rows.length,
      start_date: rows[0].Date,
      end_date: rows[rows.length - 1].Date,
    };
  }

  function compareBenchmark(rows, metrics) {
    const snapshot = getDoraMetrics(rows, metrics);
    const comparisons = [];
    Object.keys(snapshot.metrics).forEach(function (metric) {
      const data = snapshot.metrics[metric];
      const bench = BENCHMARKS[metric];
      comparisons.push({
        metric: metric,
        value: data.value,
        tier: data.tier,
        elite_threshold: bench.elite,
        high_threshold: bench.high,
        unit: bench.unit,
        gap_to_elite: bench.direction === "higher_is_better"
          ? Math.max(0, bench.elite - data.value)
          : Math.max(0, data.value - bench.elite),
      });
    });
    return { comparisons: comparisons };
  }

  function identifyBottleneck(rows) {
    const snapshot = getDoraMetrics(rows);
    const tierScore = { Low: 4, Medium: 3, High: 2, Elite: 1 };
    const ranked = [];
    Object.keys(snapshot.metrics).forEach(function (metric) {
      const data = snapshot.metrics[metric];
      const trend = analyzeTrend(rows, metric);
      let score = tierScore[data.tier] || 3;
      if (trend.direction === "declining") score += 1;
      ranked.push({
        metric: metric,
        tier: data.tier,
        value: data.value,
        unit: data.unit,
        trend: trend.direction,
        priority_score: score,
      });
    });
    ranked.sort(function (a, b) { return b.priority_score - a.priority_score; });
    return { ranked_issues: ranked, primary_bottleneck: ranked[0] || null };
  }

  function ragBestPractices(message, metrics) {
    const focus = metrics && metrics.length ? metrics[0] : "Lead Time";
    const specific = BEST_PRACTICES[focus] || BEST_PRACTICES["Lead Time"];
    return {
      snippets: specific.concat([
        "DORA research: elite teams deploy frequently with strong automation and fast recovery.",
      ]),
      focus: focus,
    };
  }

  function generateActionPlan(bottleneck, focusMetric) {
    const primary = bottleneck.primary_bottleneck || {};
    const metric = focusMetric || primary.metric || "Lead Time";
    const actions = {
      "Lead Time": [
        "Automate CI/CD gates and reduce manual approval steps",
        "Split large releases into smaller, independently deployable batches",
        "Instrument pipeline stages to find the slowest step",
      ],
      "Change Failure Rate": [
        "Expand automated test coverage on critical paths before merge",
        "Introduce canary deployments for high-risk services",
        "Run blameless postmortems and track recurring failure themes",
      ],
      MTTR: [
        "Standardize runbooks and on-call escalation paths",
        "Improve observability with service-level alerts tied to SLOs",
        "Practice game-day incident drills quarterly",
      ],
      "Deployment Frequency": [
        "Remove environment provisioning bottlenecks via IaC",
        "Shift-left security and quality checks into PR validation",
        "Enable trunk-based development with feature flags",
      ],
    };
    const steps = actions[metric] || actions["Lead Time"];
    return { focus_metric: metric, actions: steps.slice(0, 3) };
  }

  function titleCaseIntent(intent) {
    return intent.replace(/_/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function formatMetricStatus(metricsResult, trends) {
    const lines = ["**Metric status**", ""];
    Object.keys(metricsResult.metrics).forEach(function (name) {
      const d = metricsResult.metrics[name];
      const t = trends[name];
      lines.push("- **" + name + ":** " + d.value + " " + d.unit + " (" + d.tier + " tier, as of " + d.date + ")");
      if (t) {
        lines.push("  Trend: " + t.direction + " from " + t.start_value + " → " + t.end_value + " (" + t.pct_change + "%)");
      }
    });
    return {
      answer: lines.join("\n"),
      voice: Object.keys(metricsResult.metrics).map(function (n) {
        const d = metricsResult.metrics[n];
        return n + " is " + d.value + " " + d.unit + ", " + d.tier + " tier.";
      }).join(" "),
    };
  }

  function formatBenchmarkCompare(comparisons) {
    const lines = ["**Benchmark comparison**", ""];
    comparisons.comparisons.forEach(function (c) {
      lines.push("- **" + c.metric + ":** " + c.value + " " + c.unit + " → **" + c.tier + "** tier");
      lines.push("  Elite threshold: " + c.elite_threshold + " " + c.unit + " · High: " + c.high_threshold + " " + c.unit);
      if (c.gap_to_elite > 0) {
        lines.push("  Gap to Elite: " + Math.round(c.gap_to_elite * 100) / 100 + " " + c.unit);
      } else {
        lines.push("  At or better than Elite threshold.");
      }
    });
    const lowest = comparisons.comparisons.slice().sort(function (a, b) {
      const order = { Low: 0, Medium: 1, High: 2, Elite: 3 };
      return (order[a.tier] || 0) - (order[b.tier] || 0);
    })[0];
    return {
      answer: lines.join("\n"),
      voice: lowest ? "Lowest tier metric is " + lowest.metric + " at " + lowest.tier + " tier." : "Benchmark comparison complete.",
    };
  }

  function formatPerformanceReview(rows, trends) {
    const lines = ["**Performance review** (" + rows[0].Date + " → " + rows[rows.length - 1].Date + ")", ""];
    let improving = 0, declining = 0;
    DORA_METRICS.forEach(function (metric) {
      const t = trends[metric];
      if (!t) return;
      if (t.direction === "improving") improving++;
      if (t.direction === "declining") declining++;
      lines.push("- **" + metric + ":** " + t.direction + " (" + t.start_value + " → " + t.end_value + ", " + t.pct_change + "%)");
    });
    lines.push("");
    lines.push("**Summary:** " + improving + " metrics improving, " + declining + " declining over " + rows.length + " periods.");
    return {
      answer: lines.join("\n"),
      voice: improving + " of 4 metrics are improving over the period.",
    };
  }

  function formatBottleneck(bottleneck, actionPlan) {
    const primary = bottleneck.primary_bottleneck || {};
    const lines = ["**Bottleneck diagnosis**", "", "**Priority ranking:**"];
    bottleneck.ranked_issues.forEach(function (item, i) {
      lines.push((i + 1) + ". **" + item.metric + "** — " + item.tier + " tier, trend: " + item.trend +
        " (" + item.value + " " + item.unit + ")");
    });
    lines.push("", "**Recommended actions for " + actionPlan.focus_metric + ":**");
    actionPlan.actions.forEach(function (a, i) { lines.push((i + 1) + ". " + a); });
    return {
      answer: lines.join("\n"),
      voice: "Top priority is " + primary.metric + ". Start with: " + actionPlan.actions[0],
    };
  }

  function formatBestPractice(rag, actionPlan) {
    const lines = ["**Best practices for " + rag.focus + "**", ""];
    rag.snippets.forEach(function (s) { lines.push("- " + s); });
    lines.push("", "**Suggested next steps:**");
    actionPlan.actions.forEach(function (a, i) { lines.push((i + 1) + ". " + a); });
    return {
      answer: lines.join("\n"),
      voice: "For " + rag.focus + ", try: " + actionPlan.actions[0],
    };
  }

  function formatFollowUp(metric, metricsResult, trend, actionPlan) {
    const d = metricsResult.metrics[metric];
    const lines = [
      "**Follow-up: " + metric + "**",
      "",
      "Current: **" + d.value + " " + d.unit + "** (" + d.tier + " tier)",
    ];
    if (trend) {
      lines.push("Trend: " + trend.direction + " — " + trend.start_value + " → " + trend.end_value +
        " over " + trend.periods + " periods (" + trend.pct_change + "%)");
    }
    lines.push("", "**Deeper actions:**");
    actionPlan.actions.forEach(function (a, i) { lines.push((i + 1) + ". " + a); });
    return {
      answer: lines.join("\n"),
      voice: metric + " is " + d.value + " " + d.unit + " and " + trend.direction + ".",
    };
  }

  function formatGeneral(metricsResult, bottleneck) {
    const lines = ["**DORA overview**", ""];
    Object.keys(metricsResult.metrics).forEach(function (name) {
      const d = metricsResult.metrics[name];
      lines.push("- " + name + ": " + d.value + " " + d.unit + " (" + d.tier + ")");
    });
    const p = bottleneck.primary_bottleneck || {};
    lines.push("", "Weakest area: **" + p.metric + "** (" + p.tier + " tier). Ask about benchmarks, trends, or best practices for a focused answer.");
    return {
      answer: lines.join("\n"),
      voice: "Overview ready. Weakest metric is " + p.metric + ".",
    };
  }

  function step(name, detail) {
    return { tool: name, detail: detail, status: "done" };
  }

  function runAgent(message, rows, sessionContext) {
    const ctx = sessionContext || {};
    const classified = classifyIntent(message, ctx);
    const intent = classified.intent;
    const matchedMetrics = classified.matched;
    const steps = [];
    const toolsCalled = [];
    const trends = {};

    steps.push(step("classify_intent", (INTENT_LABELS[intent] || intent) + ' — "' + message.slice(0, 60) + '"'));
    toolsCalled.push("classify_intent");

    const metricsResult = getDoraMetrics(rows, matchedMetrics.length ? matchedMetrics : null);
    steps.push(step("get_dora_metrics", "Loaded " + Object.keys(metricsResult.metrics).length + " metric(s)"));
    toolsCalled.push("get_dora_metrics");

    const metricKeys = matchedMetrics.length ? matchedMetrics : DORA_METRICS;
    metricKeys.forEach(function (metric) {
      trends[metric] = analyzeTrend(rows, metric);
      steps.push(step("analyze_trend", metric + ": " + trends[metric].direction + " (" + trends[metric].pct_change + "%)"));
      toolsCalled.push("analyze_trend");
    });

    const benchmark = compareBenchmark(rows, matchedMetrics.length ? matchedMetrics : null);
    const bottleneck = identifyBottleneck(rows);
    const primary = bottleneck.primary_bottleneck || {};
    let briefing;
    let focusMetric = matchedMetrics[0] || primary.metric || "Lead Time";

    if (intent === "metric_status") {
      briefing = formatMetricStatus(metricsResult, trends);
    } else if (intent === "benchmark_compare") {
      steps.push(step("compare_benchmark", "Compared " + benchmark.comparisons.length + " metrics to tiers"));
      toolsCalled.push("compare_benchmark");
      briefing = formatBenchmarkCompare(benchmark);
    } else if (intent === "performance_review") {
      steps.push(step("compare_benchmark", "Benchmark context loaded"));
      toolsCalled.push("compare_benchmark");
      briefing = formatPerformanceReview(rows, trends);
    } else if (intent === "bottleneck_diagnosis") {
      steps.push(step("identify_bottleneck", "Primary: " + (primary.metric || "N/A") + " (" + (primary.tier || "N/A") + ")"));
      toolsCalled.push("identify_bottleneck");
      const actionPlan = generateActionPlan(bottleneck);
      briefing = formatBottleneck(bottleneck, actionPlan);
      focusMetric = actionPlan.focus_metric;
    } else if (intent === "best_practice") {
      const rag = ragBestPractices(message, matchedMetrics);
      steps.push(step("rag_best_practices", "Retrieved practices for " + rag.focus));
      toolsCalled.push("rag_best_practices");
      const actionPlan = generateActionPlan(bottleneck, rag.focus);
      briefing = formatBestPractice(rag, actionPlan);
      focusMetric = rag.focus;
    } else if (intent === "follow_up") {
      const actionPlan = generateActionPlan(bottleneck, focusMetric);
      briefing = formatFollowUp(focusMetric, metricsResult, trends[focusMetric], actionPlan);
    } else {
      steps.push(step("identify_bottleneck", "Weakest: " + (primary.metric || "N/A")));
      toolsCalled.push("identify_bottleneck");
      briefing = formatGeneral(metricsResult, bottleneck);
    }

    steps.push(step("format_briefing", "Response tailored to: " + titleCaseIntent(intent)));

    const followUpsByIntent = {
      metric_status: ["Compare " + focusMetric + " to Elite benchmark", "What's the trend for " + focusMetric + "?", "What should we fix first?"],
      benchmark_compare: ["What should we fix first?", "How did we perform this quarter?", "Best practices to improve " + focusMetric],
      performance_review: ["What should we fix first?", "Compare to Elite benchmarks", "Best practices for our weakest metric"],
      bottleneck_diagnosis: ["Break down " + focusMetric + " by team", "Best practices for " + focusMetric, "Compare to Elite benchmarks"],
      best_practice: ["What's our " + focusMetric + " status?", "How did we perform this quarter?", "What should we fix first?"],
      follow_up: ["Compare to Elite benchmarks", "What should we fix first?", "How did we perform this quarter?"],
      general: ["What should we fix first?", "How did we perform this quarter?", "Compare to Elite benchmarks"],
    };

    return {
      intent: intent,
      answer: "**Intent:** " + titleCaseIntent(intent) + "\n\n" + briefing.answer,
      voice_summary: briefing.voice,
      steps: steps,
      tools_called: toolsCalled,
      metrics_used: metricsResult.metrics,
      bottleneck: bottleneck,
      follow_ups: followUpsByIntent[intent] || followUpsByIntent.general,
      guardrail: "All metric values sourced from uploaded CSV via tools — not LLM-generated numbers.",
      last_metric: focusMetric,
    };
  }

  global.DoraAgent = {
    parseMetricsFile: parseMetricsFile,
    runAgent: runAgent,
  };
})(typeof window !== "undefined" ? window : global);
