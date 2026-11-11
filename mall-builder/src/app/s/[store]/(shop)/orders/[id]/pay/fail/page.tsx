import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/store";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 결제창 실패·취소 주소 — 토스가 code·message를 붙여 보낸다. 주문은 입금 대기 그대로라 다시 결제하거나 취소할 수 있다
export default async function PayFailPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string; id: string }>;
  searchParams: Promise<{ code?: string; message?: string }>;
}) {
  const { store: slug, id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  await requireUser(`/s/${slug}/orders/${id}`);
  const { code, message } = await searchParams;
  const base = `/s/${slug}/orders/${id}`;
  const cancelled = code === "PAY_PROCESS_CANCELED" || code === "USER_CANCEL";
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-xl font-bold">{cancelled ? "결제를 취소했습니다" : "결제하지 못했습니다"}</h1>
      <p className="mt-3 rounded bg-amber-50 p-3 text-sm" data-pay-fail>
        {(message ?? "").slice(0, 200) || "결제가 끝나지 않았습니다."}
        {code && <span className="ml-1 text-xs text-gray-500">({code.slice(0, 60)})</span>}
      </p>
      <p className="mt-2 text-sm text-gray-600">주문은 아직 결제 대기 상태입니다. 다시 결제하거나, 주문 상세에서 주문을 취소할 수 있습니다.</p>
      <div className="mt-4 flex gap-2">
        <Link href={`${base}/pay`} className="min-h-11 rounded bg-gray-900 px-5 py-2 text-white">다시 결제하기</Link>
        <Link href={base} className="min-h-11 rounded border px-5 py-2">주문 상세</Link>
      </div>
    </main>
  );
}
