"use client";
// 사진 파일 → PDF에 넣을 수 있는 PNG·JPG 바이트. 휴대폰 사진의 회전 정보(EXIF)를 반영하려고 PNG가 아니면 다시 그려 JPG로 만든다.
import type { ImageInput } from "@/lib/pdf/ops";

// HEIC(아이폰 사진)도 고를 수 있게 둔다 — 브라우저가 스스로 열 수 있으면(사파리 등) 그대로 변환하고, 못 열면 안내한다.
export const ACCEPT_IMAGES = "image/jpeg,image/png,image/webp,image/gif,image/bmp,image/heic,image/heif,.heic,.heif";

export function isHeic(file: { name: string; type: string }): boolean {
  return /^image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

export const HEIC_HELP = "HEIC(아이폰 사진)를 변환하지 못했습니다. 사진을 JPG로 바꿔 넣어 주세요(아이폰 설정 → 카메라 → 포맷 → 「높은 호환성」으로 바꾸면 앞으로 JPG로 찍힙니다).";

/**
 * 크롬·엣지처럼 HEIC를 스스로 못 여는 브라우저용 — 변환 라이브러리(heic-to, LGPL-3.0, libheif 포함)를
 * 이때만 따로 내려받아(약 3MB, 별도 파일) JPG로 바꾼다. 사진은 회원 PC 안에서만 변환되고 서버로 가지 않는다.
 */
async function decodeViaHeicTo(file: File): Promise<ImageBitmap> {
  const { heicTo } = await import("heic-to/next");
  const jpg = await heicTo({ blob: file, type: "image/jpeg", quality: 0.92 });
  return createImageBitmap(jpg);
}

/** createImageBitmap이 못 여는 형식을 <img>로 한 번 더 시도한다(일부 브라우저는 img로만 HEIC를 연다). */
async function decodeViaImg(file: File): Promise<ImageBitmap> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return await createImageBitmap(img);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("사진을 변환하지 못했습니다."))), type, quality));
}

export async function fileToImageInput(file: File): Promise<ImageInput> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
    .catch(() => decodeViaImg(file))
    .catch((e) => (isHeic(file) ? decodeViaHeicTo(file) : Promise.reject(e)))
    .catch(() => {
      throw new Error(isHeic(file) ? `「${file.name}」: ${HEIC_HELP}` : `「${file.name}」은 열 수 없는 사진 형식입니다. JPG·PNG로 바꿔 넣어 주세요.`);
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
