"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, FilePenLine, RotateCcw } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { cancelScheduledDraft, publishDraft, retryFailedDraft, saveDraft, scheduleDraft } from "./web-actions";

type Account = { id: string; username: string | null };
type Draft = { id: string; body: string; created_at: string; account_id: string; status: string; scheduled_at: string | null; error_message: string | null; media?: { url: string; type: "IMAGE" | "VIDEO" }[] };

function localDateTime(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function DraftComposer({ accounts, drafts }: { accounts: Account[]; drafts: Draft[] }) {
  const [busy, setBusy] = useState(false);
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
    <div className="grid gap-3 sm:grid-cols-3"><QueueMetric label="검토 대기" value={queueSummary.draft} tone="text-sky-700" /><QueueMetric label="예약 대기" value={queueSummary.scheduled} tone="text-amber-700" /><QueueMetric label="재검토 필요" value={queueSummary.failed} tone="text-rose-700" /></div>
    <GlassCard><div className="mb-1 flex items-center gap-2"><FilePenLine size={18} className="text-gold" /><h2 className="font-bold text-white">콘텐츠 보관함</h2></div><p className="mb-4 text-xs text-subtext">초안은 검토·수정 후 발행합니다. 실패 기록은 원인을 확인한 뒤 다시 초안으로 돌립니다.</p>{drafts.length ? <div className="space-y-3">{drafts.map((draft) => <DraftCard key={draft.id} draft={draft} busy={busy} onRun={run} />)}</div> : <p className="text-sm text-subtext">저장된 초안·예약·실패 기록이 없습니다.</p>}</GlassCard>
  </div>;
}

function QueueMetric({ label, value, tone }: { label: string; value: number; tone: string }) { return <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm"><p className="text-xs text-neutral-500">{label}</p><p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p></div>; }

function DraftCard({ draft, busy, onRun }: { draft: Draft; busy: boolean; onRun: (task: () => Promise<void>, success: string) => Promise<void> }) {
  const [body, setBody] = useState(draft.body);
  const [scheduledAt, setScheduledAt] = useState(() => localDateTime(new Date(Date.now() + 30 * 60_000)));
  const statusLabel = draft.status === "scheduled" ? "예약 대기" : draft.status === "failed" ? "발행 실패" : "검토 대기";
  const statusStyle = draft.status === "scheduled" ? "bg-amber-400/10 text-amber-300" : draft.status === "failed" ? "bg-rose-400/10 text-rose-300" : "bg-sky-400/10 text-sky-300";
  return <div className="rounded-lg border border-white/10 bg-black/15 p-3"><div className="mb-2 flex items-center justify-between gap-2"><span className={`rounded-full px-2 py-1 text-xs ${statusStyle}`}>{statusLabel}</span><p className="text-xs text-subtext">{new Date(draft.created_at).toLocaleString("ko-KR")}</p></div>{draft.status === "draft" ? <textarea className="min-h-28 w-full bg-transparent text-sm text-white outline-none" maxLength={5000} value={body} onChange={(event) => setBody(event.target.value)} /> : <p className="whitespace-pre-wrap text-sm text-white">{draft.body}</p>}{Array.isArray(draft.media) && draft.media.length > 0 && <div className="mt-2"><p className="text-xs text-subtext">첨부 미디어 {draft.media.length}개 (이미지 {draft.media.filter((item) => item.type === "IMAGE").length} · 영상 {draft.media.filter((item) => item.type === "VIDEO").length}) — 발행하면 캐러셀로 함께 올라갑니다</p><div className="mt-1 flex gap-1.5 overflow-x-auto">{draft.media.map((item, index) => item.type === "VIDEO" ? <video key={item.url} src={item.url} preload="metadata" muted className="h-16 w-16 shrink-0 rounded object-cover" aria-label={`첨부 영상 ${index + 1}`} /> : /* eslint-disable-next-line @next/next/no-img-element */ <img key={item.url} src={item.url} alt={`첨부 이미지 ${index + 1}`} className="h-16 w-16 shrink-0 rounded object-cover" />)}</div></div>}{draft.status === "failed" && draft.error_message && <p className="mt-2 rounded bg-rose-400/10 p-2 text-xs text-rose-200">{draft.error_message}</p>}{draft.status === "scheduled" && draft.scheduled_at && <p className="mt-2 flex items-center gap-1 text-xs text-amber-200"><CalendarClock size={13} /> {new Date(draft.scheduled_at).toLocaleString("ko-KR")} 예약</p>}{draft.status === "draft" && <div className="mt-3 rounded-lg border border-white/10 bg-black/10 p-2"><label className="mb-1 block text-xs text-subtext">예약 발행 시간</label><div className="flex flex-col gap-2 sm:flex-row"><input className="min-w-0 rounded border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /><button className="rounded border border-amber-400/50 px-2 py-1.5 text-xs font-bold text-amber-200 disabled:opacity-50" disabled={busy || !body.trim()} onClick={() => void onRun(async () => { await saveDraft({ draftId: draft.id, body }); await scheduleDraft({ draftId: draft.id, scheduledAt: new Date(scheduledAt).toISOString() }); }, "예약 대기열에 넣었습니다.")}>예약하기</button></div></div>}<div className="mt-3 flex flex-wrap justify-end gap-2">{draft.status === "draft" && <><button className="text-xs text-subtext hover:text-white disabled:opacity-50" disabled={busy} onClick={() => void onRun(() => saveDraft({ draftId: draft.id, body }), "초안을 저장했습니다.")}>저장</button><button className="rounded-md border border-gold/50 px-2 py-1 text-xs font-bold text-gold disabled:opacity-50" disabled={busy || !body.trim()} onClick={() => { if (window.confirm("이 초안을 지금 Threads에 공개 발행하시겠습니까? 발행 전에는 자동으로 되돌릴 수 없습니다.")) void onRun(async () => { await saveDraft({ draftId: draft.id, body }); await publishDraft(draft.id); }, "Threads에 발행했습니다."); }}>검토 후 지금 발행</button></>}{draft.status === "scheduled" && <button className="rounded-md border border-rose-400/50 px-2 py-1 text-xs font-bold text-rose-200 disabled:opacity-50" disabled={busy} onClick={() => void onRun(() => cancelScheduledDraft(draft.id), "예약을 취소하고 검토 대기 초안으로 되돌렸습니다.")}>예약 취소</button>}{draft.status === "failed" && <button className="inline-flex items-center gap-1 rounded-md border border-sky-400/50 px-2 py-1 text-xs font-bold text-sky-200 disabled:opacity-50" disabled={busy} onClick={() => void onRun(() => retryFailedDraft(draft.id), "실패 기록을 초안으로 되돌렸습니다. 내용을 확인한 뒤 다시 발행해 주세요.")}><RotateCcw size={12} />재검토·재시도</button>}</div></div>;
}
