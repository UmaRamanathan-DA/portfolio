export function isDatabaseConfigured() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return false;
  if (url.includes("@HOST") || url.includes("USER:PASSWORD")) return false;
  return true;
}

export function isDemoMode() {
  return !isDatabaseConfigured();
}
