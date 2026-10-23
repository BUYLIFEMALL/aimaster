// 공용 기준 코드 `banana-idea-link`(2026-10-22) — 바나나 캔버스 「이미지 생성」 아이디어 칸(최대 600자)을
// `/studio?idea=`로 채워 여는 주소를 만든다(글자만 전달, 자동 생성 없음). 600자를 넘으면 칸에 다 들어가지 않으므로 null.
// `src`는 보낸 프로그램 이름(바나나가 `BANANA_SOURCES`에 있는 이름만 「○○에서 보냄」·돌아가기 링크·기록 저장에 씀).
// 바나나는 `from`을 저장 작업 불러오기에 쓰므로 `src`를 쓴다. 받는 쪽(바나나)도 같은 사본으로 한도·이름표를 맞춘다.
// 사본은 직접 고치지 말고 이 파일만 고친 뒤 `node scripts/check-shared-modules.mjs --sync`
export const BANANA_STUDIO_URL = "https://banana-canvas.buylife.xyz/studio";
export const MAX_BANANA_IDEA = 600;

export type BananaSource = "style-dna-analyzer" | "emotion-writer" | "reverse-prompt";

// 보낸 프로그램 화면 이름과 돌아갈 주소 — 새 보내는 프로그램은 여기에만 추가
export const BANANA_SOURCES: Record<BananaSource, { name: string; url: string }> = {
  "style-dna-analyzer": { name: "이미지 스타일 분석기", url: "https://style-dna-analyzer.buylife.xyz" },
  "emotion-writer": { name: "감성 글귀", url: "https://emotion-writer.buylife.xyz" },
  "reverse-prompt": { name: "리버스 프롬프트", url: "https://reverse-prompt.buylife.xyz" },
};

export function isBananaSource(v: unknown): v is BananaSource {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(BANANA_SOURCES, v);
}

// 2026-10-22: AI 이미지 스튜디오 2단계 프롬프트 칸(`/dashboard?prompt=`)으로 보내는 주소도 여기서 만든다(자동 생성 없음).
// 이미지 스튜디오는 같은 이름표로 `src`를 받아 안내·돌아가기 링크·생성 기록에 쓴다. 너무 긴 프롬프트는 주소가 길어져 null
export const IMAGE_STUDIO_URL = "https://ai-image-studio.buylife.xyz/dashboard";
export const MAX_IMAGE_STUDIO_PROMPT = 6000;

export function imageStudioLink(prompt: string | null | undefined, src?: BananaSource): string | null {
  const p = (prompt ?? "").trim();
  if (!p || p.length > MAX_IMAGE_STUDIO_PROMPT) return null;
  return `${IMAGE_STUDIO_URL}?prompt=${encodeURIComponent(p)}${src ? `&src=${src}` : ""}`;
}

export function bananaIdeaLink(idea: string | null | undefined, src?: BananaSource): string | null {
  const p = (idea ?? "").trim();
  if (!p || p.length > MAX_BANANA_IDEA) return null;
  return `${BANANA_STUDIO_URL}?idea=${encodeURIComponent(p)}${src ? `&src=${src}` : ""}`;
}
