import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { formatWon } from "@/lib/format";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// B2 저장한 주소 리포트 목록(2026-11-03). 회원 본인 것만(RLS + user_id 조건), 최근 50개.
type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
type Row = { id: string; title: string; subtitle: string | null; asking_price: number | null; ai_summary: string | null; created_at: string };

const dateLabel = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function SavedReportsPage() {
  const user = await requireProgramAccess();
  const db = (await createClient()) as unknown as SupabaseLike;
  const { data } = await db
    .from("real_estate_saved_reports")
    .select("id, title, subtitle, asking_price, ai_summary, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const rows = (data ?? []) as Row[];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <Link href="/report" className="inline-flex min-h-[40px] items-center text-sm text-mx-muted hover:text-mx-text">← 주소 리포트</Link>
      <h1 className="text-2xl font-black text-mx-text">💾 저장한 리포트</h1>
      <p className="text-sm text-mx-muted">저장할 때의 숫자·호가가 그대로 남아요. 저장 기간은 1년이고, 언제든 지울 수 있어요.</p>
      <div className="mx-card p-5">
        {rows.length === 0 ? (
          <p className="text-sm text-mx-muted">아직 저장한 리포트가 없어요. 주소 리포트를 열고 「💾 리포트 저장」을 누르세요.</p>
        ) : (
          <ul className="divide-y divide-mx-border text-sm">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`/report/saved/${r.id}`} className="flex min-h-[52px] flex-wrap items-center justify-between gap-2 py-2 text-mx-text hover:text-mx-link">
                  <span className="min-w-0">
                    <b className="block truncate">{r.title}</b>
                    <span className="block truncate text-xs text-mx-muted">{r.subtitle}</span>
                  </span>
                  <span className="shrink-0 text-right text-xs text-mx-muted">
                    {r.asking_price ? `호가 ${formatWon(r.asking_price)} · ` : ""}
                    {r.ai_summary ? "🧠 총평 있음 · " : ""}
                    {dateLabel(r.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
