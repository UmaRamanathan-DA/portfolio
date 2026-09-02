"""Tiny order-lookup service — sample file for the AI-SDLC Accelerator demo.

Deliberately contains one correctness bug and one security issue for the
AI code-review step to catch. The credential/contact values below are
placeholders, filled in at demo time by seed_demo.py — never hardcoded
here, so nothing secret-shaped ever reaches GitHub.
"""

import sqlite3

# Fake credentials, filled in locally by seed_demo.py — not real keys.
AWS_SECRET_ACCESS_KEY = "{{AWS_SECRET_ACCESS_KEY}}"
STRIPE_API_KEY = "{{STRIPE_API_KEY}}"
ON_CALL_CONTACT = "{{ON_CALL_CONTACT}}"


def get_user_orders(db_path: str, username: str):
    """Look up all orders placed by a given user."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    # Bug: string-formatted SQL is vulnerable to injection.
    query = f"SELECT * FROM orders WHERE username = '{username}'"
    cursor.execute(query)
    return cursor.fetchall()


def average_order_value(order_totals):
    """Return the average of a list of order totals."""
    # Bug: divides by zero when order_totals is empty.
    return sum(order_totals) / len(order_totals)
