// v1.12: 「바나나 캔버스로 보내기」 — 이미지 프롬프트를 바나나 캔버스 「이미지 생성」 아이디어 칸(최대 600자)에
// `/studio?idea=`로 채워 연다(글자만 전달, 자동 생성 없음). 600자를 넘으면 칸에 다 들어가지 않으므로 링크를 만들지 않는다
export const BANANA_STUDIO_URL = "https://banana-canvas.buylife.xyz/studio";
export const MAX_BANANA_IDEA = 600;

export function bananaLink(prompt: string | null | undefined): string | null {
  const p = (prompt ?? "").trim();
  if (!p || p.length > MAX_BANANA_IDEA) return null;
  return `${BANANA_STUDIO_URL}?idea=${encodeURIComponent(p)}`;
}
