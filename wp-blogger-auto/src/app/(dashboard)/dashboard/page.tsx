import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { listConnections, type BlogConnection } from "@/lib/connections";
import { summarize, nextScheduled, countdown, kstLabel, STATUS_LABEL, PLATFORM_LABEL, type PostLite } from "@/lib/dashboard";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function Pad({ platform, conn, next }: { platform: "wordpress" | "blogger"; conn?: BlogConnection; next: PostLite | null }) {
  const label = PLATFORM_LABEL[platform];
  if (!conn) {
    return (
      <div className="lp-pad lp-pad-off">
        <div className="font-extrabold">{platform === "wordpress" ? "🅦" : "🅑"} {label} 발사대</div>
        <div className="mt-3 text-2xl font-black">아직 연결 전</div>
        <p className="mt-1 text-sm opacity-90">한 번만 연결하면 다음부터는 묻지 않습니다.</p>
        <Link href="/connect" className="mt-4 inline-block rounded-xl bg-white px-4 py-2 text-sm font-extrabold text-slate-700">🔗 연결하러 가기</Link>
      </div>
    );
  }
  return (
    <div className={`lp-pad ${platform === "wordpress" ? "lp-pad-wp" : "lp-pad-blogger"}`}>
      <div className="font-extrabold">{platform === "wordpress" ? "🅦" : "🅑"} {label} 발사대 · {conn.name || conn.address}</div>
      <div className="lp-count mt-2 text-5xl">{next?.scheduled_at ? countdown(next.scheduled_at) : "대기"}</div>
      <div className="mt-1 text-sm">{next ? `다음: ${next.title} · ${kstLabel(next.scheduled_at!)}` : "예약된 글이 없습니다"}</div>
      <div className="mt-2 text-xs opacity-90">{conn.needsReconnect ? "⚠️ 다시 연결이 필요합니다" : "연결됨"}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data } = await supabase
    .from("wba_posts")
    .select("id, platform, title, status, scheduled_at, published_at, remote_url, error_detail, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const posts = (data ?? []) as PostLite[];
  const conns = await listConnections(user.id);
  const s = summarize(posts);
  const upcoming = posts
    .filter((p) => p.status === "scheduled" && p.scheduled_at && Date.parse(p.scheduled_at) > Date.now())
    .sort((a, b) => Date.parse(a.scheduled_at!) - Date.parse(b.scheduled_at!))
    .slice(0, 3);
  const recent = posts.filter((p) => ["published", "draft", "failed", "uncertain"].includes(p.status)).slice(0, 6);
  const stats: [string, number][] = [["오늘 예약", s.todayScheduled], ["초안", s.drafts], ["이번 달 발행", s.publishedThisMonth], ["확인 필요", s.needsCheck]];

  return (
    <div className="space-y-6">
      <div>
        <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-extrabold text-blue-700">🚀 발사 관제실</span>
        <h1 className="mt-2 text-3xl font-black">오늘의 발행</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Pad platform="wordpress" conn={conns.find((c) => c.platform === "wordpress")} next={nextScheduled(posts, "wordpress")} />
        <Pad platform="blogger" conn={conns.find((c) => c.platform === "blogger")} next={nextScheduled(posts, "blogger")} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(([k, v]) => (
          <div key={k} className="lp-card">
            <div className="text-xs font-extrabold text-[color:var(--muted)]">{k}</div>
            <div className={`lp-count text-4xl ${k === "확인 필요" && v > 0 ? "text-red-600" : ""}`}>{v}</div>
          </div>
        ))}
      </div>

      <section>
        <h2 className="text-xl font-black">⏱ 발사 순서</h2>
        {upcoming.length === 0 ? (
          <p className="lp-card mt-3 text-sm text-[color:var(--muted)]">예약된 글이 없습니다. 원고를 만들고 「예약 발행」을 고르면 여기에 나옵니다.</p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {upcoming.map((p) => (
              <div key={p.id} className="lp-card" style={{ boxShadow: `inset 0 6px 0 ${p.platform === "wordpress" ? "var(--wp)" : "var(--blogger)"}, 0 8px 26px rgba(15,42,74,.09)` }}>
                <div className="text-xs font-extrabold text-[color:var(--muted)]">{kstLabel(p.scheduled_at!)} · {PLATFORM_LABEL[p.platform]}</div>
                <div className="mt-1 font-black">{p.title || "(제목 없음)"}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="lp-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black">최근 결과</h2>
          <Link href="/write" className="lp-btn">＋ 새 원고 만들기</Link>
        </div>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-[color:var(--muted)]">아직 올린 글이 없습니다.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-2 text-sm">
              <tbody>
                {recent.map((p) => {
                  const [label, cls] = STATUS_LABEL[p.status] ?? [p.status, "lp-tag-idle"];
                  return (
                    <tr key={p.id} className="bg-[color:var(--surface-soft)]">
                      <td className="rounded-l-xl px-3 py-2.5"><span className={`lp-tag ${cls}`}>{label}</span></td>
                      <td className="px-3"><span className={`lp-tag ${p.platform === "wordpress" ? "lp-tag-wp" : "lp-tag-blogger"}`}>{PLATFORM_LABEL[p.platform]}</span></td>
                      <td className="px-3 font-semibold">{p.title || "(제목 없음)"}</td>
                      <td className="rounded-r-xl px-3 text-xs">
                        {p.remote_url ? <a href={p.remote_url} target="_blank" rel="noreferrer" className="text-blue-700 underline">글 열기 ↗</a> : p.status === "uncertain" ? "응답 확인 안 됨 — 다시 보내지 않음" : p.error_detail ?? ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
