import { GiftingInquiryForm } from "@/components/GiftingInquiryForm";

export const metadata = {
  title: "Corporate & Event Gifting — Ksara Decor",
};

export default function GiftingPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <p className="text-sm font-medium uppercase tracking-widest text-navy">Corporate &amp; event gifting</p>
      <h1 className="mt-2 text-2xl font-semibold text-charcoal sm:text-3xl">
        The most memorable gift is the one that used to be trash.
      </h1>
      <p className="mt-3 text-sm text-charcoal/80">
        Bulk orders for client gifts, employee appreciation, or event favours — each piece hand-painted
        and rescued from a discarded bottle. Tell us the occasion and quantity, and we&apos;ll follow up
        with pricing and lead time.
      </p>
      <div className="mt-6">
        <GiftingInquiryForm />
      </div>
    </div>
  );
}
