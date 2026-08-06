import "server-only";
import { getNanoBananaConfig, type NanoBananaModelType } from "@/lib/ai/nanoBananaModels";

/** Gemini REST 에러 응답을 사람이 읽기 쉬운 한글 메시지로 바꾼다 (특히 크레딧 소진 케이스). */
function describeGeminiError(status: number, errorBody: string): string {
  let reason = "";
  try {
    const parsed = JSON.parse(errorBody) as { error?: { status?: string; message?: string } };
    reason = parsed.error?.status ?? "";
  } catch {
    // JSON이 아니면 무시하고 원본 메시지를 그대로 보여준다.
  }

  if (status === 429 || reason === "RESOURCE_EXHAUSTED") {
    return "Gemini API 결제 크레딧이 소진되었습니다. https://ai.studio/projects 에서 결제(크레딧)를 충전하거나, 설정에서 크레딧이 남아있는 다른 Gemini API 키로 교체해주세요.";
  }
  if (status === 400 && errorBody.includes("API_KEY_INVALID")) {
    return "Gemini API 키가 유효하지 않습니다. 설정에서 API 키를 다시 확인해주세요.";
  }
  return `Gemini 요청이 실패했습니다. (${status}) ${errorBody}`;
}

export interface VideoScriptResult {
  title: string;
  script: string;
}

// Make.com에서 쓰던 "01썰쇼츠자동화-영상스크립트 생성" 시나리오의 Gemini 프롬프트를 그대로 이식.
const SCRIPT_SYSTEM_PROMPT = `[역할 지정]
너는 대한민국 최고의 비디오 콘텐츠 작가다. 지난 10년간 제작한 쇼츠에서 높은 주목성·참여도·전환율을 기록해 왔다.

[작업 목적]
- 입력된 이야기를 바탕으로
몰입감 있는 1인칭 시점의 유튜브 쇼츠 스크립트를 생성한다.

- 해당 스크립트에 어울리는 영상 제목을 생성한다.

[출력 목표 및 형식]

아래와 같은 JSON 구조로 정확히 출력하라:
{
"title": "영상 제목",
"script": "쇼츠 스크립트"
}

[출력 규칙]

JSON 데이터만 출력한다. (추가 설명·주석 금지)

마크다운·특수 서식(#, *, -, > 등) 사용 금지

큰따옴표(")는 JSON 구조 자체에만 사용하고, 본문에는 사용하지 않는다.

[영상 제목 작성 규칙]

한글 15자 이내.

이야기 내용을 포함하면서 시청자의 호기심을 자극해 클릭을 유도한다.

[스크립트 작성 규칙]

첫 문장은 강력한 후킹으로 시작해 스토리 전체를 암시한다.

감정선·갈등을 강화하기 위해 원본에 없는 일화·묘사를 자유롭게 창작해도 좋다. 단, 핵심 흐름은 유지한다.

스크립트는 한글 기준 공백 포함 360~380자(포함 범위)로 완결된 이야기여야 한다.

360자 미만이면 내용을 보강해 재작성해야 한다.

380자 초과면 요약·축약해 재작성하되, 중간 절삭 없이 완결된 이야기여야 한다.`;

/** 원본 이야기(수집된 쇼츠 후보 content)로 제목 + 하나의 완결된 쇼츠 스크립트(360~380자)를 만든다. */
export async function generateVideoScript(story: string, apiKey: string): Promise<VideoScriptResult> {
  if (!apiKey) {
    throw new Error("Gemini API 키가 없습니다. 설정에서 본인 키를 등록하거나 관리자에게 문의해주세요.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `원본 이야기:\n${story}` }] }],
        systemInstruction: { parts: [{ text: SCRIPT_SYSTEM_PROMPT }] },
        generationConfig: { responseMimeType: "application/json" },
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(describeGeminiError(response.status, errorBody));
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!raw) throw new Error("Gemini가 빈 응답을 반환했습니다.");

  let parsed: VideoScriptResult;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Gemini 응답을 JSON으로 해석하지 못했습니다.");
  }
  if (!parsed.title || !parsed.script) {
    throw new Error("Gemini 응답에 title/script가 없습니다.");
  }
  return parsed;
}

export interface ScriptSegmentDraft {
  narration: string;
  imagePrompt: string;
}

const SEGMENT_COUNT = 6;
const SEGMENT_SECONDS = 5;

const SEGMENT_SYSTEM_PROMPT = `당신은 유튜브 쇼츠 연출가입니다. 주어진 완결된 내레이션 스크립트를
정확히 ${SEGMENT_COUNT}개의 장면으로 나누세요. 각 장면은 ${SEGMENT_SECONDS}초 분량의 내레이션이고,
전체 ${SEGMENT_COUNT}개를 순서대로 이어 읽으면 원본 스크립트와 같은 이야기가 되어야 합니다(내용을 바꾸거나 빼지 마세요).

규칙:
- 문장 중간을 자르지 말고, 자연스러운 스토리 흐름(기승전결)에 맞춰 장면을 나누세요.
- narration은 한글 기준 공백 포함 55~70자 내외(${SEGMENT_SECONDS}초 낭독 분량)로 만드세요.
- imagePrompt는 그 장면을 그림으로 표현하기 위한 영어 이미지 생성 프롬프트입니다. 인물의 외모/의상/화풍을
  ${SEGMENT_COUNT}개 전체에서 일관되게 유지하도록 매 프롬프트에 반복해서 명시하세요(예: 동일 인물 묘사를 매번 포함).
- 텍스트나 자막을 이미지에 넣으라는 지시는 포함하지 마세요.

출력은 반드시 아래 JSON 형식만 출력하세요.
{"segments": [{"narration": "...", "imagePrompt": "..."} x ${SEGMENT_COUNT}]}`;

/** 완결된 스크립트를 스토리 흐름에 맞게 6개의 5초 분량 장면(내레이션+이미지 프롬프트)으로 나눈다. */
export async function generateScriptSegments(
  fullScript: string,
  apiKey: string,
): Promise<ScriptSegmentDraft[]> {
  if (!apiKey) {
    throw new Error("OpenAI API 키가 없습니다. 설정에서 본인 키를 등록하거나 관리자에게 문의해주세요.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SEGMENT_SYSTEM_PROMPT },
        { role: "user", content: fullScript },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`장면 분할 요청이 실패했습니다. (${response.status}) ${errorBody}`);
  }

  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error("AI가 빈 응답을 반환했습니다.");

  let parsed: { segments?: ScriptSegmentDraft[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("장면 분할 응답을 JSON으로 해석하지 못했습니다.");
  }

  const segments = (parsed.segments ?? []).filter((s) => s?.narration && s?.imagePrompt);
  if (segments.length !== SEGMENT_COUNT) {
    throw new Error(`장면이 ${SEGMENT_COUNT}개가 아니라 ${segments.length}개 생성됐습니다. 다시 시도해주세요.`);
  }
  return segments;
}

export interface BgmPromptResult {
  bgmPrompt: string;
  styleDescription: string;
  excludeStyles: string;
}

// Make.com 시나리오(module 9)의 BGM 프롬프트를 그대로 이식.
const BGM_SYSTEM_PROMPT = "넌 전세계 최고의 유투브 전문 음악 크리에이터이다";

function buildBgmUserPrompt(script: string): string {
  return `Below is a story that will be used to generate background music.

Your task is to create ONE optimized background music prompt that emotionally supports the story.

---

### Output Format (STRICT)

Return ONLY a JSON object using the exact structure below:

{
  "BGM_Prompt": "",
  "Style Description": "",
  "Exclue Styles": ""
}

---

### BGM_Prompt Rules
• Write in natural, descriptive English
• Designed for a 20-25 second cinematic background track
• Emotion should flow naturally from beginning to end
• Avoid lyrics, vocals, or spoken words
• Avoid dramatic or aggressive shifts
• Should feel immersive, emotional, and story-supportive

---

### Style Description Rules
• Use comma-separated descriptive phrases
• Focus on mood, tempo, texture, atmosphere, and emotional progression
• Mention instruments subtly (e.g. soft piano, ambient pads, warm strings)
• Designed for cinematic short-form storytelling

---

### Exclue Styles Rules
• Clearly list styles or elements that should NOT be used
• Include genre, rhythm, or mood exclusions
• Keep it concise

---

### Story Input
${script}`;
}

export async function generateBgmPrompt(fullScript: string, apiKey: string): Promise<BgmPromptResult> {
  if (!apiKey) {
    throw new Error("OpenAI API 키가 없습니다. 설정에서 본인 키를 등록하거나 관리자에게 문의해주세요.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: BGM_SYSTEM_PROMPT },
        { role: "user", content: buildBgmUserPrompt(fullScript) },
      ],
      max_tokens: 4096,
      temperature: 1,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`BGM 프롬프트 생성 요청이 실패했습니다. (${response.status}) ${errorBody}`);
  }

  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error("AI가 빈 응답을 반환했습니다.");

  let parsed: { BGM_Prompt?: string; "Style Description"?: string; "Exclue Styles"?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("BGM 프롬프트 응답을 JSON으로 해석하지 못했습니다.");
  }

  return {
    bgmPrompt: parsed.BGM_Prompt ?? "",
    styleDescription: parsed["Style Description"] ?? "",
    excludeStyles: parsed["Exclue Styles"] ?? "",
  };
}

export interface SegmentImageResult {
  base64: string;
  mimeType: string;
}

export type { NanoBananaModelType } from "@/lib/ai/nanoBananaModels";

/** 장면 이미지 프롬프트로 나노바나나(Gemini 이미지)를 호출해 9:16 세로 이미지를 생성한다. */
export async function generateSegmentImage(
  prompt: string,
  apiKey: string,
  model?: NanoBananaModelType,
): Promise<SegmentImageResult> {
  if (!apiKey) {
    throw new Error("Gemini API 키가 없습니다. 설정에서 본인 키를 등록하거나 관리자에게 문의해주세요.");
  }

  const config = getNanoBananaConfig(model);
  const response = await fetch(`${config.endpoint}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["Image"],
        imageConfig: { aspectRatio: "9:16", imageSize: config.imageSize },
        temperature: config.temperature,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(describeGeminiError(response.status, errorBody));
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[];
  };
  const imagePart = data.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data);
  const base64 = imagePart?.inlineData?.data?.replace(/\s+/g, "");
  const mimeType = imagePart?.inlineData?.mimeType ?? "image/png";

  if (!base64) {
    throw new Error("나노바나나가 이미지를 반환하지 않았습니다.");
  }
  return { base64, mimeType };
}
