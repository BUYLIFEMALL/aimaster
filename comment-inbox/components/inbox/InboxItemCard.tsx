"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveInboxItemAction, skipInboxItemAction } from "@/lib/actions/inbox";
import { Avatar } from "@/components/ui/StudioHeader";
import { formatDateTimeKo } from "@/lib/formatDate";
import type { InboxItem } from "@/lib/inbox/load";

const PLATFORM_CHIP: Record<InboxItem["platform"], { label: string; className: string }> = {
  ig_comment: { label: "📸 인스타 댓글", className: "border-pink-500/30 bg-pink-500/10 text-pink-300" },
  ig_dm: { label: "💌 인스타 DM", className: "border-purple-500/30 bg-purple-500/10 text-purple-300" },
  threads: { label: "🧵 쓰레드", className: "border-slate-400/30 bg-slate-400/10 text-slate-200" },
  youtube: { label: "▶️ 유튜브", className: "border-red-500/30 bg-red-500/10 text-red-300" },
};

function DmWindowBadge({ leftMs }: { leftMs: number | null | undefined }) {
  if (leftMs == null) {
    return <span className="rounded-full bg-ig-danger/10 px-2 py-0.5 text-[11px] font-bold text-ig-danger">⚠️ 답장 시간 만료</span>;
  }
  const hours = Math.floor(leftMs / 3_600_000);
  const mins = Math.floor((leftMs % 3_600_000) / 60_000);
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${leftMs < 4 * 3_600_000 ? "bg-ig-warn/10 text-ig-warn" : "bg-ig-success/10 text-ig-success"}`}
    >
      ⏳ {hours}시간 {mins}분 남음
    </span>
  );
}

export function InboxItemCard({ item }: { item: InboxItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(item.draft ?? "");
  const [busy, setBusy] = useState<"post" | "skip" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chip = PLATFORM_CHIP[item.platform];
  const dmExpired = item.platform === "ig_dm" && item.dmLeftMs == null;

  async function run(kind: "post" | "skip") {
    setError(null);
    setBusy(kind);
    try {
      const result = kind === "post" ? await approveInboxItemAction(item.platform, item.id, text) : await skipInboxItemAction(item.platform, item.id);
      if (result.error) setError(result.error);
      else router.refresh();
    } catch (err) {
      // 배포 직후처럼 이전 빌드 화면이면 서버 동작 호출이 실패할 수 있어 새로고침을 안내한다(원래 프로그램과 같은 처리)
      setError(err instanceof Error ? `${err.message} (페이지를 새로고침한 뒤 다시 시도해주세요)` : "처리하지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해주세요.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className="ig-card p-4">
      <div className="flex gap-3">
        <Avatar name={item.avatarName} size={36} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${chip.className}`}>{chip.label}</span>
            <span className="font-semibold text-ig-text">{item.authorLabel}</span>
            <span className="text-ig-muted">{formatDateTimeKo(item.at)}</span>
            {item.platform === "ig_dm" && <DmWindowBadge leftMs={item.dmLeftMs} />}
          </p>
          <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-ig-text">{item.text}</p>
          {item.subText && <p className="mt-1 truncate text-[11px] text-ig-muted">{item.subText}</p>}
        </div>
        {item.thumbUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbUrl}
            alt="썸네일"
            className={`${item.thumbShape === "wide" ? "h-12 w-20" : "h-12 w-12"} shrink-0 rounded-lg object-cover`}
          />
        )}
      </div>

      {open && (
        <div className="mt-3 space-y-2 border-t border-ig-border pt-3">
          <label className="block text-xs font-semibold text-ig-muted">
            {item.platform === "ig_dm" ? "보낼 DM 답장" : "게시할 답글"} (AI 초안 — 고쳐서 보낼 수 있어요)
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-ig-border bg-ig-bg p-3 text-sm text-ig-text placeholder:text-ig-muted focus:border-[#ec4899] focus:outline-none focus:ring-1 focus:ring-[#ec4899]/20"
            placeholder={item.draft ? "" : "AI 초안이 없어요. 직접 입력해주세요."}
          />
          {dmExpired && (
            <p className="text-[11px] text-ig-warn">
              고객의 마지막 메시지로부터 24시간이 지나 인스타그램 정책상 일반 답장을 보낼 수 없을 수 있어요.
            </p>
          )}
        </div>
      )}

      {error && <p className="mt-2 rounded-lg border border-ig-danger/30 bg-ig-danger/10 p-2 text-xs text-ig-danger">{error}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {open ? (
          <>
            <button
              type="button"
              onClick={() => run("post")}
              disabled={busy !== null || !text.trim()}
              className="min-h-[40px] rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
            >
              {busy === "post" ? "게시 중…" : item.platform === "ig_dm" ? "✅ 답변승인 · 발송" : "✅ 답변승인 · 게시"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={busy !== null}
              className="min-h-[40px] rounded-xl border border-ig-border bg-ig-bg px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-ig-raised"
            >
              접기
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="min-h-[40px] rounded-xl bg-ig-primary px-4 py-2 text-sm font-bold text-white hover:bg-ig-primary-hover"
          >
            ✍️ 답장 쓰기
          </button>
        )}
        <button
          type="button"
          onClick={() => run("skip")}
          disabled={busy !== null}
          className="min-h-[40px] rounded-xl border border-ig-border bg-ig-bg px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-ig-raised disabled:opacity-50"
        >
          {busy === "skip" ? "처리 중…" : "건너뛰기"}
        </button>
        <a
          href={item.sourceHref}
          target="_blank"
          rel="noreferrer"
          className="ml-auto min-h-[40px] rounded-xl px-3 py-2 text-xs font-semibold text-pink-400 hover:underline"
        >
          원래 프로그램에서 보기 ↗
        </a>
      </div>
    </article>
  );
}
