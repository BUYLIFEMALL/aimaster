import type { MediaType } from "./types";

/** 브라우저에서 작은 JPEG 미리보기(data URL)를 만든다. 만들 수 없으면(오디오·HEIC 등) undefined */
export async function makeThumb(file: File, media: MediaType, previewUrl: string): Promise<string | undefined> {
  if (media === "audio") return undefined;
  try {
    const source: HTMLImageElement | HTMLVideoElement = media === "image" ? await loadImage(previewUrl) : await loadVideoFrame(previewUrl);
    const w = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
    const h = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
    if (!w || !h) return undefined;
    const scale = Math.min(1, 120 / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    for (const q of [0.6, 0.45, 0.3]) {
      const url = canvas.toDataURL("image/jpeg", q);
      if (url.length <= 19_000) return url;
    }
  } catch { /* 미리보기는 선택 사항 */ }
  void file;
  return undefined;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image"));
    img.src = url;
  });
}

function loadVideoFrame(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.muted = true; v.preload = "auto"; v.playsInline = true;
    const timer = setTimeout(() => reject(new Error("timeout")), 8000);
    v.onloadeddata = () => { v.currentTime = Math.min(0.5, (v.duration || 1) / 2); };
    v.onseeked = () => { clearTimeout(timer); resolve(v); };
    v.onerror = () => { clearTimeout(timer); reject(new Error("video")); };
    v.src = url;
  });
}
