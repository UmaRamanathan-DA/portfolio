import json
import os

from flask import current_app


def load_catalog():
    path = current_app.config["COLLECTIONS_PATH"]
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def get_collections():
    return load_catalog()["collections"]


def get_product_map():
    products = {}
    for collection in get_collections():
        for product in collection["products"]:
            products[product["id"]] = {
                **product,
                "collection_id": collection["id"],
                "collection_name": collection["name"],
            }
    return products


def get_product(product_id):
    return get_product_map().get(product_id)


def resolve_image(image_path):
    """Return URL path for a catalog image. Placeholders use /media/; missing files fall back."""
    if not image_path:
        return None
    if image_path.startswith("http://") or image_path.startswith("https://"):
        return image_path
    media_root = current_app.config["MEDIA_ROOT"]
    full_path = os.path.join(media_root, image_path)
    if os.path.isfile(full_path):
        return f"/media/{image_path}"
    return "/static/images/placeholder-collection.svg"
