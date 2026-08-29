"use client";

import { useState } from "react";

export function GiftingInquiryForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      company: String(form.get("company") ?? ""),
      occasion: String(form.get("occasion") ?? ""),
      quantity: String(form.get("quantity") ?? ""),
      message: String(form.get("message") ?? ""),
    };

    try {
      const response = await fetch("/api/gifting-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not send your inquiry");
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="card p-6 text-center">
        <p className="text-lg font-semibold text-navy">Thank you — got it.</p>
        <p className="mt-2 text-sm text-charcoal/80">
          We reply to gifting and bulk-order inquiries within 2 business days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-charcoal">
          Your name
          <input name="name" required className="mt-1 w-full rounded-lg border border-charcoal/20 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium text-charcoal">
          Email
          <input name="email" type="email" required className="mt-1 w-full rounded-lg border border-charcoal/20 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium text-charcoal">
          Company (optional)
          <input name="company" className="mt-1 w-full rounded-lg border border-charcoal/20 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium text-charcoal">
          Occasion (optional)
          <input name="occasion" placeholder="Client gift, event favours, holiday order…" className="mt-1 w-full rounded-lg border border-charcoal/20 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium text-charcoal sm:col-span-2">
          Quantity (optional)
          <input name="quantity" placeholder="e.g. 25 pieces" className="mt-1 w-full rounded-lg border border-charcoal/20 px-3 py-2" />
        </label>
      </div>
      <label className="block text-sm font-medium text-charcoal">
        Tell us about the order
        <textarea name="message" required rows={4} className="mt-1 w-full rounded-lg border border-charcoal/20 px-3 py-2" />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={status === "loading"} className="btn-primary w-full min-h-[48px]">
        {status === "loading" ? "Sending…" : "Send inquiry"}
      </button>
    </form>
  );
}
