"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, FilePenLine, RotateCcw, Sparkles, Youtube } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { cancelScheduledDraft, generateAndSaveDraft, loadYouTubeSource, publishDraft, retryFailedDraft, saveDraft, scheduleDraft } from "./web-actions";

type Account = { id: string; username: string | null };
type Draft = { id: string; body: string; created_at: string; account_id: string; status: string; scheduled_at: string | null; error_message: string | null };

function localDateTime(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function DraftComposer({ accounts, drafts }: { accounts: Account[]; drafts: Draft[] }) {
  const [topic, setTopic] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
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
  const generate = () => run(async () => { await generateAndSaveDraft({ accountId, topic }); setTopic(""); }, "초안을 저장했습니다. 검토 후 즉시 발행하거나 예약 대기열에 넣을 수 있습니다.");
  const importYouTube = () => run(async () => { const source = await loadYouTubeSource(youtubeUrl); setTopic(source.prompt.slice(0, 1200)); setYoutubeUrl(""); }, "YouTube 공개 메타데이터를 소재로 불러왔습니다. 내용을 확인한 뒤 초안을 생성해 주세요.");

  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-3"><QueueMetric label="검토 대기" value={queueSummary.draft} tone="text-sky-700" /><QueueMetric label="예약 대기" value={queueSummary.scheduled} tone="text-amber-700" /><QueueMetric label="재검토 필요" value={queueSummary.failed} tone="text-rose-700" /></div>
    <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <GlassCard><div className="mb-4 flex items-center gap-2"><Sparkles size={18} className="text-gold" /><h2 className="font-bold text-white">AI 초안 만들기</h2></div><label className="mb-2 block text-sm text-subtext">게시물 주제 또는 운영 메모</label><textarea className="min-h-32 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" maxLength={1200} placeholder="예: 1인 사업자가 고객 문의를 줄이기 위해 FAQ를 운영하는 실전 팁" value={topic} onChange={(event) => setTopic(event.target.value)} /><div className="mt-3 flex flex-wrap items-center gap-3"><select className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" value={accountId} onChange={(event) => setAccountId(event.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>@{account.username ?? "Threads 계정"}</option>)}</select><button className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-black disabled:opacity-50" disabled={busy || !topic.trim()} onClick={() => void generate()}>{busy ? "처리 중…" : "초안 생성·저장"}</button></div><p className="mt-3 text-xs text-subtext">버튼을 누를 때만 회원 본인의 OpenAI 키를 사용합니다. 자동 발행은 별도의 명시적 예약 또는 즉시 발행에서만 실행됩니다.</p><div className="mt-5 rounded-xl border border-white/10 bg-black/10 p-3"><div className="flex items-center gap-2"><Youtube size={16} className="text-red-300" /><p className="text-sm font-semibold text-white">YouTube 영상에서 소재 가져오기</p></div><p className="mt-1 text-xs text-subtext">본인의 YouTube Data API 키로 공개 제목·설명만 읽어 초안 소재로 채웁니다. 영상의 사실이나 개인 경험을 만들어내지 않습니다.</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-subtext" value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." /><button className="rounded-lg border border-gold/50 px-3 py-2 text-sm font-bold text-gold disabled:opacity-50" disabled={busy || !youtubeUrl.trim()} onClick={() => void importYouTube()}>소재 불러오기</button></div></div>{message && <p className="mt-3 text-sm text-subtext" role="status">{message}</p>}</GlassCard>
      <GlassCard><div className="mb-1 flex items-center gap-2"><FilePenLine size={18} className="text-gold" /><h2 className="font-bold text-white">운영 대기열</h2></div><p className="mb-4 text-xs text-subtext">초안은 검토·수정 후 발행합니다. 실패 기록은 원인을 확인한 뒤 다시 초안으로 돌립니다.</p>{drafts.length ? <div className="space-y-3">{drafts.map((draft) => <DraftCard key={draft.id} draft={draft} busy={busy} onRun={run} />)}</div> : <p className="text-sm text-subtext">저장된 초안·예약·실패 기록이 없습니다.</p>}</GlassCard>
    </div>
  </div>;
}

function QueueMetric({ label, value, tone }: { label: string; value: number; tone: string }) { return <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm"><p className="text-xs text-neutral-500">{label}</p><p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p></div>; }

function DraftCard({ draft, busy, onRun }: { draft: Draft; busy: boolean; onRun: (task: () => Promise<void>, success: string) => Promise<void> }) {
  const [body, setBody] = useState(draft.body);
  const [scheduledAt, setScheduledAt] = useState(() => localDateTime(new Date(Date.now() + 30 * 60_000)));
  const statusLabel = draft.status === "scheduled" ? "예약 대기" : draft.status === "failed" ? "발행 실패" : "검토 대기";
  const statusStyle = draft.status === "scheduled" ? "bg-amber-400/10 text-amber-300" : draft.status === "failed" ? "bg-rose-400/10 text-rose-300" : "bg-sky-400/10 text-sky-300";
  return <div className="rounded-lg border border-white/10 bg-black/15 p-3"><div className="mb-2 flex items-center justify-between gap-2"><span className={`rounded-full px-2 py-1 text-xs ${statusStyle}`}>{statusLabel}</span><p className="text-xs text-subtext">{new Date(draft.created_at).toLocaleString("ko-KR")}</p></div>{draft.status === "draft" ? <textarea className="min-h-28 w-full bg-transparent text-sm text-white outline-none" maxLength={5000} value={body} onChange={(event) => setBody(event.target.value)} /> : <p className="whitespace-pre-wrap text-sm text-white">{draft.body}</p>}{draft.status === "failed" && draft.error_message && <p className="mt-2 rounded bg-rose-400/10 p-2 text-xs text-rose-200">{draft.error_message}</p>}{draft.status === "scheduled" && draft.scheduled_at && <p className="mt-2 flex items-center gap-1 text-xs text-amber-200"><CalendarClock size={13} /> {new Date(draft.scheduled_at).toLocaleString("ko-KR")} 예약</p>}{draft.status === "draft" && <div className="mt-3 rounded-lg border border-white/10 bg-black/10 p-2"><label className="mb-1 block text-xs text-subtext">예약 발행 시간</label><div className="flex flex-col gap-2 sm:flex-row"><input className="min-w-0 rounded border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /><button className="rounded border border-amber-400/50 px-2 py-1.5 text-xs font-bold text-amber-200 disabled:opacity-50" disabled={busy || !body.trim()} onClick={() => void onRun(async () => { await saveDraft({ draftId: draft.id, body }); await scheduleDraft({ draftId: draft.id, scheduledAt: new Date(scheduledAt).toISOString() }); }, "예약 대기열에 넣었습니다.")}>예약하기</button></div></div>}<div className="mt-3 flex flex-wrap justify-end gap-2">{draft.status === "draft" && <><button className="text-xs text-subtext hover:text-white disabled:opacity-50" disabled={busy} onClick={() => void onRun(() => saveDraft({ draftId: draft.id, body }), "초안을 저장했습니다.")}>저장</button><button className="rounded-md border border-gold/50 px-2 py-1 text-xs font-bold text-gold disabled:opacity-50" disabled={busy || !body.trim()} onClick={() => { if (window.confirm("이 초안을 지금 Threads에 공개 발행하시겠습니까? 발행 전에는 자동으로 되돌릴 수 없습니다.")) void onRun(async () => { await saveDraft({ draftId: draft.id, body }); await publishDraft(draft.id); }, "Threads에 발행했습니다."); }}>검토 후 지금 발행</button></>}{draft.status === "scheduled" && <button className="rounded-md border border-rose-400/50 px-2 py-1 text-xs font-bold text-rose-200 disabled:opacity-50" disabled={busy} onClick={() => void onRun(() => cancelScheduledDraft(draft.id), "예약을 취소하고 검토 대기 초안으로 되돌렸습니다.")}>예약 취소</button>}{draft.status === "failed" && <button className="inline-flex items-center gap-1 rounded-md border border-sky-400/50 px-2 py-1 text-xs font-bold text-sky-200 disabled:opacity-50" disabled={busy} onClick={() => void onRun(() => retryFailedDraft(draft.id), "실패 기록을 초안으로 되돌렸습니다. 내용을 확인한 뒤 다시 발행해 주세요.")}><RotateCcw size={12} />재검토·재시도</button>}</div></div>;
}
