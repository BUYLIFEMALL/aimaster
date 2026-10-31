import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/ui/PageHero";
import { AddTargetForm, ScheduleForm, TargetCard, type TargetRow } from "@/components/watch/WatchForms";
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
        badge="🎯 STEP 1 · 감시 대상"
        title="감시 대상"
        description="네이버 지도에서 지역과 필터를 맞춘 화면을 저장하면, 내 PC의 크롬 확장이 그 화면을 살펴보고 새 매물과 가격 변동을 텔레그램/이메일/카카오톡으로 알려 드립니다. 매물은 우리 서버에 저장하지 않습니다."
        tip={`${rows.length}/${MAX_TARGETS}곳 감시 중 · 크롬이 켜져 있어야 예약 수집이 돌아요.`}
      />
      <section className="mx-card mt-6">
        <h2 className="mx-section-title">➕ 감시 화면 추가</h2>
        <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-mx-muted">
          <li>
            <a href={NAVER} target="_blank" rel="noreferrer" className="font-semibold text-mx-link underline">
              네이버 부동산
            </a>
            을 열어 지역으로 이동하고, 상가·건물·토지와 가격·면적 필터를 고릅니다.
          </li>
          <li>
            확장 아이콘의 <b>「이 화면 감시」</b>를 누르거나, 주소를 복사해 아래에 붙여 넣습니다.
          </li>
          <li>범위가 넓으면 앞부분만 읽으니 동 단위로 좁히고 필터를 걸어 주세요.</li>
        </ol>
        <AddTargetForm />
      </section>
      <div className="mt-4 space-y-3">
        {rows.map((t) => (
          <TargetCard key={t.id} t={t} />
        ))}
      </div>
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
