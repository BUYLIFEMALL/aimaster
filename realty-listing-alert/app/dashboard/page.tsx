import { requireProgramAccess } from "@/lib/access";
import { StudioSidebar } from "@/components/studio/StudioSidebar";
import ExtensionDownloadCard from "@/app/settings/ExtensionDownloadCard";
import { createClient } from "@/lib/supabase/server";
import { COLLECT_INTERVAL_OPTIONS } from "@/lib/schedule";
import { MAX_TARGETS } from "@/lib/targets";
import StartChecklist from "./StartChecklist";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 대시보드(인수인계 §3-5): 디자인 원칙 0 — 원클릭 다운로드 센터·내 PC 연결 상태·3단계 설치 안내를 맨 위에 둔다.
const INSTALL = [
  { icon: "⬇", title: "확장 받기", desc: "아래 버튼으로 ZIP을 받아 압축을 풉니다." },
  { icon: "🧩", title: "크롬에 설치", desc: "chrome://extensions → 개발자 모드 → 압축해제된 확장 프로그램을 로드" },
  { icon: "🔗", title: "바로 연결", desc: "「API키등록·플랫폼연동」에서 「바로 연결」을 누릅니다." },
];


export default async function DashboardPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const [{ data: targets }, { data: settings }, { data: telegram }, { data: device }, { count: tokenCount }] = await Promise.all([
    supabase.from("realty_alert_targets").select("enabled").eq("user_id", user.id),
    supabase.from("realty_alert_settings").select("schedule_enabled, interval_minutes, active_hour_start, active_hour_end, notify_kakao, notify_email").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_telegram_links").select("bot_username").eq("user_id", user.id).eq("program_slug", "realty-listing-alert").maybeSingle(),
    // 확장이 보고한 숫자 상태(마지막 수집·결과·건수)만 — 매물 내용은 서버에 없다.
    supabase
      .from("realty_alert_device_status")
      .select("last_run_at, last_result, last_count, ext_version")
      .eq("user_id", user.id)
      .order("last_run_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("personal_access_tokens").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("program_slug", "realty-listing-alert").is("revoked_at", null),
  ]);
  // 받는 곳: 텔레그램·카톡·이메일 중 하나라도(2026-10-25)
  const hasChannel = !!telegram || !!settings?.notify_kakao || !!settings?.notify_email;
  const total = targets?.length ?? 0;
  const active = targets?.filter((t) => t.enabled).length ?? 0;
  const intervalLabel = COLLECT_INTERVAL_OPTIONS.find((o) => o.value === settings?.interval_minutes)?.label ?? "3시간";
  const hours = settings?.active_hour_start != null && settings?.active_hour_end != null ? ` · ${settings.active_hour_start}~${settings.active_hour_end}시` : " · 종일";
  const kst = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  const RESULT: Record<string, string> = { ok: "✅ 정상", blocked: "⛔ 확인 화면 멈춤", rule_mismatch: "⚠ 규칙 확인", error: "⚠ 오류" };
  const nextAt =
    device?.last_run_at && settings?.schedule_enabled
      ? kst(new Date(new Date(device.last_run_at).getTime() + (settings.interval_minutes ?? 180) * 60000).toISOString())
      : null;
  // 「내 설정」 카드 — 실제 저장값 + 확장 상태 보고(3단계).
  const cards = [
    { icon: "🎯", title: "감시 대상", value: `${total} / ${MAX_TARGETS}`, href: "/targets", note: total ? `${active}개 감시 중` : "단지를 추가하세요" },
    { icon: "⏰", title: "예약", value: settings?.schedule_enabled ? "켜짐" : "꺼짐", href: "/schedule", note: settings?.schedule_enabled ? `${intervalLabel}마다${hours}` : "간격·시간대를 정하고 켜 주세요" },
    { icon: "📨", title: "받는 방법", value: hasChannel ? "연결됨" : "미연결", href: "/delivery", note: hasChannel ? [telegram ? "텔레그램" : "", settings?.notify_kakao ? "카톡" : "", settings?.notify_email ? "이메일" : ""].filter(Boolean).join(" · ") : "텔레그램·카톡·이메일 중 하나를 연결하세요" },
    {
      icon: "🖥",
      title: "내 PC 수집",
      value: device?.last_run_at ? RESULT[device.last_result ?? ""] ?? "기록 있음" : "아직 없음",
      href: "/guide",
      note: device?.last_run_at
        ? `마지막 ${kst(device.last_run_at)} · 매물 ${device.last_count ?? 0}건${nextAt ? ` · 다음 ${nextAt}쯤` : ""}`
        : "확장 팝업에서 「🔍 지금 수집」을 눌러 보세요",
    },
  ];
  return (
    <div className="studio-shell">
      <StudioSidebar email={user.email ?? ""} active="dashboard" />
      <main className="main">
        <div className="topline">
          <div>
            <div className="eyebrow">Dashboard</div>
            <h1>관심 단지 새 매물,<br />텔레그램으로 받아 보세요</h1>
            <p className="lede">수집은 회원님 PC의 크롬이 회원님 계정으로 합니다. 매물 정보는 이 사이트로 오지 않습니다.</p>
          </div>
        </div>

        <StartChecklist facts={{ email: user.email ?? "", hasToken: (tokenCount ?? 0) > 0, telegram: hasChannel, targetCount: total, scheduleOn: !!settings?.schedule_enabled }} />

        <section className="card" aria-labelledby="install-title">
          <h2 className="card-title" id="install-title">🖥 원클릭 다운로드 센터</h2>
          <ol className="guide-steps three">
            {INSTALL.map((step, index) => (
              <li key={step.title}>
                <div className="step-box">
                  <span className="guide-step-head"><span className="nav-number">{index + 1}</span></span>
                  <span className="guide-step-icon">{step.icon}</span>
                  <strong>{step.title}</strong>
                  <small>{step.desc}</small>
                </div>
              </li>
            ))}
          </ol>
          <ExtensionDownloadCard />
        </section>

        <section className="card">
          <h2 className="card-title">📋 내 설정</h2>
          <ol className="guide-steps four">
            {cards.map((card) => (
              <li key={card.title}>
                <a href={card.href}>
                  <span className="guide-step-icon">{card.icon}</span>
                  <strong>{card.title} · {card.value}</strong>
                  <small>{card.note}</small>
                </a>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
