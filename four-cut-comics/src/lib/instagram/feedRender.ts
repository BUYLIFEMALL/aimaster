"use client";

import { createClient } from "@/lib/supabase/client";
import { feedPad } from "./feed";

// v1.19 — 인스타용 그림 변환·올리기(브라우저 전용). 게시 칸(InstaDirectPublish)과 내 작품 「여러 회차 한 번에 예약」이 같은 코드를 쓴다.
// v1.17·v1.18에서 InstaDirectPublish 안에 있던 toFeedJpeg와 업로드 과정을 그대로 옮김.

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("그림을 읽지 못했습니다."));
    img.src = src;
  });
}

/** 그림 → 피드 비율 JPEG(필요하면 흰 여백) */
export async function toFeedJpeg(src: string): Promise<Blob> {
  const img = await loadImage(src);
  const p = feedPad(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = p.width;
  canvas.height = p.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("그림을 변환하지 못했습니다.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, p.width, p.height);
  ctx.drawImage(img, p.dx, p.dy, p.dw, p.dh);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("그림을 변환하지 못했습니다."))), "image/jpeg", 0.9));
}

/** JPEG들을 INSTA 공개 저장소의 회원 폴더(fourcut-insta/)에 서명 업로드 주소로 올리고 경로를 돌려준다 */
export async function uploadBlobs(blobs: Blob[]): Promise<string[]> {
  const up = await fetch("/api/instagram/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count: blobs.length }) });
  const upData = await up.json().catch(() => ({}));
  if (!up.ok) throw new Error(upData.error || "그림을 올릴 준비를 하지 못했습니다.");
  const uploads = upData.uploads as { path: string; token: string }[];
  const supabase = createClient();
  for (let i = 0; i < uploads.length; i++) {
    const { error } = await supabase.storage.from("insta-post-images").uploadToSignedUrl(uploads[i].path, uploads[i].token, blobs[i], { contentType: "image/jpeg" });
    if (error) throw new Error("그림을 올리지 못했습니다. 네트워크를 확인하고 다시 시도해주세요.");
  }
  return uploads.map((u) => u.path);
}
