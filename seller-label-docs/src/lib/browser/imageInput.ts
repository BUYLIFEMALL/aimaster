"use client";
// 사진 파일 → PDF에 넣을 수 있는 PNG·JPG 바이트. 휴대폰 사진의 회전 정보(EXIF)를 반영하려고 PNG가 아니면 다시 그려 JPG로 만든다.
import type { ImageInput } from "@/lib/pdf/ops";

export const ACCEPT_IMAGES = "image/jpeg,image/png,image/webp,image/gif,image/bmp";

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("사진을 변환하지 못했습니다."))), type, quality));
}

export async function fileToImageInput(file: File): Promise<ImageInput> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => {
    throw new Error(`「${file.name}」은 열 수 없는 사진 형식입니다(HEIC는 JPG로 바꿔 넣어 주세요).`);
  });
  const { width, height } = bitmap;
  if (file.type === "image/png") {
    bitmap.close();
    return { bytes: new Uint8Array(await file.arrayBuffer()), kind: "png", width, height };
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이 브라우저에서는 사진을 그릴 수 없습니다.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const blob = await canvasBlob(canvas, "image/jpeg", 0.92);
  return { bytes: new Uint8Array(await blob.arrayBuffer()), kind: "jpg", width, height };
}
