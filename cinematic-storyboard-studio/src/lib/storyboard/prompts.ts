// 분석·콘택트 시트·영상 프롬프트용 AI 지시문과 응답 구조(스키마). 참고 원본의 단계 구성을 분석해 우리 말로 새로 작성했다.
import { KEYFRAME_COUNT, type Analysis, type DialogueMode, type Lang } from "./types";
import { formatSeconds, planDurations } from "./plan";

/** 현재 연도 지침(핵심 원칙 8번) */
export const yearNotice = (year: number) =>
  `[Year rule: the current year is ${year}. If any text mentions the present or the current year, use ${year}; never regress to earlier years.]`;

/** 인물 묘사 기본 지침(핵심 원칙 3번): 레퍼런스에 이미 있는 인물은 그대로 유지하고, 새로 묘사해야 할 때만 한국인 기본 */
export const PEOPLE_RULE =
  "People rule: keep every person exactly as they appear in the reference image. Only if a person must be newly described and the reference gives no hint, default to Korean (East Asian) appearance.";

const OUTPUT_LANG = (lang: Lang) =>
  lang === "ko"
    ? "Write all descriptive content in KOREAN. Keep technical film terms (shot types such as ELS/CU, camera moves such as push-in/dolly) in English."
    : "Write everything in ENGLISH.";

export function buildAnalysisPrompt(input: { topic?: string; lang: Lang; year?: number }): string {
  const year = input.year ?? new Date().getFullYear();
  const topic = input.topic?.trim()
    ? `\nUSER TOPIC (must guide the story, logline and shot progression): "${input.topic.trim()}"\n`
    : "";
  return `You are a trailer director, cinematographer and storyboard artist. Turn the ONE attached reference image into a cohesive 10-20 second cinematic sequence and design ${KEYFRAME_COUNT} keyframes that an AI video model can animate.
${topic}
Ground rules
1. Look at the whole composition first. Identify every key subject (people, groups, vehicles, objects, animals, props, environment elements) and describe their positions, facing directions and interactions.
2. State only what is visible. Never guess real identities, exact real-world places or brand ownership. Mood and atmosphere may be inferred, but never presented as fact.
3. Keep strict continuity in every keyframe: same subjects, wardrobe/appearance, environment, time of day and lighting style. Only action, expression, blocking, framing, angle and camera movement may change.
4. Depth of field must be realistic (deeper in wides, shallower in close-ups). Keep ONE consistent color grade.
5. Do not add new characters or objects that are not in the reference. If tension is needed, imply it off-screen (shadow, sound, reflection, gaze).
6. ${PEOPLE_RULE}

Deliver, as one JSON object
- sceneBreakdown: subjects (each with visible traits, position, facing, action), environment (layout, materials, light direction and quality, implied time of day, 3-8 mood keywords), visualAnchors (3-6 traits that must stay constant across all shots).
- story: theme (one sentence), logline (one restrained trailer-style sentence supported by the image), emotionalArc (4 beats: setup, build, turn, payoff).
- cinematicApproach: shotProgression, cameraMovement (with the reason), lensAndExposure (focal lengths, depth of field, shutter feel), lightAndColor.
- keyframes: exactly ${KEYFRAME_COUNT} items. Each has number ("KF#01"...), duration (seconds as text), shotType (ELS/LS/MLS/MS/MCU/CU/ECU/Low/Worm's-eye/High/Bird's-eye/Insert), composition, action (one simple visible beat), camera (height, angle, movement), lighting (consistent with the grade), sound (optional one line).
  The set must include an establishing wide, an intimate close-up, an extreme detail close-up and a power-angle shot (low or high), follow the 4-beat arc, and cut together with consistent screen direction and eyelines.

${OUTPUT_LANG(input.lang)}
${yearNotice(year)}
Return ONLY valid JSON matching the schema.`;
}

export function buildContactSheetPrompt(analysis: Analysis): string {
  const panels = analysis.keyframes
    .slice(0, KEYFRAME_COUNT)
    .map((k, i) => `Panel ${i + 1}: ${k.action}. Composition: ${k.composition}. Shot type: ${k.shotType}.`)
    .join("\n");
  return `You are a storyboard artist. Produce ONE single master image: a cinematic contact sheet laid out as a perfect 3x3 grid containing ${KEYFRAME_COUNT} keyframes.

The attached reference image sets the look. Keep subjects, wardrobe, environment and lighting strictly consistent with it in every panel.
${PEOPLE_RULE}

Panels (left to right, top to bottom):
${panels}

Caption bar: at the bottom of EACH panel draw a thin black bar with small, legible white text in the form "KF#01 | 2s | ELS" (keyframe number, duration, shot type), numbered 01 to 09.

Style: photorealistic, cinematic lighting, one consistent color grade across all panels, realistic depth of field (shallow for CU/ECU, deep for wide shots). No extra borders, titles or watermarks.`;
}

/** 영상 프롬프트 지시문. 장면별 길이를 미리 계산해 정확히 그대로 쓰게 한다. */
export function buildVideoPrompt(input: { totalSeconds: number; dialogue: DialogueMode; lang: Lang; year?: number }): string {
  const year = input.year ?? new Date().getFullYear();
  const durations = planDurations(input.totalSeconds);
  const plan = durations.map((d, i) => `Scene ${i + 1} = ${formatSeconds(d)}`).join(", ");
  const dialogueRule =
    input.dialogue === "none"
      ? "Do not write any dialogue. Leave the dialogue field empty for every scene."
      : `Every scene except Scene 1 and Scene ${KEYFRAME_COUNT} gets a "dialogue" field with natural, cinematic lines in ${input.dialogue === "ko" ? "KOREAN" : "ENGLISH"} for the characters visible in that shot. Scene 1 and Scene ${KEYFRAME_COUNT} stay empty (visual only).`;
  return `You are an AI video director. The attached image is a 3x3 storyboard contact sheet. Convert each of its ${KEYFRAME_COUNT} cells into a prompt for a text/image-to-video model, as if describing a real film shot.

Total length: ${formatSeconds(input.totalSeconds)}. Use EXACTLY these scene durations (they sum to the total): ${plan}.
${dialogueRule}

Hard rules
1. Describe each scene as live-action footage. NEVER use the words storyboard, panel, frame, image, picture, drawing, grid, contact sheet, or caption. Those words make video models render a piece of paper instead of a scene.
   Bad: "A storyboard panel showing a man standing in rain."  Good: "A cinematic shot of a man standing in heavy rain, neon light reflecting on the wet ground."
2. Scene 1 will be fed to the video model as its start image. It must be an establishing shot that keeps the look of the master image, and its prompt must begin with "Static cinematic shot," or "Very slow zoom in,".
3. Each scene prompt must include shot type, subject action, camera movement, lens/depth of field feel and lighting, and must stay consistent with the masterPrompt.
4. ${PEOPLE_RULE}

Return one JSON object:
- masterPrompt: style (look, grain, lens), character (fixed appearance and wardrobe of every visible subject), environment (place, time of day, lighting mood). These stay constant across all scenes.
- scenes: ${KEYFRAME_COUNT} items with id ("S01"...), duration (e.g. "2s"), shotType, prompt, dialogue.
- meta: totalDuration, totalScenes, aspectRatio.

${input.lang === "ko" ? "Write the masterPrompt and scene prompts in English (video models work best in English); dialogue follows the dialogue rule." : "Write everything in English."}
${yearNotice(year)}
Return ONLY valid JSON matching the schema.`;
}

export function buildTopicPrompt(input: { topic?: string; lang: Lang }): string {
  const hint = input.topic?.trim();
  if (input.lang === "ko") {
    return hint
      ? `이 이미지를 분석하고 사용자의 키워드 '${hint}'를 반영해, 시네마틱 스토리보드의 로그라인을 한 문장으로 만들어 주세요. 결과 문장만 출력하세요.`
      : "이 이미지를 바탕으로 시네마틱 스토리보드의 주제(로그라인)를 한 문장으로 창의적으로 제안해 주세요. 보이는 것에 근거하고 결과 문장만 출력하세요.";
  }
  return hint
    ? `Analyze this image and the user's hint '${hint}', then write a one-sentence cinematic storyboard logline that uses the hint. Output only the sentence.`
    : "Based on this image, suggest a creative one-sentence cinematic storyboard topic (logline), grounded in what is visible. Output only the sentence.";
}

// ---- 응답 구조(Gemini responseSchema). SDK의 Type 열거형 값과 같은 문자열을 쓴다. ----
const S = { type: "STRING" } as const;
const strList = { type: "ARRAY", items: S } as const;

export const ANALYSIS_SCHEMA = {
  type: "OBJECT",
  properties: {
    sceneBreakdown: {
      type: "OBJECT",
      properties: { subjects: strList, environment: S, visualAnchors: strList },
      required: ["subjects", "environment", "visualAnchors"],
    },
    story: { type: "OBJECT", properties: { theme: S, logline: S, emotionalArc: strList }, required: ["theme", "logline", "emotionalArc"] },
    cinematicApproach: {
      type: "OBJECT",
      properties: { shotProgression: S, cameraMovement: S, lensAndExposure: S, lightAndColor: S },
      required: ["shotProgression", "cameraMovement", "lensAndExposure", "lightAndColor"],
    },
    keyframes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { number: S, duration: S, shotType: S, composition: S, action: S, camera: S, lighting: S, sound: S },
        required: ["number", "duration", "shotType", "composition", "action", "camera", "lighting"],
      },
    },
  },
  required: ["sceneBreakdown", "story", "cinematicApproach", "keyframes"],
} as const;

export const VIDEO_PROMPT_SCHEMA = {
  type: "OBJECT",
  properties: {
    masterPrompt: { type: "OBJECT", properties: { style: S, character: S, environment: S }, required: ["style", "character", "environment"] },
    scenes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { id: S, duration: S, shotType: S, prompt: S, dialogue: S },
        required: ["id", "duration", "shotType", "prompt"],
      },
    },
    meta: { type: "OBJECT", properties: { totalDuration: S, totalScenes: { type: "NUMBER" }, aspectRatio: S }, required: ["totalDuration", "totalScenes", "aspectRatio"] },
  },
  required: ["masterPrompt", "scenes", "meta"],
} as const;
