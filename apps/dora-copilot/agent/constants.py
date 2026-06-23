DORA_METRICS = [
    "Deployment Frequency",
    "Lead Time",
    "Change Failure Rate",
    "MTTR",
]

METRIC_ALIASES = {
    "Deployment Frequency": ["deployment frequency", "deploy frequency", "deployment rate", "deployments"],
    "Lead Time": ["lead time", "lead-time", "time to deploy", "delivery time"],
    "Change Failure Rate": ["change failure rate", "failure rate", "cfr", "change failure"],
    "MTTR": ["mttr", "mean time to recover", "recovery time", "time to restore"],
}

BENCHMARKS = {
    "Deployment Frequency": {"direction": "higher_is_better", "elite": 1.0, "high": 0.5, "medium": 0.2, "unit": "deployments/day"},
    "Lead Time": {"direction": "lower_is_better", "elite": 24, "high": 168, "medium": 720, "unit": "hours"},
    "Change Failure Rate": {"direction": "lower_is_better", "elite": 10, "high": 15, "medium": 30, "unit": "%"},
    "MTTR": {"direction": "lower_is_better", "elite": 1, "high": 24, "medium": 168, "unit": "hours"},
}

INTENT_LABELS = {
    "metric_status": "Metric status query",
    "performance_review": "Performance review",
    "bottleneck_diagnosis": "Bottleneck diagnosis",
    "benchmark_compare": "Benchmark comparison",
    "best_practice": "Best practice guidance",
    "follow_up": "Follow-up / clarification",
    "general": "General DORA analysis",
}

BEST_PRACTICES = {
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
    "MTTR": [
        "Maintain runbooks and on-call escalation paths for common incidents.",
        "Improve observability so teams detect and diagnose issues faster.",
    ],
}

FOLLOW_UPS = {
    "metric_status": lambda f: [f"Compare {f} to Elite benchmark", f"What's the trend for {f}?", "What should we fix first?"],
    "benchmark_compare": lambda f: ["What should we fix first?", "How did we perform this quarter?", f"Best practices to improve {f}"],
    "performance_review": lambda f: ["What should we fix first?", "Compare to Elite benchmarks", "Best practices for our weakest metric"],
    "bottleneck_diagnosis": lambda f: [f"Break down {f} by team", f"Best practices for {f}", "Compare to Elite benchmarks"],
    "best_practice": lambda f: [f"What's our {f} status?", "How did we perform this quarter?", "What should we fix first?"],
    "follow_up": lambda f: ["Compare to Elite benchmarks", "What should we fix first?", "How did we perform this quarter?"],
    "general": lambda f: ["What should we fix first?", "How did we perform this quarter?", "Compare to Elite benchmarks"],
}

ACTIONS = {
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
    "MTTR": [
        "Standardize runbooks and on-call escalation paths",
        "Improve observability with service-level alerts tied to SLOs",
        "Practice game-day incident drills quarterly",
    ],
    "Deployment Frequency": [
        "Remove environment provisioning bottlenecks via IaC",
        "Shift-left security and quality checks into PR validation",
        "Enable trunk-based development with feature flags",
    ],
}
