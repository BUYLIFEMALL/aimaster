import { getYtReplyAccount } from "@/lib/youtube/memberAccount";
import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { REPLY_MODEL_OPTIONS, DEFAULT_REPLY_MODEL, getReplyModelProvider } from "@/lib/ai/models";
import { MONITORING_INTERVAL_OPTIONS } from "@/lib/schedule";
import { formatDateTimeKo } from "@/lib/formatDate";
import { StudioHeader, StatCard, Avatar } from "@/components/ui/StudioHeader";
import { YtLogo } from "@/components/ui/YtLogo";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const FLOW = [
  { icon: "🔑", title: "채널·AI 연결", desc: "구글 앱 + 유튜브 채널 + AI 키", href: "/settings" },
  { icon: "🎬", title: "영상 고르기", desc: "동기화 후 답글 달 영상 선택", href: "/videos" },
  { icon: "🤖", title: "AI 답글 초안", desc: "새 댓글마다 초안 자동 작성", href: "/comments" },
  { icon: "✅", title: "검토 후 게시", desc: "웹 또는 텔레그램에서 승인", href: "/comments" },
];

export default async function DashboardPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [accountRes, settingsRes, keysRes, telegramRes, pendingRes, weekRes, totalRes, monitoredRes, recentRes] =
    await Promise.all([
      getYtReplyAccount(supabase, user.id).then((data) => ({ data })),
      supabase
        .from("ytreply_settings")
        .select("reply_model, monitoring_enabled, monitoring_interval_minutes, last_run_at, auto_approve")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("user_api_keys").select("provider").eq("user_id", user.id),
      supabase
        .from("user_telegram_links")
        .select("bot_username")
        .eq("user_id", user.id)
        .eq("program_slug", "youtube-auto-reply")
        .maybeSingle(),
      supabase
        .from("ytreply_comments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "pending_review"),
      supabase
        .from("ytreply_comments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "posted")
        .gte("replied_at", weekAgo),
      supabase
        .from("ytreply_comments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "posted"),
      supabase
        .from("ytreply_videos")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_monitored", true)
        .eq("is_hidden", false),
      supabase
        .from("ytreply_comments")
        .select("id, author_display_name, comment_text, fetched_at")
        .eq("user_id", user.id)
        .eq("status", "pending_review")
        .order("fetched_at", { ascending: false })
        .limit(3),
    ]);

  const account = accountRes.data;
  const settings = settingsRes.data;
  const providers = new Set((keysRes.data ?? []).map((k) => k.provider));
  const replyModel = settings?.reply_model ?? DEFAULT_REPLY_MODEL;
  const modelLabel = REPLY_MODEL_OPTIONS.find((o) => o.value === replyModel)?.shortLabel ?? replyModel;
  const intervalLabel = MONITORING_INTERVAL_OPTIONS.find((o) => o.value === settings?.monitoring_interval_minutes)?.label;
  const pending = pendingRes.count ?? 0;

  const connections = [
    {
      label: "유튜브 채널",
      ok: !!account && !account.needs_reconnect,
      detail: account ? (account.needs_reconnect ? "다시 연결 필요" : account.channel_title) : "연결 안 됨",
    },
    {
      label: "구글 앱(Client ID)",
      ok: providers.has("google_client_id") && providers.has("google_client_secret"),
      detail: providers.has("google_client_id") ? "등록됨" : "미등록",
    },
    {
      label: `AI 키 (${modelLabel})`,
      ok: providers.has(getReplyModelProvider(replyModel)),
      detail: providers.has(getReplyModelProvider(replyModel)) ? "등록됨" : "미등록",
    },
    { label: "텔레그램 승인 알림", ok: !!telegramRes.data, detail: telegramRes.data ? "연결됨" : "선택 사항" },
    {
      label: "예약 모니터링",
      ok: !!settings?.monitoring_enabled,
      detail: settings?.monitoring_enabled ? `${intervalLabel ?? ""}마다 확인` : "꺼짐",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <StudioHeader
        title="채널 대시보드"
        description="새 댓글에 AI가 답글 초안을 만들어 두면, 확인하고 「답변승인」을 눌러 유튜브에 게시합니다."
      >
        <Link href="/comments" className="yt-btn-red">
          💬 댓글 검토하기{pending > 0 ? ` (${pending})` : ""}
        </Link>
        <Link href="/guide" className="yt-btn">
          📖 매뉴얼
        </Link>
      </StudioHeader>

      {/* 채널 배너 */}
      <div className="mb-6 flex items-center gap-4 rounded-xl border border-yt-border bg-gradient-to-r from-[#2a0000] via-yt-surface to-yt-surface p-5">
        <YtLogo size={34} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-yt-muted">연결된 채널</p>
          <p className="truncate text-lg font-bold text-yt-text">{account?.channel_title ?? "아직 연결된 채널이 없어요"}</p>
          <p className="text-xs text-yt-muted">
            {settings?.last_run_at ? `마지막 댓글 확인 ${formatDateTimeKo(settings.last_run_at)}` : "아직 댓글을 확인한 적이 없어요"}
            {settings?.auto_approve && " · ⚡ 자동 게시 켜짐"}
          </p>
        </div>
        {!account && (
          <Link href="/settings" className="yt-btn-red shrink-0">
            채널 연결
          </Link>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="검토 대기 댓글" value={pending} hint="승인해야 게시돼요" accent={pending > 0} />
        <StatCard label="최근 7일 게시" value={weekRes.count ?? 0} />
        <StatCard label="총 게시한 답글" value={totalRes.count ?? 0} />
        <StatCard label="모니터링 중인 영상" value={monitoredRes.count ?? 0} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-5">
        <div className="yt-card lg:col-span-3">
          <h2 className="yt-section-title">🕒 검토를 기다리는 댓글</h2>
          {(recentRes.data ?? []).length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-4xl">💬</p>
              <p className="mt-2 text-sm text-yt-muted">지금은 검토할 댓글이 없어요.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {(recentRes.data ?? []).map((c) => (
                <li key={c.id} className="flex gap-3">
                  <Avatar name={c.author_display_name} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs">
                      <span className="font-semibold text-yt-text">{c.author_display_name ?? "익명"}</span>
                      <span className="ml-2 text-yt-muted">{formatDateTimeKo(c.fetched_at)}</span>
                    </p>
                    <p className="mt-0.5 line-clamp-2 break-words text-sm text-yt-text">{c.comment_text}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {pending > 0 && (
            <Link href="/comments" className="mt-4 inline-block text-sm font-semibold text-yt-link hover:underline">
              모두 보기 →
            </Link>
          )}
        </div>

        <div className="yt-card lg:col-span-2">
          <h2 className="yt-section-title">🔌 연결 상태</h2>
          <ul className="space-y-2">
            {connections.map((c) => (
              <li key={c.label} className="flex items-center justify-between gap-2 rounded-lg bg-yt-raised px-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block truncate text-yt-text">{c.label}</span>
                  <span className="block truncate text-[11px] text-yt-muted">{c.detail}</span>
                </span>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.ok ? "bg-yt-success" : "bg-yt-muted/40"}`} />
              </li>
            ))}
          </ul>
          <Link href="/settings" className="yt-btn mt-3 w-full">
            🔑 연결 설정
          </Link>
        </div>
      </div>

      <div className="yt-card">
        <h2 className="yt-section-title">🧭 이렇게 동작해요</h2>
        <ol className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {FLOW.map((s, i) => (
            <li key={s.title} className="relative">
              <Link
                href={s.href}
                className="flex h-full flex-col rounded-xl border border-yt-border bg-yt-raised p-3 transition-colors hover:border-yt-red"
              >
                <span className="text-[11px] font-bold text-yt-red">STEP {i + 1}</span>
                <span className="mt-1 text-2xl">{s.icon}</span>
                <span className="mt-1 text-sm font-bold text-yt-text">{s.title}</span>
                <span className="text-xs text-yt-muted">{s.desc}</span>
              </Link>
              {i < FLOW.length - 1 && (
                <span className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-yt-muted md:block">›</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
