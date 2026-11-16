// v1.33 상세페이지 「GIF 받기」로 보낼 파일 준비(순수 함수) — GIF 변환(GIF)·상품 사진 영상(애니메이션 WebP) 공용.
// 크기 기준은 공용 사본 gifHandoff.ts의 GIF_MAX_BYTES와 같아야 한다(시험 shopPayload.test.ts가 대조).
// 실행: node --test lib/shopPayload.test.ts

export const SHOP_MAX_BYTES = 10 * 1024 * 1024;
export type ShopKind = "gif" | "webp";

/** 결과 종류: 파일 형식이 WebP이거나 이름이 .webp면 WebP, 그 밖은 GIF(기존 동작). */
export function shopKind(type: string, name: string): ShopKind {
  return type === "image/webp" || /\.webp$/i.test(name) ? "webp" : "gif";
}

/** 보내기 전 검사 — 받는 쪽과 같은 기준(0바이트 초과·10MB 이하). 맞으면 null, 아니면 안내 문구. */
export function shopSizeError(bytes: number): string | null {
  if (bytes <= 0) return "보낼 파일이 비어 있습니다. 다시 만들어 주세요.";
  if (bytes > SHOP_MAX_BYTES) return `상세페이지에는 10MB 이하만 넣을 수 있습니다(지금 ${(bytes / 1048576).toFixed(1)}MB). 크기나 길이를 줄여 다시 만들어 주세요.`;
  return null;
}

/** 받는 쪽에 넘길 파일·이름 — 형식(type)과 확장자를 결과 종류에 맞춘다. */
export function shopPayload(blob: Blob, rawName: string): { file: Blob; name: string; kind: ShopKind } | { error: string } {
  const sizeError = shopSizeError(blob.size);
  if (sizeError) return { error: sizeError };
  const kind = shopKind(blob.type, rawName);
  const file = new Blob([blob], { type: kind === "webp" ? "image/webp" : "image/gif" });
  return { file, name: `${rawName.replace(/\.[^.]+$/, "")}.${kind}`, kind };
}
