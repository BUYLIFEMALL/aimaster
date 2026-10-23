"use client";
import { useRef, useState } from "react";
import { ArrowRight, Download, ImagePlus, LoaderCircle, RefreshCw, ShieldCheck, Sparkles, Trash2, WandSparkles } from "lucide-react";
import { PhotoUpload } from "./PhotoUpload";
import { ASPECTS, IMAGE_MODELS, MAX_REQUEST_BYTES, type Aspect, type Mode, type RemakeRequest, type RemakeResult, type RestoreOptions } from "@/lib/remake/types";
import { preparePhoto, resultUrl, saveResult, type PhotoInput } from "@/lib/remake/clientImages";
import { saveLocal } from "@/lib/remake/history";
export function Studio({ userId, mode }: { userId: string; mode: Mode }) {
  const [base, setBase] = useState<PhotoInput | null>(null), [objects, setObjects] = useState<(PhotoInput & { id: string })[]>([]);
  const [options, setOptions] = useState<RestoreOptions>({ repair: true, colorize: true, upscale: 1 });
  const [model, setModel] = useState<string>(IMAGE_MODELS[0].id), [aspect, setAspect] = useState<Aspect>("original");
  const [background, setBackground] = useState<"keep" | "change">("keep"), [prompt, setPrompt] = useState("");
  const [consent, setConsent] = useState(false), [busy, setBusy] = useState("");
  const [error, setError] = useState(""); const [needKey, setNeedKey] = useState(false), [message, setMessage] = useState("");
  const [result, setResult] = useState<RemakeResult | null>(null), [resultBase, setResultBase] = useState<string | null>(null), [position, setPosition] = useState(50);
  const [saved, setSaved] = useState(false); const sourceInput = useRef<HTMLInputElement>(null); const lock = useRef(false);
  const isRestore = mode === "restore", disabled = !!busy;
  async function upload(file: File, object = false) {
    if (lock.current) return; lock.current = true; setBusy("사진 준비 중…"); setError("");
    try { if (object && objects.length >= 5) throw new Error("사물 사진은 최대 5장입니다."); const photo = await preparePhoto(file, object); if (object) setObjects(p => [...p, { ...photo, id: crypto.randomUUID() }]); else setBase(photo); }
    catch (e) { setError(e instanceof Error ? e.message : "사진을 읽지 못했습니다."); }
    finally { lock.current = false; setBusy(""); }
  }
  function request(): RemakeRequest {
    if (!base) throw new Error("기본 사진을 먼저 올려 주세요.");
    if (!consent) throw new Error("본인 사진 또는 동의받은 사진인지 확인해 주세요.");
    if (!isRestore && !objects.length) throw new Error("합성할 사물 사진을 추가해 주세요.");
    const strip = (p: PhotoInput) => ({ data: p.data, mimeType: p.mimeType, name: p.name, instruction: p.instruction });
    return { base: strip(base), objects: isRestore ? [] : objects.map(strip), mode, model, options, aspect, background, prompt, consent: true };
  }
  async function run(suggest = false) {
    if (lock.current) return; lock.current = true; setError(""); setNeedKey(false); setMessage("");
    try {
      const payload = request(); const body = JSON.stringify(payload); if (new TextEncoder().encode(body).length > MAX_REQUEST_BYTES) throw new Error("사진 용량이 큽니다. 사물 수를 줄이거나 작은 사진을 올려 주세요.");
      setBusy(suggest ? "사진을 분석해 합성 지시를 제안하고 있습니다…" : "사진을 리메이크하고 있습니다…");
      const response = await fetch(suggest ? "/api/suggest" : "/api/remake", { method: "POST", headers: { "Content-Type": "application/json" }, body, signal: AbortSignal.timeout(240_000) });
      const data = await response.json(); if (!response.ok) { setNeedKey(!!data.needKey); throw new Error(data.error || "처리하지 못했습니다."); }
      if (suggest) { setPrompt(data.prompt); setMessage("합성 지시를 제안했습니다. 내용을 확인하고 [합성하기]를 눌러 주세요."); }
      else { setResult(data); setResultBase(base!.preview); setSaved(false); setPosition(50); setMessage("완성했습니다. 원본과 비교한 뒤 다운로드하거나 보관해 주세요."); }
    } catch (e) { setError(e instanceof Error && e.name !== "TimeoutError" ? e.message : "응답이 늦거나 연결이 끊겼습니다. 잠시 후 다시 시도해 주세요."); }
    finally { setBusy(""); lock.current = false; }
  }
  async function download(format: "jpeg" | "png") {
    if (!result || lock.current) return; lock.current = true; setBusy("다운로드 준비 중…"); setError("");
    try { await saveResult(result, format); } catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했습니다."); } finally { lock.current = false; setBusy(""); }
  }
  async function keep() {
    if (!result || lock.current) return; lock.current = true; setBusy("보관 중…"); setError("");
    try { await saveLocal(userId, { id: crypto.randomUUID(), title: isRestore ? "복원한 사진" : "합성한 사진", result }); setSaved(true); setMessage("이 브라우저의 내 보관함에 저장했습니다. 원본 사진은 보관하지 않습니다."); }
    catch (e) { setError(e instanceof Error ? e.message : "보관하지 못했습니다."); } finally { lock.current = false; setBusy(""); }
  }
  const summary = `${options.repair ? "손상 복원" : "원본 질감 유지"} · ${options.colorize ? "자연스러운 컬러화" : "기존 색 유지"} · ${options.upscale === 1 ? "기본 크기" : `AI 결과 ${options.upscale}배 확대`}`;
  return <div className="remake-studio">
    <div className="page-heading"><p className="eyebrow">PHOTO REMAKE / {isRestore ? "RESTORE" : "COMPOSE"}</p><h1>{isRestore ? "오래된 사진에 새로운 선명함을" : "상상한 장면을 한 장의 사진으로"}</h1><p>{isRestore ? "손상된 사진을 다듬고, 흑백의 추억에 자연스러운 색을 입혀보세요." : "인물과 사물을 자연스럽게 연결합니다. 모든 사물의 모습과 인물의 얼굴을 보존하도록 지시합니다."}</p></div>
    <div className="mode-tabs"><a className={isRestore ? "active" : ""} href="/studio">사진 복원</a><a className={!isRestore ? "active" : ""} href="/compose">사물 합성</a></div>
    <div className="studio-columns"><div className="input-column">
      <section className="card"><div className="section-title"><span className="number">01</span><h2>{isRestore ? "사진 올리기" : "기본 사진 올리기"}</h2><span className="tiny-badge">원본 서버 보관 없음</span></div><PhotoUpload photo={base} disabled={disabled} title={isRestore ? "복원할 사진 선택" : "인물·배경 사진 선택"} onFile={file => void upload(file)}/><p className="muted help-text">사진은 전송 전에 크기를 줄입니다. 생성 중에는 선택한 사진이 본인 Gemini 계정으로 전달됩니다.</p></section>
      {!isRestore && <section className="card"><div className="section-title"><span className="number">02</span><h2>합성할 사물</h2><span className="tiny-badge">{objects.length} / 5장</span></div><div className="object-list">{objects.map((photo, i) => <div key={photo.id} className="object-row"><img src={photo.preview} alt={`${i + 1}번째 사물`} /><label>{i + 1}번째 사물<input aria-label={`${i + 1}번째 사물 지시`} disabled={disabled} value={photo.instruction} maxLength={300} placeholder="예: 오른손에 들기, 머리에 착용" onChange={e => setObjects(p => p.map(q => q.id === photo.id ? { ...q, instruction: e.target.value } : q))}/></label><button type="button" aria-label={`${i + 1}번째 사물 삭제`} disabled={disabled} onClick={() => setObjects(p => p.filter(q => q.id !== photo.id))}><Trash2 size={16}/></button></div>)}</div><button type="button" className="add-object" disabled={disabled || objects.length >= 5} onClick={() => sourceInput.current?.click()}><ImagePlus size={18}/>사물 사진 추가</button><input ref={sourceInput} hidden type="file" accept="image/jpeg,image/png,image/webp" aria-label="사물 사진 파일" disabled={disabled} onChange={e => { if (e.target.files?.[0]) void upload(e.target.files[0], true); e.target.value = ""; }}/></section>}
      <section className="card"><div className="section-title"><span className="number">{isRestore ? "02" : "03"}</span><h2>{isRestore ? "복원 방식" : "장면 설정"}</h2></div>
        {isRestore ? <><div className="option-checks"><label><input type="checkbox" disabled={disabled} checked={options.repair} onChange={e => setOptions(p => ({ ...p, repair: e.target.checked }))}/><span><strong>손상 복원</strong><small>긁힘 · 빛바램 · 노이즈 개선</small></span></label><label><input type="checkbox" disabled={disabled} checked={options.colorize} onChange={e => setOptions(p => ({ ...p, colorize: e.target.checked }))}/><span><strong>흑백 컬러화</strong><small>피부와 배경에 자연스러운 색</small></span></label></div><label className="field-label">완성 이미지 확대<select disabled={disabled} value={options.upscale} onChange={e => setOptions(p => ({ ...p, upscale: Number(e.target.value) as 1 | 2 | 4 }))}><option value={1}>기본 크기</option><option value={2}>AI 결과를 실제 2배 확대</option><option value={4}>AI 결과를 실제 4배 확대</option></select></label><p className="muted help-text">AI가 만든 결과 크기를 기준으로 확대합니다. 긴 변은 최대 8,192px입니다.</p><div className="settings-summary">{summary}</div></> : <label className="field-label">배경 처리<select disabled={disabled} value={background} onChange={e => setBackground(e.target.value as "keep" | "change")}><option value="keep">기본 사진의 배경 유지</option><option value="change">추가 요청에 맞게 배경 변경</option></select></label>}
        <div className="field-grid"><label>이미지 모델<select disabled={disabled} value={model} onChange={e => setModel(e.target.value)}>{IMAGE_MODELS.map(m => <option value={m.id} key={m.id}>{m.name}</option>)}</select></label><label>완성 비율<select disabled={disabled} value={aspect} onChange={e => setAspect(e.target.value as Aspect)}>{ASPECTS.map(a => <option key={a} value={a}>{a === "original" ? "원본 비율 유지" : a}</option>)}</select></label></div>
        <label className="field-label">추가 요청 <span className="muted">(선택)</span><textarea disabled={disabled} value={prompt} maxLength={2000} rows={3} placeholder={isRestore ? "예: 얼굴과 옷의 형태는 유지하고 빛바랜 부분만 자연스럽게 다듬어 주세요." : "예: 선글라스를 착용하고 커피잔을 오른손에 들게 해 주세요."} onChange={e => setPrompt(e.target.value)}/></label><p className="muted help-text">옵션을 바꿔도 직접 쓴 요청은 유지됩니다. 얼굴·나이·주요 구도를 보존하도록 지시합니다.</p>
        <label className="consent"><input type="checkbox" checked={consent} disabled={disabled} onChange={e => setConsent(e.target.checked)}/><span>본인 사진 또는 사용 동의를 받은 사진입니다.</span></label>
        <div className="notice compact"><ShieldCheck size={16}/><span>회원 본인 Gemini 키로 호출합니다. 생성 1회, 합성 AI 제안 1회에 각각 본인 API 사용량이 발생합니다.</span></div>
        <div className="actions generate-actions">{!isRestore && <button type="button" disabled={disabled || !base || !objects.length || !consent} onClick={() => void run(true)}><Sparkles size={16}/>AI 합성 지시 제안</button>}<button type="button" className="primary generate" disabled={disabled || !base || !consent || (!isRestore && !objects.length)} onClick={() => void run()}>{disabled ? <LoaderCircle className="spin" size={18}/> : <WandSparkles size={18}/>} {isRestore ? "사진 복원하기" : "합성하기"}<ArrowRight size={16}/></button></div>
      </section>
    </div><div className="result-column"><section className="card result-card"><div className="section-title"><span className="number">{isRestore ? "03" : "04"}</span><h2>완성 & 저장</h2>{result && <span className="tiny-badge">{result.width} × {result.height}px</span>}</div>
      {result ? <><div className="comparison" style={{ aspectRatio: `${result.width} / ${result.height}` }}><img className="compare-result" src={resultUrl(result)} alt="리메이크 완성 사진"/>{resultBase && <div className="before-layer" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}><img src={resultBase} alt="리메이크 원본 사진"/></div>}<span className="compare-label left">원본</span><span className="compare-label right">완성</span><span className="compare-divider" style={{ left: `${position}%` }}/></div><label className="comparison-slider">원본과 완성 비교<input aria-label="원본과 완성 비교" type="range" min={0} max={100} value={position} onChange={e => setPosition(Number(e.target.value))}/></label><p className="muted help-text">슬라이더를 움직여 비교하세요. 비율을 바꾼 경우 원본은 여백을 포함해 표시됩니다.</p><div className="result-meta"><span>{result.width} × {result.height}px · JPEG</span><span>{IMAGE_MODELS.find(m => m.id === result.model)?.name || result.model}</span></div>{result.limited && <p className="notice warning">확대 결과의 긴 변을 8,192px로 제한했습니다.</p>}<div className="actions"><button type="button" className="primary" disabled={disabled} onClick={() => void download("jpeg")}><Download size={16}/>JPEG 저장</button><button type="button" disabled={disabled} onClick={() => void download("png")}>PNG 저장</button><button type="button" disabled={disabled || saved} onClick={() => void keep()}>{saved ? "보관 완료" : "내 보관함에 저장"}</button></div><button type="button" className="text-button" disabled={disabled} onClick={() => { setResult(null); setResultBase(null); setSaved(false); }}><RefreshCw size={14}/>결과 닫기</button></> : <div className="result-empty"><span className="empty-symbol"><WandSparkles size={32}/></span><h3>{isRestore ? "추억이 더 선명해지는 순간" : "새로운 장면이 완성되는 순간"}</h3><p>사진을 올리고 원하는 옵션을 선택하세요.<br/>완성 후 원본과 비교하며 저장할 수 있습니다.</p><div className="empty-tags"><span>얼굴 보존 지시</span><span>본인 API</span><span>실제 크기 확인</span></div></div>}
      {busy && <p role="status" className="progress"><LoaderCircle className="spin" size={18}/>{busy}</p>}{error && <div role="alert" className="notice error-box"><p>{error}</p>{needKey && <a className="button" href="/settings">본인 API 키 등록하기</a>}</div>}{message && <p role="status" className="notice success">{message}</p>}
    </section><div className="privacy-note"><ShieldCheck size={16}/><p>원본 사진과 API 키는 보관함에 저장하지 않습니다. 복원된 얼굴·색상·사물 형태는 직접 확인해 주세요.</p></div></div></div>
  </div>;
}
