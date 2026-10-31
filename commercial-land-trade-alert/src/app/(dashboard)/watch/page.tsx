import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/ui/PageHero";
import { AddTargetForm, ScheduleForm, TargetCard, type TargetRow } from "@/components/watch/WatchForms";
import { RegionPicker } from "@/components/watch/RegionPicker";
import { MAX_TARGETS } from "@/lib/watchTargets";

const NAVER = "https://new.land.naver.com/offices?ms=37.5006,127.0364,16&a=SG&e=RETAIL";
const RESULT: Record<string, string> = { ok: "정상", blocked: "⛔ 네이버 제한으로 멈춤", rule_mismatch: "⚠ 네이버 화면 변경 의심", error: "⚠ 오류" };

export default async function WatchPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: targets }, { data: prefs }] = await Promise.all([
    supabase.from("commercial_land_listing_targets").select("*").eq("user_id", user.id).order("created_at"),
    supabase.from("commercial_land_preferences").select("*").eq("user_id", user.id).maybeSingle(),
  ]);
  const rows = (targets ?? []) as TargetRow[];
  return (
    <div className="mx-auto max-w-5xl">
      <PageHero
        badge="🎯 STEP 1 · 매물 감시(예약 설정)"
        title="매물 감시(예약 설정)"
        description="네이버 지도에서 지역과 필터를 맞춘 화면을 저장하면, 내 PC의 크롬 확장이 그 화면을 살펴보고 새 매물과 가격 변동을 텔레그램/이메일/카카오톡으로 알려 드립니다. 매물은 우리 서버에 저장하지 않습니다."
        tip={`${rows.length}/${MAX_TARGETS}곳 감시 중 · 크롬이 켜져 있어야 예약 수집이 돌아요.`}
      />
      <section className="mx-card mt-6">
        <h2 className="mx-section-title">➕ 화면 추가 <small className="text-xs font-normal text-mx-muted">{rows.length} / {MAX_TARGETS}</small></h2>
        <div className="rounded-2xl border border-mx-primary/40 bg-mx-primary/5 p-4">
          <a href={NAVER} target="_blank" rel="noreferrer" className="inline-flex min-h-[48px] items-center rounded-xl border border-[#008a44] bg-gradient-to-b from-[#00b45a] to-[#009b4d] px-5 text-sm font-bold text-white shadow-[0_4px_0_#00682f]">
            🏠 네이버 부동산에서 화면 찾기 ↗
          </a>
          <ol className="mt-4 grid gap-3 md:grid-cols-3">
            <li className="rounded-xl border border-mx-border bg-white p-4"><span className="text-2xl">🗺</span><strong className="mt-1 block text-sm">1. 지역 이동</strong><small className="text-xs text-mx-muted">열린 네이버 지도에서 볼 지역으로 옮겨요</small></li>
            <li className="rounded-xl border border-mx-border bg-white p-4"><span className="text-2xl">🔍</span><strong className="mt-1 block text-sm">2. 필터 고르기</strong><small className="text-xs text-mx-muted">상가·건물·토지와 가격·면적을 골라요</small></li>
            <li className="rounded-xl border border-mx-border bg-white p-4"><span className="text-2xl">➕</span><strong className="mt-1 block text-sm">3. 이 화면 감시</strong><small className="text-xs text-mx-muted">확장 아이콘을 눌러 「이 화면 감시」를 누르면 끝!</small></li>
          </ol>
          <p className="mt-3 text-xs text-mx-muted">💡 범위가 넓으면 앞부분만 읽으니 동 단위로 좁혀 주세요.</p>
        </div>
        <details open className="mt-3 rounded-xl border border-mx-border p-4">
          <summary className="cursor-pointer text-sm font-bold">🏙 지역(시·구·동)으로 추가하기</summary>
          <RegionPicker email={user.email ?? ""} disabled={rows.length >= MAX_TARGETS} />
        </details>
        <details className="mt-3 rounded-xl border border-mx-border p-4">
          <summary className="cursor-pointer text-sm font-bold">✏️ 인터넷 주소를 복사해서 추가하기</summary>
          <div className="mt-3"><AddTargetForm /></div>
        </details>
      </section>
      <section className="mx-card mt-4">
        <h2 className="mx-section-title">📋 감시 중인 화면</h2>
        {rows.length === 0 && <p className="text-sm text-mx-muted">아직 등록한 화면이 없습니다. 위에서 첫 화면을 추가해 보세요.</p>}
        <div className="space-y-3">
          {rows.map((t) => (
            <TargetCard key={t.id} t={t} />
          ))}
        </div>
      </section>
      <section className="mx-card mt-4">
        <h2 id="schedule" className="mx-section-title scroll-mt-6">⏰ 예약과 알림</h2>
        <ScheduleForm p={prefs ?? {}} />
        <p className="mt-3 text-xs text-mx-muted">네이버 제한을 피하려고 하루 200페이지까지만 읽고, 확인 화면이 뜨면 그날은 멈춥니다. 우회하지 않습니다.</p>
        {prefs?.ext_last_run_at && (
          <p className="mt-2 text-sm text-mx-text">
            마지막 수집: {new Date(prefs.ext_last_run_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} · {RESULT[prefs.ext_last_result] ?? prefs.ext_last_result} · 매물 {prefs.ext_last_count ?? 0}건
            {prefs.ext_last_error ? ` · ${prefs.ext_last_error}` : ""}
          </p>
        )}
      </section>
    </div>
  );
}
