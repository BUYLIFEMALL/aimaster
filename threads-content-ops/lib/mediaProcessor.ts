"use client";

// 2026-10-23 v2.15 병합 A: `threads-easy-planner`의 사진·영상 분석 첨부(src/lib/mediaProcessor.ts)를 옮겼다.
// 브라우저에서만 처리한다 — 사진은 최대 1280px·JPEG 82%로 줄이고, 영상은 5개 시점(10·30·50·70·90%)을 캡처한다.
// 결과(base64)는 글 생성 요청에만 쓰고 저장하지 않는다(게시용 이미지 첨부와는 별개).

export const MAX_ANALYSIS_IMAGES = 5;

export type AnalysisMedia = {
  type: "image" | "video";
  label: string;
  previews: string[];
  base64List: string[];
};

function resize(width: number, height: number, maxDim: number) {
  if (width <= maxDim && height <= maxDim) return { width, height };
  return width > height
    ? { width: maxDim, height: Math.round((height * maxDim) / width) }
    : { width: Math.round((width * maxDim) / height), height: maxDim };
}

function processImage(file: File): Promise<{ preview: string; base64: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("이미지 파일을 읽지 못했습니다."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("이미지를 불러오지 못했습니다. JPEG·PNG·WEBP 사진을 골라 주세요."));
      img.onload = () => {
        const size = resize(img.width, img.height, 1280);
        const canvas = document.createElement("canvas");
        canvas.width = size.width;
        canvas.height = size.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("이미지를 처리하지 못했습니다.")); return; }
        ctx.drawImage(img, 0, 0, size.width, size.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        resolve({ preview: dataUrl, base64: dataUrl.split(",")[1] });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function processAnalysisImages(files: File[]): Promise<AnalysisMedia> {
  const picked = files.slice(0, MAX_ANALYSIS_IMAGES);
  if (!picked.length) throw new Error("첨부된 사진이 없습니다.");
  const items = await Promise.all(picked.map(processImage));
  return {
    type: "image",
    label: picked.length === 1 ? picked[0].name : `사진 ${picked.length}장`,
    previews: items.map((item) => item.preview),
    base64List: items.map((item) => item.base64),
  };
}

export function processAnalysisVideo(file: File): Promise<AnalysisMedia> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    const done = () => URL.revokeObjectURL(url);
    const timeout = setTimeout(() => { done(); reject(new Error("영상 처리 시간이 초과되었습니다. 더 짧은 영상을 골라 주세요.")); }, 20_000);
    video.onerror = () => { clearTimeout(timeout); done(); reject(new Error("이 영상 형식은 브라우저에서 열 수 없습니다. MP4 영상을 골라 주세요.")); };
    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration || 1;
        const size = resize(video.videoWidth || 640, video.videoHeight || 360, 960);
        const canvas = document.createElement("canvas");
        canvas.width = size.width;
        canvas.height = size.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("영상을 처리하지 못했습니다.");
        const previews: string[] = [];
        for (const ratio of [0.1, 0.3, 0.5, 0.7, 0.9]) {
          const t = Math.min(Math.max(0.05, duration * ratio), Math.max(0.05, duration - 0.05));
          await new Promise<void>((seeked) => {
            const onSeeked = () => { video.removeEventListener("seeked", onSeeked); ctx.drawImage(video, 0, 0, size.width, size.height); previews.push(canvas.toDataURL("image/jpeg", 0.8)); seeked(); };
            video.addEventListener("seeked", onSeeked);
            video.currentTime = t;
          });
        }
        clearTimeout(timeout);
        done();
        resolve({ type: "video", label: file.name, previews, base64List: previews.map((dataUrl) => dataUrl.split(",")[1]) });
      } catch (error) {
        clearTimeout(timeout);
        done();
        reject(error);
      }
    };
  });
}
