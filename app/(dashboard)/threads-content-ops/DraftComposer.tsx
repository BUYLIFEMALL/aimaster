"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilePenLine, Sparkles } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { generateAndSaveDraft, publishDraft, saveDraft } from "./web-actions";

type Account = { id: string; username: string | null };
type Draft = { id: string; body: string; created_at: string; account_id: string };

export default function DraftComposer({ accounts, drafts }: { accounts: Account[]; drafts: Draft[] }) {
  const [topic, setTopic] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  if (!accounts.length) return null;
  const generate = async () => {
    setBusy(true);
    setMessage("");
    try {
      await generateAndSaveDraft({ accountId, topic });
      setTopic("");
      setMessage("초안을 저장했습니다. 다음 단계에서 검토 후 직접 발행할 수 있습니다.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "초안 생성에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const save = async (draft: Draft) => {
    setBusy(true); setMessage("");
    try { await saveDraft({ draftId: draft.id, body: draft.body }); setMessage("초안을 저장했습니다."); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "초안을 저장하지 못했습니다."); }
    finally { setBusy(false); }
  };
  const publish = async (draft: Draft) => {
    if (!window.confirm("이 초안을 지금 Threads에 공개 발행하시겠습니까? 발행 후에는 자동으로 되돌릴 수 없습니다.")) return;
    setBusy(true); setMessage("");
    try { await publishDraft(draft.id); setMessage("Threads에 발행했습니다."); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "발행하지 못했습니다."); }
    finally { setBusy(false); }
  };

  return <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
    <GlassCard>
      <div className="mb-4 flex items-center gap-2"><Sparkles size={18} className="text-gold" /><h2 className="font-bold text-white">AI 초안 만들기</h2></div>
      <label className="mb-2 block text-sm text-subtext">게시할 주제 또는 핵심 메모</label>
      <textarea className="min-h-32 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" maxLength={1200} placeholder="예: 1인 사업자가 고객 문의를 줄이기 위해 FAQ를 운영하는 실전 팁" value={topic} onChange={(event) => setTopic(event.target.value)} />
      <div className="mt-3 flex flex-wrap items-center gap-3"><select className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" value={accountId} onChange={(event) => setAccountId(event.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>@{account.username ?? "Threads 계정"}</option>)}</select><button className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-black disabled:opacity-50" disabled={busy || !topic.trim()} onClick={() => void generate()}>{busy ? "생성 중…" : "초안 생성·저장"}</button></div>
      <p className="mt-3 text-xs text-subtext">버튼을 누를 때만 회원님의 OpenAI 키로 1회 생성합니다. 자동 발행은 하지 않습니다.</p>
      {message && <p className="mt-3 text-sm text-subtext">{message}</p>}
    </GlassCard>
    <GlassCard>
      <div className="mb-4 flex items-center gap-2"><FilePenLine size={18} className="text-gold" /><h2 className="font-bold text-white">내 초안</h2></div>
      {drafts.length ? <div className="space-y-3">{drafts.map((draft) => <DraftCard key={draft.id} draft={draft} busy={busy} onSave={save} onPublish={publish} />)}</div> : <p className="text-sm text-subtext">아직 저장한 초안이 없습니다.</p>}
    </GlassCard>
  </div>;
}

function DraftCard({ draft, busy, onSave, onPublish }: { draft: Draft; busy: boolean; onSave: (draft: Draft) => Promise<void>; onPublish: (draft: Draft) => Promise<void> }) {
  const [body, setBody] = useState(draft.body);
  const editableDraft = { ...draft, body };
  return <div className="rounded-lg border border-white/10 bg-black/15 p-3"><textarea className="min-h-28 w-full bg-transparent text-sm text-white outline-none" maxLength={5000} value={body} onChange={(event) => setBody(event.target.value)} /><div className="mt-2 flex items-center justify-between gap-2"><p className="text-xs text-subtext">초안 · {new Date(draft.created_at).toLocaleString("ko-KR")}</p><div className="flex gap-2"><button className="text-xs text-subtext hover:text-white disabled:opacity-50" disabled={busy} onClick={() => void onSave(editableDraft)}>저장</button><button className="rounded-md border border-gold/50 px-2 py-1 text-xs font-bold text-gold disabled:opacity-50" disabled={busy || !body.trim()} onClick={() => void onPublish(editableDraft)}>검토 후 지금 발행</button></div></div></div>;
}
