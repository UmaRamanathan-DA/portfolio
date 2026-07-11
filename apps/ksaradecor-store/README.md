# Ksara Decor Store

Mobile-first ecommerce webshop for one-of-a-kind hand-painted bottle art.

**Stack:** Next.js 14 · TypeScript · Tailwind · Prisma · PostgreSQL · Stripe Checkout · Resend · Vercel

## Business rule

Each product is qty **1**. When Stripe confirms payment (`checkout.session.completed` webhook), `Product.isSold` flips to `true` everywhere. Sold items stay visible with a **Sold** badge but cannot be added to cart.

## Setup

### 1. Database (Neon or Supabase free tier)

Create a Postgres database and copy the connection string.

```bash
cp .env.example .env
# Edit DATABASE_URL and other keys
```

### 2. Install & migrate

```bash
npm install
npm run db:push
npm run db:seed
```

### 3. Stripe

1. Create products are created dynamically at checkout — no Stripe Product catalog needed.
2. Add webhook endpoint: `https://your-domain.vercel.app/api/webhooks/stripe`
3. Listen for `checkout.session.completed`
4. For local dev: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### 4. Run locally

```bash
npm run dev
```

Open **http://localhost:3000**

**No database yet?** The shop runs in **demo mode** automatically — you can browse collections and add to cart. Checkout needs a real `DATABASE_URL` (see `.env.example`).

## User flow

1. **Home** — hero + collection grid
2. **Collection** — products with Sold badge overlay
3. **Product** — image gallery, add to cart (disabled if sold)
4. **Cart** — sticky mobile checkout CTA, qty capped at 1
5. **Stripe Checkout** — shipping address + domestic/international flat rates
6. **Webhook** — creates order, marks products sold, sends email
7. **Order confirmation** — polls until webhook lands

## Collection images

Add photos to `public/images/collections/` (see `public/images/collections/README.md`). Walrus images and hero art are already copied from the portfolio repo.

## Deploy (Vercel)

1. Import repo / set root to `apps/ksaradecor-store`
2. Add env vars from `.env.example`
3. Build command: `npm run build`
4. Add Stripe webhook URL for production

## TODO

- [ ] Enable Stripe Tax (`STRIPE_TAX_ENABLED` in `src/lib/constants.ts`)
- [ ] Replace flat shipping with live carrier rates
- [ ] Admin dashboard for orders
