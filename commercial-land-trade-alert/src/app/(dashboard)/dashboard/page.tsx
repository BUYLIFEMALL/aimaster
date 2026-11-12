import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/ui/PageHero";
import { normalizePrefs } from "@/lib/trades/prefs";
import { applyTradeFilter } from "@/lib/trades/query";
import { daysAgoIso } from "@/lib/trades/parse";

const fmt = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

function StepCard({
  stepNumber,
  done,
  href,
  title,
  note,
}: {
  stepNumber: number;
  done: boolean;
  href: string;
  title: string;
  note: string;
}) {
  return (
    <Link
      href={href}
      className={`group block rounded-2xl border p-5 transition-all duration-200 ${
        done
          ? "border-amber-500/40 bg-[#121824] hover:border-amber-500 hover:shadow-lg hover:shadow-amber-500/10"
          : "border-[#1E293B] bg-[#0E1420] hover:border-gray-600 hover:bg-[#121824]"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black font-mono ${
            done
              ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
              : "bg-[#1E293B] text-gray-400"
          }`}
        >
          0{stepNumber}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
            done
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-[#1E293B] text-gray-400"
          }`}
        >
          {done ? "설정 완료" : "미설정"}
        </span>
      </div>
      <p className="mt-3 font-bold text-white text-sm group-hover:text-amber-400 transition-colors">
        {title}
      </p>
      <p className="mt-1 text-xs text-gray-400 leading-relaxed">{note}</p>
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
  const stateMap = new Map(
    ((states ?? []) as { sgg_cd: string; last_success_at: string | null; last_attempt_at: string | null; last_error: string | null }[]).map(
      (s) => [s.sgg_cd, s]
    )
  );
  const since = daysAgoIso(7);
  const { count } = await applyTradeFilter(
    supabase.from("commercial_land_trades").select("id", { count: "exact", head: true }).gte("first_seen_at", since),
    { mine: true },
    codes,
    prefs
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHero
        badge="PROPTECH HUD DASHBOARD"
        title="상업용지·토지 실거래가 레이더"
        description="국토교통부 실시간 상가·건물·토지 실거래가를 서버가 매일 수집하고, 네이버 부동산 호가 변동은 크롬 확장이 찾아 텔레그램/이메일/카카오톡으로 즉시 알려 드립니다."
        tip={`최근 7일 동안 수집한 내 조건 거래 ${(count ?? 0).toLocaleString("ko-KR")}건`}
      />

      {/* 4단계 파이프라인 카드 덱 */}
      <div className="grid gap-3.5 sm:grid-cols-2 md:grid-cols-4">
        <StepCard
          stepNumber={1}
          done={(targets ?? []).length > 0}
          href="/watch"
          title="매물 감시 등록"
          note={(targets ?? []).length ? `${(targets ?? []).length}곳 감시 중` : "크롬 확장 설치 및 감시 화면 추가"}
        />
        <StepCard
          stepNumber={2}
          done={(links ?? []).length > 0}
          href="/settings"
          title="알림 채널 연결"
          note={(links ?? []).length ? "텔레그램 봇 연결됨" : "텔레그램/이메일/카카오톡 연결"}
        />
        <StepCard
          stepNumber={3}
          done={regions.length > 0}
          href="/districts"
          title="실거래 지역 추가"
          note={regions.length ? `${regions.length}곳 선택됨` : "전국 시·군·구에서 등록"}
        />
        <StepCard
          stepNumber={4}
          done={Boolean(prefRow)}
          href="/conditions"
          title="필터 조건 설정"
          note={prefRow ? "맞춤 조건 저장됨" : "기본 조건으로 동작 중"}
        />
      </div>

      {/* 실시간 지역별 수집 상태 섹션 */}
      <section className="rounded-2xl border border-[#1E293B] bg-[#121824] p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-[#1E293B] pb-3">
          <h2 className="text-sm font-black text-white flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
            📡 지역별 국토부 실거래가 수집 상태
          </h2>
          <span className="text-xs text-gray-400 font-mono">
            {regions.length} Active Regions
          </span>
        </div>

        {regions.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            아직 등록된 관심 지역이 없습니다. 상단 3단계에서 관심 지역을 추가해 주세요.
          </div>
        ) : (
          <ul className="divide-y divide-[#1E293B]/70">
            {regions.map((r) => {
              const s = stateMap.get(r.sgg_cd);
              return (
                <li key={r.sgg_cd} className="py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold font-mono text-[10px]">
                      {r.sgg_cd}
                    </span>
                    <span className="font-bold text-white text-sm">{r.sgg_nm}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-400 font-mono">
                      {s?.last_success_at
                        ? `마지막 수집: ${fmt(s.last_success_at)}`
                        : s?.last_attempt_at
                        ? "수집 재시도 대기"
                        : "첫 수집 대기 (5~10분)"}
                    </span>
                    {s?.last_error && <p className="mt-1 text-[11px] text-rose-400">⚠️ {s.last_error}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
