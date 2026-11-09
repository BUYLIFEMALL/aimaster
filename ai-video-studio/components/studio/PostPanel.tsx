"use client";

// 2026-11-09 후처리(백로그 3차) — 보관함 완성 영상 카드에서 립싱크·업스케일·배경 제거(회원 본인 fal 키, 1건씩, 자동 재시도 없음).
// 실행 전에 예상 비용을 보여 주고 회원이 한 번 더 눌러야 접수한다. 결과는 새 카드로 보관함에 들어간다(원본 그대로).
import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import type { ClientGeneration } from "@/lib/generationTypes";
import { BG_COLORS, POST_KINDS, POST_SPECS, postBlocked, postCostUsd, type BgColor, type PostKind } from "@/lib/postprocess";

const MAX_AUDIO = 3 * 1024 * 1024;

function readDataUrl(f: File): Promise<string> {
  return new Promise((ok, bad) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => bad(new Error("목소리 파일을 읽지 못했습니다."));
    r.readAsDataURL(f);
  });
}

export function PostPanel({ gen, onCreated }: { gen: ClientGeneration; onCreated: (g: ClientGeneration) => void }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<PostKind | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [color, setColor] = useState<BgColor>("Green");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolution = gen.options?.resolution;

  async function run() {
    if (!kind) return;
    setBusy(true);
    setError(null);
    try {
      let audioData: string | undefined;
      if (kind === "lipsync") {
        if (!audio) throw new Error("립싱크할 목소리 파일(MP3·WAV)을 넣어 주세요.");
        if (audio.size > MAX_AUDIO) throw new Error("목소리 파일은 3MB 이하만 됩니다(60초 MP3는 약 1MB).");
        audioData = await readDataUrl(audio);
        // 브라우저마다 MP3를 audio/mp3로 읽기도 해서 서버가 받는 이름으로 맞춘다
        audioData = audioData.replace(/^data:audio\/mp3;/, "data:audio/mpeg;");
      }
      const res = await fetch("/api/generations/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: gen.id, kind, color, audio: audioData }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "후처리를 접수하지 못했습니다.");
      const created = (data.generations as ClientGeneration[] | undefined)?.[0];
      if (created) onCreated(created);
      setOpen(false);
      setKind(null);
      setAudio(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "후처리를 접수하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex w-fit items-center gap-1 whitespace-nowrap text-xs font-medium text-sky-300 hover:underline">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> 후처리(립싱크·업스케일·배경 제거)
      </button>
    );
  }

  const blocked = kind ? postBlocked(kind, gen.duration_s, resolution) : null;
  return (
    <div className="space-y-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-sky-200">✨ 후처리 — 내 fal 키로 1건, 결과는 새 영상으로 저장(원본은 그대로)</p>
        <button type="button" onClick={() => { setOpen(false); setKind(null); setError(null); }} className="text-[11px] text-zinc-400 hover:text-zinc-200">닫기</button>
      </div>
      <div className="grid gap-1.5">
        {POST_KINDS.map((k) => {
          const s = POST_SPECS[k];
          const why = postBlocked(k, gen.duration_s, resolution);
          return (
            <button key={k} type="button" disabled={!!why || busy} title={why ?? s.desc} onClick={() => setKind(k)}
              className={`rounded-lg border px-2.5 py-1.5 text-left text-xs disabled:opacity-40 ${kind === k ? "border-sky-400 bg-sky-500/15 text-white" : "border-zinc-700 text-zinc-300 hover:border-zinc-500"}`}>
              <span className="font-bold">{s.emoji} {s.name}</span>
              <span className="ml-2 text-[11px] text-zinc-400">{why ?? `약 $${postCostUsd(k, gen.duration_s).toFixed(3)}`}</span>
            </button>
          );
        })}
      </div>
      {kind && <p className="text-[11px] leading-relaxed text-zinc-400">{POST_SPECS[kind].desc}</p>}
      {kind === "lipsync" && (
        <label className="block text-[11px] text-zinc-300">목소리 파일(MP3·WAV, 2~60초, 3MB 이하)
          <input type="file" accept=".mp3,.wav,audio/mpeg,audio/wav" disabled={busy} onChange={(e) => setAudio(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-[11px] text-zinc-300" />
        </label>
      )}
      {kind === "bgremove" && (
        <div className="flex flex-wrap gap-1.5">
          {BG_COLORS.map((c) => (
            <button key={c.id} type="button" disabled={busy} onClick={() => setColor(c.id)}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] ${color === c.id ? "border-sky-400 bg-sky-500/15 text-white" : "border-zinc-700 text-zinc-300"}`}>{c.label}</button>
          ))}
        </div>
      )}
      {kind && !blocked && (
        <button type="button" disabled={busy || (kind === "lipsync" && !audio)} onClick={run}
          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-400 disabled:opacity-50">
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          {POST_SPECS[kind].name} 실행 — 예상 약 ${postCostUsd(kind, gen.duration_s).toFixed(3)}(내 fal 계정에서 결제)
        </button>
      )}
      {error && <p role="alert" className="text-[11px] text-red-300">{error}</p>}
    </div>
  );
}
