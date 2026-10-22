// 「이미지 스튜디오에서 생성」(v1.26): 마스터 프롬프트(EN)를 AI 이미지 스튜디오 2단계 프롬프트 칸에 채워 연다.
// 이미지 스튜디오는 이미 `/dashboard?prompt=`를 받아 칸만 채운다(자동 생성 없음 — 엔진·모델은 회원이 고르고 [생성]을 누름).
// 글자만 넘기므로 이미지·키는 오가지 않는다. 너무 긴 프롬프트는 주소가 길어져 링크를 숨긴다(복사 버튼은 그대로).
export const IMAGE_STUDIO_URL = "https://ai-image-studio.buylife.xyz/dashboard";
export const MAX_LINK_PROMPT = 6000;

export function imageStudioLink(prompt: string | null | undefined): string | null {
  const p = (prompt ?? "").trim();
  if (!p || p.length > MAX_LINK_PROMPT) return null;
  return `${IMAGE_STUDIO_URL}?prompt=${encodeURIComponent(p)}`;
}

// v1.35: 「바나나 캔버스로 보내기」 — 바나나 「이미지 생성」 아이디어 칸(최대 600자)을 `/studio?idea=`로 채워 연다(자동 생성 없음).
// 600자를 넘으면 칸에 다 들어가지 않으므로 링크를 만들지 않는다(화면에서 「복사해서 줄여 쓰세요」 안내).
export const BANANA_STUDIO_URL = "https://banana-canvas.buylife.xyz/studio";
export const MAX_BANANA_IDEA = 600;

export function bananaLink(prompt: string | null | undefined): string | null {
  const p = (prompt ?? "").trim();
  if (!p || p.length > MAX_BANANA_IDEA) return null;
  return `${BANANA_STUDIO_URL}?idea=${encodeURIComponent(p)}`;
}
