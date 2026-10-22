// 「이미지 스튜디오에서 생성」(v1.26): 마스터 프롬프트(EN)를 AI 이미지 스튜디오 2단계 프롬프트 칸에 채워 연다.
// 이미지 스튜디오는 이미 `/dashboard?prompt=`를 받아 칸만 채운다(자동 생성 없음 — 엔진·모델은 회원이 고르고 [생성]을 누름).
// 글자만 넘기므로 이미지·키는 오가지 않는다. 너무 긴 프롬프트는 주소가 길어져 링크를 숨긴다(복사 버튼은 그대로).
export const IMAGE_STUDIO_URL = "https://ai-image-studio.buylife.xyz/dashboard";
export const MAX_LINK_PROMPT = 6000;

export function imageStudioLink(prompt: string | null | undefined): string | null {
  const p = (prompt ?? "").trim();
  if (!p || p.length > MAX_LINK_PROMPT) return null;
  // v1.36: 보낸 곳(`src`)을 붙여 이미지 스튜디오가 안내·돌아가기·생성 기록에 쓰게 함
  return `${IMAGE_STUDIO_URL}?prompt=${encodeURIComponent(p)}&src=style-dna-analyzer`;
}

// v1.35: 「바나나 캔버스로 보내기」 — 주소·600자 한도는 공용 기준 코드 `banana-idea-link`(같은 폴더 bananaIdeaLink.ts)
import { bananaIdeaLink } from "./bananaIdeaLink";
export { BANANA_STUDIO_URL, MAX_BANANA_IDEA } from "./bananaIdeaLink";

export function bananaLink(prompt: string | null | undefined): string | null {
  return bananaIdeaLink(prompt, "style-dna-analyzer");
}
