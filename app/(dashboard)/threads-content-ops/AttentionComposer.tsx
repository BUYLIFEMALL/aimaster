"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleAlert, Copy, Sparkles } from "lucide-react";
import { generateAttentionPost, saveGeneratedDraft } from "./web-actions";

type Account = { id: string; username: string | null };
type Candidate = { id: string; method: string; source_input: string; title: string; content: string; keywords: string[] };
type Variant = { type: string; hook: string; whyItWorks: string; content: string };
type Plan = { hook: string; hookType: string; whyHookWorks: string; content: string; cta: string; followUpIdeas: string[]; hookVariants: Variant[] };

const THREADS_LIMIT = 500;
const inputClass = "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400";

function viralPrompt(candidate: Candidate) {
  return [
    `글감 제목: ${candidate.title}`,
    `글감 내용: ${candidate.content}`,
    candidate.keywords.length ? `키워드: ${candidate.keywords.join(", ")}` : "",
    candidate.source_input ? `${candidate.method === "perplexity" ? "검색 주제" : "출처"}: ${candidate.source_input}` : "",
  ].filter(Boolean).join("\n").slice(0, 1200);
}

export default function AttentionComposer({ accounts, viralCandidates, initialViralId }: { accounts: Account[]; viralCandidates: Candidate[]; initialViralId?: string }) {
  const initial = viralCandidates.find((candidate) => candidate.id === initialViralId);
  const [viralId, setViralId] = useState(initial?.id ?? "");
  const [topic, setTopic] = useState(() => (initial ? viralPrompt(initial) : ""));
  const [note, setNote] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const selected = viralCandidates.find((candidate) => candidate.id === viralId);

  const choose = (id: string) => {
    const next = viralCandidates.find((candidate) => candidate.id === id);
    setViralId(next?.id ?? "");
    if (next) setTopic(viralPrompt(next));
    setPlan(null);
    setMessage(null);
  };

  const generate = async () => {
    if (generating) return;
    setGenerating(true);
    setMessage(null);
    try {
      const result = await generateAttentionPost({ topic, note });
      if (result.ok) {
        setPlan(result.plan);
      } else {
        setMessage({ ok: false, text: result.error });
      }
    } catch {
      setMessage({ ok: false, text: "글 생성 요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
    } finally {
      setGenerating(false);
    }
  };

  return <div className="space-y-5">
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold text-gold">ATTENTION POST GENERATOR</p>
      <h2 className="mt-1 text-xl font-bold text-neutral-900">콘텐츠 생성</h2>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">수집한 글감을 고르면 AI가 사람들의 시선을 멈추게 하는 Threads 글을 만들어 줍니다. 첫 문장(훅)이 다른 5가지 유형의 글과 댓글을 부르는 마무리 멘트를 한 번에 받아 보고, 마음에 드는 글만 골라 초안으로 저장하세요. 글감에 없는 사실이나 개인 경험은 지어내지 않습니다.</p>
    </section>

    <section className="rounded-2xl border-2 border-violet-300 bg-violet-50/60 p-5 shadow-sm">
      <h3 className="font-bold text-neutral-900">1. 글감 고르기</h3>
      {viralCandidates.length
        ? <select className={`${inputClass} mt-3`} value={viralId} onChange={(event) => choose(event.target.value)} aria-label="수집한 글감"><option value="">글감 선택 (직접 입력도 가능)</option>{viralCandidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}</select>
        : <p className="mt-3 rounded-xl border border-dashed border-violet-300 bg-white p-3 text-sm text-neutral-600">사용할 수 있는 글감이 없습니다. <Link className="font-semibold underline" href="/threads-content-ops?tab=viral">떡상 콘텐츠 수집</Link>에서 글감을 모으거나 아래에 주제를 직접 입력하세요.</p>}
      {selected && <div className="mt-3 rounded-xl border border-violet-200 bg-white p-3 text-sm"><p className="font-semibold text-neutral-900">{selected.title}</p><p className="mt-1 whitespace-pre-wrap text-neutral-700">{selected.content}</p></div>}
      <label className="mt-4 block text-sm font-medium text-neutral-700">글감·주제 <span className="font-normal text-neutral-500">(글감을 고르면 자동으로 채워지며 고쳐 써도 됩니다)</span></label>
      <textarea className={`${inputClass} mt-1 min-h-28`} maxLength={1200} value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="예: 1인 사업자가 고객 문의를 줄이기 위해 FAQ를 운영하는 실전 팁" />
      <label className="mt-3 block text-sm font-medium text-neutral-700">추가 요청 <span className="font-normal text-neutral-500">(선택)</span></label>
      <input className={`${inputClass} mt-1`} maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} placeholder="예: 20대 직장인 말투로, 마지막은 질문으로 끝내줘" />
    </section>

    <section className="rounded-2xl border-2 border-rose-300 bg-rose-50/60 p-5 shadow-sm">
      <h3 className="font-bold text-neutral-900">2. 주목받는 글 만들기</h3>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-bold text-[#ffffff] hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300" disabled={generating || !topic.trim()} onClick={() => void generate()}><Sparkles size={16} />{generating ? "글 만드는 중… (최대 1분)" : plan ? "다시 생성하기" : "주목받는 글 만들기"}</button>
        <span className="text-xs text-neutral-500">버튼을 누를 때만 회원님의 OpenAI 키가 사용됩니다. 자동 발행은 하지 않습니다.</span>
      </div>
      {message && !message.ok && <p className="mt-3 flex items-start gap-2 rounded-xl border border-neutral-200 bg-white p-3 text-sm text-neutral-800" role="status">{message.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> : <CircleAlert size={16} className="mt-0.5 shrink-0 text-rose-600" />}{message.text}{!message.ok && message.text.includes("API 키") && <> <Link className="font-semibold underline" href="/threads-content-ops?tab=settings">API키등록·플랫폼연동</Link></>}</p>}
    </section>

    {plan && <PlanView plan={plan} accounts={accounts} accountId={accountId} onAccount={setAccountId} viralId={viralId} onSaved={(text) => setMessage({ ok: true, text })} message={message} />}
  </div>;
}

function PlanView({ plan, accounts, accountId, onAccount, viralId, onSaved, message }: { plan: Plan; accounts: Account[]; accountId: string; onAccount: (id: string) => void; viralId: string; onSaved: (text: string) => void; message: { ok: boolean; text: string } | null }) {
  const options = [{ type: `${plan.hookType} (대표)`, hook: plan.hook, whyItWorks: plan.whyHookWorks, content: plan.content }, ...plan.hookVariants];
  return <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <h3 className="font-bold text-neutral-900">3. 마음에 드는 글 고르기 <span className="text-sm font-normal text-neutral-500">({options.length}가지)</span></h3>
      <label className="flex items-center gap-2 text-xs font-semibold text-neutral-600">저장할 계정<select className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900" value={accountId} onChange={(event) => onAccount(event.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>@{account.username ?? "Threads 계정"}</option>)}</select></label>
    </div>
    {message?.ok && <p className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status"><CheckCircle2 size={16} className="mt-0.5 shrink-0" />{message.text} <Link className="font-semibold underline" href="/threads-content-ops?tab=manage">초안·발행 관리 열기</Link></p>}
    <ul className="mt-4 space-y-4">{options.map((option, index) => <VariantCard key={`${option.type}-${index}`} option={option} accountId={accountId} viralId={viralId} onSaved={onSaved} />)}</ul>
    {plan.cta && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm"><p className="font-semibold text-amber-900">댓글을 부르는 마무리·첫 댓글 멘트</p><p className="mt-1 text-neutral-800">{plan.cta}</p><CopyButton value={plan.cta} label="멘트 복사" /></div>}
    {plan.followUpIdeas.length > 0 && <div className="mt-4"><p className="text-sm font-semibold text-neutral-900">이어 쓸 후속 아이디어</p><ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-neutral-700">{plan.followUpIdeas.map((idea) => <li key={idea}>{idea}</li>)}</ul></div>}
  </section>;
}

function VariantCard({ option, accountId, viralId, onSaved }: { option: Variant; accountId: string; viralId: string; onSaved: (text: string) => void }) {
  const [body, setBody] = useState(option.content);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const over = body.length > THREADS_LIMIT;

  const save = async () => {
    if (saving || saved) return;
    setSaving(true);
    setError("");
    try {
      const result = await saveGeneratedDraft({ accountId, body, viralId: viralId || undefined });
      if (result.ok) {
        setSaved(true);
        onSaved("초안으로 저장했습니다. 초안·발행 관리에서 검토한 뒤 발행하세요.");
      } else {
        setError(result.error);
      }
    } catch {
      setError("초안을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  return <li className="rounded-xl border border-neutral-200 p-4">
    <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700">{option.type}</span><span className={`text-xs ${over ? "font-bold text-rose-600" : "text-neutral-500"}`}>{body.length}/{THREADS_LIMIT}자{over ? " — Threads 글자 수를 넘습니다. 줄여 주세요" : ""}</span></div>
    {option.hook && <p className="mt-2 text-sm font-semibold text-neutral-900">“{option.hook}”</p>}
    {option.whyItWorks && <p className="mt-1 text-xs text-neutral-500">💡 {option.whyItWorks}</p>}
    <textarea className={`${inputClass} mt-3 min-h-40 leading-relaxed`} value={body} maxLength={5000} onChange={(event) => { setBody(event.target.value); setSaved(false); }} aria-label={`${option.type} 본문`} />
    {error && <p className="mt-2 text-sm text-rose-600" role="alert">{error}</p>}
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" className="inline-flex items-center rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-bold text-[#ffffff] hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300" disabled={saving || saved || !body.trim() || !accountId} onClick={() => void save()}>{saved ? "저장됨" : saving ? "저장 중…" : "이 글로 초안 저장"}</button>
      <CopyButton value={body} label="본문 복사" />
    </div>
  </li>;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return <button type="button" className="mt-0 inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50" onClick={async () => { try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* 복사 권한이 없으면 무시 */ } }}><Copy size={13} />{copied ? "복사됨" : label}</button>;
}
