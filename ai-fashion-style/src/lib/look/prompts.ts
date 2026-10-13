import type { BackgroundMode, BeautyType, Lang, SuggestionKind } from "./types";

/** 사용자가 입력한 상황 문구를 프롬프트에 넣기 전에 정리한다(길이·제어문자·따옴표) */
export function cleanSituation(input: unknown): string {
  return String(input ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/["'`\\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function yearGuard(year: number): string {
  return `[Current year: ${year}. Reflect ${year} fashion and beauty trends; never regress to past years.]`;
}

const PEOPLE_RULE = "If a person must be depicted, depict a Korean (East Asian) person unless the request explicitly requires otherwise.";

export function recommendPrompt(kind: SuggestionKind, situation: string, year: number): string {
  const s = cleanSituation(situation);
  if (kind === "accessory") {
    return `${yearGuard(year)}
You are an expert fashion stylist specializing strictly in ACCESSORIES. Analyze the person in the image and the occasion: "${s}".
Suggest exactly two distinct sets of accessories that suit the occasion. Do NOT suggest shirts, pants, dresses or other clothing — ONLY jewelry (necklaces, earrings), hats, bags, scarves, glasses/sunglasses or belts.
Each set needs a creative short name and 2 to 3 items. For each item give a short name and a detailed photorealistic image-generation prompt that shows ONLY the item isolated on a clean white background (no person, no mannequin).
Return a valid JSON array that matches the schema.`;
  }
  return `${yearGuard(year)}
You are an expert fashion stylist. First analyze the person in the image (overall impression and body proportions). Then consider the occasion: "${s}".
Suggest exactly two complete, flattering outfits suitable for the occasion. Each outfit needs a catchy short name and 2 to 3 complementary clothing items.
For each item give a short name and a detailed photorealistic image-generation prompt that shows ONLY that clothing item laid out on a clean white background (no person, no mannequin).
Return a valid JSON array that matches the schema.`;
}

export function itemImagePrompt(prompt: string): string {
  const base = String(prompt ?? "").replace(/\s+/g, " ").trim().slice(0, 600);
  return `${base}. Product photo of a single fashion item, centered, clean pure white background, soft studio lighting, no text, no logo, no person. ${PEOPLE_RULE}`;
}

export function itemNamePrompt(): string {
  return "Analyze this image of a clothing item or accessory. Reply with a short, descriptive name in Korean within 5 words (for example: '블루 스트라이프 셔츠'). Return only the name as plain text.";
}

export function tryOnPrompt(background: BackgroundMode, situation?: string): string {
  const s = cleanSituation(situation);
  const bg =
    background === "match" && s
      ? `Change only the background to a natural, realistic setting that fits this occasion: "${s}". Keep the person's lighting consistent.`
      : "Keep the background, pose and lighting exactly the same as the first image. Do not change the scene.";
  return `Image editing task.
1. The first image is the person. The second image is a clothing item or accessory.
2. Generate one new photo in which the same person wears or carries the item from the second image, naturally fitted.
3. Keep the person's face, hairstyle, skin tone, body shape and pose unchanged.
4. ${bg}`;
}

export function beautyAdvicePrompt(lang: Lang, year: number): string {
  const langInstruction =
    lang === "ko"
      ? "Write the 'title' and 'description' fields in KOREAN. The 'imagePrompt' MUST be in ENGLISH."
      : "Write the 'title' and 'description' fields in ENGLISH. The 'imagePrompt' MUST be in ENGLISH.";
  return `${yearGuard(year)}
Analyze the person's facial features, skin tone and overall style in the image. Give a beauty consultation:
1) a specific makeup look that enhances natural beauty (lipstick, eyes, blush details);
2) a modern hairstyle that suits the face shape and the overall style.
For BOTH, provide 'title', a detailed 'description', and an 'imagePrompt' for generating a close-up reference photo of a person with that style (e.g. "Close-up portrait of a young Korean woman with ..."). ${PEOPLE_RULE}
${langInstruction} Return JSON that matches the schema.`;
}

export function beautyApplyPrompt(type: BeautyType, description: string): string {
  const d = String(description ?? "").replace(/\s+/g, " ").trim().slice(0, 700);
  if (type === "makeup") {
    return `Photo editing task: apply this makeup style to the person in the image: "${d}". Keep it natural, keep the face identity, hairstyle, outfit, background and lighting unchanged.`;
  }
  return `Photo editing task: change only the person's hairstyle to: "${d}". Keep the face, outfit, background and lighting exactly the same.`;
}
