export const BRAND = {
  name: "Ksara Decor",
  tagline: "No more out of the box — think out of the bottle.",
} as const;

export const COLORS = {
  peach: "#e6b8af",
  peachLight: "#f2d4cc",
  charcoal: "#2d2d2d",
  navy: "#1a2b56",
  teal: "#7bc8d4",
  white: "#ffffff",
} as const;

export const CART_COOKIE = "ksd_cart_id";
export const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// TODO: Enable Stripe Tax when ready for automatic tax calculation
export const STRIPE_TAX_ENABLED = false;

export const SHIPPING_RATES = {
  domestic: {
    id: "domestic_flat",
    label: "Domestic shipping",
    amountCents: 800,
    countries: ["US"],
  },
  international: {
    id: "international_flat",
    label: "International shipping",
    amountCents: 2200,
    countries: ["*"],
  },
} as const;

export const PLACEHOLDER_IMAGE = "/images/placeholder-collection.svg";
