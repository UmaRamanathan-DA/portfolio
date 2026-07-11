import { isDemoMode } from "@/lib/db-config";

export function DemoBanner() {
  if (!isDemoMode()) return null;

  return (
    <div className="border-b border-navy/10 bg-navy px-4 py-2 text-center text-sm text-white">
      Demo mode — browsing and cart work locally. Add a real{" "}
      <code className="rounded bg-white/10 px-1">DATABASE_URL</code> in{" "}
      <code className="rounded bg-white/10 px-1">.env</code> for checkout and orders.
    </div>
  );
}
