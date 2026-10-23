// v1.22: 다른 프로그램에서 받은 그림을 변환한 뒤, 그 프로그램 서버 보관함에 다시 저장(v1.22 인물사진, v1.23 바나나 캔버스 기록, v1.24 4컷 만화 보관함).
// 받는 쪽 기존 저장 API를 회원 본인 로그인 쿠키(.buylife.xyz)로 부른다 — 받는 쪽이 이 주소만 CORS로 허용한다.
import type { ViaSource } from "./linkMark";

export const RESAVE_TARGETS: Partial<Record<ViaSource, { name: string; api: string; open: string; maxB64: number }>> = {
  "portrait-photo": { name: "인물사진 보관함", api: "https://portrait-photo.buylife.xyz/api/saved", open: "https://portrait-photo.buylife.xyz/history", maxB64: 3_000_000 },
  "banana-canvas": { name: "바나나 기록", api: "https://banana-canvas.buylife.xyz/api/import-result", open: "https://banana-canvas.buylife.xyz/history", maxB64: 3_000_000 },
  "four-cut-comics": { name: "4컷 보관함", api: "https://four-cut-comics.buylife.xyz/api/import-result", open: "https://four-cut-comics.buylife.xyz/works", maxB64: 3_000_000 },
  "ai-image-studio": { name: "이미지 스튜디오 갤러리", api: "https://ai-image-studio.buylife.xyz/api/import-result", open: "https://ai-image-studio.buylife.xyz/gallery", maxB64: 3_000_000 },
};

/** 「너무 큼」일 때 한 번에 다시 시도하는 품질(미배포 정리 2026-10-22) */
export const RESAVE_RETRY_QUALITY = 0.7;

/** v1.24: base64로 바꾼 길이가 받는 곳 한도를 넘는지 미리 계산(저장 버튼을 누르기 전에 알림) */
export function resaveTooBig(via: ViaSource | undefined, bytes: number): boolean {
  const target = via ? RESAVE_TARGETS[via] : undefined;
  return !!target && Math.ceil(bytes / 3) * 4 > target.maxB64;
}
export const RESAVE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** 다시 저장할 수 있으면 받는 곳 정보, 아니면 null(보낸 곳·결과 형식 확인) */
export function resaveTarget(via: ViaSource | undefined, mimeType: string) {
  if (!via || !(RESAVE_TYPES as readonly string[]).includes(mimeType)) return null;
  return RESAVE_TARGETS[via] ?? null;
}

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** 성공하면 null, 실패하면 화면에 보여 줄 문구 */
/** label: 보낸 쪽이 붙여 준 원래 이름(예: 4컷 「○○ 3화」) — 받는 쪽이 제목에 쓴다(미배포 정리 2026-10-22) */
export async function resaveToSender(via: ViaSource, blob: Blob, label = ""): Promise<string | null> {
  const target = resaveTarget(via, blob.type);
  if (!target) return "이 형식은 다시 저장할 수 없습니다(JPEG·PNG·WebP만).";
  const data = await toBase64(blob);
  if (data.length > target.maxB64) return `${target.name} 한도(약 2MB)보다 큽니다. 품질이나 크기를 줄여 다시 변환해 주세요.`;
  try {
    const r = await fetch(target.api, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: { data, mimeType: blob.type }, purposeLabel: "변환 스튜디오에서 다시 저장", aspect: "", model: "image-convert-studio", label: label.slice(0, 60) }),
    });
    if (r.ok) return null;
    const d = await r.json().catch(() => ({}));
    return (d as { error?: string }).error || `${target.name}에 저장하지 못했습니다.`;
  } catch {
    return `${target.name}에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.`;
  }
}
