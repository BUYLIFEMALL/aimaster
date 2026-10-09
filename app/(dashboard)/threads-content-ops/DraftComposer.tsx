"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, ExternalLink, FilePenLine, FolderCog, FolderInput, LoaderCircle, Pencil, RotateCcw } from "lucide-react";
import RetentionNotice from "./RetentionNotice";
import { retentionDaysLeft } from "@/threads-content-ops/lib/retention";
import { POST_STATUS, POST_STATUSES, safePostLink, type PostCounts, type PostStatus } from "@/threads-content-ops/lib/postStatus";
import ViralCategoryManager, { type ViralCategory } from "./ViralCategoryManager";
import { CategoryChip } from "./ViralCollector";
import { moveDrafts, runDraftAction } from "./web-actions";

type Account = { id: string; username: string | null };
type Draft = {
  id: string; body: string; created_at: string; account_id: string; status: string;
  scheduled_at: string | null; error_message: string | null; category_id?: string | null;
  published_at?: string | null; permalink?: string | null;
  media?: { url: string; type: "IMAGE" | "VIDEO" }[];
};
type ActionResult = { ok: true } | { ok: false; error: string };
type Run = (task: () => Promise<ActionResult>, success: string) => Promise<boolean>;
const buttonClass = "rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50";

function localDateTime(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function DraftComposer({ accounts, drafts, categories, postCounts }: {
  accounts: Account[]; drafts: Draft[]; categories: ViralCategory[]; postCounts: Record<keyof PostCounts, number | null>;
}) {
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [managing, setManaging] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();
  const categoryIds = useMemo(() => new Set(categories.map((item) => item.id)), [categories]);
  const categoryOf = (draft: Draft) => (draft.category_id && categoryIds.has(draft.category_id) ? draft.category_id : null);
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { none: 0 };
    for (const draft of drafts) {
      const key = draft.category_id && categoryIds.has(draft.category_id) ? draft.category_id : "none";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [drafts, categoryIds]);
  const visibleDrafts = drafts.filter((draft) => (statusFilter === "all" || draft.status === statusFilter)
    && (categoryFilter === "all" || (categoryFilter === "none" ? !categoryOf(draft) : categoryOf(draft) === categoryFilter)));
  const run: Run = async (task, success) => {
    if (lock.current) return false;
    lock.current = true; setBusy(true); setMessage(null);
    try {
      const result = await task();
      setMessage(result.ok ? { ok: true, text: success } : { ok: false, text: result.error });
      return result.ok;
    } catch {
      setMessage({ ok: false, text: "요청 결과를 확인하지 못했습니다. 발행을 다시 누르기 전에 목록과 Threads 계정에서 게시 여부를 확인해 주세요." });
      return false;
    } finally { lock.current = false; setBusy(false); router.refresh(); }
  };

  return <div className="space-y-4">
    <RetentionNotice scope="manage" />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <QueueMetric label="검토 대기" value={postCounts.draft} tone="text-sky-700" />
      <QueueMetric label="예약 대기" value={postCounts.scheduled} tone="text-amber-700" />
      <QueueMetric label="재검토 필요" value={postCounts.failed} tone="text-rose-700" />
      <QueueMetric label="포스팅완료" value={postCounts.published} tone="text-emerald-700" />
    </div>
    {postCounts.publishing !== null && postCounts.publishing > 0 && <p className="text-sm font-semibold text-violet-700">포스팅 중 {postCounts.publishing}건 · 아래 목록에서 진행 상태를 확인하세요.</p>}
    {message && <p role={message.ok ? "status" : "alert"} className={`rounded-xl border p-3 text-sm ${message.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{message.text}</p>}
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-bold text-neutral-900"><FilePenLine size={18} className="text-amber-600" />콘텐츠 보관함</h2>
        <select aria-label="콘텐츠 상태 필터" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-800"><option value="all">전체 상태</option>{POST_STATUSES.map((status) => <option key={status} value={status}>{POST_STATUS[status].label}</option>)}</select>
      </div>
      <p className="mt-2 text-xs text-neutral-500">수정 버튼으로 본문을 고친 뒤 저장하거나 지금 발행하세요. 포스팅완료 콘텐츠도 이곳에서 확인할 수 있습니다.</p>
      {drafts.length >= 300 && <p className="mt-2 text-xs text-neutral-500">목록과 카테고리 건수는 최근 콘텐츠 300건 기준이며, 위 상태별 집계는 전체 콘텐츠 기준입니다.</p>}
      <div className="my-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="카테고리 필터">
        <CategoryChip active={categoryFilter === "all"} onClick={() => setCategoryFilter("all")}>전체 ({drafts.length})</CategoryChip>
        {categories.map((item) => <CategoryChip key={item.id} active={categoryFilter === item.id} onClick={() => setCategoryFilter(item.id)}>{item.name} ({categoryCounts[item.id] ?? 0})</CategoryChip>)}
        <CategoryChip active={categoryFilter === "none"} onClick={() => setCategoryFilter("none")}>미분류 ({categoryCounts.none ?? 0})</CategoryChip>
        <button type="button" onClick={() => setManaging(true)} className={`${buttonClass} ml-auto inline-flex items-center gap-1`}><FolderCog size={13} />카테고리 관리</button>
      </div>
      {visibleDrafts.length ? <div className="space-y-3">{visibleDrafts.map((draft) => <DraftCard key={draft.id} draft={draft} categories={categories} categoryId={categoryOf(draft)} account={accounts.find((item) => item.id === draft.account_id)} busy={busy} onRun={run} />)}</div> : <p className="text-sm text-neutral-500">{drafts.length ? "조건에 맞는 콘텐츠가 없습니다. 필터를 바꿔 보세요." : "아직 보관된 콘텐츠가 없습니다."}</p>}
    </section>
    {managing && <ViralCategoryManager categories={categories} counts={categoryCounts} onClose={() => setManaging(false)} />}
  </div>;
}

function QueueMetric({ label, value, tone }: { label: string; value: number | null; tone: string }) {
  return <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm"><p className="text-xs text-neutral-500">{label}</p><p className={`mt-1 text-2xl font-bold ${tone}`}>{value ?? "—"}</p></div>;
}

function DraftCard({ draft, categories, categoryId, account, busy, onRun }: {
  draft: Draft; categories: ViralCategory[]; categoryId: string | null; account?: Account; busy: boolean; onRun: Run;
}) {
  const [body, setBody] = useState(draft.body);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState(() => localDateTime(new Date(Date.now() + 30 * 60_000)));
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { setBody(draft.body); }, [draft.body]);
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = "auto"; el.style.height = `${el.scrollHeight + 4}px`;
  }, [body, editing]);
  useEffect(() => { if (editing) bodyRef.current?.focus(); }, [editing]);
  const status = POST_STATUS[draft.status as PostStatus] ?? { label: draft.status, tone: "bg-neutral-100 text-neutral-600" };
  const isDraft = draft.status === "draft";
  const length = body.trim().length;
  const canPost = length > 0 && length <= 500 && Boolean(account);
  const link = safePostLink(draft.permalink);
  const submit = async (intent: "save" | "publish" | "schedule" | "cancel" | "retry", success: string) => {
    if (busy || pending) return;
    if (intent === "publish" && !window.confirm(`이 콘텐츠를 ${account?.username ? `@${account.username}` : "연결된 계정"}에 지금 포스팅하시겠습니까?`)) return;
    setPending(intent);
    try {
      const ok = await onRun(() => runDraftAction({ draftId: draft.id, intent, body, scheduledAt: intent === "schedule" ? scheduledAt : undefined }), success);
      if (ok) setEditing(false);
    } finally { setPending(null); }
  };

  return <article className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${status.tone}`}>{draft.status === "publishing" && draft.error_message ? "발행 확인 필요" : status.label}</span>
        <label className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-violet-300 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-800 focus-within:ring-2 focus-within:ring-violet-400 hover:bg-violet-100">
          <FolderInput size={12} />{categories.find((item) => item.id === categoryId)?.name ?? "미분류"}<span className="border-l border-violet-300 pl-1.5">변경 ▼</span>
          <select aria-label="카테고리 변경" disabled={busy || draft.status === "publishing"} value={categoryId ?? ""} onChange={(event) => { const target = event.target.value || null; void onRun(() => moveDrafts({ ids: [draft.id], categoryId: target }), "카테고리를 바꿨습니다."); }} className="absolute inset-0 h-full w-full cursor-pointer opacity-0"><option value="">미분류</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        </label>
        {(isDraft || draft.status === "failed") && <span className={`text-[11px] ${retentionDaysLeft(draft.created_at) <= 3 ? "text-rose-700" : "text-neutral-500"}`}>🗓️ {retentionDaysLeft(draft.created_at)}일 뒤 자동 삭제</span>}
      </div>
      <p className="text-xs text-neutral-500">{new Date(draft.created_at).toLocaleString("ko-KR")}</p>
    </div>
    {account?.username && <p className="mb-2 text-xs text-neutral-500">포스팅 계정 @{account.username}</p>}
    {isDraft && editing ? <div>
      <label htmlFor={`draft-body-${draft.id}`} className="mb-2 block text-xs font-semibold text-neutral-700">본문 수정</label>
      <textarea id={`draft-body-${draft.id}`} ref={bodyRef} disabled={busy} className="min-h-28 w-full resize-none overflow-hidden rounded-lg border border-neutral-300 bg-white p-3 text-sm leading-relaxed text-neutral-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-neutral-100" maxLength={5000} value={body} onChange={(event) => setBody(event.target.value)} />
    </div> : <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-900">{body}</p>}
    {isDraft && <p className={`mt-2 text-xs ${length > 500 ? "font-semibold text-rose-700" : "text-neutral-500"}`}>{length} / 500자{length > 500 ? " · 본문을 줄여야 발행·예약할 수 있습니다." : editing ? " · 지금 발행하거나 예약하면 수정한 본문도 함께 저장됩니다." : ""}</p>}
    {Array.isArray(draft.media) && draft.media.length > 0 && <div className="mt-3">
      <p className="text-xs text-neutral-500">첨부 미디어 {draft.media.length}개 (이미지 {draft.media.filter((item) => item.type === "IMAGE").length} · 영상 {draft.media.filter((item) => item.type === "VIDEO").length})</p>
      <div className="mt-2 flex gap-2 overflow-x-auto">{draft.media.map((item, index) => item.type === "VIDEO"
        ? <video key={item.url} src={item.url} preload="metadata" muted className="h-20 w-20 shrink-0 rounded-lg object-cover" aria-label={`첨부 영상 ${index + 1}`} />
        // eslint-disable-next-line @next/next/no-img-element
        : <img key={item.url} src={item.url} alt={`첨부 이미지 ${index + 1}`} className="h-20 w-20 shrink-0 rounded-lg object-cover" />)}</div>
    </div>}
    {(draft.status === "failed" || draft.status === "publishing") && draft.error_message && <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{draft.error_message}</p>}
    {draft.status === "scheduled" && draft.scheduled_at && <p className="mt-3 flex items-center gap-1 text-xs font-semibold text-amber-800"><CalendarClock size={13} />{new Date(draft.scheduled_at).toLocaleString("ko-KR")} 예약</p>}
    {draft.status === "published" && <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"><span className="font-semibold">✓ 포스팅완료{draft.published_at ? ` · ${new Date(draft.published_at).toLocaleString("ko-KR")}` : ""}</span>{link ? <a className="inline-flex items-center gap-1 font-bold underline" href={link} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} />게시글 보기</a> : <span>Threads 계정에서 게시글을 확인하세요.</span>}</div>}
    {isDraft && <div className="mt-3 rounded-lg border border-neutral-200 bg-white p-3">
      <label htmlFor={`schedule-${draft.id}`} className="mb-2 block text-xs text-neutral-500">예약 발행 시간</label>
      <div className="flex flex-col gap-2 sm:flex-row"><input id={`schedule-${draft.id}`} disabled={busy} className="min-w-0 rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-xs text-neutral-900" type="datetime-local" value={scheduledAt} min={localDateTime(new Date(Date.now() + 5 * 60_000))} onChange={(event) => setScheduledAt(event.target.value)} /><button type="button" className={buttonClass} disabled={busy || !canPost || !scheduledAt} onClick={() => void submit("schedule", "예약 대기열에 넣었습니다.")}>{pending === "schedule" ? "예약 중…" : "예약하기"}</button></div>
    </div>}
    <div className="mt-3 flex flex-wrap justify-end gap-2">
      {isDraft && <>
        {editing && <button type="button" className={buttonClass} disabled={busy} onClick={() => { setBody(draft.body); setEditing(false); }}>수정 취소</button>}
        <button type="button" className={`${buttonClass} inline-flex items-center gap-1`} disabled={busy || editing} onClick={() => setEditing(true)}><Pencil size={12} />{editing ? "수정 중" : "수정"}</button>
        <button type="button" className={buttonClass} disabled={busy || !body.trim()} onClick={() => void submit("save", "수정한 본문을 저장했습니다.")}>{pending === "save" ? "저장 중…" : "저장"}</button>
        <button type="button" className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-bold text-[#ffffff] hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300" disabled={busy || !canPost} onClick={() => void submit("publish", "Threads에 포스팅완료했습니다. 아래 완료 상태와 게시글 링크를 확인하세요.")}>{pending === "publish" && <LoaderCircle size={13} className="animate-spin" />}{pending === "publish" ? "포스팅 중…" : "지금 발행"}</button>
      </>}
      {isDraft && !account && <p className="w-full text-right text-xs text-amber-800">이 콘텐츠의 Threads 계정을 다시 연결한 뒤 발행하세요.</p>}
      {draft.status === "scheduled" && <button type="button" className={buttonClass} disabled={busy} onClick={() => void submit("cancel", "예약을 취소하고 검토 대기로 되돌렸습니다. 수정 후 다시 발행하거나 예약할 수 있습니다.")}>예약 취소</button>}
      {draft.status === "failed" && <button type="button" className={`${buttonClass} inline-flex items-center gap-1`} disabled={busy} onClick={() => void submit("retry", "검토 대기로 되돌렸습니다. 수정 버튼으로 내용을 확인한 뒤 다시 발행하세요.")}><RotateCcw size={12} />재검토·재시도</button>}
    </div>
  </article>;
}
