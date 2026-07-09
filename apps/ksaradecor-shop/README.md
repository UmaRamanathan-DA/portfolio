# Ksara Decor Shop

End-to-end ecommerce webshop for hand-painted bottle art. Flask backend + SQLite cart tracking.

## Run locally

```bash
cd apps/ksaradecor-shop
chmod +x run.sh
./run.sh
```

Open **http://127.0.0.1:5001**

- **Shop:** `/` — browse collections and add to cart
- **Cart:** `/cart`
- **Analytics:** `/admin` — see real visitor and add-to-cart events
- **API:** `/api/analytics`, `/api/cart/add`, etc.

## Add collection photos

Drop images into `images/KsaraDecor/collections/` using the filenames listed in `images/KsaraDecor/collections/README.md`. File paths are configured in `data/collections.json`.

Walrus collection images already use files in `images/KsaraDecor/`. Missing images show an automatic placeholder until you add them.

## Cart tracking

Each visitor gets a session ID. Every add, update, and remove is logged in SQLite (`data/shop.db`):

- `visitors` — unique sessions with user agent and referrer
- `cart_events` — full event log for analytics
- `cart_items` — current cart state per visitor

## Deploy

Set `SECRET_KEY`, `FLASK_ENV=production`, and optionally `DATABASE_PATH` for persistent storage on Render/Railway/Fly.

```bash
gunicorn -w 2 -b 0.0.0.0:$PORT "app:create_app('production')"
```

## Customize catalog

Edit `data/collections.json` to add collections, products, prices, and image paths.
