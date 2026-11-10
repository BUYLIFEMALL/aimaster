import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABEL, PLATFORM_LABEL, kstLabel } from "@/lib/dashboard";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const TABS = [
  { id: "all", label: "전체", statuses: null },
  { id: "ready", label: "발행 준비", statuses: ["ready", "writing", "failed"] },
  { id: "draft", label: "초안", statuses: ["draft"] },
  { id: "scheduled", label: "예약", statuses: ["scheduled"] },
  { id: "published", label: "발행됨", statuses: ["published"] },
  { id: "check", label: "확인 필요", statuses: ["uncertain", "publishing"] },
] as const;

type Row = { id: string; platform: string; status: string; title: string; topic: string | null; scheduled_at: string | null; published_at: string | null; remote_url: string | null; created_at: string; expires_at: string | null };

export default async function PostsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireProgramAccess();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.id === sp.tab) ?? TABS[0];
  const supabase = await createClient();
  // 회원 세션으로 읽는다(RLS: 본인 원고만)
  let q = supabase.from("wba_posts").select("id, platform, status, title, topic, scheduled_at, published_at, remote_url, created_at, expires_at").order("created_at", { ascending: false }).limit(200);
  if (tab.statuses) q = q.in("status", [...tab.statuses]);
  const { data } = await q;
  const rows = (data ?? []) as Row[];
  const { data: all } = await supabase.from("wba_posts").select("status").limit(1000);
  const count = (statuses: readonly string[] | null) => (statuses ? (all ?? []).filter((r) => statuses.includes(r.status)).length : (all ?? []).length);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-extrabold text-blue-700">📚 보관함</span>
          <h1 className="mt-2 text-3xl font-black">보관함·발행 결과</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">발행하지 않은 원고는 만든 날부터 30일 보관합니다. 구글 블로그에 실제로 발행된 글의 이미지는 발행일부터 1년 보관합니다. 블로그에 올라간 글은 블로그에 그대로 남습니다.</p>
        </div>
        <Link href="/write" className="lp-btn">＋ 새 원고 만들기</Link>
      </div>

      <nav className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link key={t.id} href={t.id === "all" ? "/posts" : `/posts?tab=${t.id}`} className={`rounded-full px-3.5 py-1.5 text-sm font-bold ${t.id === tab.id ? "bg-[color:var(--navy)] text-white" : "bg-white text-[color:var(--foreground)] shadow-sm"} ${t.id === "check" && count(t.statuses) > 0 ? "ring-2 ring-red-400" : ""}`}>
            {t.label} {count(t.statuses)}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="lp-card text-sm text-[color:var(--muted)]">{tab.id === "all" ? "아직 원고가 없습니다. 「새 원고 만들기」로 시작해 보세요." : "이 상태의 원고가 없습니다."}</p>
      ) : (
        <div className="lp-card overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr className="text-left text-xs text-[color:var(--muted)]"><th className="px-3">상태</th><th className="px-3">블로그</th><th className="px-3">제목</th><th className="px-3">날짜</th><th className="px-3">블로그 글</th></tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const [label, cls] = STATUS_LABEL[p.status] ?? [p.status, "lp-tag-idle"];
                const when = p.status === "scheduled" && p.scheduled_at ? `예약 ${kstLabel(p.scheduled_at)}` : p.published_at ? `발행 ${kstLabel(p.published_at)}` : `작성 ${kstLabel(p.created_at)}`;
                return (
                  <tr key={p.id} className="bg-[color:var(--surface-soft)]">
                    <td className="rounded-l-xl px-3 py-2.5"><span className={`lp-tag ${cls}`}>{label}</span></td>
                    <td className="px-3"><span className={`lp-tag ${p.platform === "wordpress" ? "lp-tag-wp" : "lp-tag-blogger"}`}>{PLATFORM_LABEL[p.platform]}</span></td>
                    <td className="px-3 font-semibold"><Link href={`/posts/${p.id}`} className="hover:underline">{p.title || p.topic || "(제목 없음)"}</Link></td>
                    <td className="whitespace-nowrap px-3 text-xs">{when}</td>
                    <td className="rounded-r-xl px-3 text-xs">{p.remote_url ? <a href={p.remote_url} target="_blank" rel="noreferrer" className="text-blue-700 underline">열기 ↗</a> : p.status === "uncertain" ? <Link href={`/posts/${p.id}`} className="font-bold text-red-600 underline">확인하기</Link> : "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
