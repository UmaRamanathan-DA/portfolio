import sqlite3
from datetime import datetime, timezone

from flask import current_app, g


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(current_app.config["DATABASE_PATH"])
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def close_db(_exc=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = get_db()
    db.executescript(
        """
        CREATE TABLE IF NOT EXISTS visitors (
            id TEXT PRIMARY KEY,
            first_seen TEXT NOT NULL,
            last_seen TEXT NOT NULL,
            user_agent TEXT,
            referrer TEXT
        );

        CREATE TABLE IF NOT EXISTS cart_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            visitor_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            product_name TEXT NOT NULL,
            collection_id TEXT NOT NULL,
            action TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            price REAL NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (visitor_id) REFERENCES visitors(id)
        );

        CREATE TABLE IF NOT EXISTS cart_items (
            visitor_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (visitor_id, product_id),
            FOREIGN KEY (visitor_id) REFERENCES visitors(id)
        );

        CREATE INDEX IF NOT EXISTS idx_cart_events_visitor ON cart_events(visitor_id);
        CREATE INDEX IF NOT EXISTS idx_cart_events_created ON cart_events(created_at);
        """
    )
    db.commit()


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def upsert_visitor(visitor_id, user_agent=None, referrer=None):
    db = get_db()
    now = utc_now()
    db.execute(
        """
        INSERT INTO visitors (id, first_seen, last_seen, user_agent, referrer)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            last_seen = excluded.last_seen,
            user_agent = COALESCE(excluded.user_agent, visitors.user_agent),
            referrer = COALESCE(excluded.referrer, visitors.referrer)
        """,
        (visitor_id, now, now, user_agent, referrer),
    )
    db.commit()


def log_cart_event(visitor_id, product, action, quantity=1):
    db = get_db()
    db.execute(
        """
        INSERT INTO cart_events (
            visitor_id, product_id, product_name, collection_id,
            action, quantity, price, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            visitor_id,
            product["id"],
            product["name"],
            product["collection_id"],
            action,
            quantity,
            product["price"],
            utc_now(),
        ),
    )
    db.commit()


def add_cart_item(visitor_id, product_id, quantity=1):
    db = get_db()
    now = utc_now()
    db.execute(
        """
        INSERT INTO cart_items (visitor_id, product_id, quantity, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(visitor_id, product_id) DO UPDATE SET
            quantity = cart_items.quantity + excluded.quantity,
            updated_at = excluded.updated_at
        """,
        (visitor_id, product_id, quantity, now),
    )
    db.commit()


def remove_cart_item(visitor_id, product_id):
    db = get_db()
    db.execute(
        "DELETE FROM cart_items WHERE visitor_id = ? AND product_id = ?",
        (visitor_id, product_id),
    )
    db.commit()


def update_cart_item(visitor_id, product_id, quantity):
    db = get_db()
    if quantity <= 0:
        remove_cart_item(visitor_id, product_id)
        return
    db.execute(
        """
        UPDATE cart_items SET quantity = ?, updated_at = ?
        WHERE visitor_id = ? AND product_id = ?
        """,
        (quantity, utc_now(), visitor_id, product_id),
    )
    db.commit()


def get_cart_items(visitor_id):
    db = get_db()
    rows = db.execute(
        "SELECT product_id, quantity FROM cart_items WHERE visitor_id = ?",
        (visitor_id,),
    ).fetchall()
    return {row["product_id"]: row["quantity"] for row in rows}


def get_cart_events(limit=200):
    db = get_db()
    return db.execute(
        """
        SELECT ce.*, v.user_agent, v.referrer
        FROM cart_events ce
        LEFT JOIN visitors v ON v.id = ce.visitor_id
        ORDER BY ce.created_at DESC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()


def get_analytics_summary():
    db = get_db()
    return {
        "total_visitors": db.execute("SELECT COUNT(*) AS c FROM visitors").fetchone()["c"],
        "total_add_to_cart": db.execute(
            "SELECT COUNT(*) AS c FROM cart_events WHERE action = 'add'"
        ).fetchone()["c"],
        "unique_products_added": db.execute(
            "SELECT COUNT(DISTINCT product_id) AS c FROM cart_events WHERE action = 'add'"
        ).fetchone()["c"],
        "active_carts": db.execute(
            "SELECT COUNT(DISTINCT visitor_id) AS c FROM cart_items"
        ).fetchone()["c"],
    }
