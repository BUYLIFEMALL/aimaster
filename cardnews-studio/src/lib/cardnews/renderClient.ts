"use client";

import { ensureCardFonts } from "./fonts";
import { drawCard, ratioSize } from "./render";
import type { RatioId } from "./presets";
import type { CardPage, CardStyle } from "./types";

const imageCache = new Map<string, Promise<HTMLImageElement>>();

/** 배경 이미지를 불러온다(같은 주소는 한 번만). 저장소 이미지는 CORS 허용이라 캔버스가 오염되지 않는다. */
export function loadImage(url: string): Promise<HTMLImageElement> {
  let p = imageCache.get(url);
  if (!p) {
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => {
        imageCache.delete(url);
        reject(new Error("배경 이미지를 불러오지 못했습니다."));
      };
      img.src = url;
    });
    imageCache.set(url, p);
  }
  return p;
}

/** 캔버스에 카드 한 장을 그린다(글꼴·배경 이미지 로딩을 기다린다). 이미지 로딩에 실패하면 그라데이션 배경으로 그린다. */
export async function renderCardToCanvas(
  canvas: HTMLCanvasElement,
  page: Pick<CardPage, "headline" | "sub">,
  style: CardStyle,
  ratio: RatioId,
  bgUrl?: string
): Promise<{ imageFailed: boolean }> {
  const size = ratioSize(ratio);
  if (canvas.width !== size.width) canvas.width = size.width;
  if (canvas.height !== size.height) canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이 브라우저에서는 그림을 그릴 수 없습니다.");

  await ensureCardFonts(style, page);
  let bg: HTMLImageElement | null = null;
  let imageFailed = false;
  if (bgUrl) {
    try {
      bg = await loadImage(bgUrl);
    } catch {
      imageFailed = true;
    }
  }
  drawCard(ctx, size, page, style, bg);
  return { imageFailed };
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG로 저장하지 못했습니다."))), "image/png");
  });
}

/** 페이지 1장을 PNG 파일 데이터로 만든다(내보내기용). */
export async function renderCardToBlob(page: Pick<CardPage, "headline" | "sub">, style: CardStyle, ratio: RatioId, bgUrl?: string): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const { imageFailed } = await renderCardToCanvas(canvas, page, style, ratio, bgUrl);
  if (imageFailed) throw new Error("배경 이미지를 불러오지 못해 저장할 수 없습니다. 배경을 다시 생성해주세요.");
  return canvasToBlob(canvas);
}
