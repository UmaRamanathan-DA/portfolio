#!/usr/bin/env python3
"""seed_demo.py — materializes sample/service.py from sample/service.template.py.

Prompts for each placeholder value interactively (press Enter to accept the
shown fake default) and writes the filled-in result to sample/service.py.
That file is gitignored — generated fresh each time you run this, never
committed, so nothing secret-shaped ever reaches GitHub. Only this script
and the template (both placeholder-only) are tracked.

    python sample/seed_demo.py
"""

import re
from pathlib import Path

TEMPLATE_PATH = Path(__file__).parent / "service.template.py"
OUTPUT_PATH = Path(__file__).parent / "service.py"

# Fake defaults shown as a convenience — not real credentials. Press Enter
# to accept one, or type your own value for that placeholder.
DEFAULTS = {
    "AWS_SECRET_ACCESS_KEY": "AKIA" + "IOSFODNN7EXAMPLE",
    "STRIPE_API_KEY": "sk_" + "live_4242424242424242424242424242",
    "ON_CALL_CONTACT": "finance-ops@example-corp.com",
}


def find_placeholders(template_text: str) -> list:
    return re.findall(r"\{\{([A-Z0-9_]+)\}\}", template_text)


def main():
    template_text = TEMPLATE_PATH.read_text(encoding="utf-8")
    placeholders = find_placeholders(template_text)

    print("Filling sample/service.py from its template — press Enter to accept the default.\n")

    values = {}
    for name in placeholders:
        default = DEFAULTS.get(name, "")
        prompt = f"{name} [{default}]: " if default else f"{name}: "
        entered = input(prompt).strip()
        values[name] = entered or default

    filled = template_text
    for name, value in values.items():
        filled = filled.replace("{{" + name + "}}", value)

    OUTPUT_PATH.write_text(filled, encoding="utf-8")
    print(f"\nWrote {OUTPUT_PATH} (gitignored, local only, not committed).")


if __name__ == "__main__":
    main()
