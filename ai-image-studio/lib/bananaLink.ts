// 「바나나 캔버스로 보내 편집」 링크(v1.24). 바나나 캔버스는 우리 저장소(ai-image-generations)의 서명 주소이면서 본인 폴더인 것만 받아 원본으로 넣는다.
// 공급사 주소로만 남은 옛 기록(저장 실패분)은 보낼 수 없어 null.
export const BANANA_STUDIO_URL = "https://banana-canvas.buylife.xyz/studio";

export function bananaEditUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl || !imageUrl.includes("/storage/v1/object/sign/ai-image-generations/")) return null;
  return `${BANANA_STUDIO_URL}?import=${encodeURIComponent(imageUrl)}`;
}
