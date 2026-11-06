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
import { ART_PROMPT_LIMIT } from "@/lib/albumArt";
import type { LyricProvider } from "@/lib/lyricModels";

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
}: {
  title: string;
  style: string;
  lyrics?: string;
  songId?: string | null;
  art: string;
  onArtChange: (v: string) => void;
  /** 영어 설명문 자동 작성에 쓸 회원 AI(곡 만들기 화면의 AI 작사 선택과 같음) */
  ai?: { provider: LyricProvider; model: string };
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
  useEffect(() => {
    fetch("/api/settings/api-keys")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.keys && setKeys(d.keys))
      .catch(() => {});
  }, []);
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

  // 곡 제목·스타일·가사로 영어 설명문(회원 AI 키 1회, 재시도 없음)
  const writePrompt = async () => {
    setBusy("prompt");
    setMsg(null);
    try {
      const res = await fetch("/api/album-art/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, style, lyrics, provider: ai?.provider, model: ai?.model }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setMsg({ ok: false, text: data.error || "그림 설명을 만들지 못했습니다.", needKey: !!data.needApiKey });
      onArtChange(data.prompt);
      setMsg({ ok: true, text: `영어 그림 설명을 만들어 칸에 넣었습니다(AI 호출 ${data.calls}번). 고친 뒤 [앨범 그림 만들기]를 눌러 주세요.` });
    } catch {
      setMsg({ ok: false, text: "그림 설명을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
    } finally {
      setBusy("");
    }
  };

  // 내 PC 그림 — 대기열에 넣고 끝날 때까지 지켜본다(처음이면 엔진·모델 받기까지)
  const makeLocal = async () => {
    if (!art.trim()) return setMsg({ ok: false, text: "내 PC 그림 모델은 영어 설명만 읽습니다. [AI로 영어 설명 만들기]를 누르거나 영어로 적어 주세요." });
    setBusy("make");
    setMsg(null);
    setStage("대기열에 넣는 중");
    try {
      const job = await enqueueLocalArt({ title, songId, style, lyrics }, art, localId || undefined);
      await new Promise<void>((resolve, reject) => {
        polling.current = window.setInterval(async () => {
          try {
            const j = (await listQueue()).find((x) => x.id === job.id);
            if (!j) return reject(new Error("작업이 사라졌습니다."));
            setStage(j.stage || "");
            if (j.status === "done") resolve();
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
      setMsg({ ok: true, text: canSave ? "내 PC에서 그림을 만들었습니다(무료). 마음에 들면 [내 PC 노래 폴더에 저장]을 눌러 주세요." : "그림을 만들었습니다. [그림 받기]로 내려받을 수 있습니다." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "앨범 그림을 만들지 못했습니다." });
    } finally {
      setBusy("");
      setStage("");
    }
  };

  const make = async () => {
    if (provider === "local") return makeLocal();
    setBusy("make");
    setMsg(null);
    try {
      const res = await fetch("/api/album-art", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, style, art, provider, model }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: data.error || "앨범 그림을 만들지 못했습니다.", needKey: !!data.needApiKey });
        return;
      }
      setImage({ base64: data.base64, mimeType: data.mimeType || "image/png" });
      setMsg({ ok: true, text: canSave ? "그림을 만들었습니다. 마음에 들면 [내 PC 노래 폴더에 저장]을 눌러 주세요." : "그림을 만들었습니다. [그림 받기]로 내려받을 수 있습니다." });
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
      const where = await saveArtToLibrary(title, image.base64, image.mimeType);
      setMsg({ ok: true, text: `내 PC에 저장했습니다${where ? `: ${where}` : ""} — 같은 제목의 곡 표지가 되고, 「모든 음악」에서 MP3로 받으면 표지가 들어갑니다(엔진 0.6.8+).` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof EngineError ? e.message : "내 PC에 저장하지 못했습니다." });
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
        <ImageIcon className="h-4 w-4 text-fuchsia-300" /> 앨범 그림 만들기{" "}
        <span className="text-[11px] font-normal text-slate-400">(내 Gemini·OpenAI·Replicate 키 또는 내 PC 그래픽카드(무료) · 정사각형 1장 · 선택)</span>
      </h2>
      <textarea
        className={`${field} min-h-[60px] text-xs`}
        value={art}
        onChange={(e) => onArtChange(e.target.value)}
        maxLength={ART_PROMPT_LIMIT}
        placeholder={provider === "local" ? "그림 설명(영어만 — 내 PC 모델은 영어만 읽습니다). [AI로 영어 설명 만들기]로 곡 제목·가사에서 자동으로 만들 수 있습니다." : "그림 설명(영어 권장, 선택) — 비워 두면 곡 제목·스타일로 만듭니다. AI 작곡 기획으로 만든 곡은 자동으로 채워집니다."}
      />
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
        {provider === "local" && (
          <button type="button" onClick={writePrompt} disabled={!!busy || !(title.trim() || style.trim() || lyrics.trim())} className="inline-flex items-center gap-1.5 rounded-xl border border-sky-400/40 bg-sky-950/40 px-4 py-2 text-xs font-bold text-sky-200 hover:bg-sky-900/50 disabled:opacity-40">
            {busy === "prompt" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} AI로 영어 설명 만들기
          </button>
        )}
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
            {canSave ? (
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
