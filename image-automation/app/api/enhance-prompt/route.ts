import { checkProgramAccessApi, getUserApiKey } from "@/lib/access";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(req: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse || !user) return errorResponse;

  try {
    const { idea } = await req.json();
    if (!idea || typeof idea !== "string") {
      return Response.json({ error: "아이디어 텍스트를 입력해주세요." }, { status: 400 });
    }

    // Try fetching user's OpenAI API key first, then Gemini if available
    let openAiKey = await getUserApiKey(user.id, "openai");

    if (!openAiKey) {
      return Response.json({
        error: "API 키 등록이 필요합니다. [API키등록·플랫폼연동] 메뉴에서 OpenAI API 키를 등록해주세요."
      }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: openAiKey });

    const systemPrompt = `You are a world-class AI Image Prompt Engineer.
Your task is to take a simple Korean concept/idea from the user and expand it into a highly detailed, professional, high-resolution image prompt in ENGLISH suitable for Midjourney, DALL-E 3, FLUX, and Imagen 3.

RULES:
1. Main Prompt: Translate and elaborate on the scene with vivid sensory details, subject description, lighting (e.g., volumetric lighting, golden hour, soft studio light), camera setup (e.g., 85mm lens, f/1.8 aperture, photorealistic, 8k resolution, shot on Hasselblad), shot angle, composition, and artistic style.
2. If the user's prompt involves a person (unless specified otherwise as a famous non-Asian figure), explicitly describe them as an EAST ASIAN / KOREAN person with natural, attractive features.
3. Negative Prompt: Provide standard negative terms (e.g., "blurry, low quality, distorted hands, extra limbs, watermark, bad anatomy").
4. Output format MUST be a valid JSON object matching this schema:
{
  "enhancedPrompt": "The full detailed English image prompt",
  "styleNotes": "Brief Korean summary of what style, lighting, and composition were added",
  "negativePrompt": "Comma-separated English negative prompt terms"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `사용자 아이디어: ${idea}` }
      ],
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("AI가 프롬프트 응답을 생성하지 못했습니다.");
    }

    const parsed = JSON.parse(content);
    return Response.json({
      enhancedPrompt: parsed.enhancedPrompt || idea,
      styleNotes: parsed.styleNotes || "상세 묘사 및 인물/조명 옵션 추가됨",
      negativePrompt: parsed.negativePrompt || "blurry, low quality, distorted, extra limbs, watermark"
    });
  } catch (err: any) {
    console.error("Enhance prompt error:", err);
    return Response.json({ error: err.message || "프롬프트 최적화 중 오류가 발생했습니다." }, { status: 500 });
  }
}
