"use client";

// 앨범 그림 만들기(2026-11-05 주인님 「앨범 그림 만들기 기능도 넣어줘」) — 회원 본인 Gemini 키로 정사각형 1장,
// 그림은 서버에 남기지 않고 내 PC 노래 저장 폴더(엔진 0.6.7+)에 「곡 제목.png」로 넣거나 바로 받는다.
import { useEffect, useState } from "react";
import { ART_PROVIDERS, DEFAULT_ART_PROVIDER, type ArtProvider } from "@/lib/albumArtModels";
import Link from "next/link";
import { ImageIcon, Loader2, FolderDown, Download } from "lucide-react";
import { useEngine } from "@/components/engine/useEngine";
import { EngineError, hasArt, saveArtToLibrary } from "@/lib/engine";
import { ART_PROMPT_LIMIT } from "@/lib/albumArt";

const field =
  "w-full rounded-xl border border-slate-700/60 bg-slate-950/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-400";

export function AlbumArtPanel({ title, style, art, onArtChange }: { title: string; style: string; art: string; onArtChange: (v: string) => void }) {
  const { paired, status } = useEngine(10000);
  const [busy, setBusy] = useState<"" | "make" | "save">("");
  const [image, setImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; needKey?: boolean } | null>(null);
  const canSave = paired && hasArt(status);
  // 플랫폼·모델 선택(회원 본인 키가 있는 곳 표시) — Gemini 나노바나나 / GPT Image / Replicate FLUX 2
  const [provider, setProvider] = useState<ArtProvider>(DEFAULT_ART_PROVIDER);
  const [model, setModel] = useState<string>(ART_PROVIDERS.find((p) => p.id === DEFAULT_ART_PROVIDER)!.defaultModel);
  const [keys, setKeys] = useState<Record<string, { registered: boolean }> | null>(null);
  useEffect(() => {
    fetch("/api/settings/api-keys")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.keys && setKeys(d.keys))
      .catch(() => {});
  }, []);
  const info = ART_PROVIDERS.find((p) => p.id === provider)!;

  const make = async () => {
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

  return (
    <section className="space-y-3 rounded-2xl border border-fuchsia-500/20 bg-gradient-to-b from-[#0a0f1d] to-[#070b14] p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
        <ImageIcon className="h-4 w-4 text-fuchsia-300" /> 앨범 그림 만들기{" "}
        <span className="text-[11px] font-normal text-slate-400">(내 Gemini·OpenAI·Replicate 키 중 골라 사용 · 정사각형 1장 · 선택)</span>
      </h2>
      <textarea
        className={`${field} min-h-[60px] text-xs`}
        value={art}
        onChange={(e) => onArtChange(e.target.value)}
        maxLength={ART_PROMPT_LIMIT}
        placeholder="그림 설명(영어 권장, 선택) — 비워 두면 곡 제목·스타일로 만듭니다. AI 작곡 기획으로 만든 곡은 자동으로 채워집니다."
      />
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-slate-700/60 bg-slate-950/80 p-1" role="tablist" aria-label="그림 플랫폼">
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
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${provider === p.id ? "bg-fuchsia-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}
              >
                {p.label}
                {noKey && <span className="ml-1 text-[10px] font-normal text-slate-400">키 없음</span>}
              </button>
            );
          })}
        </div>
        <select className={`${field} w-auto min-w-[15rem] flex-1`} value={model} onChange={(e) => setModel(e.target.value)} aria-label="그림 모델">
          {info.models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={make}
          disabled={!!busy || !(title.trim() || art.trim())}
          className="inline-flex items-center gap-1.5 rounded-xl border border-fuchsia-400/40 bg-fuchsia-950/40 px-4 py-2 text-xs font-bold text-fuchsia-200 hover:bg-fuchsia-900/50 disabled:opacity-40"
        >
          {busy === "make" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />} {busy === "make" ? "그리는 중…(최대 2분)" : image ? "다시 그리기" : "🖼 앨범 그림 만들기"}
        </button>
        <span className="text-[11px] text-slate-500">글자·로고 없이, 사람이 나오면 한국인으로 그립니다 · AI 호출 1번(재시도 없음)</span>
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
