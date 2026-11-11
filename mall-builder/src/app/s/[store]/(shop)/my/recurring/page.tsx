import Link from "next/link";
import { getStoreBySlug, requireUser } from "@/lib/store";
import { getMyRecurring, getRecurringRuns } from "@/lib/recurring-store";
import { RecurringList } from "../../../recurring-list";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// D30 손님 「내 정기 주문」 — 주기·다음 주문일·지난 회차, 일시정지·건너뛰기·해지·수량 바꾸기
export default async function MyRecurringPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ error?: string; ok?: string; msg?: string }> }) {
  const { store: slug } = await params;
  const { error, ok, msg } = await searchParams;
  const user = await requireUser(`/s/${slug}/my/recurring`);
  const store = await getStoreBySlug(slug);
  const rows = await getMyRecurring(store.id, user.id);
  const runs = await getRecurringRuns(store.id, rows.map((r) => r.id), 200);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-xl font-bold">🔁 정기 주문</h1>
        <Link href={`/s/${store.slug}/my`} className="ml-auto text-sm underline">← 마이페이지</Link>
      </div>
      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{msg || "처리했습니다."}</p>}
      <p className="mb-4 text-sm text-gray-600">주문일 아침(8시 이후)에 같은 품목을 자동으로 주문합니다. 가격은 그날 가격으로 다시 계산되고, 품절·한도 초과면 주문하지 않고 문자로 알려 드립니다.</p>
      <RecurringList slug={store.slug} rows={rows} runs={runs} back={`/s/${store.slug}/my/recurring`} />
    </main>
  );
}
