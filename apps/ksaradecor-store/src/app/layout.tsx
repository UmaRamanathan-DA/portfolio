import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { BRAND } from "@/lib/constants";
import { getCartWithProducts, getOrCreateCartId } from "@/lib/cart";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: `${BRAND.name} — Hand-painted bottle art`,
  description: BRAND.tagline,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let cartCount = 0;
  try {
    const cartId = await getOrCreateCartId();
    const cart = await getCartWithProducts(cartId);
    cartCount = cart.itemCount;
  } catch {
    cartCount = 0;
  }

  return (
    <html lang="en">
      <body className={`${poppins.variable} font-sans`}>
        <SiteHeader cartCount={cartCount} />
        <main className="min-h-screen pb-8">{children}</main>
      </body>
    </html>
  );
}
