"use client";

import { createClient } from "@/lib/supabase/client";
import { LINE_H, SLIDE_H, SLIDE_PAD, SLIDE_W, slideLayout, wrapDialogue, type SlideSource } from "./slides";

// v1.17 — 웹툰 장 그리기·올리기(브라우저 전용). 게시 칸(한 편)과 회차 묶음 예약(여러 편)이 같은 코드를 쓴다.
// 「1컷 = 캐러셀 1장」: 흰 4:5 판(1080×1350)에 컷 전체 + 아래 대사 말풍선을 그려 JPEG로(v1.15에서 InstagramPublishPanel 안에 있던 코드를 그대로 옮김).

const FONT = "bold 30px 'Pretendard', 'Noto Sans KR', sans-serif";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("컷 그림을 읽지 못했습니다. 그 컷을 다시 만든 뒤 시도해 주세요."));
    img.src = src;
  });
}

/** 컷 1장 → 4:5 JPEG(흰 판 + 컷 전체 + 대사 말풍선) */
export async function renderSlide(s: SlideSource): Promise<Blob> {
  const img = await loadImage(s.src);
  const canvas = document.createElement("canvas");
  canvas.width = SLIDE_W;
  canvas.height = SLIDE_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("그림을 변환하지 못했습니다.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, SLIDE_W, SLIDE_H);
  ctx.font = FONT;
  const lines = wrapDialogue(s.dialogue, SLIDE_W - SLIDE_PAD * 2 - 64, (t) => ctx.measureText(t).width);
  const textW = Math.max(0, ...lines.map((l) => ctx.measureText(l).width));
  const lay = slideLayout(img.naturalWidth, img.naturalHeight, lines.length, textW);
  ctx.drawImage(img, lay.dx, lay.dy, lay.dw, lay.dh);
  if (lay.bubble) {
    const { x, y, w, h } = lay.bubble;
    const r = 24;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#0f172a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((l, i) => ctx.fillText(l, SLIDE_W / 2, y + 22 + LINE_H * i + LINE_H / 2));
  }
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("그림을 변환하지 못했습니다."))), "image/jpeg", 0.9)
  );
}

/** 장들을 그려 INSTA 공개 저장소의 회원 폴더에 올리고 경로를 돌려준다(서명 업로드 주소 사용) */
export async function uploadSlides(slides: SlideSource[], onProgress?: (msg: string) => void): Promise<string[]> {
  const blobs: Blob[] = [];
  for (let i = 0; i < slides.length; i++) {
    onProgress?.(`인스타 장 만드는 중... (${i + 1}/${slides.length})`);
    blobs.push(await renderSlide(slides[i]));
  }
  onProgress?.("그림 올리는 중...");
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
