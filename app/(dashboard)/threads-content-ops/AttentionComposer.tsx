"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleAlert, Copy, Sparkles } from "lucide-react";
import { DEFAULT_ENGINE, ENGINES, PERSONAS, REWRITE_MODES, type EngineProvider } from "@/threads-content-ops/lib/personas";
import { generateAttentionPost, rewriteGeneratedPost, saveGeneratedDraft } from "./web-actions";

type Account = { id: string; username: string | null };
type Candidate = { id: string; method: string; source_input: string; title: string; content: string; keywords: string[]; status?: string };
type Variant = { type: string; hook: string; whyItWorks: string; content: string };
type Plan = { hook: string; hookType: string; whyHookWorks: string; content: string; cta: string; followUpIdeas: string[]; hookVariants: Variant[] };
type Engine = { provider: EngineProvider; model: string };

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

export default function AttentionComposer({ accounts, viralCandidates, initialViralId, configuredProviders }: { accounts: Account[]; viralCandidates: Candidate[]; initialViralId?: string; configuredProviders: string[] }) {
  const initial = viralCandidates.find((candidate) => candidate.id === initialViralId);
  const [viralId, setViralId] = useState(initial?.id ?? "");
  const [topic, setTopic] = useState(() => (initial ? viralPrompt(initial) : ""));
  const [note, setNote] = useState("");
  const topicRef = useRef<HTMLTextAreaElement>(null);
  const [personaId, setPersonaId] = useState("");
  const [product, setProduct] = useState("");
  const [experience, setExperience] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [engine, setEngine] = useState<Engine>(DEFAULT_ENGINE);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [generatingLabel, setGeneratingLabel] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const engineKeyReady = configuredProviders.includes(engine.provider);
  const engineInfo = ENGINES.find((item) => item.provider === engine.provider) ?? ENGINES[0];
  const generating = generatingLabel !== null;

  // 글감 내용이 스크롤 없이 모두 보이도록 입력 내용 길이에 맞춰 세로 칸을 키운다.
  useEffect(() => {
    const el = topicRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 4}px`;
  }, [topic]);

  const choose = (id: string) => {
    const next = viralCandidates.find((candidate) => candidate.id === id);
    setViralId(next?.id ?? "");
    if (next) setTopic(viralPrompt(next));
    setPlan(null);
    setMessage(null);
  };

  const generate = async (label: string, forcedPersonaId?: string, forcedTopic?: string) => {
    if (generating) return;
    const effectiveTopic = (forcedTopic ?? topic).trim();
    if (!effectiveTopic) return;
    setGeneratingLabel(label);
    setMessage(null);
    try {
      const result = await generateAttentionPost({
        topic: effectiveTopic, note, personaId: forcedPersonaId ?? (personaId || undefined),
        custom: { product, experience, targetAudience }, engine,
      });
      if (result.ok) setPlan(result.plan);
      else setMessage({ ok: false, text: result.error });
    } catch {
      setMessage({ ok: false, text: "글 생성 요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
    } finally {
      setGeneratingLabel(null);
    }
  };

  const clickPersona = (id: string) => {
    const persona = PERSONAS.find((item) => item.id === id);
    if (!persona) return;
    setPersonaId(id);
    // 글감이 없으면 그 페르소나의 기본 주제로 바로 만든다(원클릭). 있으면 고른 글감을 그 페르소나의 시점으로 쓴다.
    const nextTopic = topic.trim() ? topic : persona.defaultTopic;
    if (!topic.trim()) setTopic(persona.defaultTopic);
    void generate(persona.name, id, nextTopic);
  };

  return <div className="space-y-5">
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold text-gold">ATTENTION POST GENERATOR</p>
      <h2 className="mt-1 text-xl font-bold text-neutral-900">콘텐츠 생성</h2>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">수집한 글감을 고르면 AI가 사람들의 시선을 멈추게 하는 Threads 글을 만들어 줍니다. 상황별 페르소나 버튼으로 한 번에 만들거나, 내 경험과 상품을 넣은 맞춤글도 만들 수 있고, 첫 문장이 다른 5가지 유형의 글을 받아 마음에 드는 글만 초안으로 저장하세요. 글감에 없는 사실이나 개인 경험은 지어내지 않습니다.</p>
    </section>

    <section className="rounded-2xl border-2 border-violet-300 bg-violet-50/60 p-5 shadow-sm">
      <h3 className="font-bold text-neutral-900">1. 글감 고르기</h3>
      {viralCandidates.length
        ? <>
          <p className="mt-2 text-xs text-neutral-600">떡상 콘텐츠 수집에서 모은 글감 {viralCandidates.length}건입니다. 아래 선택 상자에서 글감을 고르면 주제 칸에 내용 전체가 채워집니다. <Link className="font-semibold underline" href="/threads-content-ops?tab=viral">수집 화면으로 가기</Link></p>
          <select className={`${inputClass} mt-3`} value={viralId} onChange={(event) => choose(event.target.value)} aria-label="수집한 글감 선택">
            <option value="">글감을 선택하세요 ({viralCandidates.length}건)</option>
            {viralCandidates.map((candidate) => {
              const source = candidate.method === "perplexity" ? "Perplexity" : candidate.source_input.startsWith("https://www.youtube.com/shorts/") ? "유튜브 쇼츠" : "주소";
              return <option key={candidate.id} value={candidate.id}>[{source}] {candidate.title}{candidate.status === "used" ? " (사용 완료)" : ""}</option>;
            })}
          </select>
        </>
        : <p className="mt-3 rounded-xl border border-dashed border-violet-300 bg-white p-3 text-sm text-neutral-600">사용할 수 있는 글감이 없습니다. <Link className="font-semibold underline" href="/threads-content-ops?tab=viral">떡상 콘텐츠 수집</Link>에서 글감을 모으거나 아래에 주제를 직접 입력하세요.</p>}
      <label className="mt-4 block text-sm font-medium text-neutral-700">글감·주제 <span className="font-normal text-neutral-500">(글감을 고르면 자동으로 채워지며 고쳐 써도 됩니다. 비워 두고 페르소나를 누르면 그 페르소나의 기본 주제로 만듭니다)</span></label>
      <textarea ref={topicRef} className={`${inputClass} mt-1 min-h-48 resize-y overflow-hidden leading-relaxed`} maxLength={1200} value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="예: 전자레인지 찜기, 세탁조 클리너, 월요병 (소재나 상품명도 좋아요)" />
    </section>

    <section className="rounded-2xl border-2 border-sky-300 bg-sky-50/60 p-5 shadow-sm">
      <h3 className="font-bold text-neutral-900">2. 상황별 페르소나 원클릭 생성 <span className="text-sm font-normal text-neutral-500">(누르면 바로 생성됩니다)</span></h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{PERSONAS.map((persona) => {
        const active = personaId === persona.id;
        const busy = generatingLabel === persona.name;
        return <button key={persona.id} type="button" disabled={generating} onClick={() => clickPersona(persona.id)} className={`rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${active ? "border-sky-500 bg-white ring-2 ring-sky-300" : "border-neutral-200 bg-white hover:border-sky-300"}`}>
          <span className="flex items-center justify-between gap-2"><span className="text-sm font-bold text-neutral-900">{persona.emoji} {persona.name}</span><span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">{persona.badge}</span></span>
          <span className="mt-1 block text-xs text-neutral-600">{persona.tagline}</span>
          <span className="mt-2 block text-[11px] font-semibold text-sky-700">{busy ? "생성 중…" : "클릭하여 바로 생성 →"}</span>
        </button>;
      })}</div>
      {personaId && <p className="mt-2 text-xs text-neutral-600">선택한 페르소나: <b>{PERSONAS.find((item) => item.id === personaId)?.name}</b> · 아래 "글 생성하기"도 이 시점으로 만듭니다. <button type="button" className="font-semibold underline" onClick={() => setPersonaId("")}>해제</button></p>}

      <details className="mt-4 rounded-xl border border-neutral-200 bg-white p-3">
        <summary className="cursor-pointer text-sm font-bold text-neutral-900">✍️ 맞춤글 (내 경험·상품·타깃 직접 입력) <span className="font-normal text-neutral-500">— 선택</span></summary>
        <div className="mt-3 space-y-3">
          <label className="block text-xs font-semibold text-neutral-600">내 실제 경험<textarea className={`${inputClass} mt-1 min-h-20`} maxLength={800} value={experience} onChange={(event) => setExperience(event.target.value)} placeholder="직접 겪은 일만 적어 주세요. 여기에 적은 경험만 1인칭 경험담으로 쓰입니다." /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-neutral-600">연결할 상품·핵심 소재<input className={`${inputClass} mt-1`} maxLength={200} value={product} onChange={(event) => setProduct(event.target.value)} placeholder="예: 실리콘 전자레인지 찜기" /></label>
            <label className="block text-xs font-semibold text-neutral-600">타깃 독자<input className={`${inputClass} mt-1`} maxLength={200} value={targetAudience} onChange={(event) => setTargetAudience(event.target.value)} placeholder="예: 퇴근 후 설거지가 싫은 자취 직장인" /></label>
          </div>
          <p className="text-[11px] text-neutral-500">상품명은 본문에 쓰지 않고 첫 댓글 멘트에서만 언급합니다. 글감에 없는 사실은 여전히 지어내지 않습니다.</p>
        </div>
      </details>

      <details className="mt-3 rounded-xl border border-neutral-200 bg-white p-3">
        <summary className="cursor-pointer text-sm font-bold text-neutral-900">⚙️ AI 엔진·모델 <span className="font-normal text-neutral-500">— 현재: {engineInfo.models.find((item) => item.value === engine.model)?.label ?? engine.model}</span></summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-neutral-600">AI 엔진
            <select className={`${inputClass} mt-1`} value={engine.provider} onChange={(event) => { const next = ENGINES.find((item) => item.provider === event.target.value) ?? ENGINES[0]; setEngine({ provider: next.provider, model: next.models[0].value }); }}>{ENGINES.map((item) => <option key={item.provider} value={item.provider}>{item.label}{configuredProviders.includes(item.provider) ? "" : " (키 미등록)"}</option>)}</select>
          </label>
          <label className="block text-xs font-semibold text-neutral-600">모델
            <select className={`${inputClass} mt-1`} value={engine.model} onChange={(event) => setEngine({ ...engine, model: event.target.value })}>{engineInfo.models.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          </label>
        </div>
        {!engineKeyReady && <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><CircleAlert size={16} className="mt-0.5 shrink-0" /><span>{engineInfo.label} API 키가 등록되지 않았습니다. <Link className="font-semibold underline" href="/threads-content-ops?tab=settings">API키등록·플랫폼연동</Link>에서 본인 키를 저장하거나 다른 엔진을 선택해 주세요.</span></p>}
      </details>
    </section>

    <section className="rounded-2xl border-2 border-rose-300 bg-rose-50/60 p-5 shadow-sm">
      <h3 className="font-bold text-neutral-900">3. 주목받는 글 만들기</h3>
      <label className="mt-3 block text-sm font-medium text-neutral-700">추가 요청 <span className="font-normal text-neutral-500">(선택)</span></label>
      <input className={`${inputClass} mt-1`} maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} placeholder="예: 20대 직장인 말투로, 마지막은 질문으로 끝내줘" />
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-bold text-[#ffffff] hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300" disabled={generating || !topic.trim()} onClick={() => void generate("main")}><Sparkles size={16} />{generatingLabel ? "글 만드는 중… (최대 1분)" : plan ? "다시 생성하기" : "글 생성하기"}</button>
        <span className="text-xs text-neutral-500">버튼을 누를 때만 선택한 엔진의 회원님 키가 사용됩니다. 자동 발행은 하지 않습니다.</span>
      </div>
      {message && !message.ok && <p className="mt-3 flex items-start gap-2 rounded-xl border border-neutral-200 bg-white p-3 text-sm text-neutral-800" role="status"><CircleAlert size={16} className="mt-0.5 shrink-0 text-rose-600" />{message.text}</p>}
    </section>

    {plan && <PlanView plan={plan} accounts={accounts} accountId={accountId} onAccount={setAccountId} viralId={viralId} engine={engine} onSaved={(text) => setMessage({ ok: true, text })} message={message} />}
  </div>;
}

function PlanView({ plan, accounts, accountId, onAccount, viralId, engine, onSaved, message }: { plan: Plan; accounts: Account[]; accountId: string; onAccount: (id: string) => void; viralId: string; engine: Engine; onSaved: (text: string) => void; message: { ok: boolean; text: string } | null }) {
  const options = [{ type: `${plan.hookType} (대표)`, hook: plan.hook, whyItWorks: plan.whyHookWorks, content: plan.content }, ...plan.hookVariants];
  return <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <h3 className="font-bold text-neutral-900">4. 마음에 드는 글 고르기 <span className="text-sm font-normal text-neutral-500">({options.length}가지)</span></h3>
      <label className="flex items-center gap-2 text-xs font-semibold text-neutral-600">저장할 계정<select className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900" value={accountId} onChange={(event) => onAccount(event.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>@{account.username ?? "Threads 계정"}</option>)}</select></label>
    </div>
    {message?.ok && <p className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status"><CheckCircle2 size={16} className="mt-0.5 shrink-0" />{message.text} <Link className="font-semibold underline" href="/threads-content-ops?tab=manage">초안·발행 관리 열기</Link></p>}
    <ul className="mt-4 space-y-4">{options.map((option, index) => <VariantCard key={`${option.type}-${index}`} option={option} accountId={accountId} viralId={viralId} engine={engine} onSaved={onSaved} />)}</ul>
    {plan.cta && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm"><p className="font-semibold text-amber-900">댓글을 부르는 마무리·첫 댓글 멘트</p><p className="mt-1 text-neutral-800">{plan.cta}</p><div className="mt-2"><CopyButton value={plan.cta} label="멘트 복사" /></div></div>}
    {plan.followUpIdeas.length > 0 && <div className="mt-4"><p className="text-sm font-semibold text-neutral-900">이어 쓸 후속 아이디어</p><ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-neutral-700">{plan.followUpIdeas.map((idea) => <li key={idea}>{idea}</li>)}</ul></div>}
  </section>;
}

function VariantCard({ option, accountId, viralId, engine, onSaved }: { option: Variant; accountId: string; viralId: string; engine: Engine; onSaved: (text: string) => void }) {
  const [body, setBody] = useState(option.content);
  const [hook, setHook] = useState(option.hook);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [rewriting, setRewriting] = useState<string | null>(null);
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

  const rewrite = async (mode: string) => {
    if (rewriting || saving) return;
    setRewriting(mode);
    setError("");
    try {
      const result = await rewriteGeneratedPost({ hook, content: body, mode, engine });
      if (result.ok) {
        setBody(result.content);
        setHook(result.hook);
        setSaved(false);
      } else {
        setError(result.error);
      }
    } catch {
      setError("다시 쓰기 요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setRewriting(null);
    }
  };

  return <li className="rounded-xl border border-neutral-200 p-4">
    <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700">{option.type}</span><span className={`text-xs ${over ? "font-bold text-rose-600" : "text-neutral-500"}`}>{body.length}/{THREADS_LIMIT}자{over ? " — Threads 글자 수를 넘습니다. 줄여 주세요" : ""}</span></div>
    {hook && <p className="mt-2 text-sm font-semibold text-neutral-900">“{hook}”</p>}
    {option.whyItWorks && <p className="mt-1 text-xs text-neutral-500">💡 {option.whyItWorks}</p>}
    <textarea className={`${inputClass} mt-3 min-h-40 leading-relaxed`} value={body} maxLength={5000} onChange={(event) => { setBody(event.target.value); setSaved(false); }} aria-label={`${option.type} 본문`} />
    <div className="mt-2 flex flex-wrap items-center gap-1.5"><span className="text-[11px] font-semibold text-neutral-500">다시 써줘</span>{REWRITE_MODES.map((item) => <button key={item.mode} type="button" disabled={rewriting !== null || saving} onClick={() => void rewrite(item.mode)} className="rounded-full border border-neutral-300 bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50">{rewriting === item.mode ? "수정 중…" : `${item.icon} ${item.label}`}</button>)}</div>
    {error && <p className="mt-2 text-sm text-rose-600" role="alert">{error}</p>}
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" className="inline-flex items-center rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-bold text-[#ffffff] hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300" disabled={saving || saved || rewriting !== null || !body.trim() || !accountId} onClick={() => void save()}>{saved ? "저장됨" : saving ? "저장 중…" : "이 글로 초안 저장"}</button>
      <CopyButton value={body} label="본문 복사" />
    </div>
  </li>;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50" onClick={async () => { try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* 복사 권한이 없으면 무시 */ } }}><Copy size={13} />{copied ? "복사됨" : label}</button>;
}
