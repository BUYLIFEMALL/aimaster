import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { getReplyAccount } from "@/lib/threads/memberAccount";
import { REPLY_MODEL_OPTIONS, DEFAULT_REPLY_MODEL, getReplyModelProvider } from "@/lib/ai/models";
import { MONITORING_INTERVAL_OPTIONS } from "@/lib/schedule";
import { formatDateTimeKo } from "@/lib/formatDate";
import { StudioHeader, StatCard } from "@/components/ui/StudioHeader";
import { PendingReviewList } from "@/components/PendingReviewList";
import { ThLogo } from "@/components/ui/ThLogo";

// v1.18: 공용 기준 코드 `pending-review-list` 목록 색
const LIST_CLASSES = { text: "text-th-text", muted: "text-th-muted", hover: "hover:bg-th-raised" };

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const FLOW = [
  { icon: "🔑", title: "계정·AI 연결", desc: "Meta 앱 + 쓰레드 계정 + AI 키", href: "/settings" },
  { icon: "🧵", title: "게시물 고르기", desc: "동기화 후 답글 달 게시물 선택", href: "/media" },
  { icon: "🤖", title: "AI 답글 초안", desc: "새 댓글마다 초안 자동 작성", href: "/comments" },
  { icon: "✅", title: "검토 후 게시", desc: "웹 또는 텔레그램에서 승인", href: "/comments" },
];

export default async function DashboardPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [accountRes, settingsRes, keysRes, telegramRes, pendingRes, weekRes, totalRes, monitoredRes, recentRes] =
    await Promise.all([
      // v1.13: 공용 연결 계정 포함
      getReplyAccount(supabase, user.id).then((data) => ({ data })),
      supabase
        .from("th_settings")
        .select("reply_model, monitoring_enabled, monitoring_interval_minutes, last_run_at, auto_approve")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("user_api_keys").select("provider").eq("user_id", user.id),
      supabase
        .from("user_telegram_links")
        .select("bot_username")
        .eq("user_id", user.id)
        .eq("program_slug", "threads-comment-reply")
        .maybeSingle(),
      supabase
        .from("th_comments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "pending_review"),
      supabase
        .from("th_comments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "posted")
        .gte("replied_at", weekAgo),
      supabase
        .from("th_comments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "posted"),
      supabase
        .from("th_posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_monitored", true)
        .eq("is_hidden", false),
      supabase
        .from("th_comments")
        .select("id, post_id, author_username, comment_text, fetched_at")
        .eq("user_id", user.id)
        .eq("status", "pending_review")
        .order("fetched_at", { ascending: false })
        .limit(3),
    ]);

  // v1.17: 검토 대기 댓글이 달린 글 앞부분(쓰레드 글은 썸네일이 없어 글로 표시)
  const recentPostIds = Array.from(new Set((recentRes.data ?? []).map((c) => c.post_id)));
  const { data: recentPosts } = await supabase
    .from("th_posts")
    .select("id, text")
    .eq("user_id", user.id)
    .in("id", recentPostIds.length > 0 ? recentPostIds : ["__none__"]);
  const textByPostId = new Map((recentPosts ?? []).map((p) => [p.id, p.text]));

  const account = accountRes.data;
  const settings = settingsRes.data;
  const providers = new Set((keysRes.data ?? []).map((k) => k.provider));
  const replyModel = settings?.reply_model ?? DEFAULT_REPLY_MODEL;
  const modelLabel = REPLY_MODEL_OPTIONS.find((o) => o.value === replyModel)?.shortLabel ?? replyModel;
  const intervalLabel = MONITORING_INTERVAL_OPTIONS.find((o) => o.value === settings?.monitoring_interval_minutes)?.label;
  const pending = pendingRes.count ?? 0;

  const connections = [
    {
      label: "쓰레드 계정",
      ok: !!account && !account.needs_reconnect,
      detail: account ? (account.needs_reconnect ? "다시 연결 필요" : `@${account.username}`) : "연결 안 됨",
    },
    {
      label: "Meta 앱(Threads 앱 ID)",
      ok: providers.has("threads_app_id") && providers.has("threads_app_secret"),
      detail: providers.has("threads_app_id") ? "등록됨" : "미등록",
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
        title="계정 대시보드"
        description="새 댓글에 AI가 답글 초안을 만들어 두면, 확인하고 「답변승인」을 눌러 쓰레드에 게시합니다."
      >
        <Link href="/comments" className="th-btn-primary">
          💬 댓글 검토하기{pending > 0 ? ` (${pending})` : ""}
        </Link>
        <Link href="/guide" className="th-btn">
          📖 매뉴얼
        </Link>
      </StudioHeader>

      {/* 계정 배너 */}
      <div className="mb-6 flex items-center gap-4 rounded-xl border border-th-border bg-gradient-to-r from-[#262626] via-th-surface to-th-surface p-5">
        <ThLogo size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-th-muted">연결된 쓰레드 계정</p>
          <p className="truncate text-lg font-bold text-th-text">{account ? `@${account.username}` : "아직 연결된 계정이 없어요"}</p>
          <p className="text-xs text-th-muted">
            {settings?.last_run_at ? `마지막 댓글 확인 ${formatDateTimeKo(settings.last_run_at)}` : "아직 댓글을 확인한 적이 없어요"}
            {settings?.auto_approve && " · ⚡ 자동 게시 켜짐"}
          </p>
        </div>
        {!account && (
          <Link href="/settings" className="th-btn-primary shrink-0">
            계정 연결
          </Link>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="검토 대기 댓글" value={pending} hint="승인해야 게시돼요" accent={pending > 0} />
        <StatCard label="최근 7일 게시" value={weekRes.count ?? 0} />
        <StatCard label="총 게시한 답글" value={totalRes.count ?? 0} />
        <StatCard label="모니터링 중인 게시물" value={monitoredRes.count ?? 0} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-5">
        <div className="th-card lg:col-span-3">
          {/* v1.16: INSTA 댓글·DM 대시보드와 같은 형식(제목 옆 건수 + 오른쪽 위 전체 보기) */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-th-text">
              🕒 검토를 기다리는 댓글 <span className="ml-1 rounded-full bg-th-raised px-2 py-0.5 text-xs text-th-muted">{pending}건</span>
            </h2>
            <Link href="/comments" className="shrink-0 text-sm font-semibold text-th-link hover:underline">
              전체 보기 →
            </Link>
          </div>
          <PendingReviewList
            classes={LIST_CLASSES}
            empty={
              <div className="py-8 text-center">
                <p className="text-4xl">💬</p>
                <p className="mt-2 text-sm text-th-muted">지금은 검토할 댓글이 없어요.</p>
              </div>
            }
            items={(recentRes.data ?? []).map((c) => ({
              id: c.id,
              href: `/comments#post-${c.post_id}`,
              avatarName: c.author_username,
              authorLabel: c.author_username ? `@${c.author_username}` : "익명",
              at: c.fetched_at,
              text: c.comment_text,
              subText: `🧵 ${textByPostId.get(c.post_id) || "(삭제된 글)"}`,
            }))}
          />
        </div>

        <div className="th-card lg:col-span-2">
          <h2 className="th-section-title">🔌 연결 상태</h2>
          <ul className="space-y-2">
            {connections.map((c) => (
              <li key={c.label} className="flex items-center justify-between gap-2 rounded-lg bg-th-raised px-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block truncate text-th-text">{c.label}</span>
                  <span className="block truncate text-[11px] text-th-muted">{c.detail}</span>
                </span>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.ok ? "bg-th-success" : "bg-th-muted/40"}`} />
              </li>
            ))}
          </ul>
          <Link href="/settings" className="th-btn mt-3 w-full">
            🔑 연결 설정
          </Link>
        </div>
      </div>

      <div className="th-card">
        <h2 className="th-section-title">🧭 이렇게 동작해요</h2>
        <ol className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {FLOW.map((s, i) => (
            <li key={s.title} className="relative">
              <Link
                href={s.href}
                className="flex h-full flex-col rounded-xl border border-th-border bg-th-raised p-3 transition-colors hover:border-th-muted"
              >
                <span className="text-[11px] font-bold text-th-text">STEP {i + 1}</span>
                <span className="mt-1 text-2xl">{s.icon}</span>
                <span className="mt-1 text-sm font-bold text-th-text">{s.title}</span>
                <span className="text-xs text-th-muted">{s.desc}</span>
              </Link>
              {i < FLOW.length - 1 && (
                <span className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-th-muted md:block">›</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
