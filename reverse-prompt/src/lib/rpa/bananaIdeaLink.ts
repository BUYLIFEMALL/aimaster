// 공용 기준 코드 `banana-idea-link`(2026-10-22) — 바나나 캔버스 「이미지 생성」 아이디어 칸(최대 600자)을
// `/studio?idea=`로 채워 여는 주소를 만든다(글자만 전달, 자동 생성 없음). 600자를 넘으면 칸에 다 들어가지 않으므로 null.
// `src`는 보낸 프로그램 이름(바나나가 정해 둔 이름만 「○○에서 보냄」으로 표시). 바나나는 `from`을 저장 작업 불러오기에 쓰므로 `src`를 쓴다.
// 사본은 직접 고치지 말고 이 파일만 고친 뒤 `node scripts/check-shared-modules.mjs --sync`
export const BANANA_STUDIO_URL = "https://banana-canvas.buylife.xyz/studio";
export const MAX_BANANA_IDEA = 600;

export type BananaSource = "style-dna-analyzer" | "emotion-writer" | "reverse-prompt";

export function bananaIdeaLink(idea: string | null | undefined, src?: BananaSource): string | null {
  const p = (idea ?? "").trim();
  if (!p || p.length > MAX_BANANA_IDEA) return null;
  return `${BANANA_STUDIO_URL}?idea=${encodeURIComponent(p)}${src ? `&src=${src}` : ""}`;
}
