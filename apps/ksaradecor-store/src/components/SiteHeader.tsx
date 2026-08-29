import Link from "next/link";
import { BRAND } from "@/lib/constants";

export function SiteHeader({ cartCount }: { cartCount: number }) {
  return (
    <header className="sticky top-0 z-50 border-b border-charcoal/10 bg-peach-light/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="min-w-0">
          <span className="block text-lg font-semibold text-charcoal">{BRAND.name}</span>
          <span className="block truncate text-xs text-charcoal/75">Hand-painted bottle art</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/gifting" className="hidden text-sm font-medium text-charcoal/80 hover:text-navy sm:block">
            Corporate gifting
          </Link>
          <Link href="/cart" className="btn-primary relative min-h-[44px] min-w-[44px] px-4 py-2 text-sm">
            Cart
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-teal px-1 text-xs font-semibold text-charcoal">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
