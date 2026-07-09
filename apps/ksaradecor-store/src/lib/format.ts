export function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function productImageSrc(path: string) {
  if (!path) return "/images/placeholder-collection.svg";
  if (path.startsWith("http")) return path;
  return path.startsWith("/") ? path : `/images/${path}`;
}
