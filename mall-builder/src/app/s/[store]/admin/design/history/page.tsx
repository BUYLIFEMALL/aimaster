import Link from "next/link";
import { getStaffStore } from "@/lib/store";
import { getDesignHistory } from "@/lib/builder/design-store";
import { summarizeSnapshot } from "@/lib/builder/history";
import { NoPermission } from "../../admin-shell";
import RestoreButton from "./restore-button";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 디자인 빌더 D6 — 게시 기록(최근 20번). 「이 판으로 되돌리기」는 그 판을 초안으로만 복사하고, 편집기에서 확인한 뒤 게시해야 손님 화면이 바뀐다
export default async function DesignHistoryPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/design/history`);
  if (!staff) return <NoPermission />;
  const rows = await getDesignHistory(store.id);
  const fmt = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" });

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-4" data-history-page>
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
          <Link href={`/s/${store.slug}/admin/design`} className="font-semibold text-gray-800 hover:underline">← 디자인 편집으로</Link>
          <span>손님 화면에 게시할 때마다 그때 모습이 저장됩니다(최근 20번). <b>되돌리기는 초안만 바꿉니다</b> — 편집기에서 확인하고 게시해야 손님 화면이 바뀝니다.</span>
        </div>
        <h1 className="text-xl font-black tracking-tight text-gray-900">🕘 게시 기록</h1>
        {rows.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
            아직 기록이 없습니다. 디자인 편집에서 「손님 화면에 게시」를 누르면 그때부터 남습니다.
          </p>
        ) : (
          <ol className="mt-4 space-y-2" data-history-list>
            {rows.map((r, i) => {
              const s = summarizeSnapshot(r.snapshot);
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm" data-history-row>
                  <span className="h-6 w-6 shrink-0 rounded-full border border-gray-200" style={{ background: s.primary || "#e5e7eb" }} title={s.primary ? `포인트색 ${s.primary}` : "기본 색"} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {fmt.format(new Date(r.createdAt))}
                      {i === 0 && <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">지금 손님 화면</span>}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      첫 화면 블록 {s.shownBlocks}개{s.blocks > s.shownBlocks ? `(숨김 ${s.blocks - s.shownBlocks})` : ""}
                      {s.firstBlock && ` · 맨 위 ${s.firstBlock}`} · {s.parts.join("·") || "내용 없음"}
                    </p>
                  </div>
                  {i > 0 && <RestoreButton slug={store.slug} storeId={store.id} historyId={r.id} />}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
