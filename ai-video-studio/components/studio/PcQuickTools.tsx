"use client";

// v1.18 작업 결과 갤러리 카드 「⚡ 내 PC로」 — 완성 영상을 회원 PC ffmpeg(「AIMaster 내 PC 고속 변환」)로 GIF·작은 MP4로 바꿔 바로 내려받는다.
// 렌더러가 없으면 아무것도 그리지 않는다(설치 안내는 영상 합치기 화면에 있음). 명령: lib/edit/pcVideo.ts
import { useEffect, useRef, useState } from "react";
import { Download, Loader2, Zap } from "lucide-react";
import { galleryFileName, galleryGifCommand, gallerySmallCommand, toMb } from "@/lib/edit/pcVideo";
import { detectPcRenderer, runPcJob, type PcRendererStatus } from "@/lib/pcRenderer";

type Kind = "gif" | "small";
type Made = { kind: Kind; url: string; name: string; mb: number };

// 카드가 여러 장이어도 렌더러 확인은 한 번만
let statusOnce: Promise<PcRendererStatus> | null = null;
function pcStatus(): Promise<PcRendererStatus> {
  statusOnce ??= detectPcRenderer("gif").catch((): PcRendererStatus => ({ kind: "none" }));
  return statusOnce;
}

export function PcQuickTools({ id, url, seconds }: { id: string; url: string; seconds: number }) {
  const [pc, setPc] = useState<PcRendererStatus | null>(null);
  const [busy, setBusy] = useState<{ kind: Kind; msg: string } | null>(null);
  const [made, setMade] = useState<Made[]>([]);
  const [error, setError] = useState("");

  const urls = useRef<string[]>([]);

  useEffect(() => { void pcStatus().then(setPc); }, []);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  if (pc?.kind !== "ready") return null;
  const canSmall = pc.capabilities.includes("compress");

  async function run(kind: Kind) {
    setError("");
    setBusy({ kind, msg: "영상 받는 중" });
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("영상을 받지 못했습니다. 화면을 새로고침해 주세요.");
      const blob = await res.blob();
      const label = kind === "gif" ? "GIF 만드는 중" : "작게 줄이는 중";
      const r = await runPcJob(blob, kind === "gif" ? galleryGifCommand(seconds) : gallerySmallCommand(seconds), {
        onUploaded: (ra) => setBusy({ kind, msg: `내 PC로 넘기는 중 ${Math.round(ra * 100)}%` }),
        onProgress: (ra) => setBusy({ kind, msg: `${label} ${Math.round(ra * 100)}%` }),
      });
      const out = new Blob([r.bytes as BlobPart], { type: kind === "gif" ? "image/gif" : "video/mp4" });
      const objectUrl = URL.createObjectURL(out);
      urls.current.push(objectUrl);
      setMade((cur) => [...cur.filter((m) => m.kind !== kind), { kind, url: objectUrl, name: galleryFileName(id, kind), mb: toMb(out.size) }]);
    } catch (e) {
      setError(`내 PC로 만들지 못했습니다(${e instanceof Error ? e.message : "알 수 없는 오류"}).`);
    } finally {
      setBusy(null);
    }
  }

  const btn = "inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-lg border border-amber-400/30 px-2 py-1 text-xs font-medium text-amber-100 hover:bg-amber-400/10 disabled:opacity-40";
  return (
    <div className="space-y-1.5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-200"><Zap className="h-3.5 w-3.5" aria-hidden="true" /> 내 PC로</span>
        <button type="button" disabled={!!busy} onClick={() => void run("gif")} className={btn}>GIF 만들기(앞 6초)</button>
        {canSmall && <button type="button" disabled={!!busy} onClick={() => void run("small")} className={btn}>작게 줄이기(720)</button>}
        {busy && <span className="inline-flex items-center gap-1 text-[11px] text-amber-100"><Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> {busy.msg}</span>}
      </div>
      {made.map((m) => (
        <a key={m.kind} href={m.url} download={m.name} className="inline-flex w-fit items-center gap-1 whitespace-nowrap text-xs font-medium text-emerald-300 hover:underline">
          <Download className="h-3.5 w-3.5" aria-hidden="true" /> {m.kind === "gif" ? "GIF" : "작은 MP4"} 내려받기 ({m.mb}MB)
        </a>
      ))}
      {!canSmall && <p className="text-[11px] text-zinc-400">작게 줄이기는 실행기를 새 판(1.30 이상)으로 업데이트하면 쓸 수 있습니다.</p>}
      {error && <p role="alert" className="text-[11px] text-red-300">{error}</p>}
    </div>
  );
}
