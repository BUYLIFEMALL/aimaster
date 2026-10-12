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
      const started = await start.json();
      if (!start.ok) {
        if (started.needApiKey) setError({ message: started.error, needKey: true });
        setMedia(scene.id, { videoBusy: false, videoNote: undefined, error: started.error || "영상 생성을 시작하지 못했습니다." });
        return;
      }
      const name = started.operation as string;
      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        if (!mounted.current) return;
        setMedia(scene.id, { videoNote: `영상 생성 중… (${Math.round(((i + 1) * POLL_MS) / 1000)}초 경과, 보통 1~3분)` });
        const st = await fetch(`/api/music/video/status?name=${encodeURIComponent(name)}`);
        const status = await st.json();
        if (!st.ok) {
          setMedia(scene.id, { videoBusy: false, videoNote: undefined, error: status.error || "영상 상태를 확인하지 못했습니다." });
          return;
        }
        if (status.state === "failed") {
          setMedia(scene.id, { videoBusy: false, videoNote: undefined, error: status.message || "영상 생성에 실패했습니다." });
          return;
        }
        if (status.state === "done") {
          setMedia(scene.id, { videoNote: "영상을 내려받는 중…" });
          const file = await fetch(`/api/music/video/download?name=${encodeURIComponent(name)}`);
          if (!file.ok) {
            const data = await file.json().catch(() => ({}));
            setMedia(scene.id, { videoBusy: false, videoNote: undefined, error: data.error || "영상을 내려받지 못했습니다." });
            return;
          }
          const blob = await file.blob();
          const old = mediaRef.current[scene.id]?.videoUrl;
          if (old) URL.revokeObjectURL(old);
          setMedia(scene.id, { videoBusy: false, videoNote: undefined, videoUrl: URL.createObjectURL(blob) });
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
      <StepHeader step={3} title="장면 제작" desc="장면마다 이미지를 만들고, 그 이미지로 Veo 영상 클립을 만듭니다. 영상은 길이만큼 본인 계정에 요금이 청구됩니다." />

      <Card className="space-y-4">
        <h2 className="text-sm font-bold text-gray-900">씬 전용 설정</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="영상 생성 모델" hint={`${modelInfo.note} · 초당 약 $${modelInfo.usdPerSecond} (720p, 오디오 포함)`}>
            <select className={SELECT} value={video.model} onChange={(e) => patchVideo({ model: e.target.value as VeoModelId })}>
              {VEO_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="영상 길이" hint={video.loop ? "루프(첫·마지막 프레임 지정)를 쓰면 8초로 고정됩니다." : undefined}>
            <select className={SELECT} value={video.length} onChange={(e) => patchVideo({ length: Number(e.target.value) as VideoLength })}>
              {VIDEO_LENGTHS.map((n) => (
                <option key={n} value={n}>
                  {n}초
                </option>
              ))}
            </select>
          </Field>
          <Field label="화면 비율" hint="이미지와 영상 모두에 적용됩니다. 이미 만든 이미지는 바뀌지 않습니다.">
            <select className={SELECT} value={video.ratio} onChange={(e) => patchVideo({ ratio: e.target.value as AspectRatioId })}>
              {ASPECT_RATIOS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
          <div>
            <span className="mb-1 block text-xs font-bold text-gray-700">심리스 루프</span>
            <div className="inline-flex overflow-hidden rounded-xl border border-gray-200 text-sm font-semibold" role="group">
              {[true, false].map((on) => (
                <button key={String(on)} type="button" aria-pressed={video.loop === on} onClick={() => patchVideo({ loop: on })} className={`px-4 py-2.5 ${video.loop === on ? "bg-rose-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}>
                  {on ? "On" : "Off"}
                </button>
              ))}
            </div>
            <span className="mt-1 block text-[11px] text-gray-500">장면 이미지가 있어야 적용됩니다(이미지 → 같은 이미지로 돌아오는 영상).</span>
          </div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          예상 비용: 영상 1개 약 ${perSceneCost(true).usd} (약 {perSceneCost(true).krw.toLocaleString()}원), 장면 {scenes.length}개 전부 만들면 약 ${totalCost.usd} (약 {totalCost.krw.toLocaleString()}원). 요금표·환율에 따라 달라질 수 있으며 회원님 Gemini 계정에 청구됩니다.
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={BTN_GHOST} disabled={anyBusy || imageCount === scenes.length} onClick={() => void generateAllImages()}>
            <ImageIcon className="h-4 w-4" /> 이미지 전체 생성 ({scenes.length - imageCount}개)
          </button>
          <button type="button" className={BTN_PRIMARY} disabled={anyBusy} onClick={() => setConfirm("all")}>
            <Film className="h-4 w-4" /> 영상 전체 생성
          </button>
          <button type="button" className={BTN_GHOST} disabled={zipping || (imageCount === 0 && videoCount === 0)} onClick={() => void downloadZip()}>
            {zipping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />} 전체 ZIP 저장
          </button>
        </div>
        {confirm === "all" && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            <p>영상 {scenes.length}개를 만듭니다. 약 ${totalCost.usd}(약 {totalCost.krw.toLocaleString()}원)이 회원님 Gemini 계정에 청구됩니다. 진행할까요?</p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => void generateAllVideos()} className={BTN_PRIMARY}>
                진행
              </button>
              <button type="button" onClick={() => setConfirm(null)} className={BTN_GHOST}>
                취소
              </button>
            </div>
          </div>
        )}
        {error && <ErrorNote message={error.message} needKey={error.needKey} />}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {scenes.map((s, i) => {
          const m = media[s.id] ?? {};
          const hasImage = !!m.imageUrl;
          const cost = perSceneCost(hasImage);
          const aspect = video.ratio === "16:9" ? "aspect-video" : "aspect-[9/16] max-h-[420px] mx-auto";
          return (
            <Card key={s.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">SCENE {i + 1}</span>
                <span className="text-[11px] text-gray-400">{imageCount > 0 || videoCount > 0 ? "" : "결과는 저장되지 않으니 내려받아 보관하세요"}</span>
              </div>
              <div className={`relative w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100 ${aspect}`}>
                {m.videoUrl ? (
                  <video src={m.videoUrl} controls loop playsInline className="h-full w-full object-cover" />
                ) : m.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.imageUrl} alt={`장면 ${i + 1}`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full min-h-40 items-center justify-center text-sm text-gray-400">이미지를 만들어주세요</div>
                )}
                {(m.imageBusy || m.videoBusy) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80 text-sm text-gray-700">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="px-3 text-center text-xs">{m.videoBusy ? m.videoNote : "이미지를 만드는 중…"}</span>
                  </div>
                )}
              </div>
              <p className="whitespace-pre-line text-sm font-semibold text-gray-800">{s.lyric}</p>
              <p className="line-clamp-2 text-xs italic text-gray-500" title={s.prompt}>
                {s.prompt}
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={BTN_GHOST} disabled={m.imageBusy || m.videoBusy} onClick={() => void generateImage(s)}>
                  <ImageIcon className="h-4 w-4" /> {hasImage ? "이미지 다시" : "Image"}
                </button>
                <button type="button" className={BTN_PRIMARY} disabled={m.imageBusy || m.videoBusy} onClick={() => setConfirm(s.id)}>
                  <Film className="h-4 w-4" /> {m.videoUrl ? "영상 다시" : "Video"}
                </button>
                {m.imageUrl && (
                  <button type="button" className={BTN_GHOST} onClick={() => saveUrl(m.imageUrl!, `scene-${String(i + 1).padStart(2, "0")}.jpg`)}>
                    <Download className="h-4 w-4" /> 이미지
                  </button>
                )}
                {m.videoUrl && (
                  <button type="button" className={BTN_GHOST} onClick={() => saveUrl(m.videoUrl!, `scene-${String(i + 1).padStart(2, "0")}.mp4`)}>
                    <Download className="h-4 w-4" /> 영상
                  </button>
                )}
              </div>
              {confirm === s.id && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                  <p>
                    영상 1개({effectiveLength(video.length, video.loop, hasImage)}초{hasImage ? ", 이 장면 이미지 기반" : ", 이미지 없이 텍스트만"})를 만듭니다. 약 ${cost.usd}(약 {cost.krw.toLocaleString()}원)이 청구됩니다. 진행할까요?
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirm(null);
                        setError(null);
                        void generateVideo(s);
                      }}
                      className={BTN_PRIMARY}
                    >
                      진행
                    </button>
                    <button type="button" onClick={() => setConfirm(null)} className={BTN_GHOST}>
                      취소
                    </button>
                  </div>
                </div>
              )}
              {m.error && <ErrorNote message={m.error} />}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
