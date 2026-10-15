import type { Aspect, AspectOrOriginal, ComicLang, ComicStyle } from "./types";
import { MATERIALS, categoryById } from "./styles";

/** 모든 AI 프롬프트는 당해 연도 기준(CLAUDE.md 핵심 원칙 8) */
export function yearGuard(): string {
  const y = new Date().getFullYear();
  const [koreaYear, koreaMonth] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).format(new Date()).split("-").map(Number);
  return `[기준 연도 엄수: 현재 연도는 ${y}년입니다. 연도·시기·트렌드를 언급할 때는 ${y}년(당해 연도)을 기준으로 하고, 과거 연도로 퇴행하지 마세요.] [기준 시점: 한국 시간으로 지금은 ${koreaYear}년 ${koreaMonth}월입니다. 계절·시기 표현은 현재 월에 맞추고, 연도·계절은 불필요하게 덧붙이지 마세요.]`;
}

/** 새 인물을 그릴 때의 기본 인물 규칙(핵심 원칙 3). 업로드 사진 변환에는 쓰지 않는다. */
export const KOREAN_PEOPLE_RULE = "If people appear and no nationality or ethnicity is specified, depict them as Korean (East Asian) people.";

/** 종횡비 재구성(아웃페인팅) 부록: 자르기 금지, 장면 확장 */
export function aspectAppendix(ratio: AspectOrOriginal | undefined): string {
  if (!ratio || ratio === "original") return "";
  return `

[ABSOLUTE COMMAND: ASPECT RATIO & SCENE EXPANSION]
- Target Aspect Ratio: ${ratio}
- Generate the final image directly in this target aspect ratio.
- You are strictly forbidden from cropping the original image's main subject.
- To achieve the new aspect ratio, creatively expand the scene (outpainting). If the target is wider, invent and seamlessly paint new details to the left and right. If it's taller, invent and paint new details above and below.
- The final image must contain the ENTIRE original scene plus the expanded areas. Any cropping of the original content is a complete failure.`;
}

export function synthesisPrompt(userGoal: string, bgEmpty: boolean, aspect: AspectOrOriginal | undefined): string {
  const bg = bgEmpty
    ? "4. **BACKGROUND GENERATION (MANDATORY)**: The BASE image has no background. Create a new, photorealistic, contextually appropriate background that seamlessly integrates with the synthesized subject. The final image must be a complete scene."
    : "4. **BACKGROUND INTEGRATION**: The BASE image has an existing background. Seamlessly blend the synthesized subject with it, ensuring consistent lighting, shadows, and perspective.";
  return `[CORE MISSION: High-Fidelity Character Synthesis]
[ABSOLUTE RULE #1: FACIAL IDENTITY LOCK]
Perfectly preserve the facial identity of the person in the BASE image. The output face MUST be a 1:1 match to the BASE image's face. Do NOT alter facial structure, features, or unique characteristics. This rule overrides all other artistic instructions.
[TASK INSTRUCTIONS]
1. **ANALYZE INPUTS**: The first image is the BASE (primary subject). The following images are SOURCE images containing elements to add.
2. **EXECUTE USER GOAL**: The user's instruction is: "${userGoal}".
3. **SYNTHESIZE**: Create a SINGLE new image by applying the user's goal to the BASE image.
${bg}
5. **OUTPUT**: Return ONLY the single, final, synthesized image. Do not return multiple images or text.${aspectAppendix(aspect)}`;
}

/** 배경 제거: 모델은 이진 마스크를 안정적으로 만들지 못하므로, 배경을 순수 녹색으로 바꾸게 하고 서버에서 크로마키로 알파를 만든다 */
export const BGREMOVE_PROMPT = "Keep the main subject (person, product, or object in the foreground) EXACTLY as it is, with identical pose, colors, details, size and position in the frame. Replace the ENTIRE background with a single, flat, solid pure bright green color (#00FF00): no gradient, no texture, no shadows, no reflections, no floor, no border, no vignette. The subject edges must be clean and sharp, including fine details like hair. Do not add or remove anything else.\n\n";

export const INPAINT_PROMPT = "You are an expert image inpainting model. You will receive two images followed by this text prompt. 1. The first image is the original image. 2. The second image is a mask. The white area in this mask indicates the region that needs to be removed and realistically filled. Remove the content within the white masked area from the first image and intelligently fill it so it blends seamlessly with the surrounding pixels. Output only the final, single, inpainted image.";

export const IDPHOTO_PROMPT = `[TASK] Convert the provided photograph into a professional, Korean-style ID photo.
[STRICT INSTRUCTIONS]
1. **Identity Preservation (Top Priority)**: The facial features MUST be identical to the original.
2. **Mandatory Wardrobe Change**: The subject's clothing MUST be changed to a formal business suit.
3. **Background**: The background MUST be a solid, pure white color (#FFFFFF).
4. **Pose & Gaze**: The subject MUST face directly forward, looking at the camera.
5. **Lighting**: Apply soft, even studio lighting typical of professional portraiture, such as butterfly lighting.
6. **Framing (CRITICAL)**: The final image MUST have a perfect 3:4 aspect ratio, a standard upper-body ID photo shot. Do not leave extra space; the subject must fill the 3:4 frame.`;

export function floorplanPrompt(aspect: AspectOrOriginal | undefined): string {
  return `[MISSION] Convert the provided 2D floor plan into a photorealistic 3D model.
[ABSOLUTE CAMERA RULE] Imagine you are looking at a dollhouse from an upper corner.
[DETAILED VIEW SPECIFICATIONS]
1. **Perspective**: A 3D isometric view. DO NOT create a flat top-down image.
2. **Camera Angle**: A high-angle (bird's-eye view) tilted at approximately 45 degrees.
3. **Composition**: Use a 'cutaway' style where the front and side walls are removed so the entire interior layout (rooms, furniture, pathways) is clearly visible. The camera is positioned outside one of the corners.
4. **Style**: A high-quality, photorealistic 3D render.
5. **Details**: Populate the space with modern furniture, realistic textures (wood floors, tiles), and natural lighting with soft shadows.
6. **Background**: The area outside the rendered model should be a clean, solid white background.${aspectAppendix(aspect)}`;
}

export function lifeAlbumPrompt(age: number, aspect: AspectOrOriginal | undefined): string {
  return `[TOP PRIORITY MISSION]
Create a life album of THE EXACT PERSON in the provided original image. Preserving facial similarity is overwhelmingly more important than any other artistic requirement. Every face in the output must be clearly recognizable as the same person from the original photo at different ages. If face consistency fails, the whole generation has failed.
[OUTPUT DETAILS]
- Overall format: a scrapbook-style collage in a ${aspect && aspect !== "original" ? aspect : "16:9"} aspect ratio.
- Photos to include:
  1. **Present (${age} years old)**: the person from the original photo unchanged, but with the background completely replaced by a new, beautiful scenery.
  2. **Other moments of the life**: the same person as an infant, a child, a high-school student, a university student, in their 30s, 50s, and 70s.
- Absolute rules:
  - **Face consistency**: facial features (eyes, nose, mouth, face shape) must clearly match the original person at every age. Never look like another person.
- Style guide:
  - **Layout**: arrange the photos irregularly yet aesthetically.
  - **Photo frames**: apply varied, distinctive frames such as polaroids and vintage frames.
  - **No labels**: do NOT add any text, age, or caption labels to the photos.`;
}

const COMIC_STYLES: Record<ComicStyle, (text: string, note: string) => string> = {
  noir: (t, n) => `A single comic book panel in a gritty, noir art style, using high-contrast black and white ink. The scene should be a dramatic re-imagining of the provided image's subject and pose. ${t ? `A caption box at the top of the panel must contain the following text: "${t}". ${n}` : "The panel must NOT contain any text, speech bubbles, or captions."} The lighting must be harsh and dramatic, with deep shadows, to create a moody and somber atmosphere.`,
  webtoon: (t, n) => `A single panel in a clean, modern Korean webtoon style. The art should feature crisp digital line art, vibrant cell shading, and expressive characters based on the provided image. ${t ? `A speech bubble or caption, styled appropriately for a webtoon, must contain the following text: "${t}". ${n}` : "The panel must NOT contain any text, speech bubbles, or captions."} The overall mood should be bright and engaging.`,
  american: (t, n) => `A single panel in the style of a classic American superhero comic book from the 1980s. The art must have bold inks and use Ben-Day dot patterns for color. The composition must be dynamic and action-oriented, based on the provided image. ${t ? `A caption box with a yellow background, typical of the era, must contain the following text: "${t}". ${n}` : "The panel must NOT contain any text, speech bubbles, or captions."}`,
};

export function comicPrompt(style: ComicStyle, lang: ComicLang, text: string, aspect: AspectOrOriginal | undefined): string {
  const note = lang === "ko" ? "The text is in Korean and must be rendered exactly as written." : "The text is in English and must be rendered exactly as written.";
  return COMIC_STYLES[style](text.trim(), note) + aspectAppendix(aspect);
}

/** 연속 스토리: 텍스트 모델이 8컷 장면을 먼저 기획한다 */
export function storyPlanPrompt(idea: string, hasBase: boolean): string {
  return `${yearGuard()}
You are a visual storyteller. Create a silent, purely visual story of exactly 8 scenes (no dialogue, no captions) based on the user's idea.${hasBase ? " The story must BEGIN from the theme of the provided starting image; scene 1 is a natural continuation of it." : ""}
${KOREAN_PEOPLE_RULE}
Respond with JSON only: {"character": "<one-sentence consistent description of the main character(s) and art style>", "scenes": ["<scene 1>", ..., "<scene 8>"]}. Each scene is one concrete sentence in English describing what is visible.
[USER'S STORY IDEA]
"${idea}"`;
}

export function storyCutPrompt(character: string, scene: string, n: number, total: number): string {
  return `[VISUAL STORY - CUT ${n} OF ${total}]
- Keep the main character(s) and art style exactly consistent with the previous cut (if provided) and with: ${character}
- This cut shows: ${scene}
- The image MUST NOT contain any text, words, captions, or speech bubbles. Pure visual storytelling.`;
}

/** 이미지 레시피: 텍스트 모델이 한국어 단계와 이미지 프롬프트를 기획한다 */
export function recipePlanPrompt(dish: string): string {
  return `${yearGuard()}
당신은 한국어 요리 레시피 작가입니다. 아래 요리의 완전한 레시피를 6~8단계로 만드세요. 첫 단계는 재료 준비, 마지막 단계는 완성된 요리를 접시에 담아내는 단계여야 합니다.
JSON만 답하세요: {"title": "<요리 이름>", "steps": [{"text": "1단계: <한국어 설명>", "imagePrompt": "<English description of what the photo shows for this step>"}]}
- text는 모두 한국어이며 "N단계:"로 시작합니다.
- imagePrompt는 그 단계의 행동과 음식만 묘사하는 영어 문장입니다(글자·숫자·워터마크 금지).
[요리]
"${dish}"`;
}

export function recipeImagePrompt(dish: string, imagePrompt: string): string {
  return `Photorealistic food photography for a step-by-step recipe of "${dish}". Show only this step: ${imagePrompt}. The image MUST NOT contain any text, letters, numbers, step indicators, or watermarks. Natural kitchen lighting, appetizing, high detail.`;
}

/** ───── 프롬프트 제안(텍스트 모델) ───── */
const OUTPUT_FORMAT = `[OUTPUT FORMAT]
- Language: MUST be in KOREAN.
- Style: Use vivid, specific descriptions to paint a visually rich scene.
- Response Format: Do NOT include any extra explanations. The response must be only the generated prompt sentence, ready for the user to copy and use.`;

export function suggestGeneratePrompt(idea: string, category: string): string {
  const c = categoryById(category);
  if (!c.template) {
    return `[MISSION]
You are a creative prompt generation expert. Given a user's simple idea, write a detailed and creative prompt in KOREAN that an AI image generation model can easily understand to produce a rich result.

[USER IDEA]
"${idea}"

[EXAMPLE]
- (User Idea: a cat flying in space) -> "사실적인 스타일, 우주복을 입은 귀여운 아기 고양이가 은하수를 배경으로 떠다닙니다. 배경에는 행성과 별이 반짝이고 헬멧에 지구가 비칩니다. 영화 같은 조명, 극적인 구도, 8K 고화질."

${OUTPUT_FORMAT}`;
  }
  return `[MISSION]
${c.template} Given a user's simple idea, write one highly detailed prompt in KOREAN following that template, describing every element specifically.

[USER IDEA]
"${idea}"

${OUTPUT_FORMAT}`;
}

export function suggestEditPrompt(opts: { processes: string[]; style: string | null; custom: string; bgEmpty: boolean; styleId?: string }): string {
  const bg = opts.bgEmpty ? "The original image has a transparent or meaningless solid-color background." : "The original image has a meaningful background.";
  const material = opts.styleId && MATERIALS[opts.styleId] ? `\n[STYLE-SPECIFIC GUIDELINE: Materials & Textures]\n- ${MATERIALS[opts.styleId]}` : "";
  return `${yearGuard()}
[SYSTEM ROLE]
You are a world-class visual concept artist and prompt engineer. Analyze the user's original image and their selections, then write a new, masterful prompt in KOREAN that completely reimagines the image, preserving its core concept but transforming it into the chosen style.

[CONTEXT]
- Background Status: ${bg}

[USER SELECTIONS]
1. Style: "${opts.style ?? "None"}"
2. Processes: [${opts.processes.length ? opts.processes.map((p) => `"${p}"`).join(", ") : "None"}]
3. Additional Request: "${opts.custom || "None"}"

[PROMPT GENERATION RULES]
1. The prompt MUST start with a natural conversion command: "원본 이미지를 [상세한 스타일명]으로 변환하여..." Do NOT use the raw style label; elaborate it (e.g., '애니화' -> '생생한 일본 애니메이션 스타일'). Never start with the style name itself. If no style is selected, this rule does not apply.
2. If the selected style has a guideline below, you MUST include its material and texture descriptions.
3. Background: if the background is empty, create a natural background that suits the style; otherwise transform the existing background into the new style along with the subject.
4. Core mission: eliminate any hint that the original was a 'photo' or 'live-action'; describe the scene as if painting it from scratch in the target style.
5. LANGUAGE: the final prompt MUST be in KOREAN.
6. OUTPUT: return ONLY the generated Korean prompt text, with no explanations, prefixes, or markdown.${material}

Now create the new prompt in KOREAN.`;
}

export function suggestSynthesisPrompt(bgEmpty: boolean, aspect: AspectOrOriginal | undefined): string {
  const a = aspect && aspect !== "original" ? aspect : null;
  const status = bgEmpty ? "NO_BACKGROUND" : "HAS_BACKGROUND";
  const ratio = a
    ? `\n3. **Generate Part C (Aspect Ratio) - MANDATORY**: Complete the sentence with a phrase that commands the AI to expand the scene to a **${a}** ratio without cropping. Example: "...그리고 전체 장면을 16:9 비율로 확장하여, 성 주변의 풍경을 더 보여주세요."`
    : "";
  return `${yearGuard()}
[YOUR MISSION]
Generate ONE creative Korean sentence suggesting how to combine the provided images (the first is the BASE image, the rest are SOURCE images).

[BACKGROUND CONTEXT]
- Background Status: ${status}. Your entire response depends on it.

[STEP-BY-STEP INSTRUCTIONS]
1. **Part A (The Action)**: Describe the core action of combining the images in Korean (e.g., "여성에게 선글라스를 씌우고").
2. **Part B (The Background) - MANDATORY**: Complete the sentence by describing the background following the rule below.${ratio}

[RULES FOR PART B]
- If NO_BACKGROUND: invent a new, interesting background that fits the action. Example: "여성에게 선글라스를 씌우고, 햇살 좋은 캘리포니아 해변에 서 있는 모습으로 만들어 주세요."
- If HAS_BACKGROUND: suggest TRANSFORMING the existing background into a cohesive new scene; do NOT just say "blend it". Example: "인물에게 갑옷을 입히고, 사무실 배경을 중세 시대의 성으로 바꿔주세요."

[FINAL CHECK]
- Is the output ONLY the single Korean sentence?`;
}

export const SUGGEST_STORY_PROMPT = `[YOUR MISSION]
Analyze the provided image and generate a creative and concise story idea in KOREAN that could be told in 8 silent images. The story should have a clear beginning, middle, and a compelling end.
[OUTPUT FORMAT]
- Language: MUST be in KOREAN.
- Do NOT include any extra explanations. The response must be ONLY the story idea sentence.`;

export const SUGGEST_DISH_PROMPT = `[YOUR MISSION]
Analyze the provided image of a food dish. Identify the name of the dish as specifically as possible.
[OUTPUT FORMAT]
- Language: MUST be in KOREAN.
- Do NOT include any extra explanations. The response must be ONLY the name of the dish. Example: if the image is of macarons, output "마카롱".`;

export type { Aspect };
