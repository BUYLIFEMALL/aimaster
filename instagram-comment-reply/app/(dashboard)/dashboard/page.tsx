import { getCommentAccount } from "@/lib/instagram/memberAccount";
import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { REPLY_MODEL_OPTIONS, DEFAULT_REPLY_MODEL, getReplyModelProvider } from "@/lib/ai/models";
import { MONITORING_INTERVAL_OPTIONS } from "@/lib/schedule";
import { formatDateTimeKo } from "@/lib/formatDate";
import { Avatar } from "@/components/ui/StudioHeader";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [accountRes, settingsRes, keysRes, telegramRes, pendingRes, weekRes, totalRes, monitoredRes, recentRes, dmAccountRes, dmPendingRes, dmTelegramRes] =
    await Promise.all([
      getCommentAccount(supabase, user.id).then((data) => ({ data })),
      supabase
        .from("ig_settings")
        .select("reply_model, monitoring_enabled, monitoring_interval_minutes, last_run_at, auto_approve")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("user_api_keys").select("provider").eq("user_id", user.id),
      supabase
        .from("user_telegram_links")
        .select("bot_username")
        .eq("user_id", user.id)
        .eq("program_slug", "instagram-comment-reply")
        .maybeSingle(),
      supabase
        .from("ig_comments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "pending_review"),
      supabase
        .from("ig_comments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "posted")
        .gte("replied_at", weekAgo),
      supabase
        .from("ig_comments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "posted"),
      supabase
        .from("ig_media")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_monitored", true)
        .eq("is_hidden", false),
      supabase
        .from("ig_comments")
        .select("id, author_username, comment_text, fetched_at")
        .eq("user_id", user.id)
        .eq("status", "pending_review")
        .order("fetched_at", { ascending: false })
        .limit(3),
      // 2026-10-20 병합 B 2단계: DM 답변 상태도 함께
      supabase.from("dm_accounts").select("id").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("dm_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "pending_review"),
      supabase
        .from("user_telegram_links")
        .select("bot_username")
        .eq("user_id", user.id)
        .eq("program_slug", "instagram-dm-reply")
        .maybeSingle(),
    ]);

  const account = accountRes.data;
  const settings = settingsRes.data;
  const providers = new Set((keysRes.data ?? []).map((k) => k.provider));
  const replyModel = settings?.reply_model ?? DEFAULT_REPLY_MODEL;
  const modelLabel = REPLY_MODEL_OPTIONS.find((o) => o.value === replyModel)?.shortLabel ?? replyModel;
  const intervalLabel = MONITORING_INTERVAL_OPTIONS.find((o) => o.value === settings?.monitoring_interval_minutes)?.label;
  const pending = pendingRes.count ?? 0;
  const dmPending = dmPendingRes.count ?? 0;

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
    { label: "텔레그램 댓글 알림", ok: !!telegramRes.data, detail: telegramRes.data ? "연결됨" : "선택 사항" },
    {
      label: "DM 답변 (메시지 권한)",
      ok: !!dmAccountRes.data,
      detail: dmAccountRes.data ? "사용 중" : "「DM 답변도 사용」으로 연결하면 켜져요",
    },
    { label: "텔레그램 DM 알림", ok: !!dmTelegramRes.data, detail: dmTelegramRes.data ? "연결됨" : "선택 사항" },
    {
      label: "예약 모니터링",
      ok: !!settings?.monitoring_enabled,
      detail: settings?.monitoring_enabled ? `${intervalLabel ?? ""}마다 확인` : "꺼짐",
    },
  ];

  // 2026-10-20 v1.24: INSTA 포스팅 자동화 대시보드와 같은 배치(머리 카드 → 소개 → 단계 카드 → 상태 숫자 → 목록)
  const stepCards = [
    { href: "/settings", title: "1. 계정·키 연결", desc: "Meta 앱·AI 키·인스타 연결", icon: "🔑", highlight: false },
    { href: "/comments", title: "2. 댓글 답글", desc: "AI 초안 검토 후 게시", icon: "💬", highlight: false },
    { href: "/dm/conversations", title: "3. DM 답장", desc: "AI 초안 검토 후 발송", icon: "💌", highlight: false },
    { href: "/guide", title: "4. 사용 매뉴얼", desc: "5단계 가이드 & 자주 묻는 질문", icon: "📖", highlight: true },
  ];
  const stats = [
    { label: "검토 대기 댓글", value: pending, tone: "bg-pink-500/15 text-pink-300 border-pink-500/30", href: "/comments" },
    { label: "검토 대기 DM", value: dmPending, tone: "bg-purple-500/15 text-purple-300 border-purple-500/30", href: "/dm/conversations" },
    { label: "최근 7일 게시", value: weekRes.count ?? 0, tone: "bg-sky-500/15 text-sky-300 border-sky-500/30", href: "/history" },
    { label: "총 게시한 답글", value: totalRes.count ?? 0, tone: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", href: "/history" },
    { label: "모니터링 게시물", value: monitoredRes.count ?? 0, tone: "bg-amber-500/15 text-amber-300 border-amber-500/30", href: "/media" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* 머리 카드 */}
      <div className="flex flex-col gap-4 rounded-2xl border border-ig-border bg-ig-surface p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold text-ig-text">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-lg">💬</span>
            대시보드
            <span className="rounded-full border border-pink-500/30 bg-pink-500/10 px-2 py-0.5 text-xs font-bold text-pink-400">{APP_VERSION}</span>
          </h1>
          <p className="mt-1 text-sm text-ig-muted">인스타그램 댓글과 DM에 AI 답변 초안을 만들고, 검토·승인 현황을 한눈에 관리합니다.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href="/comments" className="rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:opacity-90">
            💬 댓글 검토하기{pending > 0 ? ` (${pending})` : ""}
          </Link>
          <Link href="/dm/conversations" className="rounded-xl border border-ig-border bg-ig-bg px-4 py-2 text-sm font-bold text-ig-text hover:bg-ig-raised">
            💌 DM 검토하기{dmPending > 0 ? ` (${dmPending})` : ""}
          </Link>
        </div>
      </div>

      {/* 소개 카드 */}
      <div className="space-y-1.5 rounded-2xl border border-ig-border bg-ig-surface p-5 text-sm leading-relaxed text-ig-text">
        <p>💬 인스타 계정 연결 한 번으로 게시물 댓글과 DM 문의를 한 곳에서 응대하는 INSTA 댓글·DM 자동화입니다.</p>
        <p>✍️ 새 댓글마다 다른 답글 초안(링크 포함)을, 새 DM에는 문의에 맞는 답장 초안을 AI가 만들어 둡니다.</p>
        <p>✅ 웹 화면이나 텔레그램에서 「답변승인」을 눌러야 게시·발송되고, 자동 게시·발송은 위험 안내에 동의해야 켜집니다.</p>
        <p className="text-ig-muted">
          🔗 연결된 인스타 계정: <b className="text-ig-text">{account ? `@${account.username}` : "아직 없음"}</b>
          {settings?.last_run_at ? ` · 마지막 댓글 확인 ${formatDateTimeKo(settings.last_run_at)}` : " · 아직 댓글을 확인한 적이 없어요"}
          {settings?.auto_approve && " · ⚡ 자동 게시 켜짐"}
        </p>
        <p className="text-ig-muted">🔑 회원 본인의 Meta 앱·인스타그램 계정과 AI 키를 등록해 사용합니다.</p>
      </div>

      {/* 단계 카드 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stepCards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className={`rounded-xl border p-4 transition-colors ${
              c.highlight
                ? "border-pink-500/40 bg-gradient-to-br from-pink-500/15 to-purple-600/10 hover:border-pink-400"
                : "border-ig-border bg-ig-surface hover:border-slate-500"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`text-sm font-bold ${c.highlight ? "text-pink-300" : "text-ig-text"}`}>{c.title}</span>
              <span>{c.icon}</span>
            </div>
            <p className={`mt-1 text-xs ${c.highlight ? "text-pink-300/80" : "text-ig-muted"}`}>{c.desc}</p>
          </Link>
        ))}
      </div>

      {/* 상태 숫자 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((st) => (
          <Link key={st.label} href={st.href} className="rounded-xl border border-ig-border bg-ig-surface p-4 hover:border-slate-500">
            <p className="text-2xl font-extrabold text-ig-text">{st.value}</p>
            <span className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[11px] font-bold ${st.tone}`}>{st.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="rounded-2xl border border-ig-border bg-ig-surface p-5 lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-ig-text">
              🕒 검토를 기다리는 댓글 <span className="ml-1 rounded-full bg-ig-raised px-2 py-0.5 text-xs text-ig-muted">{pending}건</span>
            </h2>
            <Link href="/comments" className="text-sm font-semibold text-pink-400 hover:underline">
              전체 보기 →
            </Link>
          </div>
          {(recentRes.data ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-ig-muted">
              지금은 검토할 댓글이 없어요.
              <br />
              DM 대기는 {dmPending}건입니다.
            </p>
          ) : (
            <ul className="space-y-4">
              {(recentRes.data ?? []).map((c) => (
                <li key={c.id} className="flex gap-3">
                  <Avatar name={c.author_username} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs">
                      <span className="font-semibold text-ig-text">{c.author_username ? `@${c.author_username}` : "익명"}</span>
                      <span className="ml-2 text-ig-muted">{formatDateTimeKo(c.fetched_at)}</span>
                    </p>
                    <p className="mt-0.5 line-clamp-2 break-words text-sm text-ig-text">{c.comment_text}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-ig-border bg-ig-surface p-5 lg:col-span-2">
          <h2 className="mb-3 text-base font-bold text-ig-text">🔌 연결 상태</h2>
          <ul className="space-y-2">
            {connections.map((c) => (
              <li key={c.label} className="flex items-center justify-between gap-2 rounded-lg bg-ig-raised px-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block truncate text-ig-text">{c.label}</span>
                  <span className="block truncate text-[11px] text-ig-muted">{c.detail}</span>
                </span>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.ok ? "bg-ig-success" : "bg-ig-muted/40"}`} />
              </li>
            ))}
          </ul>
          <Link href="/settings" className="mt-3 block rounded-xl border border-ig-border bg-ig-bg px-4 py-2 text-center text-sm font-bold text-ig-text hover:bg-ig-raised">
            🔑 연결 설정
          </Link>
        </div>
      </div>
    </div>
  );
}
