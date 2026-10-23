"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Film, ImageIcon, Loader2, Package } from "lucide-react";
import JSZip from "jszip";
import { ASPECT_RATIOS, VEO_MODELS, VIDEO_LENGTHS, type AspectRatioId, type VeoModelId, type VideoLength } from "@/lib/music/presets";
import { effectiveLength, estimateCost } from "@/lib/music/veo";
import type { Scene } from "@/lib/music/types";
import { useStudio } from "@/components/studio/ProjectProvider";
import { BTN_GHOST, BTN_PRIMARY, Card, ErrorNote, Field, NeedStep, SELECT, StepHeader } from "@/components/studio/ui";

const POLL_MS = 8000;
const MAX_POLLS = 90; // 약 12분

async function runPool<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(size, queue.length) }, async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift()) await fn(item);
    })
  );
}

function saveUrl(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
}

export default function ScenesPage() {
  const { project, update, media, setMedia, references } = useStudio();
  const { scenes, video, artStyle } = project;
  const [confirm, setConfirm] = useState<string | null>(null); // 장면 id 또는 "all"
  const [error, setError] = useState<{ message: string; needKey?: boolean } | null>(null);
  const [zipping, setZipping] = useState(false);
  const mounted = useRef(true);
  const mediaRef = useRef(media);
  mediaRef.current = media;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  if (scenes.length === 0) {
    return (
      <NeedStep href="/storyboard" label="2단계로 이동">
        먼저 2단계에서 스토리보드를 만들어주세요.
      </NeedStep>
    );
  }

  const patchVideo = (patch: Partial<typeof video>) => update((p) => ({ ...p, video: { ...p.video, ...patch } }));
  const perSceneCost = (hasImage: boolean) => estimateCost(video.model, effectiveLength(video.length, video.loop, hasImage));
  const modelInfo = VEO_MODELS.find((m) => m.value === video.model)!;

  const generateImage = async (scene: Scene) => {
    setMedia(scene.id, { imageBusy: true, error: undefined });
    try {
      const res = await fetch("/api/music/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: scene.prompt,
          artStyle,
          ratio: video.ratio,
          references: references.map((r) => ({ mimeType: "image/jpeg", data: r.dataUrl.split(",")[1] })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.needApiKey) setError({ message: data.error, needKey: true });
        setMedia(scene.id, { imageBusy: false, error: data.error || "이미지를 만들지 못했습니다." });
        return;
      }
      setMedia(scene.id, { imageBusy: false, imageUrl: data.image });
    } catch {
      setMedia(scene.id, { imageBusy: false, error: "네트워크 오류로 이미지를 만들지 못했습니다." });
    }
  };

  const generateVideo = async (scene: Scene) => {
    const image = mediaRef.current[scene.id]?.imageUrl;
    setMedia(scene.id, { videoBusy: true, videoNote: "영상 생성을 시작하는 중…", error: undefined });
    try {
      const start = await fetch("/api/music/video/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: scene.prompt, model: video.model, length: video.length, loop: video.loop, ratio: video.ratio, artStyle, image }),
      });
      // 영상(MP4)이 응답되면 완성 — 시작 때 바로 올 수도, 상태 확인 중에 올 수도 있다
      const showVideo = async (res: Response) => {
        const blob = await res.blob();
        const old = mediaRef.current[scene.id]?.videoUrl;
        if (old) URL.revokeObjectURL(old);
        setMedia(scene.id, { videoBusy: false, videoNote: undefined, videoUrl: URL.createObjectURL(blob) });
      };
      const isVideo = (res: Response) => (res.headers.get("content-type") ?? "").startsWith("video/");
      if (start.ok && isVideo(start)) return showVideo(start);
      const started = await start.json();
      if (!start.ok) {
        if (started.needApiKey) setError({ message: started.error, needKey: true });
        setMedia(scene.id, { videoBusy: false, videoNote: undefined, error: started.error || "영상 생성을 시작하지 못했습니다." });
        return;
      }
      const job = started.job;
      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        if (!mounted.current) return;
        setMedia(scene.id, { videoNote: `영상 생성 중… (${Math.round(((i + 1) * POLL_MS) / 1000)}초 경과, 보통 1~3분)` });
        const st = await fetch("/api/music/video/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job }) });
        if (st.ok && isVideo(st)) return showVideo(st);
        const status = await st.json().catch(() => ({}));
        if (status.state === "failed" || !st.ok) {
          setMedia(scene.id, { videoBusy: false, videoNote: undefined, error: status.message || status.error || "영상 생성에 실패했습니다." });
          return;
        }
      }
      setMedia(scene.id, { videoBusy: false, videoNote: undefined, error: "영상이 너무 오래 걸려 확인을 멈췄습니다. 잠시 뒤 다시 시도해주세요." });
    } catch {
      setMedia(scene.id, { videoBusy: false, videoNote: undefined, error: "네트워크 오류로 영상 생성을 마치지 못했습니다." });
    }
  };

  const generateAllImages = async () => {
    setError(null);
    await runPool(scenes.filter((s) => !mediaRef.current[s.id]?.imageUrl), 2, generateImage);
  };

  const generateAllVideos = async () => {
    setConfirm(null);
    setError(null);
    await runPool(scenes.filter((s) => !mediaRef.current[s.id]?.videoBusy), 2, generateVideo);
  };

  const downloadZip = async () => {
    setZipping(true);
    try {
      const zip = new JSZip();
      const base = (project.title || "music-video").replace(/[\\/:*?"<>|]/g, "_");
      if (project.lyrics) zip.file("lyrics.txt", project.lyrics);
      if (project.sunoStyle) zip.file("suno-style.txt", project.sunoStyle);
      zip.file("storyboard.txt", scenes.map((s, i) => `SCENE ${i + 1}\n${s.lyric}\n${s.prompt}\n`).join("\n"));
      for (const [i, s] of scenes.entries()) {
        const n = String(i + 1).padStart(2, "0");
        const m = media[s.id];
        if (m?.imageUrl) zip.file(`scene-${n}.jpg`, m.imageUrl.split(",")[1], { base64: true });
        if (m?.videoUrl) zip.file(`scene-${n}.mp4`, await (await fetch(m.videoUrl)).blob());
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      saveUrl(url, `${base}.zip`);
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } finally {
      setZipping(false);
    }
  };

  const imageCount = scenes.filter((s) => media[s.id]?.imageUrl).length;
  const videoCount = scenes.filter((s) => media[s.id]?.videoUrl).length;
  const anyBusy = scenes.some((s) => media[s.id]?.imageBusy || media[s.id]?.videoBusy);
  const totalCost = estimateCost(video.model, effectiveLength(video.length, video.loop, true), scenes.length);

  return (
    <div className="space-y-6">
      <StepHeader
        step={3}
        title="장면 제작 (Scene Rendering Console)"
        desc="장면마다 시네마틱 이미지를 생성하고, Gemini Omni Flash 영상 모델로 비디오 클립으로 렌더링합니다. (회원님 본인 Gemini API 키로 직접 실행)"
      />

      <Card className="space-y-5 border-cyan-500/30 bg-gradient-to-br from-[#0c1322] via-[#0a0f1d] to-[#070b14]">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
            <h2 className="text-sm font-bold tracking-wide text-cyan-300">씬 전용 엔진 설정 (Engine Rack)</h2>
          </div>
          <span className="font-mono text-xs text-slate-400">
            총 {scenes.length}개 장면 · {imageCount}개 이미지 · {videoCount}개 영상 완료
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="영상 생성 모델 (Gemini Omni Flash)" hint={`${modelInfo.note} · 초당 약 $${modelInfo.usdPerSecond} (720p, 시네마틱 모션)`}>
            <select className={SELECT} value={video.model} onChange={(e) => patchVideo({ model: e.target.value as VeoModelId })}>
              {VEO_MODELS.map((m) => (
                <option key={m.value} value={m.value} className="bg-[#0b101e] text-slate-100">
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="영상 클립 길이" hint={video.loop ? "심리스 루프: 끝 화면을 시작 이미지와 같게 맞춥니다. 실제 길이는 AI가 정해 조금 다를 수 있습니다." : "단일 클립 길이 선택(대략값 — 실제 길이는 AI가 정해 조금 다를 수 있습니다)"}>
            <select className={SELECT} value={video.length} onChange={(e) => patchVideo({ length: Number(e.target.value) as VideoLength })}>
              {VIDEO_LENGTHS.map((n) => (
                <option key={n} value={n} className="bg-[#0b101e] text-slate-100">
                  {n}초
                </option>
              ))}
            </select>
          </Field>
          <Field label="화면 비율 (Aspect Ratio)" hint="이미지와 비디오 클립 모두에 일괄 적용됩니다.">
            <select className={SELECT} value={video.ratio} onChange={(e) => patchVideo({ ratio: e.target.value as AspectRatioId })}>
              {ASPECT_RATIOS.map((r) => (
                <option key={r.value} value={r.value} className="bg-[#0b101e] text-slate-100">
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-slate-300">심리스 무한 루프 (Seamless Loop)</span>
            <div className="inline-flex overflow-hidden rounded-xl border border-cyan-500/30 bg-slate-900/80 p-0.5 text-xs font-semibold" role="group">
              {[true, false].map((on) => (
                <button
                  key={String(on)}
                  type="button"
                  aria-pressed={video.loop === on}
                  onClick={() => patchVideo({ loop: on })}
                  className={`rounded-lg px-4 py-2 transition-all ${
                    video.loop === on
                      ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.4)]"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {on ? "On" : "Off"}
                </button>
              ))}
            </div>
            <span className="mt-1.5 block text-[11px] text-slate-500">
              첫 프레임과 마지막 프레임이 매끄럽게 연결되는 루핑 영상 (쇼츠/릴스 배경에 이상적)
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 text-xs text-amber-200">
          <div className="flex items-center gap-2 font-semibold text-amber-300">
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span>예상 API 비용 안내 (Google Cloud 직접 청구)</span>
          </div>
          <p className="mt-1 leading-relaxed text-amber-200/90">
            영상 1개당 약 ${perSceneCost(true).usd} (약 {perSceneCost(true).krw.toLocaleString()}원), 전체 {scenes.length}개 장면 일괄 렌더링 시 약 ${totalCost.usd} (약 {totalCost.krw.toLocaleString()}원).
            회원님 본인 Gemini API 계정으로만 청구되며, 이미지만 생성할 경우 무료/저비용으로 기획안을 확인할 수 있습니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            className={BTN_GHOST}
            disabled={anyBusy || imageCount === scenes.length}
            onClick={() => void generateAllImages()}
          >
            <ImageIcon className="h-4 w-4 text-cyan-400" />
            <span>이미지 일괄 생성 ({scenes.length - imageCount}개 대기)</span>
          </button>
          <button
            type="button"
            className={BTN_PRIMARY}
            disabled={anyBusy}
            onClick={() => setConfirm("all")}
          >
            <Film className="h-4 w-4" />
            <span>영상 일괄 렌더링</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-2.5 text-xs font-semibold text-slate-200 transition-all hover:border-slate-600 hover:bg-slate-800 disabled:opacity-40"
            disabled={zipping || (imageCount === 0 && videoCount === 0)}
            onClick={() => void downloadZip()}
          >
            {zipping ? <Loader2 className="h-4 w-4 animate-spin text-pink-400" /> : <Package className="h-4 w-4 text-pink-400" />}
            <span>전체 프로젝트 ZIP 패키지 다운로드</span>
          </button>
        </div>

        {confirm === "all" && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 text-xs text-rose-200">
            <p className="font-semibold text-rose-300">
              전체 {scenes.length}개 장면의 비디오 생성을 시작합니다.
            </p>
            <p className="mt-1 leading-relaxed text-rose-200/90">
              약 ${totalCost.usd} (약 {totalCost.krw.toLocaleString()}원)의 API 비용이 등록하신 회원님 Gemini 계정에 직접 청구됩니다. 계속 진행하시겠습니까?
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => void generateAllVideos()} className={BTN_PRIMARY}>
                네, 일괄 렌더링 시작
              </button>
              <button type="button" onClick={() => setConfirm(null)} className={BTN_GHOST}>
                취소
              </button>
            </div>
          </div>
        )}

        {error && <ErrorNote message={error.message} needKey={error.needKey} />}
      </Card>

      {/* 장면 그리드 */}
      <div className="grid gap-5 lg:grid-cols-2">
        {scenes.map((s, i) => {
          const m = media[s.id] ?? {};
          const hasImage = !!m.imageUrl;
          const cost = perSceneCost(hasImage);
          const aspect = video.ratio === "16:9" ? "aspect-video" : "aspect-[9/16] max-h-[460px] mx-auto";
          return (
            <Card
              key={s.id}
              className="flex flex-col justify-between space-y-3.5 border-slate-800/80 bg-gradient-to-b from-[#0a0f1d] to-[#070b14] hover:border-cyan-500/30"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg border border-pink-500/30 bg-pink-500/10 px-2.5 py-0.5 font-mono text-xs font-bold text-pink-400">
                      SCENE {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      {m.videoUrl ? "🎬 영상 준비 완료" : m.imageUrl ? "🖼 이미지 준비 완료" : "대기 중"}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">
                    약 ${cost.usd} ({effectiveLength(video.length, video.loop, hasImage)}s)
                  </span>
                </div>

                <div className={`relative w-full overflow-hidden rounded-xl border border-slate-800/90 bg-[#05070f] ${aspect}`}>
                  {m.videoUrl ? (
                    <video src={m.videoUrl} controls loop playsInline className="h-full w-full object-cover" />
                  ) : m.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.imageUrl} alt={`장면 ${i + 1}`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 text-slate-500">
                      <ImageIcon className="h-8 w-8 text-slate-700" />
                      <span className="text-xs">이미지를 먼저 생성해주세요</span>
                    </div>
                  )}

                  {(m.imageBusy || m.videoBusy) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-black/80 backdrop-blur-xs text-cyan-300">
                      <Loader2 className="h-7 w-7 animate-spin text-pink-500" />
                      <span className="px-3 text-center font-mono text-xs tracking-wide">
                        {m.videoBusy ? m.videoNote : "이미지 비주얼 렌더링 중…"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 rounded-xl border border-slate-800/50 bg-slate-900/40 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Lyric Cue</div>
                  <p className="whitespace-pre-line text-xs font-semibold leading-relaxed text-slate-200">
                    {s.lyric}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Visual Prompt</div>
                  <p className="line-clamp-2 font-mono text-[11px] leading-relaxed text-slate-400 hover:line-clamp-none transition-all cursor-pointer" title={s.prompt}>
                    {s.prompt}
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800/60">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    className={BTN_GHOST}
                    disabled={m.imageBusy || m.videoBusy}
                    onClick={() => void generateImage(s)}
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-cyan-400" />
                    <span>{hasImage ? "이미지 재생성" : "이미지 생성"}</span>
                  </button>
                  <button
                    type="button"
                    className={BTN_PRIMARY}
                    disabled={m.imageBusy || m.videoBusy}
                    onClick={() => setConfirm(s.id)}
                  >
                    <Film className="h-3.5 w-3.5" />
                    <span>{m.videoUrl ? "비디오 재생성" : "비디오 생성"}</span>
                  </button>
                  {m.imageUrl && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                      onClick={() => saveUrl(m.imageUrl!, `scene-${String(i + 1).padStart(2, "0")}.jpg`)}
                    >
                      <Download className="h-3.5 w-3.5 text-slate-400" />
                      <span>JPG</span>
                    </button>
                  )}
                  {m.videoUrl && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                      onClick={() => saveUrl(m.videoUrl!, `scene-${String(i + 1).padStart(2, "0")}.mp4`)}
                    >
                      <Download className="h-3.5 w-3.5 text-pink-400" />
                      <span>MP4</span>
                    </button>
                  )}
                </div>

                {confirm === s.id && (
                  <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-200">
                    <p>
                      장면 {i + 1} 비디오 클립({effectiveLength(video.length, video.loop, hasImage)}초
                      {hasImage ? ", 생성된 이미지 기반 모션 적용" : ", 텍스트 프롬프트 기반"})을 생성합니다.
                      약 ${cost.usd} (약 {cost.krw.toLocaleString()}원)이 청구됩니다. 진행하시겠습니까?
                    </p>
                    <div className="mt-2.5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirm(null);
                          setError(null);
                          void generateVideo(s);
                        }}
                        className={BTN_PRIMARY}
                      >
                        렌더링 시작
                      </button>
                      <button type="button" onClick={() => setConfirm(null)} className={BTN_GHOST}>
                        취소
                      </button>
                    </div>
                  </div>
                )}

                {m.error && <ErrorNote message={m.error} />}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
