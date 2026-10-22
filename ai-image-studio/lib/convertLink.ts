// 갤러리 「🔁 형식 바꾸기」 — 이미지 변환 스튜디오로 보낸다(미배포 정리 2026-10-22).
// 우리 저장소(ai-image-generations) 서명 주소만(공급사 주소로만 남은 옛 기록은 null). 보낸 곳 ?via=, 이름표 ?label=(프롬프트 앞 40자).
export const CONVERT_STUDIO_URL = "https://image-convert-studio.buylife.xyz/convert";

export function convertLinkOf(imageUrl: string | null | undefined, prompt = ""): string | null {
  if (!imageUrl || !imageUrl.includes("/storage/v1/object/sign/ai-image-generations/")) return null;
  const label = prompt.replace(/\s+/g, " ").trim().slice(0, 40);
  return `${CONVERT_STUDIO_URL}?src=${encodeURIComponent(imageUrl)}&via=ai-image-studio${label ? `&label=${encodeURIComponent(label)}` : ""}`;
}
