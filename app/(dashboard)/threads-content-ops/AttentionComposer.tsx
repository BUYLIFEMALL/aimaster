"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleAlert, Copy, Sparkles } from "lucide-react";
import { DEFAULT_ENGINE, DEFAULT_IMAGE_MODELS, DEFAULT_IMAGE_PLATFORM, ENGINES, IMAGE_KEY_LABEL, IMAGE_MODELS, IMAGE_PLATFORMS, IMAGE_RATIOS, MAX_GENERATE_COUNT, PERSONAS, REWRITE_MODES, type EngineProvider, type ImagePlatform, type ImageRatio } from "@/threads-content-ops/lib/personas";
import { createClient } from "@/lib/supabase/client";
import { MAX_IMAGE_BYTES, MAX_MEDIA, MAX_VIDEO_BYTES, MEDIA_BUCKET, MEDIA_RETENTION_DAYS, memberMediaFolder, type PostMedia } from "@/threads-content-ops/lib/media";
import { assemblePostBody, disclosureFor, productPlatformLabel, type LinkedProduct } from "@/threads-content-ops/lib/productPost";
import { deleteMediaFile, generateAttentionPost, generatePostImage, planPostImages, rewriteGeneratedPost, saveGeneratedDraft } from "./web-actions";

type Account = { id: string; username: string | null };
type Candidate = { id: string; method: string; source_input: string; title: string; content: string; keywords: string[]; status?: string };
type Variant = { type: string; hook: string; whyItWorks: string; content: string };
type Plan = { hook: string; hookType: string; whyHookWorks: string; content: string; cta: string; followUpIdeas: string[]; hookVariants: Variant[] };
type Engine = { provider: EngineProvider; model: string };
type ImageSettings = { platform: ImagePlatform; model: string; ratio: ImageRatio; count: number };

const pickedButton = "border-amber-500 bg-amber-500 text-[#ffffff] shadow-sm";
const idleButton = "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100";

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

export default function AttentionComposer({ userId, accounts, products, viralCandidates, initialViralId, configuredProviders }: { userId: string; accounts: Account[]; products: LinkedProduct[]; viralCandidates: Candidate[]; initialViralId?: string; configuredProviders: string[] }) {
  const initial = viralCandidates.find((candidate) => candidate.id === initialViralId);
  const [viralId, setViralId] = useState(initial?.id ?? "");
  const [topic, setTopic] = useState(() => (initial ? viralPrompt(initial) : ""));
  const [note, setNote] = useState("");
  const topicRef = useRef<HTMLTextAreaElement>(null);
  const [personaId, setPersonaId] = useState("");
  const [product, setProduct] = useState("");
  const [productId, setProductId] = useState("");
  const linkedProduct = products.find((item) => item.id === productId);
  const [experience, setExperience] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [benchmark, setBenchmark] = useState("");
  const [engine, setEngine] = useState<Engine>(DEFAULT_ENGINE);
  const [image, setImage] = useState<ImageSettings>({ platform: DEFAULT_IMAGE_PLATFORM, model: DEFAULT_IMAGE_MODELS[DEFAULT_IMAGE_PLATFORM], ratio: "1:1", count: 1 });
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [media, setMedia] = useState<PostMedia[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [generatingLabel, setGeneratingLabel] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const engineKeyReady = configuredProviders.includes(engine.provider);
  const imagePlatform = IMAGE_PLATFORMS.find((item) => item.id === image.platform) ?? IMAGE_PLATFORMS[0];
  const imageKeyReady = configuredProviders.includes(imagePlatform.keyProvider);
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
        custom: { product, experience, targetAudience, benchmarkPost: benchmark }, engine, productId: productId || undefined,
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

    <section className="rounded-2xl border-2 border-violet-300 bg-white p-5 shadow-sm">
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

    <section className="rounded-2xl border-2 border-sky-300 bg-white p-5 shadow-sm">
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

      <div className="mt-4 rounded-xl border-2 border-amber-300 bg-white p-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden>✍️</span>
          <div className="min-w-0"><p className="text-sm font-bold text-neutral-900">맞춤글 생성 (내 실제 경험담 · 상품명 · 타깃 직접 입력)</p><p className="mt-0.5 text-xs text-neutral-500">내가 직접 겪은 썰이나 특정 상품을 넣어, 지어내지 않고 리얼하고 자연스러운 글로 완성합니다. 모두 선택 사항입니다.</p></div>
        </div>
        <div className="mt-3 space-y-3">
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
            <label className="block text-xs font-bold text-neutral-800">🛍️ 등록한 상품 연결 <span className="font-normal text-neutral-500">— 선택 안 하면 일반 Threads 글이 됩니다</span>
              <select className={`${inputClass} mt-1`} value={productId} onChange={(event) => { setProductId(event.target.value); setPlan(null); }} aria-label="등록한 상품 연결">
                <option value="">연결 안 함 (일반 포스팅)</option>
                {products.map((item) => <option key={item.id} value={item.id}>[{productPlatformLabel(item.source_type)}] {item.title || item.source_url}</option>)}
              </select>
            </label>
            {!products.length && <p className="mt-2 text-xs text-neutral-600">등록된 상품이 없습니다. <Link className="font-semibold underline" href="/threads-content-ops?tab=sources">쇼핑제휴 상품 등록</Link>에서 상품을 먼저 등록해 주세요.</p>}
            {linkedProduct && <div className="mt-2 rounded-lg border border-amber-200 bg-white p-2.5 text-xs leading-relaxed text-neutral-700">
              <p className="font-semibold text-neutral-900">{linkedProduct.title}</p>
              {linkedProduct.summary && <p className="mt-0.5">{linkedProduct.summary}</p>}
              <p className="mt-1 break-all text-neutral-500">상품링크: {linkedProduct.source_url}</p>
              <p className="mt-1 text-neutral-600">글 형식: 첫 줄 제휴 고지(“{disclosureFor(linkedProduct.source_type)}”) → 이모티콘+짧은 제목 → 글감 이야기에서 상품 특징·가격으로 이어지는 3개 단락 → 맨 아래 “상품링크: 주소”. 고지와 링크는 자동으로 붙고 법에 따라 지울 수 없습니다.</p>
            </div>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-neutral-700">연결할 상품/핵심 소재 <span className="font-normal text-neutral-500">(본문에는 숨겨지고 첫 댓글 CTA로 유도됨){linkedProduct ? " — 등록 상품 연결 중이라 위 상품이 우선합니다" : ""}</span><input disabled={Boolean(linkedProduct)} className={`${inputClass} mt-1 disabled:bg-neutral-100`} maxLength={200} value={product} onChange={(event) => setProduct(event.target.value)} placeholder="예: 실리콘 전자레인지 찜기, 세탁조 클리너" /></label>
            <label className="block text-xs font-semibold text-neutral-700">타깃 독자<input className={`${inputClass} mt-1`} maxLength={200} value={targetAudience} onChange={(event) => setTargetAudience(event.target.value)} placeholder="예: 20대 후반 자취 직장인, 살림하는 주부" /></label>
          </div>
          <label className="block text-xs font-semibold text-neutral-700">내 실제 경험담 / 상황 <span className="font-normal text-neutral-500">(지어내지 않고 솔직한 리얼 썰 — 여기에 적은 경험만 1인칭 경험담으로 쓰입니다)</span><textarea className={`${inputClass} mt-1 min-h-20`} maxLength={800} value={experience} onChange={(event) => setExperience(event.target.value)} placeholder="예: 퇴근 후 설거지가 너무 싫어서 저녁을 자주 거르다가 샀음. 써 본 지 2주째인데 삶의 질 수직 상승" /></label>
          <label className="block text-xs font-semibold text-neutral-700">참고할 터진 글 원문 <span className="font-normal text-neutral-500">(선택 사항 — 벤치마킹할 스레드 글이 있다면 붙여넣기)</span><textarea className={`${inputClass} mt-1 min-h-20`} maxLength={2000} value={benchmark} onChange={(event) => setBenchmark(event.target.value)} placeholder="예: 넘더러워서 안 올리려다 추천해준 치니 고마워서 올림... 워싱소다 다 소용없더라" /></label>
          <p className="text-[11px] text-neutral-500">터진 글은 첫 문장 후킹·심리·전개 순서(뼈대)만 참고하고, 문장이나 소재는 그대로 따라 쓰지 않습니다. 직접 쓴 경험에 없는 사실은 지어내지 않습니다.</p>
          <div className="flex flex-col items-end gap-1">
            <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-bold text-[#ffffff] hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300" disabled={generating || !(topic.trim() || product.trim() || experience.trim() || benchmark.trim() || linkedProduct)} onClick={() => void generate("custom", undefined, topic.trim() || linkedProduct?.title || product.trim() || experience.trim().slice(0, 300) || benchmark.trim().slice(0, 300))}><Sparkles size={15} />{generatingLabel === "custom" ? "맞춤글 만드는 중… (최대 1분)" : "입력한 템플릿으로 글 생성하기"}</button>
            <span className="text-[11px] text-neutral-500">글감 칸이 비어 있으면 위 입력(상품·경험담)을 주제로 씁니다.</span>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border-2 border-emerald-300 bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-neutral-900">🤖 AI 글 생성 엔진 선택 <span className="hidden font-normal text-neutral-500 sm:inline">GPT / Claude / Gemini</span></p>
          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">글 생성·다시 쓰기에 적용</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">{ENGINES.map((item) => <button key={item.provider} type="button" onClick={() => setEngine({ provider: item.provider, model: item.models[0].value })} aria-pressed={engine.provider === item.provider} className={`flex flex-col items-center justify-center gap-0.5 rounded-xl border p-2.5 text-center font-bold transition-all ${engine.provider === item.provider ? pickedButton : idleButton}`}>
          <span className="text-base">{item.icon}</span><span className="text-sm font-extrabold tracking-tight">{item.label}</span><span className="text-[10px] font-normal opacity-80">{item.sub}{configuredProviders.includes(item.provider) ? "" : " · 키 미등록"}</span>
        </button>)}</div>
        <label className="mt-3 block border-t border-neutral-100 pt-2 text-[11px] font-bold text-neutral-700">🎯 {engineInfo.label} 세부 실행 모델
          <select className={`${inputClass} mt-1`} value={engine.model} onChange={(event) => setEngine({ ...engine, model: event.target.value })}>{engineInfo.models.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
        </label>
        {!engineKeyReady && <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><CircleAlert size={16} className="mt-0.5 shrink-0" /><span>{engineInfo.label} API 키가 등록되지 않았습니다. <Link className="font-semibold underline" href="/threads-content-ops?tab=settings">API키등록·플랫폼연동</Link>에서 본인 키를 저장하거나 다른 엔진을 선택해 주세요.</span></p>}
      </div>

      <div className="mt-3 rounded-xl border-2 border-fuchsia-300 bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-neutral-900">🖼️ 이미지 생성 모델 <span className="hidden font-normal text-neutral-500 sm:inline">NanoBanana · GPT Image · FLUX · Z-Image</span></p>
          <span className="rounded-md border border-fuchsia-200 bg-fuchsia-50 px-2 py-0.5 text-[11px] font-bold text-fuchsia-700">결과 글의 "이미지 생성"에 적용</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">{IMAGE_PLATFORMS.map((item) => <button key={item.id} type="button" onClick={() => setImage({ ...image, platform: item.id, model: DEFAULT_IMAGE_MODELS[item.id] })} aria-pressed={image.platform === item.id} className={`flex flex-col items-center justify-center gap-0.5 rounded-xl border p-2.5 text-center font-bold transition-all ${image.platform === item.id ? pickedButton : idleButton}`}>
          <span className="text-base">{item.icon}</span><span className="text-xs font-extrabold tracking-tight">{item.name}</span><span className="text-[10px] font-normal opacity-80">{item.sub}{configuredProviders.includes(item.keyProvider) ? "" : " · 키 미등록"}</span>
        </button>)}</div>
        <div className="mt-3 grid gap-3 border-t border-neutral-100 pt-2 sm:grid-cols-[1fr_auto_auto]">
          <label className="block min-w-0 text-[11px] font-bold text-neutral-700">🎯 {imagePlatform.name} 세부 실행 모델
            <select className={`${inputClass} mt-1`} value={image.model} onChange={(event) => setImage({ ...image, model: event.target.value })}>{IMAGE_MODELS.filter((item) => item.platform === image.platform).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          </label>
          <label className="block text-[11px] font-bold text-neutral-700">📐 비율
            <select className={`${inputClass} mt-1`} value={image.ratio} onChange={(event) => setImage({ ...image, ratio: event.target.value as ImageRatio })}>{IMAGE_RATIOS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          </label>
          <label className="block text-[11px] font-bold text-neutral-700">🔢 생성 장수
            <select className={`${inputClass} mt-1`} value={image.count} onChange={(event) => setImage({ ...image, count: Number(event.target.value) })}>{Array.from({ length: MAX_GENERATE_COUNT }, (_, index) => index + 1).map((num) => <option key={num} value={num}>{num}장{num === 1 ? " (기본)" : " 생성"}</option>)}</select>
          </label>
        </div>
        <p className="mt-2 text-xs text-neutral-500">장수를 2장 이상 고르면 본문의 장면을 나눠 서로 다른 컷으로 순서대로 만듭니다. 사람이 나오면 한국인으로 그리고 이미지 안에 글자는 넣지 않습니다.</p>
        {!imageKeyReady && <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><CircleAlert size={16} className="mt-0.5 shrink-0" /><span>{IMAGE_KEY_LABEL[imagePlatform.keyProvider]} API 키가 등록되지 않았습니다. <Link className="font-semibold underline" href="/threads-content-ops?tab=settings">API키등록·플랫폼연동</Link>에서 본인 키를 저장하거나 다른 플랫폼을 선택해 주세요.</span></p>}
      </div>
      <MediaManager userId={userId} media={media} onChange={setMedia} />
    </section>

    <section className="rounded-2xl border-2 border-rose-300 bg-white p-5 shadow-sm">
      <h3 className="font-bold text-neutral-900">3. 주목받는 글 만들기</h3>
      <label className="mt-3 block text-sm font-medium text-neutral-700">추가 요청 <span className="font-normal text-neutral-500">(선택)</span></label>
      <input className={`${inputClass} mt-1`} maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} placeholder="예: 20대 직장인 말투로, 마지막은 질문으로 끝내줘" />
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-bold text-[#ffffff] hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300" disabled={generating || !topic.trim()} onClick={() => void generate("main")}><Sparkles size={16} />{generatingLabel ? "글 만드는 중… (최대 1분)" : plan ? "다시 생성하기" : "글 생성하기"}</button>
        <span className="text-xs text-neutral-500">버튼을 누를 때만 선택한 엔진의 회원님 키가 사용됩니다. 자동 발행은 하지 않습니다.</span>
      </div>
      {message && !message.ok && <p className="mt-3 flex items-start gap-2 rounded-xl border border-neutral-200 bg-white p-3 text-sm text-neutral-800" role="status"><CircleAlert size={16} className="mt-0.5 shrink-0 text-rose-600" />{message.text}</p>}
    </section>

    {plan && <PlanView plan={plan} accounts={accounts} accountId={accountId} onAccount={setAccountId} viralId={viralId} engine={engine} image={image} product={linkedProduct} media={media} onAddMedia={(item) => setMedia((current) => (current.length >= MAX_MEDIA || current.some((entry) => entry.url === item.url) ? current : [...current, item]))} onSaved={(text) => setMessage({ ok: true, text })} message={message} />}
  </div>;
}

function PlanView({ plan, accounts, accountId, onAccount, viralId, engine, image, product, media, onAddMedia, onSaved, message }: { plan: Plan; accounts: Account[]; accountId: string; onAccount: (id: string) => void; viralId: string; engine: Engine; image: ImageSettings; product?: LinkedProduct; media: PostMedia[]; onAddMedia: (item: PostMedia) => void; onSaved: (text: string) => void; message: { ok: boolean; text: string } | null }) {
  const options = [{ type: `${plan.hookType} (대표)`, hook: plan.hook, whyItWorks: plan.whyHookWorks, content: plan.content }, ...plan.hookVariants];
  return <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <h3 className="font-bold text-neutral-900">4. 마음에 드는 글 고르기 <span className="text-sm font-normal text-neutral-500">({options.length}가지)</span></h3>
      <label className="flex items-center gap-2 text-xs font-semibold text-neutral-600">저장할 계정<select className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900" value={accountId} onChange={(event) => onAccount(event.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>@{account.username ?? "Threads 계정"}</option>)}</select></label>
    </div>
    {message?.ok && <p className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status"><CheckCircle2 size={16} className="mt-0.5 shrink-0" />{message.text} <Link className="font-semibold underline" href="/threads-content-ops?tab=manage">초안·발행 관리 열기</Link></p>}
    <ul className="mt-4 space-y-4">{options.map((option, index) => <VariantCard key={`${option.type}-${index}`} option={option} accountId={accountId} viralId={viralId} engine={engine} image={image} product={product} media={media} onAddMedia={onAddMedia} onSaved={onSaved} />)}</ul>
    {plan.cta && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm"><p className="font-semibold text-amber-900">댓글을 부르는 마무리·첫 댓글 멘트</p><p className="mt-1 text-neutral-800">{plan.cta}</p><div className="mt-2"><CopyButton value={plan.cta} label="멘트 복사" /></div></div>}
    {plan.followUpIdeas.length > 0 && <div className="mt-4"><p className="text-sm font-semibold text-neutral-900">이어 쓸 후속 아이디어</p><ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-neutral-700">{plan.followUpIdeas.map((idea) => <li key={idea}>{idea}</li>)}</ul></div>}
  </section>;
}

function VariantCard({ option, accountId, viralId, engine, image, product, media, onAddMedia, onSaved }: { option: Variant; accountId: string; viralId: string; engine: Engine; image: ImageSettings; product?: LinkedProduct; media: PostMedia[]; onAddMedia: (item: PostMedia) => void; onSaved: (text: string) => void }) {
  const [body, setBody] = useState(option.content);
  const [hook, setHook] = useState(option.hook);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [rewriting, setRewriting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const finalBody = assemblePostBody(body, product);
  const over = finalBody.length > THREADS_LIMIT;
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [imaging, setImaging] = useState<{ done: number; total: number } | null>(null);

  const makeImages = async () => {
    if (imaging || saving || rewriting) return;
    const want = Math.min(image.count, MAX_MEDIA - media.length);
    if (want < 1) { setError(`미디어는 최대 ${MAX_MEDIA}개까지 둘 수 있습니다. 위 미디어 카드에서 불필요한 파일을 삭제한 뒤 다시 생성해 주세요.`); return; }
    setError("");
    setImaging({ done: 0, total: want });
    try {
      const plan = await planPostImages({ content: body, count: want, engine });
      if (!plan.ok) { setError(plan.error); return; }
      for (let index = 0; index < plan.prompts.length; index += 1) {
        const result = await generatePostImage({ prompt: plan.prompts[index], imageModel: image.model, ratio: image.ratio });
        if (!result.ok) { setError(`${index}장을 만든 뒤 멈췄습니다. ${result.error}`); return; }
        onAddMedia({ url: result.url, type: "IMAGE", size: result.size });
        setImaging({ done: index + 1, total: want });
      }
    } catch {
      setError("이미지 생성 요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setImaging(null);
    }
  };

  // 결과 본문이 스크롤 없이 한 번에 모두 보이도록 글 길이에 맞춰 세로 칸을 키운다(다시 쓰기·직접 수정 때도 따라간다).
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 4}px`;
  }, [body]);

  const save = async () => {
    if (saving || saved) return;
    setSaving(true);
    setError("");
    try {
      const result = await saveGeneratedDraft({ accountId, body, viralId: viralId || undefined, productId: product?.id, media });
      if (result.ok) {
        setSaved(true);
        onSaved(media.length ? `초안으로 저장했습니다(이미지·영상 ${media.length}개 포함). 초안·발행 관리에서 검토한 뒤 발행하세요.` : "초안으로 저장했습니다. 초안·발행 관리에서 검토한 뒤 발행하세요.");
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
      const result = await rewriteGeneratedPost({ hook, content: body, mode, engine, productId: product?.id });
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
    <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700">{option.type}</span><span className={`text-xs ${over ? "font-bold text-rose-600" : "text-neutral-500"}`}>{finalBody.length}/{THREADS_LIMIT}자{product ? " (고지·링크 포함)" : ""} · 목표 450~480자{over ? " — Threads 글자 수를 넘습니다. 본문을 줄여 주세요" : ""}</span></div>
    {hook && <p className="mt-2 text-sm font-semibold text-neutral-900">“{hook}”</p>}
    {option.whyItWorks && <p className="mt-1 text-xs text-neutral-500">💡 {option.whyItWorks}</p>}
    {product && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">{disclosureFor(product.source_type)} <span className="font-normal text-amber-700">(첫 줄에 자동으로 붙습니다)</span></p>}
    <textarea ref={bodyRef} className={`${inputClass} ${product ? "mt-1.5" : "mt-3"} min-h-40 resize-y overflow-hidden leading-relaxed`} value={body} maxLength={5000} onChange={(event) => { setBody(event.target.value); setSaved(false); }} aria-label={`${option.type} 본문`} />
    {product && <p className="mt-1.5 break-all rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900"><b>상품링크:</b> {product.source_url} <span className="text-amber-700">(하단에 자동으로 붙습니다 · {product.title})</span></p>}
    <div className="mt-2 flex flex-wrap items-center gap-1.5"><span className="text-[11px] font-semibold text-neutral-500">다시 써줘</span>{REWRITE_MODES.map((item) => <button key={item.mode} type="button" disabled={rewriting !== null || saving} onClick={() => void rewrite(item.mode)} className="rounded-full border border-neutral-300 bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50">{rewriting === item.mode ? "수정 중…" : `${item.icon} ${item.label}`}</button>)}</div>
    {error && <p className="mt-2 text-sm text-rose-600" role="alert">{error}</p>}
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" className="inline-flex items-center gap-1 rounded-lg border-2 border-violet-300 bg-white px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50" disabled={imaging !== null || saving || rewriting !== null || !body.trim()} onClick={() => void makeImages()}>{imaging ? `이미지 만드는 중… ${imaging.done}/${imaging.total}장` : image.count > 1 ? `🖼️ 이미지 ${image.count}장 생성` : "🖼️ 이미지 생성"}</button>
      <button type="button" className="inline-flex items-center rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-bold text-[#ffffff] hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300" disabled={saving || saved || rewriting !== null || imaging !== null || !body.trim() || !accountId} onClick={() => void save()}>{saved ? "저장됨" : saving ? "저장 중…" : "이 글로 초안 저장"}</button>
      <CopyButton value={finalBody} label="본문 복사" />
    </div>
  </li>;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50" onClick={async () => { try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* 복사 권한이 없으면 무시 */ } }}><Copy size={13} />{copied ? "복사됨" : label}</button>;
}

const IMAGE_TYPES = ["image/jpeg", "image/png"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime"];
const fileExt = (file: File) => (file.name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);

/** 글에 붙일 이미지·영상(혼합 캐러셀) 관리 카드 — threads-affiliate-poster의 미디어 카드 방식. AI 생성 이미지도 여기에 모인다. */
function MediaManager({ userId, media, onChange }: { userId: string; media: PostMedia[]; onChange: React.Dispatch<React.SetStateAction<PostMedia[]>> }) {
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<"image" | "video" | null>(null);
  const [error, setError] = useState("");
  const [viewer, setViewer] = useState<number | null>(null);
  const full = media.length >= MAX_MEDIA;

  const upload = async (files: File[], kind: "image" | "video") => {
    if (!files.length) return;
    setError("");
    const room = MAX_MEDIA - media.length;
    if (room < 1) { setError(`Threads에는 이미지·영상을 합쳐 최대 ${MAX_MEDIA}개까지 붙일 수 있습니다.`); return; }
    const picked = files.slice(0, room);
    if (picked.length < files.length) setError(`최대 ${MAX_MEDIA}개 제한으로 ${picked.length}개만 올렸습니다.`);
    setUploading(kind);
    try {
      const supabase = createClient();
      for (const file of picked) {
        if (kind === "image") {
          if (!IMAGE_TYPES.includes(file.type)) { setError("Threads는 JPEG·PNG 이미지만 올릴 수 있습니다(webp·gif 등은 불가)."); continue; }
          if (file.size > MAX_IMAGE_BYTES) { setError("이미지는 8MB 이하만 올릴 수 있습니다(Threads 제한)."); continue; }
        } else {
          if (!VIDEO_TYPES.includes(file.type)) { setError("영상은 MP4·MOV만 올릴 수 있습니다."); continue; }
          if (file.size > MAX_VIDEO_BYTES) { setError("영상은 1GB 이하만 올릴 수 있습니다(Threads 제한)."); continue; }
        }
        const ext = fileExt(file) || (kind === "image" ? "jpg" : "mp4");
        const path = `${memberMediaFolder(userId, "up")}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
        if (uploadError) { setError(`업로드에 실패했습니다. ${uploadError.message}`); continue; }
        const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
        onChange((current) => (current.length >= MAX_MEDIA ? current : [...current, { url: data.publicUrl, type: kind === "image" ? "IMAGE" : "VIDEO", size: file.size }]));
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "업로드에 실패했습니다.");
    } finally {
      setUploading(null);
    }
  };

  const remove = (index: number) => {
    const target = media[index];
    onChange((current) => current.filter((_, position) => position !== index));
    if (target) void deleteMediaFile(target.url);
  };
  const clearAll = () => {
    if (!media.length || !window.confirm("등록된 모든 미디어(이미지·영상)를 삭제할까요? 파일도 함께 지워지며 되돌릴 수 없습니다.")) return;
    const targets = [...media];
    onChange([]);
    for (const item of targets) void deleteMediaFile(item.url);
  };
  const move = (index: number, delta: number) => onChange((current) => {
    const target = index + delta;
    if (target < 0 || target >= current.length) return current;
    const next = [...current];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });

  return <div className="mt-3 rounded-xl border-2 border-sky-300 bg-white p-3">
    <input ref={imageInput} type="file" accept="image/jpeg,image/png" multiple className="hidden" onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ""; void upload(files, "image"); }} />
    <input ref={videoInput} type="file" accept="video/mp4,video/quicktime" className="hidden" onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ""; void upload(files, "video"); }} />
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-bold text-neutral-900">📁 미디어 (이미지·영상 혼합 캐러셀) <span className="text-xs font-normal text-neutral-500">{media.length} / {MAX_MEDIA}개</span></p>
      <span className="rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700">AI 이미지 · PC 파일 · 동영상 · 최대 {MAX_MEDIA}개</span>
    </div>
    {media.length === 0 ? <div className="mt-3 rounded-xl border-2 border-dashed border-neutral-300 p-5 text-center">
      <p className="text-sm font-bold text-neutral-800">등록된 미디어가 없습니다.</p>
      <p className="mt-1 text-xs text-neutral-500">위 이미지 생성 모델로 글의 "이미지 생성"을 누르거나, 아래 버튼으로 내 PC의 이미지·영상을 추가하세요. (최대 {MAX_MEDIA}개 혼합 캐러셀 지원)</p>
    </div> : <>
      <div className="mt-2 flex justify-end"><button type="button" onClick={clearAll} className="rounded-lg border border-rose-300 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50">🗑️ 전체 미디어 삭제</button></div>
      <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">{media.map((item, index) => <li key={item.url} className="rounded-lg border border-neutral-200 p-1.5">
        <button type="button" onClick={() => setViewer(index)} className="relative block w-full" aria-label={`${index + 1}번 미디어 크게 보기`}>
          {item.type === "VIDEO"
            ? <video src={item.url} preload="metadata" muted className="aspect-square w-full rounded-md bg-black object-cover" />
            : /* eslint-disable-next-line @next/next/no-img-element */ <img src={item.url} alt={`미디어 ${index + 1}`} className="aspect-square w-full rounded-md object-cover" />}
          <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 text-[10px] font-bold text-[#ffffff]">{index + 1}</span>
          <span className="absolute right-1 top-1 rounded bg-black/70 px-1.5 text-[10px] font-bold text-[#ffffff]">{item.type === "VIDEO" ? "🎬 영상" : "🖼️"}</span>
        </button>
        {item.type === "IMAGE" && item.size !== undefined && item.size > MAX_IMAGE_BYTES && <p className="mt-1 text-[10px] font-semibold text-rose-600">8MB 초과 — Threads 발행 불가</p>}
        <div className="mt-1.5 flex items-center justify-between gap-1">
          <span className="flex gap-1"><button type="button" aria-label="앞으로" disabled={index === 0} onClick={() => move(index, -1)} className="rounded border border-neutral-300 px-1.5 text-xs disabled:opacity-40">◀</button><button type="button" aria-label="뒤로" disabled={index === media.length - 1} onClick={() => move(index, 1)} className="rounded border border-neutral-300 px-1.5 text-xs disabled:opacity-40">▶</button></span>
          <button type="button" onClick={() => remove(index)} className="rounded border border-rose-300 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50" aria-label={`${index + 1}번 미디어 삭제`}>✕ 삭제</button>
        </div>
      </li>)}</ul>
    </>}
    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
      <button type="button" disabled={full || uploading !== null} onClick={() => imageInput.current?.click()} className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50">{uploading === "image" ? "이미지 올리는 중…" : "📷 이미지 파일 추가"}</button>
      <button type="button" disabled={full || uploading !== null} onClick={() => videoInput.current?.click()} className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50">{uploading === "video" ? "영상 올리는 중… (큰 파일은 오래 걸립니다)" : "🎬 영상 파일 추가 (최대 1GB)"}</button>
    </div>
    {error && <p className="mt-2 text-center text-xs font-semibold text-rose-600" role="alert">{error}</p>}
    <p className="mt-2 text-center text-[11px] text-neutral-500">⏳ 데이터 보관 기간: 등록 시점 기준 {MEDIA_RETENTION_DAYS}일 후 자동 삭제 (불필요한 파일은 언제든 수동 삭제 가능) · 이미지는 JPEG·PNG 8MB 이하, 영상은 MP4·MOV 1GB·5분 이하 · 결과 글의 "이 글로 초안 저장"을 누르면 이 미디어가 함께 저장되고, 발행하면 캐러셀로 올라갑니다.</p>
    {viewer !== null && media[viewer] && <MediaViewer media={media} index={viewer} onIndex={setViewer} />}
  </div>;
}

function MediaViewer({ media, index, onIndex }: { media: PostMedia[]; index: number; onIndex: (index: number | null) => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onIndex(null);
      if (event.key === "ArrowLeft") onIndex((index + media.length - 1) % media.length);
      if (event.key === "ArrowRight") onIndex((index + 1) % media.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, media.length, onIndex]);
  const item = media[index];
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="미디어 크게 보기" onClick={() => onIndex(null)}>
    <div className="relative max-h-full max-w-4xl" onClick={(event) => event.stopPropagation()}>
      {item.type === "VIDEO"
        ? <video src={item.url} controls autoPlay className="max-h-[80vh] max-w-full rounded-lg" />
        : /* eslint-disable-next-line @next/next/no-img-element */ <img src={item.url} alt={`미디어 ${index + 1}`} className="max-h-[80vh] max-w-full rounded-lg object-contain" />}
      <div className="mt-2 flex items-center justify-center gap-3 text-xs font-semibold text-[#ffffff]">
        <button type="button" onClick={() => onIndex((index + media.length - 1) % media.length)} className="rounded bg-white/20 px-3 py-1">◀ 이전</button>
        <span>{index + 1} / {media.length}</span>
        <button type="button" onClick={() => onIndex((index + 1) % media.length)} className="rounded bg-white/20 px-3 py-1">다음 ▶</button>
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="rounded bg-white/20 px-3 py-1">원본 열기</a>
        <button type="button" onClick={() => onIndex(null)} className="rounded bg-white/20 px-3 py-1">닫기 (Esc)</button>
      </div>
    </div>
  </div>;
}
