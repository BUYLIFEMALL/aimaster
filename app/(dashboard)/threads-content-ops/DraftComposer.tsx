"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, FilePenLine, FolderCog, FolderInput, RotateCcw } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import RetentionNotice from "./RetentionNotice";
import { retentionDaysLeft } from "@/threads-content-ops/lib/retention";
import ViralCategoryManager, { type ViralCategory } from "./ViralCategoryManager";
import { CategoryChip } from "./ViralCollector";
import { cancelScheduledDraft, moveDrafts, publishDraft, retryFailedDraft, saveDraft, scheduleDraft } from "./web-actions";

type Account = { id: string; username: string | null };
type Draft = { id: string; body: string; created_at: string; account_id: string; status: string; scheduled_at: string | null; error_message: string | null; category_id?: string | null; media?: { url: string; type: "IMAGE" | "VIDEO" }[] };

function localDateTime(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function DraftComposer({ accounts, drafts, categories }: { accounts: Account[]; drafts: Draft[]; categories: ViralCategory[] }) {
  const [busy, setBusy] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all"); // all | none(미분류) | 카테고리 id
  const [managing, setManaging] = useState(false);
  const categoryIds = useMemo(() => new Set(categories.map((item) => item.id)), [categories]);
  const categoryOf = (draft: Draft) => (draft.category_id && categoryIds.has(draft.category_id) ? draft.category_id : null);
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { none: 0 };
    for (const draft of drafts) { const key = draft.category_id && categoryIds.has(draft.category_id) ? draft.category_id : "none"; counts[key] = (counts[key] ?? 0) + 1; }
    return counts;
  }, [drafts, categoryIds]);
  const visibleDrafts = drafts.filter((draft) => categoryFilter === "all" || (categoryFilter === "none" ? !categoryOf(draft) : categoryOf(draft) === categoryFilter));
  const [message, setMessage] = useState("");
  const router = useRouter();
  const queueSummary = useMemo(() => ({
    draft: drafts.filter((draft) => draft.status === "draft").length,
    scheduled: drafts.filter((draft) => draft.status === "scheduled").length,
    failed: drafts.filter((draft) => draft.status === "failed").length,
  }), [drafts]);

  if (!accounts.length) return null;
  const run = async (task: () => Promise<void>, success: string) => {
    setBusy(true); setMessage("");
    try { await task(); setMessage(success); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "작업을 완료하지 못했습니다."); }
    finally { setBusy(false); }
  };

  return <div className="space-y-4">
    <RetentionNotice scope="manage" />
    <div className="grid gap-3 sm:grid-cols-3"><QueueMetric label="검토 대기" value={queueSummary.draft} tone="text-sky-700" /><QueueMetric label="예약 대기" value={queueSummary.scheduled} tone="text-amber-700" /><QueueMetric label="재검토 필요" value={queueSummary.failed} tone="text-rose-700" /></div>
    <GlassCard><div className="mb-1 flex items-center gap-2"><FilePenLine size={18} className="text-gold" /><h2 className="font-bold text-white">콘텐츠 보관함</h2></div><p className="mb-4 text-xs text-subtext">초안은 검토·수정 후 발행합니다. 실패 기록은 원인을 확인한 뒤 다시 초안으로 돌립니다.</p><div className="mb-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="카테고리 필터">
      <CategoryChip active={categoryFilter === "all"} onClick={() => setCategoryFilter("all")}>전체 ({drafts.length})</CategoryChip>
      {categories.map((item) => <CategoryChip key={item.id} active={categoryFilter === item.id} onClick={() => setCategoryFilter(item.id)}>{item.name} ({categoryCounts[item.id] ?? 0})</CategoryChip>)}
      {(categoryCounts.none ?? 0) > 0 && <CategoryChip active={categoryFilter === "none"} onClick={() => setCategoryFilter("none")}>미분류 ({categoryCounts.none})</CategoryChip>}
      <button type="button" onClick={() => setManaging(true)} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"><FolderCog size={13} />카테고리 관리</button>
    </div>{visibleDrafts.length ? <div className="space-y-3">{visibleDrafts.map((draft) => <DraftCard key={draft.id} draft={draft} categories={categories} categoryId={categoryOf(draft)} busy={busy} onRun={run} />)}</div> : <p className="text-sm text-subtext">{drafts.length ? "이 카테고리에 보관된 글이 없습니다." : "저장된 초안·예약·실패 기록이 없습니다."}</p>}</GlassCard>
    {managing && <ViralCategoryManager categories={categories} counts={categoryCounts} onClose={() => setManaging(false)} />}
  </div>;
}

function QueueMetric({ label, value, tone }: { label: string; value: number; tone: string }) { return <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm"><p className="text-xs text-neutral-500">{label}</p><p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p></div>; }

function DraftCard({ draft, categories, categoryId, busy, onRun }: { draft: Draft; categories: ViralCategory[]; categoryId: string | null; busy: boolean; onRun: (task: () => Promise<void>, success: string) => Promise<void> }) {
  const [body, setBody] = useState(draft.body);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  // 본문이 스크롤 없이 한 번에 모두 보이도록 글 길이에 맞춰 세로 칸을 키운다.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 4}px`;
  }, [body]);
  const [scheduledAt, setScheduledAt] = useState(() => localDateTime(new Date(Date.now() + 30 * 60_000)));
  const statusLabel = draft.status === "scheduled" ? "예약 대기" : draft.status === "failed" ? "발행 실패" : "검토 대기";
  const statusStyle = draft.status === "scheduled" ? "bg-amber-400/10 text-amber-300" : draft.status === "failed" ? "bg-rose-400/10 text-rose-300" : "bg-sky-400/10 text-sky-300";
  return <div className="rounded-lg border border-white/10 bg-black/15 p-3"><div className="mb-2 flex items-center justify-between gap-2"><span className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-xs ${statusStyle}`}>{statusLabel}</span><label className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-violet-300 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-800 focus-within:ring-2 focus-within:ring-violet-400 hover:bg-violet-100"><FolderInput size={12} />{categories.find((item) => item.id === categoryId)?.name ?? "미분류"}<span className="border-l border-violet-300 pl-1.5">변경 ▼</span><select aria-label="카테고리 변경" disabled={busy} value={categoryId ?? ""} onChange={(event) => void onRun(async () => { const result = await moveDrafts({ ids: [draft.id], categoryId: event.target.value || null }); if (!result.ok) throw new Error(result.error); }, "카테고리를 바꿨습니다.")} className="absolute inset-0 h-full w-full cursor-pointer opacity-0"><option value="">미분류</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{(draft.status === "draft" || draft.status === "failed") && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${retentionDaysLeft(draft.created_at) <= 3 ? "bg-rose-50 text-rose-700" : "bg-neutral-100 text-neutral-600"}`}>🗓️ {retentionDaysLeft(draft.created_at)}일 뒤 자동 삭제</span>}</span><p className="text-xs text-subtext">{new Date(draft.created_at).toLocaleString("ko-KR")}</p></div>{draft.status === "draft" ? <textarea ref={bodyRef} className="min-h-28 w-full resize-none overflow-hidden bg-transparent text-sm leading-relaxed text-white outline-none" maxLength={5000} value={body} onChange={(event) => setBody(event.target.value)} /> : <p className="whitespace-pre-wrap text-sm text-white">{draft.body}</p>}{Array.isArray(draft.media) && draft.media.length > 0 && <div className="mt-2"><p className="text-xs text-subtext">첨부 미디어 {draft.media.length}개 (이미지 {draft.media.filter((item) => item.type === "IMAGE").length} · 영상 {draft.media.filter((item) => item.type === "VIDEO").length}) — 발행하면 캐러셀로 함께 올라갑니다</p><div className="mt-1 flex gap-1.5 overflow-x-auto">{draft.media.map((item, index) => item.type === "VIDEO" ? <video key={item.url} src={item.url} preload="metadata" muted className="h-16 w-16 shrink-0 rounded object-cover" aria-label={`첨부 영상 ${index + 1}`} /> : /* eslint-disable-next-line @next/next/no-img-element */ <img key={item.url} src={item.url} alt={`첨부 이미지 ${index + 1}`} className="h-16 w-16 shrink-0 rounded object-cover" />)}</div></div>}{draft.status === "failed" && draft.error_message && <p className="mt-2 rounded bg-rose-400/10 p-2 text-xs text-rose-200">{draft.error_message}</p>}{draft.status === "scheduled" && draft.scheduled_at && <p className="mt-2 flex items-center gap-1 text-xs text-amber-200"><CalendarClock size={13} /> {new Date(draft.scheduled_at).toLocaleString("ko-KR")} 예약</p>}{draft.status === "draft" && <div className="mt-3 rounded-lg border border-white/10 bg-black/10 p-2"><label className="mb-1 block text-xs text-subtext">예약 발행 시간</label><div className="flex flex-col gap-2 sm:flex-row"><input className="min-w-0 rounded border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /><button className="rounded border border-amber-400/50 px-2 py-1.5 text-xs font-bold text-amber-200 disabled:opacity-50" disabled={busy || !body.trim()} onClick={() => void onRun(async () => { await saveDraft({ draftId: draft.id, body }); await scheduleDraft({ draftId: draft.id, scheduledAt: new Date(scheduledAt).toISOString() }); }, "예약 대기열에 넣었습니다.")}>예약하기</button></div></div>}<div className="mt-3 flex flex-wrap justify-end gap-2">{draft.status === "draft" && <><button className="text-xs text-subtext hover:text-white disabled:opacity-50" disabled={busy} onClick={() => void onRun(() => saveDraft({ draftId: draft.id, body }), "초안을 저장했습니다.")}>저장</button><button className="rounded-md border border-gold/50 px-2 py-1 text-xs font-bold text-gold disabled:opacity-50" disabled={busy || !body.trim()} onClick={() => { if (window.confirm("이 초안을 지금 Threads에 공개 발행하시겠습니까? 발행 전에는 자동으로 되돌릴 수 없습니다.")) void onRun(async () => { await saveDraft({ draftId: draft.id, body }); await publishDraft(draft.id); }, "Threads에 발행했습니다."); }}>검토 후 지금 발행</button></>}{draft.status === "scheduled" && <button className="rounded-md border border-rose-400/50 px-2 py-1 text-xs font-bold text-rose-200 disabled:opacity-50" disabled={busy} onClick={() => void onRun(() => cancelScheduledDraft(draft.id), "예약을 취소하고 검토 대기 초안으로 되돌렸습니다.")}>예약 취소</button>}{draft.status === "failed" && <button className="inline-flex items-center gap-1 rounded-md border border-sky-400/50 px-2 py-1 text-xs font-bold text-sky-200 disabled:opacity-50" disabled={busy} onClick={() => void onRun(() => retryFailedDraft(draft.id), "실패 기록을 초안으로 되돌렸습니다. 내용을 확인한 뒤 다시 발행해 주세요.")}><RotateCcw size={12} />재검토·재시도</button>}</div></div>;
}
