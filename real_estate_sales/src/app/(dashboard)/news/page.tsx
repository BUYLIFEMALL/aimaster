import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/ui/PageHero";
import { NewsSettingsForm } from "@/components/news/NewsSettingsForm";
import { NEWS_CATEGORIES } from "@/lib/news/radarCore";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// RQ-C 지역 뉴스 레이더(2026-11-09, v1.57, 플랜 docs/PLAN_20261109_RQ_C_NEWS_RADAR.md). 회원 본인 기사만(RLS + user_id).
type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
interface NewsRow { id: string; sgg_nm: string; category: string; title: string; link: string; source: string | null; snippet: string | null; published_at: string | null; created_at: string }

const CATEGORY_ICON: Record<string, string> = { 개발: "🏗️", 교통: "🚇", 학교: "🏫", 규제: "📜" };

const kstDay = (iso: string) => new Date(new Date(iso).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ region?: string; category?: string }> }) {
  const user = await requireProgramAccess();
  const filter = await searchParams;
  const db = (await createClient()) as unknown as SupabaseLike;

  const [{ data: pref }, { data: keys }, { data: watch }, { data: digest }, { data: news }] = await Promise.all([
    db.from("real_estate_user_preferences").select("news_enabled, news_ai_summary, news_sent_on").eq("user_id", user.id).maybeSingle(),
    db.from("user_api_keys").select("provider").eq("user_id", user.id).in("provider", ["naver_client_id", "naver_client_secret", "anthropic"]),
    db.from("real_estate_watch_districts").select("sgg_nm").eq("user_id", user.id).eq("is_active", true).order("created_at", { ascending: true }),
    db.from("real_estate_news_digests").select("digest_date, content").eq("user_id", user.id).order("digest_date", { ascending: false }).limit(1).maybeSingle(),
    db.from("real_estate_news_items").select("id, sgg_nm, category, title, link, source, snippet, published_at, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(300),
  ]);
  const providers = new Set(((keys ?? []) as { provider: string }[]).map((k) => k.provider));
  const hasNaverKey = providers.has("naver_client_id") && providers.has("naver_client_secret");
  const regions = [...new Set(((watch ?? []) as { sgg_nm: string }[]).map((w) => w.sgg_nm))];
  const all = (news ?? []) as NewsRow[];
  const rows = all.filter((r) => (!filter.region || r.sgg_nm === filter.region) && (!filter.category || r.category === filter.category));
  const byDay = new Map<string, NewsRow[]>();
  for (const r of rows) {
    const d = kstDay(r.published_at ?? r.created_at);
    byDay.set(d, [...(byDay.get(d) ?? []), r]);
  }
  const link = (next: { region?: string; category?: string }) => {
    const q = new URLSearchParams();
    const region = "region" in next ? next.region : filter.region;
    const category = "category" in next ? next.category : filter.category;
    if (region) q.set("region", region);
    if (category) q.set("category", category);
    const s = q.toString();
    return s ? `/news?${s}` : "/news";
  };
  const chip = (active: boolean) => `inline-flex min-h-[36px] items-center rounded-full border px-3 text-xs font-medium ${active ? "border-mx-primary bg-mx-raised text-[#93c5fd]" : "border-mx-border text-mx-muted hover:text-mx-text"}`;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHero
        badge="📰 지역 뉴스"
        title="관심 지역 개발·교통·학교·규제 소식"
        description="관심 지역 앞 5곳의 새 기사만 모아 매일 아침 한 번 알려 드려요. 기사 본문은 가져오지 않고 제목·짧은 요약·원문 링크만 보여 줍니다."
      />

      {!hasNaverKey && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-mx-text">
          🔑 네이버 검색 키가 아직 없어요. <Link href="/settings" className="font-semibold text-[#93c5fd] underline">API키등록·플랫폼연동</Link>에서 Client ID·Secret을 등록하면 바로 쓸 수 있어요(다른 프로그램에 등록했다면 그대로 쓰여요).
        </div>
      )}
      {regions.length === 0 && (
        <div className="rounded-2xl border border-mx-border bg-mx-surface p-4 text-sm text-mx-muted">
          📍 관심 지역이 없어요. <Link href="/districts" className="font-semibold text-[#93c5fd] underline">관심 지역 설정</Link>에서 먼저 지역을 고르세요.
        </div>
      )}

      <section className="rounded-2xl border border-mx-border bg-mx-surface p-5">
        <h2 className="mb-3 text-base font-bold text-mx-text">⚙️ 받기 설정</h2>
        <NewsSettingsForm enabled={Boolean(pref?.news_enabled)} aiSummary={Boolean(pref?.news_ai_summary)} hasNaverKey={hasNaverKey} hasClaudeKey={providers.has("anthropic")} />
        <p className="mt-3 text-xs text-mx-muted">
          대상 지역: {regions.slice(0, 5).join(", ") || "없음"}{regions.length > 5 ? ` (앞 5곳만, 나머지 ${regions.length - 5}곳 제외)` : ""}
          {pref?.news_sent_on ? ` · 마지막 알림 확인 ${pref.news_sent_on}` : ""}
        </p>
      </section>

      {digest?.content && (
        <section className="rounded-2xl border border-mx-border bg-mx-surface p-5">
          <h2 className="mb-2 text-base font-bold text-mx-text">🤖 AI 요약 · {digest.digest_date}</h2>
          <p className="whitespace-pre-line text-sm text-mx-text">{digest.content}</p>
          <p className="mt-2 text-xs text-mx-muted">기사 제목·요약문만 보고 쓴 글이라 틀릴 수 있어요. 원문을 꼭 확인하세요.</p>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Link href={link({ region: undefined })} className={chip(!filter.region)}>전체 지역</Link>
          {regions.slice(0, 5).map((r) => (
            <Link key={r} href={link({ region: r })} className={chip(filter.region === r)}>{r}</Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={link({ category: undefined })} className={chip(!filter.category)}>전체 분류</Link>
          {NEWS_CATEGORIES.map((c) => (
            <Link key={c} href={link({ category: c })} className={chip(filter.category === c)}>{CATEGORY_ICON[c]} {c}</Link>
          ))}
        </div>
      </section>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-mx-border bg-mx-surface p-6 text-center text-sm text-mx-muted">아직 받은 기사가 없어요. 「🔎 지금 받아 보기」를 눌러 보세요.</p>
      ) : (
        [...byDay.entries()].map(([day, list]) => (
          <section key={day} className="rounded-2xl border border-mx-border bg-mx-surface p-4">
            <h3 className="mb-2 text-sm font-bold text-mx-muted">{day} · {list.length}건</h3>
            <ul className="divide-y divide-mx-border">
              {list.map((r) => (
                <li key={r.id} className="py-3">
                  <p className="text-xs text-mx-muted">{CATEGORY_ICON[r.category] ?? "📰"} {r.category} · {r.sgg_nm}{r.source ? ` · ${r.source}` : ""}</p>
                  <a href={r.link} target="_blank" rel="noopener noreferrer" className="mt-0.5 block break-words text-sm font-semibold text-mx-text hover:text-[#93c5fd]">{r.title} ↗</a>
                  {r.snippet && <p className="mt-1 line-clamp-2 break-words text-xs text-mx-muted">{r.snippet}</p>}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
      <p className="text-xs text-mx-muted">출처: 각 언론사, 네이버 검색 · 기사는 90일 뒤 자동으로 지워져요.</p>
    </div>
  );
}
