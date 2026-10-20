"use client";
import { assertWebCodecs, encodeMp4, mixVoiceAndBgm, type ExportProgress, type VoiceClip } from "@/lib/render/mp4Encoder";
import type { TtsVoice } from "@/lib/render/voices";

// 「브라우저에서 만들기(무료)」 — 장면 이미지 + 본인 OpenAI 음성 + 노란 자막(JSON2Video 설정과 같은 모양)으로
// 1080×1920·30fps MP4를 이 브라우저 안에서 만든다. 인코딩은 공용 기준 코드 mp4Encoder.ts(`browser-mp4-encoder`).
const W = 1080, H = 1920, FPS = 30;
const LEAD = 0.3, TAIL = 0.5, MIN_SCENE = 3; // 장면 길이 = 앞 여백 + 음성 + 뒤 여백(최소 3초)
const FONT_CSS = "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@900&display=swap";

export interface StoryScene { narration: string; imageUrl: string }
interface Built { img: ImageBitmap; start: number; dur: number; voice: { at: number; dur: number } | null; chunks: { text: string; from: number; to: number }[] }

/** 음성 길이에 맞춰 내레이션을 2어절씩 나눠 보여 줄 시각을 정한다(글자 수에 비례). 마지막 한 어절은 앞 줄에 붙인다 */
export function subtitleChunks(text: string, at: number, dur: number): { text: string; from: number; to: number }[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length || dur <= 0) return [];
  const groups: string[] = [];
  for (let i = 0; i < words.length; i += 2) groups.push(words.slice(i, i + 2).join(" "));
  if (groups.length > 1 && !groups[groups.length - 1].includes(" ")) groups.splice(-2, 2, `${groups[groups.length - 2]} ${groups[groups.length - 1]}`);
  const total = groups.reduce((n, g) => n + g.replace(/\s/g, "").length, 0) || 1;
  let t = at;
  return groups.map((g) => { const d = (g.replace(/\s/g, "").length / total) * dur; const c = { text: g, from: t, to: t + d }; t += d; return c; });
}

async function loadFont(text: string): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  if (!document.querySelector(`link[href="${FONT_CSS}"]`)) {
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = FONT_CSS; document.head.appendChild(l);
    await new Promise((r) => { l.onload = r; l.onerror = r; setTimeout(r, 5000); });
  }
  await document.fonts.load(`900 80px "Noto Sans KR"`, text).catch(() => []);
}

async function tts(text: string, voice: TtsVoice, speed: number, signal: AbortSignal): Promise<Blob> {
  const res = await fetch("/api/render/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, voice, speed }), signal });
  if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "음성을 만들지 못했습니다.");
  return res.blob();
}

function drawCover(ctx: CanvasRenderingContext2D, img: ImageBitmap, zoom: number, alpha = 1) {
  const s = Math.max(W / img.width, H / img.height) * zoom; const w = img.width * s, h = img.height * s;
  ctx.globalAlpha = alpha; ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h); ctx.globalAlpha = 1;
}

function drawSubtitle(ctx: CanvasRenderingContext2D, text: string) {
  let px = 80; ctx.font = `900 ${px}px "Noto Sans KR", sans-serif`;
  const max = W - 140; const w = ctx.measureText(text).width; if (w > max) { px = Math.floor(px * (max / w)); ctx.font = `900 ${px}px "Noto Sans KR", sans-serif`; }
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
  ctx.lineWidth = 12; ctx.strokeStyle = "#000000"; ctx.strokeText(text, W / 2, H / 2); // 테두리 6px(안팎 합쳐 12)
  ctx.fillStyle = "#FFD200"; ctx.fillText(text, W / 2, H / 2);
}

export async function buildStoryMp4(o: {
  scenes: StoryScene[]; bgmUrl: string | null; voice: TtsVoice; speed: number;
  onProgress: (p: ExportProgress) => void; signal: AbortSignal;
}): Promise<{ blob: Blob; duration: number; warnings: string[] }> {
  assertWebCodecs();
  if (!o.scenes.length) throw new Error("장면이 없습니다.");
  const stop = () => { if (o.signal.aborted) throw new DOMException("취소", "AbortError"); };
  const warnings: string[] = []; const blobUrls: string[] = [];
  const decoder = new AudioContext();
  try {
    o.onProgress({ pct: 1, status: "글꼴 준비 중…" });
    await loadFont(o.scenes.map((s) => s.narration).join(""));
    // 장면 이미지·음성은 동시에 준비한다(차례로 받으면 장면당 약 5~10초 — 2026-10-21 실측)
    let done = 0;
    o.onProgress({ pct: 2, status: `장면 음성·이미지 준비 중… (0/${o.scenes.length})` });
    const prepared = await Promise.all(o.scenes.map(async (sc, i) => {
      const imgRes = await fetch(sc.imageUrl, { signal: o.signal }).catch(() => null);
      if (!imgRes?.ok) throw new Error(`장면 ${i + 1} 이미지를 불러오지 못했습니다. 이미지를 다시 만들어 주세요.`);
      const img = await createImageBitmap(await imgRes.blob());
      let audio: { src: string; dur: number } | null = null;
      if (sc.narration.trim()) {
        const blob = await tts(sc.narration, o.voice, o.speed, o.signal);
        const dur = (await decoder.decodeAudioData(await blob.arrayBuffer())).duration;
        const src = URL.createObjectURL(blob); blobUrls.push(src); audio = { src, dur };
      }
      done += 1; o.onProgress({ pct: 2 + Math.round((done / o.scenes.length) * 14), status: `장면 음성·이미지 준비 중… (${done}/${o.scenes.length})` });
      return { img, audio };
    }));
    stop();
    const built: Built[] = []; const voices: VoiceClip[] = []; let t = 0;
    o.scenes.forEach((sc, i) => {
      const { img, audio } = prepared[i];
      const voice = audio ? { at: t + LEAD, dur: audio.dur } : null;
      if (audio && voice) voices.push({ src: audio.src, at: voice.at, dur: voice.dur });
      const dur = Math.max(MIN_SCENE, voice ? LEAD + voice.dur + TAIL : MIN_SCENE);
      built.push({ img, start: t, dur, voice, chunks: voice ? subtitleChunks(sc.narration, voice.at, voice.dur) : [] });
      t += dur;
    });
    const total = t;

    let bgm: { src: string; volume: number } | null = null;
    if (o.bgmUrl) {
      const r = await fetch(o.bgmUrl, { signal: o.signal }).catch(() => null);
      if (r?.ok) { const src = URL.createObjectURL(await r.blob()); blobUrls.push(src); bgm = { src, volume: 0.5 }; }
      else warnings.push("선택한 배경음악 파일을 불러오지 못해(만료된 주소일 수 있음) 음악 없이 만들었습니다. 배경음악을 다시 만들면 함께 넣을 수 있습니다.");
    }
    stop();
    const audio = await mixVoiceAndBgm({ total, voices, bgm, onStatus: (status) => o.onProgress({ pct: 18, status }) });
    stop();

    const blob = await encodeMp4({
      // 느린 확대로 매 프레임이 바뀌어 8Mbps면 50초에 약 32MB(2026-10-21 실측) → 4Mbps로 저장 한도 50MB 여유
      width: W, height: H, fps: FPS, total, audio, pctFrom: 20, videoBitrate: 4_000_000, onProgress: o.onProgress, signal: o.signal,
      drawFrame: (ctx, time) => {
        const found = built.findIndex((x) => time < x.start + x.dur); const i = found === -1 ? built.length - 1 : found; const b = built[i];
        const local = time - b.start;
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
        drawCover(ctx, b.img, 1 + 0.08 * (local / b.dur)); // 느린 확대
        const prev = built[i - 1]; if (prev && local < 0.3) drawCover(ctx, prev.img, 1.08, 1 - local / 0.3); // 0.3초 겹쳐 바뀜
        const c = b.chunks.find((x) => time >= x.from && time < x.to); if (c) drawSubtitle(ctx, c.text);
      },
    });
    return { blob, duration: total, warnings };
  } finally {
    blobUrls.forEach((u) => URL.revokeObjectURL(u)); void decoder.close().catch(() => undefined);
  }
}
