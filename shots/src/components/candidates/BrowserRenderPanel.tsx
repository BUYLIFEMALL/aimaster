"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createBrowserRenderUploadAction, saveBrowserRenderAction } from "@/lib/actions/browserRender";
import { buildStoryMp4, type StoryScene } from "@/lib/render/story";
import { TTS_VOICES, type TtsVoice } from "@/lib/render/voices";
import type { ExportProgress } from "@/lib/render/mp4Encoder";
import { Play, Sparkles } from "lucide-react";

// 「브라우저에서 만들기(무료)」 — 본인 OpenAI 음성 + 장면 이미지 + 자막을 이 브라우저에서 MP4로 만들고 저장소에 올린다.
export function BrowserRenderPanel({ videoId, scenes, bgmUrl, hasOpenAiKey }: { videoId: string; scenes: StoryScene[]; bgmUrl: string | null; hasOpenAiKey: boolean }) {
  const router = useRouter();
  const [voice, setVoice] = useState<TtsVoice>("coral");
  const [speed, setSpeed] = useState(1.05);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const abort = useRef<AbortController | null>(null);
  const missing = scenes.filter((s) => !s.imageUrl).length;
  const busy = progress !== null;

  async function run() {
    setError(null); setWarnings([]);
    const ac = new AbortController(); abort.current = ac;
    try {
      const { blob, warnings: w } = await buildStoryMp4({ videoId, scenes, bgmUrl, voice, speed, onProgress: setProgress, signal: ac.signal });
      setWarnings(w);
      if (blob.size > 50 * 1048576) throw new Error(`영상이 ${(blob.size / 1048576).toFixed(1)}MB라 저장 한도(50MB)를 넘었습니다. 장면 대사를 줄여 다시 만들어 주세요.`);
      setProgress({ pct: 99, status: `저장소에 올리는 중… (${(blob.size / 1048576).toFixed(1)}MB)` });
      const up = await createBrowserRenderUploadAction(videoId);
      if (!up.path || !up.token) throw new Error(up.error ?? "업로드 주소를 만들지 못했습니다.");
      const { error: upErr } = await createClient().storage.from("shots-videos").uploadToSignedUrl(up.path, up.token, blob, { contentType: "video/mp4" });
      if (upErr) throw new Error("영상을 저장소에 올리지 못했습니다. 잠시 후 다시 시도해 주세요.");
      const saved = await saveBrowserRenderAction(videoId, up.path);
      if (saved.error) throw new Error(saved.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof DOMException && e.name === "AbortError" ? "만들기를 멈췄습니다." : e instanceof Error ? e.message : "영상을 만들지 못했습니다.");
    } finally {
      setProgress(null); abort.current = null;
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[#202945] bg-[#13182c] p-5 shadow-xl">
      <div className="flex items-center gap-2 border-b border-[#202945] pb-3">
        <span className="h-2 w-2 rounded-full bg-rose-500 animate-rec-pulse" />
        <h3 className="text-sm font-black text-white">🎬 WebCodecs 하드웨어 가속 브라우저 렌더러</h3>
      </div>
      <p className="text-xs text-slate-300 leading-relaxed">
        본인 OpenAI 키로 장면마다 내레이션 음성을 만들고(영상 1편 약 10원, 대사·목소리가 같은 장면은 다시 만들 때 보관한 음성을 그대로 써서 무료), 장면 이미지·자막·배경음악과 함께 이 브라우저 안에서
        1080×1920 MP4로 만듭니다. 영상 합성 요금은 없고, 만드는 동안 이 탭을 열어 두세요(1~3분).
      </p>
      {!hasOpenAiKey && <p className="text-xs text-rose-400 font-bold">⚠️ OpenAI API 키가 없습니다. 설정 페이지에서 본인 키를 등록해 주세요.</p>}
      {missing > 0 && <p className="text-xs text-rose-400 font-bold">⚠️ 이미지가 없는 장면이 {missing}개 있습니다. 먼저 이미지를 만들어 주세요.</p>}
      <div className="flex flex-wrap items-end gap-3.5 pt-1">
        <label className="text-xs font-bold text-slate-400">
          목소리 선택
          <select value={voice} onChange={(e) => setVoice(e.target.value as TtsVoice)} disabled={busy} className="mt-1 block rounded-xl border border-[#202945] bg-[#0f1325] px-3 py-2 text-xs font-bold text-white focus:border-rose-500 focus:outline-none">
            {TTS_VOICES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-400">
          말 빠르기 ({speed.toFixed(2)}배)
          <input type="range" min={0.8} max={1.4} step={0.05} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} disabled={busy} className="mt-2 block w-40 accent-rose-500" />
        </label>
        {busy ? (
          <button type="button" onClick={() => abort.current?.abort()} className="btn-3d-dark px-4 py-2 text-xs font-bold text-rose-400">
            만들기 멈추기
          </button>
        ) : (
          <button type="button" onClick={run} disabled={!hasOpenAiKey || missing > 0 || scenes.length === 0} className="btn-3d-rec px-5 py-2.5 text-xs font-black">
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>1080p 브라우저에서 만들기</span>
          </button>
        )}
      </div>
      {progress && (
        <div className="rounded-xl border border-[#202945] bg-[#0b0d1b] p-3 space-y-1.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#181f38]">
            <div className="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-300" style={{ width: `${progress.pct}%` }} />
          </div>
          <p className="text-xs text-rose-300 font-mono font-bold flex justify-between">
            <span>{progress.status}</span>
            <span>{progress.pct}%</span>
          </p>
        </div>
      )}
      {warnings.map((w) => <p key={w} className="text-xs text-amber-400">{w}</p>)}
      {error && <p className="text-xs text-rose-400 font-bold">{error}</p>}
    </div>
  );
}
