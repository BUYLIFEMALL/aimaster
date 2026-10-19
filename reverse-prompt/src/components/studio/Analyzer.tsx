"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ClipboardCopy, Download, FileAudio, FileImage, FileVideo, Loader2, RefreshCw, Save, UploadCloud, X, Sparkles, Cpu, Layers, SlidersHorizontal, BookOpen, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Analysis, MediaType, Options } from "@/lib/rpa/types";
import { DEFAULT_OPTIONS, MEDIA_LABEL, TARGETS, defaultTarget } from "@/lib/rpa/types";
import { ACCEPT_ATTR, BUCKET, FORMAT_HELP, SIZE_LIMIT, detectMedia, fileBase, sizeError } from "@/lib/rpa/media";
import { mainPrompt, toMarkdown, withEditedPrompt } from "@/lib/rpa/schemas";
import { makeThumb } from "@/lib/rpa/thumb";
import { MEMO_MAX } from "@/lib/rpa/validate";

interface Result { id: string; media: MediaType; title: string; data: Analysis; modelUsed: string; fileName: string; target: string }
type Phase = "" | "uploading" | "analyzing";
interface ApiError { error?: string; needKey?: boolean; expired?: boolean }

const LABELS: Record<string, string> = {
  visual_analysis: "시각 분석", subject_details: "피사체", environment: "환경", lighting_style: "조명", color_grade: "색감", composition_guide: "구도", artistic_style: "화풍",
  midjourney_data: "생성 파라미터", parameters: "파라미터", aspect_ratio: "화면비", stylize: "Stylize", chaos: "Chaos", weird: "Weird", version: "버전", tile: "타일",
  cinematography: "촬영", camera_movement: "카메라 움직임", shot_type: "샷 유형", camera_angle: "카메라 각도", lens_characteristics: "렌즈 특성",
  visuals: "비주얼", subject_action: "피사체 동작", lighting_atmosphere: "조명·분위기", color_palette: "색 구성", visual_style: "비주얼 스타일",
  editing: "편집", pacing: "속도감", transition_style: "전환 방식",
  audio_atmosphere: "오디오", sound_design: "사운드 디자인", music: "음악", dialogue: "대사",
  musical_structure: "음악 구조", genre_main: "주 장르", sub_genre: "세부 장르", key_scale: "조·스케일", bpm: "BPM", time_signature: "박자",
  instrumentation: "악기 구성", lead: "리드", rhythm: "리듬", bass: "베이스", drums: "드럼",
  vocal_layer: "보컬", presence: "유무", gender: "성별", style: "스타일",
  emotional_profile: "감정", mood: "분위기", energy_level: "에너지",
};
const HIDDEN = new Set(["prompt", "negative_prompt", "full_command", "video_prompt", "audio_prompt"]);

function show(v: unknown): string {
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "boolean") return v ? "예" : "아니오";
  return v === undefined || v === null || v === "" ? "—" : String(v);
}

/** 카드로 보여 줄 분석 요소(프롬프트 계열 키는 제외) */
function cardsOf(data: Analysis): { title: string; rows: [string, string][] }[] {
  const out: { title: string; rows: [string, string][] }[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (!v || typeof v !== "object" || Array.isArray(v)) continue;
    const rows: [string, string][] = [];
    for (const [kk, vv] of Object.entries(v as Record<string, unknown>)) {
      if (HIDDEN.has(kk)) continue;
      if (vv && typeof vv === "object" && !Array.isArray(vv)) {
        for (const [k3, v3] of Object.entries(vv as Record<string, unknown>)) rows.push([LABELS[k3] ?? k3, show(v3)]);
      } else rows.push([LABELS[kk] ?? kk, show(vv)]);
    }
    if (rows.length) out.push({ title: LABELS[k] ?? k, rows });
  }
  return out;
}

function saveFile(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function api<T>(url: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; error: string; needKey: boolean; expired: boolean }> {
  try {
    const res = await fetch(url, init);
    const data = (await res.json().catch(() => ({}))) as T & ApiError;
    if (!res.ok) return { ok: false, error: data.error ?? "요청을 처리하지 못했습니다.", needKey: !!data.needKey, expired: !!data.expired };
    return { ok: true, data };
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return { ok: false, error: "분석을 취소했습니다.", needKey: false, expired: false };
    return { ok: false, error: "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.", needKey: false, expired: false };
  }
}

const MEDIA_ICON = { image: FileImage, video: FileVideo, audio: FileAudio };

export function Analyzer({ historyId }: { historyId?: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [media, setMedia] = useState<MediaType | null>(null);
  const [mime, setMime] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [path, setPath] = useState<string | null>(null);
  const [options, setOptions] = useState<Options>({ ...DEFAULT_OPTIONS });
  const [phase, setPhase] = useState<Phase>("");
  const [error, setError] = useState("");
  const [needKey, setNeedKey] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [promptEdit, setPromptEdit] = useState("");
  const [negEdit, setNegEdit] = useState("");
  const [copied, setCopied] = useState("");
  const [over, setOver] = useState(false);
  const [notice, setNotice] = useState("");
  const abort = useRef<AbortController | null>(null);
  const thumbRef = useRef<string | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathRef = useRef<string | null>(null);
  pathRef.current = path;

  const activeMedia: MediaType | null = media ?? result?.media ?? null;
  const targets = TARGETS[activeMedia ?? "image"];

  const showResult = useCallback((r: Result) => {
    setResult(r);
    const a = r.data as Record<string, unknown>;
    const md = (a.midjourney_data ?? {}) as Record<string, unknown>;
    setPromptEdit(r.media === "image" ? String(md.prompt ?? "") : mainPrompt(r.media, r.data));
    setNegEdit(r.media === "image" ? String(md.negative_prompt ?? "") : "");
  }, []);

  // 기록에서 열기
  useEffect(() => {
    if (!historyId) return;
    let alive = true;
    (async () => {
      const r = await api<{ item: { id: string; title: string; media_type: MediaType; file_name: string; options: Options; result: Analysis; model_used: string } }>(`/api/history/${historyId}`, { cache: "no-store" });
      if (!alive) return;
      if (!r.ok) { setError(r.error); return; }
      const it = r.data.item;
      setOptions((o) => ({ ...o, ...it.options }));
      showResult({ id: it.id, media: it.media_type, title: it.title, data: it.result, modelUsed: it.model_used, fileName: it.file_name, target: it.options?.target ?? "" });
      setNotice("저장된 분석 기록을 열었습니다. 같은 파일을 다시 분석하려면 파일을 다시 올려 주세요.");
    })();
    return () => { alive = false; };
  }, [historyId, showResult]);

  // 화면을 떠날 때 미리보기 주소 정리
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const dropTemp = useCallback((p: string | null) => {
    if (p) void fetch(`/api/upload?path=${encodeURIComponent(p)}`, { method: "DELETE", keepalive: true }).catch(() => {});
  }, []);

  function clearFile() {
    dropTemp(pathRef.current);
    setPath(null); setFile(null); setMedia(null); setMime(""); setPreviewUrl(""); thumbRef.current = undefined;
  }

  function pick(f: File | undefined | null) {
    if (!f) return;
    setError(""); setNeedKey(false); setNotice("");
    const det = detectMedia(f.name, f.type);
    if (!det) { setError(`지원하지 않는 형식입니다. ${FORMAT_HELP}만 올릴 수 있습니다.`); return; }
    const big = sizeError(det.media, f.size);
    if (big) { setError(big); return; }
    dropTemp(pathRef.current);
    setPath(null);
    const url = URL.createObjectURL(f);
    setFile(f); setMedia(det.media); setMime(det.mime); setPreviewUrl(url);
    setResult(null);
    setOptions((o) => ({ ...o, target: TARGETS[det.media].some((t) => t.id === o.target) ? o.target : defaultTarget(det.media) }));
    thumbRef.current = undefined;
    void makeThumb(f, det.media, url).then((t) => { thumbRef.current = t; });
  }

  // Ctrl+V 이미지 붙여넣기
  useEffect(() => {
    const h = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.files ?? [])[0];
      if (f) pick(f);
    };
    window.addEventListener("paste", h);
    return () => window.removeEventListener("paste", h);
  });

  async function run(retried = false) {
    if (!file || !media) { setError("분석할 파일을 먼저 올려 주세요."); return; }
    setError(""); setNeedKey(false); setNotice("");
    const ctl = new AbortController();
    abort.current = ctl;
    try {
      let p = pathRef.current;
      if (!p) {
        setPhase("uploading");
        const sign = await api<{ path: string; token: string }>("/api/upload", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, mime, size: file.size }), signal: ctl.signal,
        });
        if (!sign.ok) { setError(sign.error); setNeedKey(sign.needKey); return; }
        const { error: upErr } = await createClient().storage.from(BUCKET).uploadToSignedUrl(sign.data.path, sign.data.token, file, { contentType: mime });
        if (upErr) { setError("파일 업로드에 실패했습니다. 네트워크를 확인하고 다시 시도해 주세요."); return; }
        p = sign.data.path;
        setPath(p);
      }
      setPhase("analyzing");
      const res = await api<{ id: string; media: MediaType; title: string; result: Analysis; modelUsed: string }>("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: ctl.signal,
        body: JSON.stringify({ path: p, name: file.name, mime, options, thumb: thumbRef.current }),
      });
      if (!res.ok) {
        if (res.expired && !retried) { setPath(null); pathRef.current = null; setPhase(""); await run(true); return; }
        setError(res.error); setNeedKey(res.needKey);
        return;
      }
      showResult({ id: res.data.id, media: res.data.media, title: res.data.title, data: res.data.result, modelUsed: res.data.modelUsed, fileName: file.name, target: options.target });
    } catch (e) {
      // 업로드(저장소)·화면 처리 중 예외 — 조용히 끝나지 않게 안내(직접 취소는 제외)
      if ((e as Error)?.name !== "AbortError") setError("분석 중 문제가 생겼습니다. 네트워크를 확인하고 다시 시도해 주세요.");
    } finally {
      setPhase("");
      abort.current = null;
    }
  }

  async function copy(key: string, text: string) {
    try { await navigator.clipboard.writeText(text); } catch {
      const t = document.createElement("textarea");
      t.value = text; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove();
    }
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? "" : c)), 1800);
  }

  const dirty = useMemo(() => {
    if (!result) return false;
    const a = result.data as Record<string, unknown>;
    const md = (a.midjourney_data ?? {}) as Record<string, unknown>;
    const base = result.media === "image" ? String(md.prompt ?? "") : mainPrompt(result.media, result.data);
    return promptEdit.trim() !== base.trim() || (result.media === "image" && negEdit.trim() !== String(md.negative_prompt ?? "").trim());
  }, [result, promptEdit, negEdit]);

  async function saveEdit() {
    if (!result) return;
    const next = withEditedPrompt(result.media, result.data, { prompt: promptEdit, negative: negEdit }, result.target);
    if (!next) { setError("프롬프트를 비워 둘 수 없습니다."); return; }
    setError("");
    const r = await api<{ ok: true }>(`/api/history/${result.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ result: next }) });
    if (!r.ok) { setError(r.error); return; }
    showResult({ ...result, data: next });
    setNotice("수정한 프롬프트를 저장했습니다.");
  }

  const busy = phase !== "";
  const Icon = media ? MEDIA_ICON[media] : UploadCloud;
  const cards = result ? cardsOf(result.data) : [];
  const main = result ? mainPrompt(result.media, result.data) : "";
  const base = result ? fileBase(result.fileName || result.title) : "analysis";
  const isMj = !result || !result.target || result.target === "midjourney";

  return (
    <div className="rp">
      {/* 크리에이티브 아틀리에 웰컴 히어로 배너 */}
      <div className="studio-hero">
        <div className="studio-hero-title">
          <Sparkles size={24} style={{ color: "#f59e0b" }} />
          <span>Creative Reverse Prompt Atelier</span>
        </div>
        <p className="studio-hero-desc">
          이미지·동영상·오디오 미디어를 멀티모달 AI로 정밀 역분석하여 Midjourney, Flux, Sora, Suno 등 10대 주요 생성 AI에 최적화된 프롬프트와 파라미터를 도출합니다.
        </p>
        <div className="studio-hero-badges">
          <span className="badge-tag amber"><Sparkles size={12} /> v1.10 ARCHITECT</span>
          <span className="badge-tag violet"><Layers size={12} /> 10대 AI 도구 맞춤 최적화</span>
          <span className="badge-tag cyan"><Cpu size={12} /> 멀티모달 3종 미디어 역분석</span>
        </div>
        <div className="actions" style={{ marginTop: "16px" }}>
          <a href="/guide" className="button" style={{ background: "rgba(245, 158, 11, 0.15)", borderColor: "#f59e0b", color: "#fbbf24" }}>
            <BookOpen size={14} /> 📖 연동 & 사용 매뉴얼 보기
          </a>
          <a href="/settings" className="button">
            <KeyRound size={14} /> 🔑 API 키 설정
          </a>
        </div>
      </div>

      {/* 3대 핵심 KPI 지표 카드 */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrap amber">
            <Layers size={20} />
          </div>
          <div className="kpi-content">
            <strong>10대 타겟 AI 도구</strong>
            <small>Midjourney · Flux · Sora · Suno 완벽 호환</small>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-wrap violet">
            <Cpu size={20} />
          </div>
          <div className="kpi-content">
            <strong>멀티모달 3종 역분석</strong>
            <small>이미지 · 동영상 · 오디오 시각/음향 정밀 분해</small>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-wrap cyan">
            <SlidersHorizontal size={20} />
          </div>
          <div className="kpi-content">
            <strong>실시간 재조합 & 내보내기</strong>
            <small>프롬프트 수정 · 파라미터 재계산 · JSON 저장</small>
          </div>
        </div>
      </div>

      <section className="card rp-step" id="upload">
        <h2><span className="gd-num">1</span> 파일 올리기</h2>
        {!file ? (
          <button
            type="button" className={`rp-drop${over ? " over" : ""}`} disabled={busy}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files?.[0]); }}
          >
            <UploadCloud size={30} />
            <strong>클릭하거나 파일을 끌어다 놓으세요 (Ctrl+V 붙여넣기도 가능)</strong>
            <small>{FORMAT_HELP}</small>
            <small>이미지 {SIZE_LIMIT.image / 1048576}MB · 동영상 {SIZE_LIMIT.video / 1048576}MB · 오디오 {SIZE_LIMIT.audio / 1048576}MB 이하</small>
          </button>
        ) : (
          <div className="rp-file">
            <div className="rp-preview">
              {media === "image" && /* eslint-disable-next-line @next/next/no-img-element */ <img src={previewUrl} alt={file.name} />}
              {media === "video" && <video src={previewUrl} controls preload="metadata" />}
              {media === "audio" && <audio src={previewUrl} controls />}
            </div>
            <div className="rp-fileinfo">
              <p><Icon size={15} style={{ verticalAlign: "-3px" }} /> <b>{file.name}</b></p>
              <small>{media ? MEDIA_LABEL[media] : ""} · {(file.size / 1048576).toFixed(1)}MB</small>
              <div className="actions" style={{ marginTop: 8 }}>
                <button type="button" disabled={busy} onClick={() => inputRef.current?.click()}>다른 파일로 바꾸기</button>
                <button type="button" disabled={busy} onClick={clearFile}><X size={14} />삭제</button>
              </div>
            </div>
          </div>
        )}
        <input ref={inputRef} type="file" hidden accept={ACCEPT_ATTR} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        <p className="rp-privacy">올린 파일은 분석에만 쓰이고 1시간 안에 자동 삭제됩니다. 원본은 기록에 저장되지 않습니다.</p>
      </section>

      <section className="card rp-step" id="options">
        <h2><span className="gd-num">2</span> 분석 옵션</h2>
        <div className="rp-grid">
          <label>대상 도구
            <select value={targets.some((t) => t.id === options.target) ? options.target : targets[0].id} onChange={(e) => setOptions({ ...options, target: e.target.value })}>
              {targets.map((t) => <option key={t.id} value={t.id}>{t.label} — {t.note}</option>)}
            </select>
          </label>
          <label>설명 언어
            <select value={options.lang} onChange={(e) => setOptions({ ...options, lang: e.target.value === "en" ? "en" : "ko" })}>
              <option value="ko">한국어 (프롬프트는 영어)</option>
              <option value="en">English</option>
            </select>
          </label>
          <label>프롬프트 길이
            <select value={options.length} onChange={(e) => setOptions({ ...options, length: e.target.value as Options["length"] })}>
              <option value="short">간결</option><option value="standard">표준</option><option value="detailed">상세</option>
            </select>
          </label>
          <label>AI 모델
            <select value={options.model} onChange={(e) => setOptions({ ...options, model: e.target.value === "pro" ? "pro" : "flash" })}>
              <option value="flash">Gemini 3.5 Flash — 빠름(기본)</option>
              <option value="pro">Gemini 3.1 Pro — 정밀(느림)</option>
            </select>
          </label>
          <label className="rp-wide">추가 지시 (선택)
            <textarea rows={2} maxLength={MEMO_MAX} value={options.memo} onChange={(e) => setOptions({ ...options, memo: e.target.value })} placeholder="예: 배경 위주로 분석해 주세요 / 인물의 의상에 집중해 주세요" />
          </label>
        </div>
        <div className="actions" style={{ marginTop: 14 }}>
          <button type="button" className="primary" disabled={busy || !file} onClick={() => void run()}>
            {busy ? <Loader2 size={15} className="ls-spin" /> : result && path ? <RefreshCw size={15} /> : null}
            {busy ? (phase === "uploading" ? "업로드 중…" : "분석 중…") : result && path ? "옵션 바꿔 다시 분석" : "분석 시작"}
          </button>
          {busy && <button type="button" onClick={() => abort.current?.abort()}>취소</button>}
        </div>
        {phase === "analyzing" && <p className="rp-wait">{media === "video" || media === "audio" ? "동영상·오디오는 처리에 1~3분 걸릴 수 있습니다. 창을 닫지 말고 기다려 주세요." : "이미지를 분석하는 중입니다. 보통 10~30초 걸립니다."}</p>}
      </section>

      {error && (
        <div className="lp-alert" role="alert">
          <span>
            {error}
            {needKey && <> <a href="/settings" style={{ textDecoration: "underline" }}>API키등록·플랫폼연동 열기</a></>}
          </span>
          <button type="button" aria-label="닫기" onClick={() => setError("")}><X size={16} /></button>
        </div>
      )}
      {notice && <div className="notice">{notice}</div>}

      {result && (
        <section className="card rp-step" id="result">
          <div className="rp-result-head">
            <h2><span className="gd-num">3</span> 분석 결과</h2>
            <small>{MEDIA_LABEL[result.media]} · {TARGETS[result.media].find((t) => t.id === result.target)?.label ?? ""} · 모델 {result.modelUsed}</small>
          </div>

          <div className="rp-prompt">
            <div className="rp-prompt-head">
              <b>{result.media === "image" ? "추천 프롬프트 (English)" : result.media === "video" ? "영상 프롬프트 (English)" : "오디오 프롬프트 (English)"}</b>
              <button type="button" onClick={() => void copy("prompt", main)}>{copied === "prompt" ? <Check size={14} /> : <ClipboardCopy size={14} />}{copied === "prompt" ? "복사됨" : result.media === "image" && isMj ? "전체 명령어 복사" : "복사"}</button>
            </div>
            <textarea aria-label="프롬프트 편집" rows={result.media === "audio" ? 4 : 6} value={promptEdit} onChange={(e) => setPromptEdit(e.target.value)} />
            {result.media === "image" && (
              <>
                <label className="rp-neg">부정 프롬프트 (Negative)
                  <textarea aria-label="부정 프롬프트 편집" rows={2} value={negEdit} onChange={(e) => setNegEdit(e.target.value)} />
                </label>
                {isMj && <div className="rp-cmd"><small>Midjourney 전체 명령어</small><code>{main}</code></div>}
              </>
            )}
            <div className="actions">
              <button type="button" className="primary" disabled={!dirty} onClick={() => void saveEdit()}><Save size={14} />수정 저장·명령어 재조합</button>
              {result.media === "image" && <button type="button" onClick={() => void copy("neg", negEdit)}>{copied === "neg" ? <Check size={14} /> : <ClipboardCopy size={14} />}{copied === "neg" ? "복사됨" : "부정 프롬프트 복사"}</button>}
            </div>
          </div>

          <h3 className="rp-sub">분석 요소 상세</h3>
          <div className="rp-cards">
            {cards.map((c) => (
              <article key={c.title}>
                <h4>{c.title}</h4>
                <dl>{c.rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
              </article>
            ))}
          </div>

          <details className="rp-raw">
            <summary>Raw JSON 보기</summary>
            <pre>{JSON.stringify(result.data, null, 2)}</pre>
          </details>

          <div className="actions" style={{ marginTop: 14 }}>
            <button type="button" onClick={() => void copy("json", JSON.stringify(result.data, null, 2))}>{copied === "json" ? <Check size={14} /> : <ClipboardCopy size={14} />}{copied === "json" ? "복사됨" : "JSON 복사"}</button>
            <button type="button" onClick={() => saveFile(`${base}-prompt.json`, JSON.stringify(result.data, null, 2), "application/json")}><Download size={14} />JSON 파일 저장</button>
            <button type="button" onClick={() => void copy("md", toMarkdown(result.title, result.media, result.data))}>{copied === "md" ? <Check size={14} /> : <ClipboardCopy size={14} />}{copied === "md" ? "복사됨" : "Markdown 요약 복사"}</button>
            <a className="button" href="/history">분석 기록 보기</a>
          </div>
        </section>
      )}
    </div>
  );
}
