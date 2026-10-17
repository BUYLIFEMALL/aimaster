import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { REPLY_MODEL_OPTIONS, DEFAULT_REPLY_MODEL, getReplyModelProvider } from "@/lib/ai/models";
import { formatDateTimeKo } from "@/lib/formatDate";
import { StudioHeader, StatCard, Avatar } from "@/components/ui/StudioHeader";
import { IgLogo } from "@/components/ui/IgLogo";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const FLOW = [
  { icon: "🔑", title: "계정·AI 연결", desc: "Meta 앱 + 인스타 계정 + AI 키", href: "/settings" },
  { icon: "📡", title: "DM 웹훅 등록", desc: "새 DM이 실시간으로 들어오게", href: "/settings" },
  { icon: "🤖", title: "AI 답장 초안", desc: "새 DM마다 초안 자동 작성", href: "/conversations" },
  { icon: "✅", title: "24시간 안에 발송", desc: "웹 또는 텔레그램에서 승인", href: "/conversations" },
];

const HOUR = 60 * 60 * 1000;

export default async function DashboardPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * HOUR).toISOString();

  const [accountRes, settingsRes, keysRes, telegramRes, pendingRes, weekRes, totalRes] = await Promise.all([
    supabase.from("dm_accounts").select("username, needs_reconnect").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("dm_settings")
      .select("reply_model, auto_approve, bot_enabled, bot_started_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("user_api_keys").select("provider").eq("user_id", user.id),
    supabase
      .from("user_telegram_links")
      .select("bot_username")
      .eq("user_id", user.id)
      .eq("program_slug", "instagram-dm-reply")
      .maybeSingle(),
    supabase
      .from("dm_messages")
      .select("conversation_id")
      .eq("user_id", user.id)
      .eq("direction", "in")
      .eq("status", "pending_review"),
    supabase
      .from("dm_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "posted")
      .gte("replied_at", weekAgo),
    supabase
      .from("dm_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "posted"),
  ]);

  const pendingRows = pendingRes.data ?? [];
  const pendingConversationIds = Array.from(new Set(pendingRows.map((r) => r.conversation_id)));
  const { data: conversations } = await supabase
    .from("dm_conversations")
    .select("id, customer_username, last_inbound_at")
    .in("id", pendingConversationIds.length > 0 ? pendingConversationIds : ["__none__"]);

  // 답장 기한(마지막 고객 메시지 + 24시간)이 가까운 순서. 이미 지난 대화는 따로 센다.
  const now = Date.now();
  const withDeadline = (conversations ?? [])
    .filter((c) => c.last_inbound_at)
    .map((c) => ({ ...c, remainingMs: new Date(c.last_inbound_at as string).getTime() + 24 * HOUR - now }))
    .sort((a, b) => a.remainingMs - b.remainingMs);
  const urgent = withDeadline.filter((c) => c.remainingMs > 0 && c.remainingMs < 4 * HOUR);
  const expired = withDeadline.filter((c) => c.remainingMs <= 0).length;

  const account = accountRes.data;
  const settings = settingsRes.data;
  const providers = new Set<string>((keysRes.data ?? []).map((k) => k.provider));
  const replyModel = settings?.reply_model ?? DEFAULT_REPLY_MODEL;
  const modelLabel = REPLY_MODEL_OPTIONS.find((o) => o.value === replyModel)?.shortLabel ?? replyModel;

  const connections = [
    {
      label: "인스타 계정",
      ok: !!account && !account.needs_reconnect,
      detail: account ? (account.needs_reconnect ? "다시 연결 필요" : `@${account.username}`) : "연결 안 됨",
    },
    {
      label: "Meta 앱(Instagram 앱 ID)",
      ok: providers.has("meta_app_id") && providers.has("meta_app_secret"),
      detail: providers.has("meta_app_id") ? "등록됨" : "미등록",
    },
    {
      label: `AI 키 (${modelLabel})`,
      ok: providers.has(getReplyModelProvider(replyModel)),
      detail: providers.has(getReplyModelProvider(replyModel)) ? "등록됨" : "미등록",
    },
    { label: "DM 자동응답 봇", ok: !!settings?.bot_enabled, detail: settings?.bot_enabled ? "켜짐 — 새 DM 받는 중" : "꺼짐" },
    { label: "텔레그램 승인 알림", ok: !!telegramRes.data, detail: telegramRes.data ? "연결됨" : "선택 사항" },
  ];

  const formatRemaining = (ms: number) => `${Math.floor(ms / HOUR)}시간 ${Math.floor((ms % HOUR) / 60000)}분`;

  return (
    <div className="mx-auto max-w-6xl">
      <StudioHeader
        title="계정 대시보드"
        description="새 DM이 들어오면 AI가 답장 초안을 만들어 둡니다. 고객의 마지막 메시지로부터 24시간 안에 「답변승인」을 눌러야 발송할 수 있어요."
      >
        <Link href="/conversations" className="ig-btn-primary">
          💬 DM 검토하기{pendingRows.length > 0 ? ` (${pendingRows.length})` : ""}
        </Link>
        <Link href="/guide" className="ig-btn">
          📖 매뉴얼
        </Link>
      </StudioHeader>

      <div className="mb-6 flex items-center gap-4 rounded-xl border border-ig-border bg-gradient-to-r from-[#fdf2f8] via-ig-surface to-ig-surface p-5">
        <IgLogo size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ig-muted">연결된 인스타 계정</p>
          <p className="truncate text-lg font-bold text-ig-text">{account ? `@${account.username}` : "아직 연결된 계정이 없어요"}</p>
          <p className="text-xs text-ig-muted">
            {settings?.bot_enabled
              ? `🟢 자동응답 봇 켜짐${settings.bot_started_at ? ` · ${formatDateTimeKo(settings.bot_started_at)}부터` : ""}`
              : "⚪ 자동응답 봇 꺼짐 — 설정에서 켜야 새 DM에 초안이 만들어져요"}
            {settings?.auto_approve && " · ⚡ 자동 발송 켜짐"}
          </p>
        </div>
        {!account && (
          <Link href="/settings" className="ig-btn-primary shrink-0">
            계정 연결
          </Link>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="검토 대기 DM" value={pendingRows.length} hint="승인해야 발송돼요" accent={pendingRows.length > 0} />
        <StatCard label="⏳ 4시간 안에 기한 끝남" value={urgent.length} hint={expired > 0 ? `이미 지난 대화 ${expired}개` : "24시간 답장 규칙"} accent={urgent.length > 0} />
        <StatCard label="최근 7일 발송" value={weekRes.count ?? 0} />
        <StatCard label="총 발송한 답장" value={totalRes.count ?? 0} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-5">
        <div className="ig-card lg:col-span-3">
          <h2 className="ig-section-title">⏳ 답장 기한이 가까운 대화</h2>
          {withDeadline.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-4xl">📩</p>
              <p className="mt-2 text-sm text-ig-muted">지금은 검토할 DM이 없어요.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {withDeadline.slice(0, 5).map((c) => (
                <li key={c.id} className="flex items-center gap-3">
                  <Avatar name={c.customer_username} size={34} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ig-text">
                    {c.customer_username ? `@${c.customer_username}` : "익명 고객"}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      c.remainingMs <= 0
                        ? "bg-ig-danger/10 text-ig-danger"
                        : c.remainingMs < 4 * HOUR
                          ? "bg-ig-warn/10 text-ig-warn"
                          : "bg-ig-success/10 text-ig-success"
                    }`}
                  >
                    {c.remainingMs <= 0 ? "기한 지남" : `${formatRemaining(c.remainingMs)} 남음`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {withDeadline.length > 0 && (
            <Link href="/conversations" className="mt-4 inline-block text-sm font-semibold text-ig-primary hover:underline">
              DM 검토로 →
            </Link>
          )}
        </div>

        <div className="ig-card lg:col-span-2">
          <h2 className="ig-section-title">🔌 연결 상태</h2>
          <ul className="space-y-2">
            {connections.map((c) => (
              <li key={c.label} className="flex items-center justify-between gap-2 rounded-lg bg-ig-raised px-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block truncate text-ig-text">{c.label}</span>
                  <span className="block truncate text-[11px] text-ig-muted">{c.detail}</span>
                </span>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.ok ? "bg-ig-success" : "bg-ig-border"}`} />
              </li>
            ))}
          </ul>
          <Link href="/settings" className="ig-btn mt-3 w-full">
            🔑 연결 설정
          </Link>
        </div>
      </div>

      <div className="ig-card">
        <h2 className="ig-section-title">🧭 이렇게 동작해요</h2>
        <ol className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {FLOW.map((s, i) => (
            <li key={s.title} className="relative">
              <Link
                href={s.href}
                className="flex h-full flex-col rounded-xl border border-ig-border bg-ig-raised p-3 transition-colors hover:border-ig-primary"
              >
                <span className="text-[11px] font-bold text-ig-primary">STEP {i + 1}</span>
                <span className="mt-1 text-2xl">{s.icon}</span>
                <span className="mt-1 text-sm font-bold text-ig-text">{s.title}</span>
                <span className="text-xs text-ig-muted">{s.desc}</span>
              </Link>
              {i < FLOW.length - 1 && (
                <span className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-ig-muted md:block">›</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
