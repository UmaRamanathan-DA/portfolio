import os
import uuid

from flask import Blueprint, current_app, g, jsonify, render_template, request, send_from_directory, session

from app.catalog import get_collections, get_product, get_product_map, resolve_image
from app.database import (
    add_cart_item,
    get_analytics_summary,
    get_cart_events,
    get_cart_items,
    init_db,
    log_cart_event,
    remove_cart_item,
    update_cart_item,
    upsert_visitor,
)

bp = Blueprint("shop", __name__)


def _ensure_visitor():
    if "visitor_id" not in session:
        session["visitor_id"] = str(uuid.uuid4())
    visitor_id = session["visitor_id"]
    upsert_visitor(
        visitor_id,
        user_agent=request.headers.get("User-Agent"),
        referrer=request.headers.get("Referer"),
    )
    return visitor_id


def _enrich_collections():
    collections = []
    for collection in get_collections():
        products = []
        for product in collection["products"]:
            products.append(
                {
                    **product,
                    "image_url": resolve_image(product.get("image")),
                    "collection_id": collection["id"],
                }
            )
        collections.append(
            {
                **collection,
                "image_url": resolve_image(collection.get("image")),
                "products": products,
            }
        )
    return collections


def get_cart_enriched(visitor_id):
    cart = get_cart_items(visitor_id)
    product_map = get_product_map()
    items = []
    subtotal = 0.0
    for product_id, quantity in cart.items():
        product = product_map.get(product_id)
        if not product:
            continue
        line_total = product["price"] * quantity
        subtotal += line_total
        items.append(
            {
                **product,
                "quantity": quantity,
                "line_total": round(line_total, 2),
                "image_url": resolve_image(product.get("image")),
            }
        )
    return {"items": items, "subtotal": round(subtotal, 2), "item_count": sum(cart.values())}


@bp.route("/")
def index():
    _ensure_visitor()
    return render_template(
        "shop.html",
        collections=_enrich_collections(),
        cart_count=get_cart_enriched(session["visitor_id"])["item_count"],
    )


@bp.route("/cart")
def cart_page():
    visitor_id = _ensure_visitor()
    cart = get_cart_enriched(visitor_id)
    return render_template("cart.html", cart=cart, cart_count=cart["item_count"])


@bp.route("/admin")
def admin_page():
    visitor_id = _ensure_visitor()
    summary = get_analytics_summary()
    events = get_cart_events()
    cart_count = get_cart_enriched(visitor_id)["item_count"]
    return render_template("admin.html", summary=summary, events=events, cart_count=cart_count)


@bp.route("/media/<path:filename>")
def media(filename):
    return send_from_directory(current_app.config["MEDIA_ROOT"], filename)


@bp.route("/api/health")
def health():
    return jsonify({"status": "ok", "app": "ksaradecor-shop", "version": "1.0.0"})


@bp.route("/api/collections")
def api_collections():
    return jsonify({"collections": _enrich_collections()})


@bp.route("/api/cart", methods=["GET"])
def api_get_cart():
    visitor_id = _ensure_visitor()
    return jsonify(get_cart_enriched(visitor_id))


@bp.route("/api/cart/add", methods=["POST"])
def api_add_to_cart():
    visitor_id = _ensure_visitor()
    data = request.get_json(silent=True) or {}
    product_id = data.get("product_id")
    quantity = int(data.get("quantity", 1))
    if not product_id or quantity < 1:
        return jsonify({"error": "product_id and positive quantity required"}), 400

    product = get_product(product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    if not product.get("in_stock", True):
        return jsonify({"error": "Product is sold out"}), 400

    add_cart_item(visitor_id, product_id, quantity)
    log_cart_event(visitor_id, product, "add", quantity)
    cart = get_cart_enriched(visitor_id)
    return jsonify({"message": "Added to cart", "cart": cart})


@bp.route("/api/cart/update", methods=["POST"])
def api_update_cart():
    visitor_id = _ensure_visitor()
    data = request.get_json(silent=True) or {}
    product_id = data.get("product_id")
    quantity = int(data.get("quantity", 0))
    if not product_id:
        return jsonify({"error": "product_id required"}), 400

    product = get_product(product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404

    if quantity <= 0:
        remove_cart_item(visitor_id, product_id)
        log_cart_event(visitor_id, product, "remove", 0)
    else:
        update_cart_item(visitor_id, product_id, quantity)
        log_cart_event(visitor_id, product, "update", quantity)

    return jsonify({"cart": get_cart_enriched(visitor_id)})


@bp.route("/api/cart/remove", methods=["POST"])
def api_remove_from_cart():
    visitor_id = _ensure_visitor()
    data = request.get_json(silent=True) or {}
    product_id = data.get("product_id")
    if not product_id:
        return jsonify({"error": "product_id required"}), 400

    product = get_product(product_id)
    if product:
        log_cart_event(visitor_id, product, "remove", 0)
    remove_cart_item(visitor_id, product_id)
    return jsonify({"cart": get_cart_enriched(visitor_id)})


@bp.route("/api/analytics")
def api_analytics():
    return jsonify(
        {
            "summary": get_analytics_summary(),
            "recent_events": [
                dict(row) for row in get_cart_events(limit=50)
            ],
        }
    )


@bp.before_app_request
def _db_init_once():
    if not hasattr(g, "_db_initialized"):
        init_db()
        g._db_initialized = True
