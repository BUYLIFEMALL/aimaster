"use client";

import type { MediaAttachment, ProcessedImageItem } from "@/types/planner";

/**
 * 단일 이미지 파일을 최적화(최대 1280px 리사이즈 및 JPEG 82% 압축)하여 ProcessedImageItem으로 추출
 */
export async function processSingleImage(file: File): Promise<ProcessedImageItem> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("이미지 파일을 읽는데 실패했습니다."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("이미지를 불러올 수 없습니다."));
      img.onload = () => {
        const maxDim = 1280;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("캔버스 컨텍스트를 생성할 수 없습니다."));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        const base64 = dataUrl.split(",")[1];

        resolve({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          fileName: file.name,
          mimeType: "image/jpeg",
          previewUrl: dataUrl,
          base64,
          fileSize: file.size,
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * 여러 이미지 파일을 병렬 최적화하여 배열로 반환
 */
export async function processMultipleImages(files: File[]): Promise<ProcessedImageItem[]> {
  const promises = files.map((f) => processSingleImage(f));
  return Promise.all(promises);
}

/**
 * ProcessedImageItem 배열로부터 MediaAttachment 객체 생성
 */
export function buildMediaAttachmentFromImages(items: ProcessedImageItem[]): MediaAttachment {
  if (items.length === 0) {
    throw new Error("첨부된 이미지가 없습니다.");
  }
  const first = items[0];
  const count = items.length;
  const fileNameLabel = count === 1 ? first.fileName : `사진 ${count}장 (${first.fileName} 외 ${count - 1}개)`;
  const totalSize = items.reduce((sum, item) => sum + (item.fileSize || 0), 0);

  return {
    type: "image",
    fileName: fileNameLabel,
    mimeType: "image/jpeg",
    previewUrl: first.previewUrl,
    base64List: items.map((it) => it.base64),
    fileSize: totalSize,
    imageCount: count,
    imageItems: items,
  };
}

/**
 * 단일 이미지 파일 처리 (하위 호환 래퍼)
 */
export async function processImageFile(file: File): Promise<MediaAttachment> {
  const item = await processSingleImage(file);
  return buildMediaAttachmentFromImages([item]);
}

/**
 * 비디오 파일에서 핵심 3장면(25%, 50%, 75% 시점)을 브라우저 캔버스로 초고속 추출
 */
export async function processVideoFile(file: File): Promise<MediaAttachment> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    const timeout = setTimeout(() => {
      URL.revokeObjectURL(videoUrl);
      reject(new Error("동영상 처리 시간이 초과되었습니다."));
    }, 20000);

    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(videoUrl);
      reject(new Error("동영상 파일을 재생/분석할 수 없는 형식입니다."));
    };

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration || 1;
        // 3개 시점 (20%, 50%, 80%)
        const timestamps = [
          Math.max(0.1, duration * 0.2),
          Math.max(0.2, duration * 0.5),
          Math.max(0.3, duration * 0.8),
        ];

        const base64List: string[] = [];
        let previewDataUrl = "";

        const maxDim = 854; // 480p 해상도로 가볍게 압축
        let width = video.videoWidth || 640;
        let height = video.videoHeight || 360;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          throw new Error("비디오 캔버스 컨텍스트 생성 실패");
        }

        for (let i = 0; i < timestamps.length; i++) {
          const t = timestamps[i];
          await new Promise<void>((seekResolve) => {
            const onSeeked = () => {
              video.removeEventListener("seeked", onSeeked);
              ctx.drawImage(video, 0, 0, width, height);
              const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
              if (i === 0) previewDataUrl = dataUrl;
              base64List.push(dataUrl.split(",")[1]);
              seekResolve();
            };
            video.addEventListener("seeked", onSeeked);
            video.currentTime = t;
          });
        }

        clearTimeout(timeout);
        URL.revokeObjectURL(videoUrl);

        resolve({
          type: "video",
          fileName: file.name,
          mimeType: "image/jpeg",
          previewUrl: previewDataUrl,
          base64List,
          videoDuration: duration,
        });
      } catch (err) {
        clearTimeout(timeout);
        URL.revokeObjectURL(videoUrl);
        reject(err);
      }
    };
  });
}
