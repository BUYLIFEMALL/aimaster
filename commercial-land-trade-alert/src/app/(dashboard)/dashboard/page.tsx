import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/ui/PageHero";
import { normalizePrefs } from "@/lib/trades/prefs";
import { applyTradeFilter } from "@/lib/trades/query";
import { daysAgoIso } from "@/lib/trades/parse";

const fmt = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

function Step({ done, href, title, note }: { done: boolean; href: string; title: string; note: string }) {
  return (
    <Link href={href} className="mx-card block p-4 hover:border-mx-primary">
      <p className="font-semibold text-mx-text">
        {done ? "✅" : "⬜"} {title}
      </p>
      <p className="mt-1 text-sm text-mx-muted">{note}</p>
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: watches }, { data: prefRow }, { data: links }, { data: targets }] = await Promise.all([
    supabase.from("commercial_land_watch").select("sgg_cd, sgg_nm").eq("user_id", user.id).eq("is_active", true),
    supabase.from("commercial_land_preferences").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_telegram_links").select("bot_username").eq("user_id", user.id).not("bot_token", "is", null).limit(1),
    supabase.from("commercial_land_listing_targets").select("id").eq("user_id", user.id),
  ]);
  const regions = (watches ?? []) as { sgg_cd: string; sgg_nm: string }[];
  const codes = regions.map((r) => r.sgg_cd);
  const prefs = normalizePrefs(prefRow);
  const { data: states } = await supabase.from("commercial_land_region_state").select("*").in("sgg_cd", codes.length ? codes : [""]);
  const stateMap = new Map(((states ?? []) as { sgg_cd: string; last_success_at: string | null; last_attempt_at: string | null; last_error: string | null }[]).map((s) => [s.sgg_cd, s]));
  const since = daysAgoIso(7);
  const { count } = await applyTradeFilter(supabase.from("commercial_land_trades").select("id", { count: "exact", head: true }).gte("first_seen_at", since), { mine: true }, codes, prefs);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHero badge="🏠 대시보드" title="상가·건물·토지 매물 알림" description="실거래는 지역과 조건만 고르면 서버가 하루 1회 받아 옵니다. 네이버 새 매물과 가격 변동은 내 PC의 크롬 확장이 찾아 텔레그램/이메일/카카오톡으로 알려 드립니다." tip={`최근 7일 동안 수집한 내 조건 거래 ${(count ?? 0).toLocaleString("ko-KR")}건`} />
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <Step done={regions.length > 0} href="/districts" title="1. 관심 지역 고르기" note={regions.length ? `${regions.length}곳 선택됨` : "전국 시·군·구에서 고릅니다"} />
        <Step done={Boolean(prefRow)} href="/conditions" title="2. 조건 확인" note={prefRow ? "저장됨" : "기본 조건으로 동작 중입니다"} />
        <Step done={(links ?? []).length > 0} href="/settings" title="3. 받는 곳 연결" note={(links ?? []).length ? "텔레그램 연결됨" : "텔레그램/이메일/카카오톡 중 연결해 주세요"} />
        <Step done={(targets ?? []).length > 0} href="/watch" title="4. 네이버 매물 감시(선택)" note={(targets ?? []).length ? `${(targets ?? []).length}곳 감시 중` : "확장을 설치하고 감시 화면을 추가합니다"} />
      </div>
      <section className="mx-card mt-6">
        <h2 className="mx-section-title mb-3">📡 지역별 수집 상태</h2>
        {regions.length === 0 && <p className="text-sm text-mx-muted">아직 고른 지역이 없습니다.</p>}
        <ul className="divide-y divide-mx-border">
          {regions.map((r) => {
            const s = stateMap.get(r.sgg_cd);
            return (
              <li key={r.sgg_cd} className="py-2 text-sm">
                <span className="font-semibold text-mx-text">{r.sgg_nm}</span>{" "}
                <span className="text-mx-muted">{s?.last_success_at ? `마지막 수집 ${fmt(s.last_success_at)}` : s?.last_attempt_at ? "수집 재시도 대기" : "첫 수집 대기 (5~10분)"}</span>
                {s?.last_error && <p className="mt-1 text-xs text-mx-danger">⚠️ {s.last_error}</p>}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
