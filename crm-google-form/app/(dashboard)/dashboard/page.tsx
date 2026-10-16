import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/layout/PageHero";
import { KpiCard, KpiGrid } from "@/components/dashboard/KpiCard";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PIPELINE = [
  { icon: "🔗", title: "구글폼 등록", desc: "폼 이름을 등록하면 전용 웹훅 주소 발급", href: "/sources" },
  { icon: "🧩", title: "Apps Script 연결", desc: "응답 시트에 코드 붙여넣고 트리거 등록", href: "/sources" },
  { icon: "🔑", title: "발송 계정", desc: "이메일·SOLAPI·텔레그램 본인 계정", href: "/settings" },
  { icon: "📥", title: "자동 접수·발송", desc: "응답마다 접수 확인 + 운영자 알림", href: "/submissions" },
];

const STATUS: Record<string, { label: string; chip: string }> = {
  received: { label: "접수됨", chip: "mx-chip" },
  notified: { label: "발송 완료", chip: "mx-chip-green" },
  failed: { label: "발송 실패", chip: "mx-chip-red" },
};

export default async function DashboardPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [sourcesRes, totalRes, weekRes, failedRes, recentRes, smtpRes, solapiRes, telegramRes] = await Promise.all([
    supabase.from("crm_form_sources").select("id, name, is_active").eq("user_id", user.id),
    supabase.from("crm_submissions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("crm_submissions").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", weekAgo),
    supabase.from("crm_submissions").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "failed"),
    supabase
      .from("crm_submissions")
      .select("id, form_source_id, name, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("user_smtp_accounts").select("id").eq("user_id", user.id).eq("is_active", true),
    supabase.from("user_solapi_accounts").select("sender_phone").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("user_telegram_links")
      .select("bot_username")
      .eq("user_id", user.id)
      .eq("program_slug", "crm-google-form")
      .maybeSingle(),
  ]);

  const sources = sourcesRes.data ?? [];
  const sourceNameById = new Map(sources.map((s) => [s.id, s.name]));
  const recent = recentRes.data ?? [];
  const channels = [
    { label: "이메일(SMTP)", ok: (smtpRes.data ?? []).length > 0, hint: "신청자 이메일 발송" },
    { label: "문자·카카오(SOLAPI)", ok: !!solapiRes.data, hint: "SMS·알림톡·친구톡·RCS" },
    { label: "텔레그램", ok: !!telegramRes.data, hint: "운영자 알림" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHero
        badge="🏠 대시보드"
        title="구글폼 신청이 들어오면 알아서 응대"
        description="구글폼 응답이 들어올 때마다 신청자에게 접수 확인(이메일·문자·알림톡·친구톡)을 보내고, 운영자에게 텔레그램으로 알려 드립니다. N일 뒤 팔로우업도 자동으로 보낼 수 있어요."
        tip="모든 발송은 회원님 본인 발송 계정으로 나가며, 문자·카카오 발송에는 SOLAPI 요금이 듭니다."
      >
        <Link href="/sources" className="mx-btn-primary">
          🔗 구글폼 연결하기
        </Link>
        <Link href="/guide" className="mx-btn-ghost">
          📖 사용 매뉴얼
        </Link>
      </PageHero>

      <KpiGrid>
        <KpiCard icon="🔗" label="연결된 구글폼" value={sources.length} hint={`연동 중 ${sources.filter((s) => s.is_active).length}개`} />
        <KpiCard icon="📥" label="전체 접수" value={totalRes.count ?? 0} tone="green" />
        <KpiCard icon="📅" label="최근 7일 접수" value={weekRes.count ?? 0} tone="amber" />
        <KpiCard icon="⚠️" label="발송 실패" value={failedRes.count ?? 0} hint="접수 내역에서 원인 확인" tone="muted" />
      </KpiGrid>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <div className="mx-card lg:col-span-2">
          <h2 className="mx-section-title">🧭 작업 흐름</h2>
          <ol className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {PIPELINE.map((step, idx) => (
              <li key={step.title} className="relative">
                <Link
                  href={step.href}
                  className="flex h-full flex-col rounded-xl border border-mx-border bg-mx-raised p-3 transition-colors hover:border-mx-primary"
                >
                  <span className="text-xs font-bold text-mx-accent">STEP {idx + 1}</span>
                  <span className="mt-1 text-2xl">{step.icon}</span>
                  <span className="mt-1 text-sm font-bold text-mx-text">{step.title}</span>
                  <span className="text-xs text-mx-muted">{step.desc}</span>
                </Link>
                {idx < PIPELINE.length - 1 && (
                  <span className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-mx-muted md:block">›</span>
                )}
              </li>
            ))}
          </ol>
        </div>

        <div className="mx-card">
          <h2 className="mx-section-title">🔌 발송 계정</h2>
          <ul className="space-y-2 text-sm">
            {channels.map((c) => (
              <li key={c.label} className="flex items-center justify-between gap-2 rounded-lg bg-mx-raised px-3 py-2.5">
                <span>
                  <span className="block text-mx-text">{c.label}</span>
                  <span className="block text-xs text-mx-muted">{c.hint}</span>
                </span>
                {c.ok ? <span className="mx-chip-green">● 연결됨</span> : <span className="mx-chip-amber">○ 미연결</span>}
              </li>
            ))}
          </ul>
          {channels.some((c) => !c.ok) && (
            <Link href="/settings" className="mx-btn-ghost mt-3 w-full">
              🔑 발송 계정 연결하기
            </Link>
          )}
        </div>
      </div>

      <div className="mx-card">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="mx-section-title mb-0">🕒 최근 접수</h2>
          {recent.length > 0 && (
            <Link href="/submissions" className="text-xs font-semibold text-mx-link hover:underline">
              전체 보기 →
            </Link>
          )}
        </div>
        {recent.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-4xl">📭</p>
            <p className="mt-3 text-sm text-mx-muted">아직 접수된 신청이 없어요. 구글폼을 연결하고 테스트 응답을 1건 보내 보세요!</p>
            <Link href="/sources" className="mx-btn-primary mt-4">
              🔗 구글폼 연결하기
            </Link>
          </div>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="mx-table min-w-[520px]">
              <thead>
                <tr>
                  <th>신청자</th>
                  <th>폼</th>
                  <th>접수 시각</th>
                  <th className="text-right">상태</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((s) => {
                  const st = STATUS[s.status] ?? { label: s.status, chip: "mx-chip" };
                  return (
                    <tr key={s.id}>
                      <td className="font-semibold">{s.name ?? "이름 미매핑"}</td>
                      <td className="text-mx-muted">{sourceNameById.get(s.form_source_id) ?? "폼"}</td>
                      <td className="text-mx-muted">{formatDateTime(s.created_at)}</td>
                      <td className="text-right">
                        <span className={st.chip}>{st.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
