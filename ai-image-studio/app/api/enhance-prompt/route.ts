import { checkProgramAccessApi, getUserApiKey } from "@/lib/access";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(req: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { idea, presetStyle = "photorealistic" } = await req.json();
    if (!idea || typeof idea !== "string") {
      return Response.json({ error: "아이디어 텍스트를 입력해주세요." }, { status: 400 });
    }

    let openAiKey = await getUserApiKey(user.id, "openai");

    if (!openAiKey) {
      return Response.json({
        error: "API 키 등록이 필요합니다. [API키등록·플랫폼연동] 메뉴에서 OpenAI API 키를 등록해주세요."
      }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: openAiKey });

    const systemPrompt = `You are an Expert Visual Director and Master Image Prompt Engineer (trained on AIMaster's photorealistic and creative image generation standards).
Your job is to convert a user's Korean idea into a world-class English image generation prompt tailored for DALL-E 3, Midjourney v6, FLUX.1, and Imagen 3.

MASTER PROMPT RULES TO APPLY:

1. ETHNICITY & HUMAN SUBJECT RULE (MANDATORY):
   - Unless the user explicitly names a foreign celebrity/politician or specifies a historical non-Asian setting, whenever human figures appear, depict realistic KOREAN / EAST ASIAN individuals by default with natural skin texture, anatomically correct hands, and physically believable facial proportions.

2. SINGLE UNIFIED FRAME RULE:
   - Always create one unified photographic or artistic scene in a single frame. Do NOT create collages, split screens, storyboards, or multiple panels.

3. VISUAL TONE PRESET RULES based on presetStyle = "${presetStyle}":
   - "photorealistic": Real-world documentary/editorial photography. Specify camera gear (Canon EOS R5, Sony A7R IV, or Nikon Z8), prime lens (35mm prime, 50mm prime, or 85mm portrait prime), aperture (f/1.8 to f/2.8), shutter speed (1/250s), ISO (100-400), lighting (soft daylight, golden hour, or volumetric studio light), 8K resolution, 16-bit RAW photographic look.
   - "3d_digital": High-end 3D digital artwork (Octane render, Cinema 4D look, smooth textures, vibrant volumetric lighting, Pixar/Disney inspired character aesthetic, 3D icon microtexture).
   - "artistic_editorial": High-fashion editorial lookbook style (Vogue fashion magazine shot, dramatic shadow interplay, elegant color palette, high contrast).
   - "vector_illustration": Modern clean vector illustration & flat pop art (Recraft V3 style, bold outlines, harmonious color palette, SVG vector graphics).
   - "cyberpunk_neon": Cyberpunk futuristic aesthetic (glowing neon signs, wet reflection on asphalt, atmospheric haze, blue and magenta lighting, retro-futurism).
   - "oriental_ink": Traditional Oriental Ink wash painting (Sumi-e aesthetic, Xuan rice paper grain, elegant black ink brush strokes, delicate watercolor touches, oriental artistic heritage).
   - "watercolor_pastel": Soft watercolor fairytale illustration (Pastel color palette, paper texture grain, gentle watercolor brush strokes, dreamlike storytelling aesthetic).
   - "cinematic_film": 35mm retro film photography (Kodak Portra 400 film grain, nostalgic warm color grading, vintage lens flare, 90s cinematic storytelling frame).
   - "claymation": Handcrafted claymation 3D stop-motion (Plasticine clay texture, cute miniature lighting, tactile craft stop-motion look, Aardman inspired character design).
   - "webtoon_lineart": Korean Webtoon & manga illustration (Sharp ink line art, clean cel-shaded coloring, vibrant comic book aesthetic, dynamic cell line outline).
   - "architectural": Architectural Digest interior & space design (Minimalist luxury architecture, realistic ambient occlusion, clean geometric lines, ArchDaily lighting harmony).
   - "dark_fantasy": Epic dark fantasy concept art (Elden Ring visual tone, dramatic volumetric fog, gothic architecture, glowing magical runes, dark majestic atmosphere).
   - "minimal_flat": Modern minimal flat vector graphic (Mid-century poster art, bold color blocks, clean graphic design layout, vector geometry).

4. NEGATIVE PROMPT STANDARD BLOCK:
   - Provide a comprehensive English negative prompt (e.g. "blurry, low quality, distorted hands, extra limbs, malformed fingers, watermark, logo, text overlay, bad anatomy, over-smoothed skin, collage, split screen").

OUTPUT FORMAT:
Return strictly a JSON object:
{
  "enhancedPrompt": "The complete, detailed English prompt string",
  "styleNotes": "Brief Korean summary explaining the chosen visual direction, camera/lens setup, lighting, and composition notes",
  "negativePrompt": "Full English negative prompt string"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `사용자 아이디어: "${idea}", 선호 화풍 프리셋: "${presetStyle}"` }
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
      styleNotes: parsed.styleNotes || "마스터 비주얼 룰 및 연출 노하우 적용됨",
      negativePrompt: parsed.negativePrompt || "blurry, low quality, distorted hands, extra limbs, watermark, logo, bad anatomy"
    });
  } catch (err: any) {
    console.error("Enhance prompt error:", err);
    return Response.json({ error: err.message || "프롬프트 최적화 중 오류가 발생했습니다." }, { status: 500 });
  }
}
