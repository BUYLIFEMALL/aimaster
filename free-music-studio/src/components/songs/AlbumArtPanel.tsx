"use client";

// 앨범 그림 만들기(2026-11-05 주인님 「앨범 그림 만들기 기능도 넣어줘」) — 회원 본인 Gemini·OpenAI·Replicate 키로 정사각형 1장,
// 또는 「내 PC(무료)」(엔진 0.7.0+, 원본 boks-music image-engine — 키 없이 회원 PC 그래픽카드로, 2026-11-06 주인님 결정).
// 그림은 서버에 남기지 않고 내 PC 노래 저장 폴더(엔진 0.6.7+)에 「곡 제목.png」로 넣거나 바로 받는다.
import { useEffect, useRef, useState } from "react";
import { ART_PROVIDERS, DEFAULT_ART_PROVIDER, type ArtProvider } from "@/lib/albumArtModels";
import Link from "next/link";
import { ImageIcon, Loader2, FolderDown, Download, Sparkles } from "lucide-react";
import { useEngine } from "@/components/engine/useEngine";
import { EngineError, enqueueLocalArt, fetchLocalArt, getImageModels, hasArt, hasLocalArt, listQueue, saveArtToLibrary, type ImageModelState } from "@/lib/engine";
import { ART_PROMPT_LIMIT, ART_STYLES, DEFAULT_ART_STYLE, withArtStyle, type ArtStyleId } from "@/lib/albumArt";
import { LYRIC_PROVIDERS, type LyricProvider } from "@/lib/lyricModels";
import { loadAiPrefs, modelLabel, saveAiPrefs, usableProvider, type AiPrefs } from "@/lib/aiModelChoice";

const field =
  "w-full rounded-xl border border-slate-700/60 bg-slate-950/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-400";

type Choice = ArtProvider | "local";
const gbText = (b: number) => `${(b / 1024 ** 3).toFixed(1)}GB`;

export function AlbumArtPanel({
  title,
  style,
  lyrics = "",
  songId = null,
  art,
  onArtChange,
  ai,
  saveAction,
  heading = "앨범 그림 만들기",
}: {
  title: string;
  style: string;
  lyrics?: string;
  songId?: string | null;
  art: string;
  onArtChange: (v: string) => void;
  /** 영어 설명문 자동 작성에 쓸 회원 AI(곡 만들기 화면의 AI 작사 선택과 같음) */
  ai?: { provider: LyricProvider; model: string };
  /** 저장 버튼을 바꿔 쓴다(앨범 화면: 앨범 보관함에 저장). run은 결과 안내 문구를 돌려준다 */
  saveAction?: { label: string; ready: boolean; notReady: string; run: (img: { base64: string; mimeType: string }) => Promise<string> };
  heading?: string;
}) {
  const { paired, status } = useEngine(10000);
  const [busy, setBusy] = useState<"" | "make" | "save" | "prompt">("");
  const [image, setImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; needKey?: boolean } | null>(null);
  const canSave = paired && hasArt(status);
  const localOk = paired && hasLocalArt(status);
  // 플랫폼·모델 선택(회원 본인 키가 있는 곳 표시) — Gemini 나노바나나 / GPT Image / Replicate FLUX 2 / 내 PC(무료)
  const [provider, setProvider] = useState<Choice>(DEFAULT_ART_PROVIDER);
  const [model, setModel] = useState<string>(ART_PROVIDERS.find((p) => p.id === DEFAULT_ART_PROVIDER)!.defaultModel);
  const [keys, setKeys] = useState<Record<string, { registered: boolean }> | null>(null);
  const [local, setLocal] = useState<ImageModelState | null>(null);
  const [localId, setLocalId] = useState("");
  const [stage, setStage] = useState("");
  const polling = useRef<number | null>(null);
  // 화풍(기본 실사 사진) — 이 브라우저에 기억
  const [artStyle, setArtStyleState] = useState<ArtStyleId>(DEFAULT_ART_STYLE);
  useEffect(() => {
    try {
      const v = localStorage.getItem("fms:art-style");
      if (v && ART_STYLES.some((s) => s.id === v)) setArtStyleState(v as ArtStyleId);
    } catch {}
  }, []);
  const pickStyle = (v: ArtStyleId) => {
    setArtStyleState(v);
    try {
      localStorage.setItem("fms:art-style", v);
    } catch {}
  };
  // 영어 설명 AI — 곡 만들기에서 넘겨받지 않으면(앨범 화면) 여기서 플랫폼 버튼만 고르고, 모델은 설정 화면에서 저장한 것(2026-11-08 주인님)
  const [prefs, setPrefs] = useState<AiPrefs | null>(null);
  const [textProvider, setTextProvider] = useState<LyricProvider | null>(null);
  useEffect(() => {
    fetch("/api/settings/api-keys")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.keys && setKeys(d.keys))
      .catch(() => {});
    void loadAiPrefs().then(setPrefs);
  }, []);
  useEffect(() => {
    if (prefs && !textProvider) setTextProvider(usableProvider(prefs.textProvider, keys));
  }, [prefs, keys, textProvider]);
  const textAi = ai ?? (textProvider && prefs ? { provider: textProvider, model: prefs.models[textProvider] } : null);
  const pickText = (p: LyricProvider) => {
    setTextProvider(p);
    if (prefs) void saveAiPrefs(prefs, { textProvider: p }).then(setPrefs).catch(() => {});
  };
  useEffect(() => {
    if (!localOk) return setLocal(null);
    getImageModels()
      .then((s) => {
        setLocal(s);
        setLocalId((v) => v || s.defaultId || s.installed[0] || s.recommendedId || "");
      })
      .catch(() => setLocal(null));
  }, [localOk, provider]);
  useEffect(() => () => void (polling.current && window.clearInterval(polling.current)), []);
  const info = provider === "local" ? null : ART_PROVIDERS.find((p) => p.id === provider)!;
  const localRow = local?.families.flatMap((f) => f.variants).find((v) => v.id === localId);
  const hasHangul = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(art);
  const savedHint = saveAction ? `마음에 들면 [${saveAction.label}]을 눌러 주세요.` : canSave ? "마음에 들면 [내 PC 노래 폴더에 저장]을 눌러 주세요." : "[그림 받기]로 내려받을 수 있습니다.";

  // 곡 제목·스타일·가사로 영어 설명문(회원 AI 키 1회, 재시도 없음).
  // 칸에 한글로 장면을 적었으면 그 장면을 영어로 바꾼다(v1.35, 주인님 「한글로 상황을 묘사하면 영어로 변환」). 만든 영어 설명을 돌려준다.
  const writePrompt = async (): Promise<string | null> => {
    setBusy("prompt");
    setMsg(null);
    const idea = hasHangul ? art.trim() : "";
    try {
      const res = await fetch("/api/album-art/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, style, lyrics, idea, artStyle, provider: textAi?.provider, model: textAi?.model }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: data.error || "그림 설명을 만들지 못했습니다.", needKey: !!data.needApiKey });
        return null;
      }
      onArtChange(data.prompt);
      setMsg({ ok: true, text: `${idea ? "한글 설명을 영어로 바꿔" : "영어 그림 설명을 만들어"} 칸에 넣었습니다(AI 호출 ${data.calls}번). 고친 뒤 [앨범 그림 만들기]를 눌러 주세요.` });
      return data.prompt as string;
    } catch {
      setMsg({ ok: false, text: "그림 설명을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
      return null;
    } finally {
      setBusy("");
    }
  };

  // 내 PC 그림 — 대기열에 넣고 끝날 때까지 지켜본다(처음이면 엔진·모델 받기까지)
  const makeLocal = async () => {
    if (!art.trim()) return setMsg({ ok: false, text: "그림 설명을 적어 주세요(한글도 됩니다). 비워 두려면 [AI로 영어 설명 만들기]를 눌러 주세요." });
    // 한글로 적었으면 먼저 영어로 바꾼 뒤 그린다(내 PC 모델은 영어만 읽음)
    const prompt = hasHangul ? await writePrompt() : art;
    if (!prompt) return;
    setBusy("make");
    setMsg(null);
    setStage("대기열에 넣는 중");
    try {
      const job = await enqueueLocalArt({ title, songId, style, lyrics }, withArtStyle(prompt, artStyle), localId || undefined);
      // 끝난 작업의 결과(모델·걸린 시간·그래픽 메모리 최대 사용량 — B-3, 메모리는 엔진 0.7.5+)
      let done: { model?: string; seconds?: number; vramPeakGb?: number } | null = null;
      await new Promise<void>((resolve, reject) => {
        polling.current = window.setInterval(async () => {
          try {
            const j = (await listQueue()).find((x) => x.id === job.id);
            if (!j) return reject(new Error("작업이 사라졌습니다."));
            setStage(j.stage || "");
            if (j.status === "done") {
              done = (j as { result?: typeof done }).result ?? null;
              resolve();
            }
            else if (j.status !== "queued" && j.status !== "running") reject(new Error(j.error || `그림을 그리지 못했습니다(${j.stage}).`));
          } catch (e) {
            if (e instanceof EngineError) reject(e);
          }
        }, 2500);
      }).finally(() => {
        if (polling.current) window.clearInterval(polling.current);
        polling.current = null;
      });
      setImage(await fetchLocalArt(job.id));
      const r = done as { model?: string; seconds?: number; vramPeakGb?: number } | null;
      const info = [r?.model, typeof r?.seconds === "number" ? `${r.seconds}초` : "", typeof r?.vramPeakGb === "number" ? `그래픽 메모리 최대 ${r.vramPeakGb}GB` : ""].filter(Boolean).join(" · ");
      setMsg({ ok: true, text: `내 PC에서 그림을 만들었습니다(무료${info ? ` · ${info}` : ""}). ${savedHint}` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "앨범 그림을 만들지 못했습니다." });
    } finally {
      setBusy("");
      setStage("");
    }
  };

  const make = async () => {
    if (provider === "local") return makeLocal();
    // 한글로 적었으면 먼저 영어로 바꿔 그린다(그림 모델은 영어 설명을 가장 잘 따른다)
    const prompt = hasHangul ? await writePrompt() : art;
    if (hasHangul && !prompt) return;
    setBusy("make");
    setMsg(null);
    try {
      const res = await fetch("/api/album-art", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, style, art: prompt, artStyle, provider, model }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: data.error || "앨범 그림을 만들지 못했습니다.", needKey: !!data.needApiKey });
        return;
      }
      setImage({ base64: data.base64, mimeType: data.mimeType || "image/png" });
      setMsg({ ok: true, text: `그림을 만들었습니다. ${savedHint}` });
    } catch {
      setMsg({ ok: false, text: "앨범 그림을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
    } finally {
      setBusy("");
    }
  };

  const save = async () => {
    if (!image) return;
    setBusy("save");
    setMsg(null);
    try {
      // 앨범 화면(v1.35)은 노래 폴더 대신 앨범 보관함에 저장한다
      if (saveAction) {
        setMsg({ ok: true, text: await saveAction.run(image) });
        return;
      }
      const where = await saveArtToLibrary(title, image.base64, image.mimeType);
      setMsg({ ok: true, text: `내 PC에 저장했습니다${where ? `: ${where}` : ""} — 같은 제목의 곡 표지가 되고, 「모든 음악」에서 MP3로 받으면 표지가 들어갑니다(엔진 0.6.8+).` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error && e.message ? e.message : "내 PC에 저장하지 못했습니다." });
    } finally {
      setBusy("");
    }
  };

  const src = image ? `data:${image.mimeType};base64,${image.base64}` : "";
  const ext = image?.mimeType === "image/jpeg" ? "jpg" : "png";
  const tab = (active: boolean) => `rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${active ? "bg-fuchsia-600 text-white" : "text-slate-300 hover:bg-slate-800"}`;

  return (
    <section className="space-y-3 rounded-2xl border border-fuchsia-500/20 bg-gradient-to-b from-[#0a0f1d] to-[#070b14] p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
        <ImageIcon className="h-4 w-4 text-fuchsia-300" /> {heading}{" "}
        <span className="text-[11px] font-normal text-slate-400">(내 Gemini·OpenAI·Replicate 키 또는 내 PC 그래픽카드(무료) · 정사각형 1장 · 선택)</span>
      </h2>
      <div>
        <p className="mb-1.5 text-[11px] font-bold text-slate-400">
          화풍 <span className="font-normal text-slate-500">· 기본은 실사 사진 · AI 영어 설명과 그림 모두 이 화풍으로 만듭니다</span>
        </p>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="앨범 화풍">
          {ART_STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={artStyle === s.id}
              onClick={() => pickStyle(s.id)}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors ${artStyle === s.id ? "border-fuchsia-400 bg-fuchsia-600 text-white" : "border-slate-700 text-slate-300 hover:border-fuchsia-400/60"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <textarea
        className={`${field} min-h-[60px] text-xs`}
        value={art}
        onChange={(e) => onArtChange(e.target.value)}
        maxLength={ART_PROMPT_LIMIT}
        placeholder="그림 장면을 한글로 적어도 됩니다(예: 노을 진 시골 기차역 — 화풍은 위 버튼으로). [한글 설명을 영어로 바꾸기]를 누르거나 그대로 그리면 AI가 영어로 바꿔 그립니다. 비워 두고 [AI로 영어 설명 만들기]를 누르면 곡 제목·가사로 만듭니다."
      />
      {!ai && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="font-semibold text-slate-400">영어 설명 AI</span>
          {LYRIC_PROVIDERS.map((p) => {
            const noKey = keys !== null && !keys[p.id]?.registered;
            const on = textProvider === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => pickText(p.id)}
                title={noKey ? `${p.label} API 키가 등록되지 않았습니다. 설정 화면에서 등록해 주세요.` : `설정에 저장한 모델: ${prefs ? modelLabel(p.id, prefs.models[p.id]) : ""}`}
                className={`rounded-lg px-2.5 py-1 font-bold transition-colors ${on ? "bg-sky-600 text-white" : noKey ? "border border-slate-800 text-slate-500 hover:bg-slate-900" : "border border-slate-700 text-slate-300 hover:bg-slate-800"}`}
              >
                {p.label}
                {noKey && <span className={`ml-1 font-normal ${on ? "text-rose-100" : "text-rose-300"}`}>· API 미등록</span>}
              </button>
            );
          })}
          {textProvider && prefs && (
            <span className="text-slate-500">
              {modelLabel(textProvider, prefs.models[textProvider])} ·{" "}
              <Link href="/settings#ai-models" className="underline underline-offset-2 hover:text-slate-300">
                모델은 설정에서
              </Link>
            </span>
          )}
        </div>
      )}
      {/* 2026-11-08 주인님 그림 표시 「순서만 바꾸기」·「좌측에 생성 프롬프트」 — 설명 → 영어 설명 AI → 그림 플랫폼·모델 → 그리기·결과 */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void writePrompt()} disabled={!!busy || !(hasHangul || title.trim() || style.trim() || lyrics.trim())} className="inline-flex items-center gap-1.5 rounded-xl border border-sky-400/40 bg-sky-950/40 px-4 py-2 text-xs font-bold text-sky-200 hover:bg-sky-900/50 disabled:opacity-40">
            {busy === "prompt" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} {hasHangul ? "한글 설명을 영어로 바꾸기" : "AI로 영어 설명 만들기"}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap rounded-xl border border-slate-700/60 bg-slate-950/80 p-1" role="tablist" aria-label="그림 플랫폼">
          {ART_PROVIDERS.map((p) => {
            const noKey = keys !== null && !keys[p.id]?.registered;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setProvider(p.id);
                  setModel(p.defaultModel);
                }}
                className={tab(provider === p.id)}
              >
                {p.label}
                {noKey && <span className="ml-1 text-[10px] font-normal text-slate-400">키 없음</span>}
              </button>
            );
          })}
          <button type="button" onClick={() => setProvider("local")} className={tab(provider === "local")} title={localOk ? "API 키 없이 내 PC 그래픽카드로 그립니다(처음에 모델을 받습니다)" : "엔진 0.7.0 이상이 연결돼야 합니다"}>
            내 PC (무료)
            {!localOk && <span className="ml-1 text-[10px] font-normal text-slate-400">엔진 0.7.0+</span>}
          </button>
        </div>
        {info && (
          <select className={`${field} w-auto min-w-[15rem] flex-1`} value={model} onChange={(e) => setModel(e.target.value)} aria-label="그림 모델">
            {info.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        )}
        {provider === "local" && local && (
          <select className={`${field} w-auto min-w-[15rem] flex-1`} value={localId} onChange={(e) => setLocalId(e.target.value)} aria-label="내 PC 그림 모델">
            {local.families.map((f) => (
              <optgroup key={f.id} label={`${f.name} (${f.vendor}, ${f.license})`}>
                {f.variants.map((v) => (
                  <option key={v.id} value={v.id} disabled={v.status === "unavailable"}>
                    {v.quant}
                    {v.recommended ? " · 추천" : v.familyRecommended ? " · 이 모델 추천" : ""}
                    {v.installed ? " · 받아 둠" : ` · 받기 ${gbText(v.downloadBytes)}`}
                    {v.status === "slow" ? " · 느림" : v.status === "unavailable" ? " · 못 씀" : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        )}
      </div>
      {provider === "local" && (
        <p className="text-[11px] leading-relaxed text-slate-400">
          {!localOk
            ? "내 PC 엔진 0.7.0 이상이 연결돼 있어야 합니다(내 PC 엔진 화면에서 설치 파일 받기)."
            : !local
              ? "내 PC 그림 모델 목록을 읽는 중…"
              : local.reason
                ? local.reason
                : localRow
                  ? `${localRow.familyName} ${localRow.quant} — ${localRow.note}. ${localRow.installed ? "받아 두어 바로 그립니다." : `처음 한 번 ${gbText(localRow.downloadBytes)}를 받습니다(저장 공간 ${local.hardware.diskGB}GB 남음).`}${localRow.reason ? ` ${localRow.reason}` : ""} 그래픽카드 ${local.build?.label}${local.hardware.gpuGB ? ` ${local.hardware.gpuGB}GB` : ""}.`
                  : "그림 모델을 골라 주세요."}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={make}
          disabled={!!busy || (provider === "local" ? !localOk || !localId || !art.trim() : !(title.trim() || art.trim()))}
          className="inline-flex items-center gap-1.5 rounded-xl border border-fuchsia-400/40 bg-fuchsia-950/40 px-4 py-2 text-xs font-bold text-fuchsia-200 hover:bg-fuchsia-900/50 disabled:opacity-40"
        >
          {busy === "make" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />} {busy === "make" ? (provider === "local" ? stage || "그리는 중…" : "그리는 중…(최대 2분)") : image ? "다시 그리기" : "🖼 앨범 그림 만들기"}
        </button>
        <span className="text-[11px] text-slate-500">{provider === "local" ? "내 PC에서 그립니다 · 비용 없음 · 다른 음악 작업과 차례로(작업 대기열)" : "글자·로고 없이, 사람이 나오면 한국인으로 그립니다 · AI 호출 1번(재시도 없음)"}</span>
      </div>
      {msg && (
        <p className={`text-[11px] ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>
          {msg.text}
          {msg.needKey && (
            <>
              {" "}
              <Link href="/settings" className="font-semibold underline underline-offset-2">
                키 등록하러 가기
              </Link>
            </>
          )}
        </p>
      )}
      {image && (
        <div className="flex flex-wrap items-end gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={`${title} 앨범 그림`} className="h-48 w-48 rounded-xl border border-slate-700 object-cover" />
          <div className="flex flex-col gap-2">
            {saveAction ? (
              saveAction.ready ? (
                <button
                  type="button"
                  onClick={save}
                  disabled={!!busy}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:brightness-110 disabled:opacity-40"
                >
                  <FolderDown className="h-3.5 w-3.5" /> {busy === "save" ? "저장 중…" : saveAction.label}
                </button>
              ) : (
                <p className="max-w-xs text-[11px] leading-relaxed text-amber-200/90">{saveAction.notReady}</p>
              )
            ) : canSave ? (
              <button
                type="button"
                onClick={save}
                disabled={!!busy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:brightness-110 disabled:opacity-40"
              >
                <FolderDown className="h-3.5 w-3.5" /> {busy === "save" ? "저장 중…" : "내 PC 노래 폴더에 저장"}
              </button>
            ) : (
              <p className="max-w-xs text-[11px] leading-relaxed text-slate-400">
                내 PC 노래 폴더에 바로 넣으려면 엔진 0.6.7 이상이 연결돼 있어야 합니다(
                <Link href="/engine" className="underline underline-offset-2">
                  내 PC 엔진
                </Link>
                ).
              </p>
            )}
            <a href={src} download={`${(title || "앨범 그림").replace(/[\\/:*?"<>|]/g, "_")}.${ext}`} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900">
              <Download className="h-3.5 w-3.5" /> 그림 받기
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
