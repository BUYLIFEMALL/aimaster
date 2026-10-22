// v1.22: 다른 프로그램에서 받은 그림을 변환한 뒤, 그 프로그램 서버 보관함에 다시 저장(지금은 AI 인물사진만).
// 받는 쪽 기존 저장 API를 회원 본인 로그인 쿠키(.buylife.xyz)로 부른다 — 받는 쪽이 이 주소만 CORS로 허용한다.
import type { ViaSource } from "./linkMark";

export const RESAVE_TARGETS: Partial<Record<ViaSource, { name: string; api: string; maxB64: number }>> = {
  "portrait-photo": { name: "인물사진 보관함", api: "https://portrait-photo.buylife.xyz/api/saved", maxB64: 3_000_000 },
};
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
export async function resaveToSender(via: ViaSource, blob: Blob): Promise<string | null> {
  const target = resaveTarget(via, blob.type);
  if (!target) return "이 형식은 다시 저장할 수 없습니다(JPEG·PNG·WebP만).";
  const data = await toBase64(blob);
  if (data.length > target.maxB64) return `${target.name} 한도(약 2MB)보다 큽니다. 품질이나 크기를 줄여 다시 변환해 주세요.`;
  try {
    const r = await fetch(target.api, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: { data, mimeType: blob.type }, purposeLabel: "변환 스튜디오에서 다시 저장", aspect: "", model: "image-convert-studio" }),
    });
    if (r.ok) return null;
    const d = await r.json().catch(() => ({}));
    return (d as { error?: string }).error || `${target.name}에 저장하지 못했습니다.`;
  } catch {
    return `${target.name}에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.`;
  }
}
