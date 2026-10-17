// [이미지 모델 교체 2026-10-17] 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview) → 최신 정식(gemini-nano-banana-2.1·gemini-3-pro-image), 기준: ai-image-studio v1.11 lib/providers/adapters/gemini.ts.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
import { GoogleGenAI, Type } from "@google/genai";
import { buildInfluencerPrompt } from "./influencer-engine";
import { generateGeminiImage } from "./geminiImage";
import {
  LIGHTINGS,
  CAMERA_MODES,
  FILM_STOCKS,
  HAIR_STYLES,
  FACE_STYLES,
  SKIN_TEXTURES,
  AD_TYPES,
} from "@/data/influencer-options";
import type { InfluencerConfig, TimelineScenario } from "@/types/influencer";

/** Korea-time current month rule (prevents season mistakes, docs/ERROR_LESSONS.md 2026-10-14). */
function koreaNowRule(now: Date = new Date()): string {
  const label = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", year: "numeric", month: "long" }).format(now);
  return `[Current time in Korea: ${label}. Match any season or time-of-year wording (spring, summer, autumn, winter, holidays, year-end) to the current month; never invent a different season.]`;
}

/**
 * 1. AI 인플루언서 고화질 이미지 생성 (Gemini 3 Pro Image Preview)
 */
export async function generateInfluencerImage(
  apiKey: string,
  config: InfluencerConfig
): Promise<string> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error("Gemini API 키가 등록되지 않았습니다. 설정에서 본인 키를 등록해주세요.");
  }

  const finalPrompt = buildInfluencerPrompt(config);

  const parts: any[] = [];

  // 인물 참조 이미지 (얼굴/이목구비 고정)
  if (config.personImage) {
    const base64Data = config.personImage.includes(",")
      ? config.personImage.split(",")[1]
      : config.personImage;
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: "image/png",
      },
    });
  }

  // 장소 참조 이미지 (배경 유지)
  if (config.placeImage) {
    const base64Data = config.placeImage.includes(",")
      ? config.placeImage.split(",")[1]
      : config.placeImage;
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: "image/png",
      },
    });
  }

  // 광고 제품 참조 이미지들 (최대 3장)
  if (config.isAdMode && config.productImages && config.productImages.length > 0) {
    for (const prodImg of config.productImages) {
      const base64Data = prodImg.includes(",") ? prodImg.split(",")[1] : prodImg;
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: "image/png",
        },
      });
    }
  }

  // 직전 결과물 (미세 보정 루프)
  if (config.lastResultImage && config.feedback) {
    const base64Data = config.lastResultImage.includes(",")
      ? config.lastResultImage.split(",")[1]
      : config.lastResultImage;
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: "image/png",
      },
    });
  }

  // 프롬프트 텍스트 파트
  parts.push({ text: finalPrompt });

  // 2026-10-18: 호출·대기·이미지 받기는 공용 기준 코드 gemini-image-client(./geminiImage — 기준은 ai-image-studio).
  // 생성 라우트 함수 한도 60초 → 시간 제한 50초, 유료 생성이라 재시도 없음(이중 과금 방지). 실패하면 한국어 안내(키 가림)를
  // 담은 오류를 던지고 라우트가 그 문구를 보여 준다. 모델·비율·화질·프롬프트는 그대로.
  try {
    const image = await generateGeminiImage({
      apiKey,
      modelName: "gemini-3-pro-image",
      parts,
      aspectRatio: config.aspectRatio || "9:16",
      imageSize: config.quality || "1K",
      timeoutMs: 50_000,
      retries: 0,
    });
    return `data:${image.mimeType || "image/png"};base64,${image.base64}`;
  } catch (err: any) {
    console.error("Gemini Image Generation Error:", err?.code ?? "", err?.message ?? "");
    throw err instanceof Error ? err : new Error("이미지 생성 실패");
  }
}

/**
 * 2. 인스타그램 맞춤형 3종 캡션 자동 생성 (Gemini 3 Flash Preview)
 */
export async function generateInstagramCaption(
  apiKey: string,
  config: InfluencerConfig,
  refinementRequest?: string
): Promise<string[]> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error("Gemini API 키가 필요합니다.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const currentYear = new Date().getFullYear();
  const prodName = config.productName || "이 제품";
  const locShort = config.location?.includes(" ")
    ? config.location.split(" ")[0]
    : config.location || "핫플레이스";

  let situationContext = "";
  if (config.isAdMode) {
    const adLabel = AD_TYPES.find((a) => a.id === config.adType)?.labelKo || "광고/협찬";
    situationContext = `
[AD MODE CONTEXT INTEGRATION]
- Situation: Promoting "${prodName}". Ad Type: ${adLabel}.
- Year: ${currentYear}.
- ${koreaNowRule()} Outfits and scenery should fit this season.
- CRITICAL: Seamlessly integrate the scene location (${config.location || "trendy spot"}) and story (${config.storyContext || "daily life"}) into the product introduction.
- Do NOT just sell the product blindly. Describe the organic lifestyle experience of using it in this specific scene.`;
  } else {
    situationContext = `
Situation: Daily influencer lifestyle post (${currentYear}).
Context: At ${config.location || "an aesthetic lifestyle spot"}, wearing ${config.outfit || "a stylish aesthetic outfit"}.
Story: ${config.storyContext || "Casual aesthetic day."}`;
  }

  const promptText = `
Role: You are a famous Korean Instagram Influencer (${config.age || "20s"}-year-old ${config.gender || "female"}).
Task: Write 3 DISTINCT caption options in natural, trendy Korean for this Instagram post.
${situationContext}
${refinementRequest ? `Refinement / Feedback Request: ${refinementRequest}` : ""}

Output Format: Return a JSON array of exactly 3 strings: ["Option 1", "Option 2", "Option 3"]

Guidelines for Options:
1. Option 1 (감성/스토리텔링형): Focus on personal feelings, atmosphere, storytelling. Moderate length with aesthetic paragraph breaks.
2. Option 2 (위트/트렌디형): Short, punchy, witty MZ generation influencer style.
3. Option 3 (질문/소통형): Engage followers directly with a question related to the outfit, scene, or product to maximize comments.

General Rules:
- Use trendy emojis naturally.
- Include 5-10 highly relevant hashtags at the bottom (e.g. #AI인플루언서 #OOTD #일상).
`;

  try {
    const res = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    });

    const parsed = JSON.parse(res.text || "[]");
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    throw new Error("Invalid caption format");
  } catch (err) {
    console.warn("Caption generation fallback triggered:", err);
    // 시간대별 안정적인 폴백 캡션
    const hour = new Date().getHours();
    const greeting =
      hour < 12 ? "굿모닝! ☀️" : hour < 18 ? "나른한 오후 ☕️" : "오늘 하루 마무리 🌙";
    const tagBase = `#${config.ethnicity === "kr" ? "일상" : "Daily"} #OOTD #${locShort} #AI인플루언서`;

    if (config.isAdMode) {
      return [
        `${greeting}\n\n${locShort} 분위기랑 찰떡인 ${prodName}! 💖\n여기서 이거 쓰고 있으니까 다들 뭐냐고 물어보네요 ㅎㅎ\n진짜 인생템 등극..✨\n\n#${prodName} #광고 #협찬 #${locShort}`,
        `${locShort} 필수템 ${prodName} 📸\n이거 하나면 오늘 촬영 끝! 😎\n\n#${prodName} #추천`,
        `${locShort} 뷰 맛집인 거 아시죠? 👀\n근데 저 뭐 들고 있게요?\n맞추는 분께 하트 날려드림! 💕 (${prodName}인 건 비밀)\n\n#${prodName} #이벤트`,
      ];
    } else {
      return [
        `${greeting}\n\n${locShort}에서 ${config.outfit || "예쁜 착장"} 입고 기분 전환 중이에요! 📸\n분위기 너무 좋아서 시간 가는 줄 모르겠네 ㅎㅎ\n다들 오늘 하루 어떠셨나요?\n\n${tagBase}`,
        `${locShort} 바이브 ✨\n오늘 룩 맘에 들어서 박제! 😎\n\n${tagBase}`,
        `${locShort} 왔는데 여기 아시는 분? 🙋‍♀️\n다음에 또 오고 싶은데 근처 맛집 추천해주세요!\n\n${tagBase}`,
      ];
    }
  }
}

// AI 플래너 시스템 인스트럭션
const PLANNER_SYSTEM_INSTRUCTION = `You are a professional social media planner for a top Instagram influencer.
When creating visual configurations, you MUST use the following VALID IDs for the corresponding fields to ensure system compatibility:
- lighting: [${LIGHTINGS.map((l) => l.id).join(", ")}]
- camera: [${CAMERA_MODES.flatMap((c) => c.options).map((o) => o.id).join(", ")}]
- filmStock: [${FILM_STOCKS.map((f) => f.id).join(", ")}]
- hairStyle: [${HAIR_STYLES.map((h) => h.id).join(", ")}]
- faceStyle: [${FACE_STYLES.map((f) => f.id).join(", ")}]
- skin: Use an array of IDs from [${SKIN_TEXTURES.map((s) => s.id).join(", ")}]

For 'outfit', 'location', 'expression', and 'pose', provide descriptive English strings.
Return a JSON array of scenarios.`;

/**
 * 3. 인플루언서의 하루 일과 5대 타임라인 자동 기획 (Gemini 3 Flash Preview)
 */
export async function planInfluencerDay(
  apiKey: string,
  routinePrompt: string,
  persona: string = ""
): Promise<TimelineScenario[]> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error("Gemini API 키가 필요합니다.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const res = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Plan 5 Instagrammable moments across a full day based on: "${routinePrompt}". Persona info: "${persona}". Ensure realistic time progression (Morning to Night).`,
    config: {
      systemInstruction: PLANNER_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            labelKo: { type: Type.STRING },
            labelEn: { type: Type.STRING },
            story: { type: Type.STRING },
            timeOrder: { type: Type.INTEGER },
            config: {
              type: Type.OBJECT,
              properties: {
                outfit: { type: Type.STRING },
                location: { type: Type.STRING },
                expression: { type: Type.STRING },
                pose: { type: Type.STRING },
                lighting: { type: Type.STRING },
                hairStyle: { type: Type.STRING },
                faceStyle: { type: Type.STRING },
                camera: { type: Type.STRING },
                filmStock: { type: Type.STRING },
                skin: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ["outfit", "location", "expression", "pose", "lighting", "camera"],
            },
          },
          required: ["id", "labelKo", "labelEn", "timeOrder", "config", "story"],
        },
      },
    },
  });

  return JSON.parse(res.text || "[]");
}

/**
 * 4. 단일 이벤트 5각 변형 자동 기획 (Gemini 3 Flash Preview)
 */
export async function planEventVariations(
  apiKey: string,
  eventPrompt: string,
  persona: string = ""
): Promise<TimelineScenario[]> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error("Gemini API 키가 필요합니다.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const res = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Create 5 distinct and creative visual variations for this specific event: "${eventPrompt}". Ensure varied camera angles, moods (selfie, full body, detail, editorial). Persona: "${persona}".`,
    config: {
      systemInstruction: PLANNER_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            labelKo: { type: Type.STRING },
            labelEn: { type: Type.STRING },
            story: { type: Type.STRING },
            timeOrder: { type: Type.INTEGER },
            config: {
              type: Type.OBJECT,
              properties: {
                outfit: { type: Type.STRING },
                location: { type: Type.STRING },
                expression: { type: Type.STRING },
                pose: { type: Type.STRING },
                lighting: { type: Type.STRING },
                hairStyle: { type: Type.STRING },
                faceStyle: { type: Type.STRING },
                camera: { type: Type.STRING },
                filmStock: { type: Type.STRING },
                skin: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ["outfit", "location", "expression", "pose", "lighting", "camera"],
            },
          },
          required: ["id", "labelKo", "labelEn", "timeOrder", "config", "story"],
        },
      },
    },
  });

  return JSON.parse(res.text || "[]");
}
