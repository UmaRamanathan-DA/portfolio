import { OrderConfirmationClient } from "@/components/OrderConfirmationClient";

export default function OrderPage({
  params,
}: {
  params: { sessionId: string };
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <OrderConfirmationClient sessionId={params.sessionId} />
    </div>
  );
}
