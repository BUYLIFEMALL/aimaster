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

    const systemPrompt = `You are an Expert Visual Director and Master Image Prompt Engineer (trained on Nanobanana, Midjourney v6, FLUX.1, Imagen 3, and DALL-E 3 photorealistic generation standards).
Your job is to convert a user's Korean idea into a world-class English image generation prompt.

WHEN presetStyle = "photorealistic" (OR ANY REAL-WORLD PHOTOGRAPHY SCENE):
You MUST follow these strict Photorealism Rules:
1. SCENE & SUBJECT RULES:
   - The scene MUST be a real-world photographic scene (never illustration, painting, or 3D render).
   - Use cinematic, natural, physically accurate lighting.
   - All people MUST appear as realistic Korean or East Asian individuals, unless specified otherwise.
   - Public/famous figure names must be described by environment and situation, NOT their names.

2. MANDATORY PHOTOREALISM REINFORCEMENT BLOCK (Include in sentence):
   "photorealistic, real-world photography, physically plausible lighting and materials, true-to-life colors, natural film grain, realistic skin texture, accurate scale and perspective, high micro-contrast, optical bokeh, slight sensor noise, subtle chromatic aberration, natural atmospheric depth, realistic material roughness and microtexture"

3. CAMERA METADATA (Include compact phrase in sentence):
   E.g., "shot on Sony A7R IV (or Canon EOS R5 / Nikon Z8) with a 50mm (or 35mm/85mm) prime lens, f/1.8 to f/2.8, 1/250s, ISO 100-400, white balance 5200K-5600K, shallow depth of field, focus plane on main subject, subtle optical vignetting, tripod-level horizon"

4. LIGHTING PRESET (Choose ONE appropriate for scene context):
   - Outdoor Daylight: "golden hour sunlight, soft directional key at 45 degrees, realistic penumbra shadows, gentle aerial haze"
   - Indoor / Lab: "diffused daylight through windows, controlled fluorescent fill light, color-balanced to 5600K"
   - Night / Neon: "visible practical lights and signs, mixed color temperatures from 3200K to 5600K, controlled specular highlights, realistic low-light exposure"

5. PHYSICAL REALISM PHRASES (Include):
   "physically correct shadows, contact shadows, plausible reflections and refractions, real-world surface microtexture, realistic motion blur if movement present"

6. COMPOSITION & OUTPUT SETTINGS (Include):
   "cinematic framing, rule of thirds, layered depth with foreground, midground, and background, high resolution 4K, native aspect ratio 16:9"

7. NEGATIVE PROMPT STANDARD BLOCK (Always append at very end of sentence and negativePrompt field):
   "no illustration, no painting, no vector, no cartoon, no anime, no 3D render, no CGI, no flat shading, no cell shading, no plastic skin, no watermark, no logo artifacts, no posterization, no excessive HDR, no unreal colors"

OTHER VISUAL TONE PRESETS (if presetStyle != "photorealistic"):
   - "pixar_3d": Disney/Pixar 3D animation style (adorable character design, soft volumetric lighting, smooth plastic/fabric textures, expressive big eyes, Cinema 4D Octane render).
   - "ghibli_anime": Studio Ghibli anime aesthetic (Miyazaki Hayao style, hand-drawn watercolor scenery background, fluffy cumulus clouds, nostalgic warm lighting, gentle anime cel shading, peaceful atmosphere).
   - "japanese_anime": High-detail 2D Japanese anime screencap (Makoto Shinkai / Kyoto Animation style, dramatic volumetric lens flare, vibrant saturated colors, crisp line art, beautiful sky and cloud reflection).
   - "3d_digital": High-end 3D digital artwork (Octane render, Cinema 4D look, smooth textures, vibrant volumetric lighting, Pixar/Disney inspired character aesthetic).
   - "artistic_editorial": High-fashion editorial lookbook style (Vogue fashion magazine shot, dramatic shadow interplay, elegant color palette).
   - "vector_illustration": Modern clean vector illustration & flat pop art (bold outlines, SVG vector graphics).
   - "cyberpunk_neon": Cyberpunk futuristic aesthetic (glowing neon signs, wet reflection on asphalt, atmospheric haze).
   - "oriental_ink": Traditional Oriental Ink wash painting (Sumi-e aesthetic, Xuan rice paper grain, elegant black ink brush strokes).
   - "watercolor_pastel": Soft watercolor fairytale illustration (Pastel color palette, paper texture grain).
   - "cinematic_film": 35mm retro film photography (Kodak Portra 400 film grain, nostalgic warm color grading).
   - "claymation": Handcrafted claymation 3D stop-motion (Plasticine clay texture, cute miniature lighting).
   - "webtoon_lineart": Korean Webtoon & manga illustration (Sharp ink line art, clean cel-shaded coloring).
   - "architectural": Architectural Digest interior & space design (Minimalist luxury architecture, realistic ambient occlusion).
   - "dark_fantasy": Epic dark fantasy concept art (dramatic volumetric fog, gothic architecture).
   - "minimal_flat": Modern minimal flat vector graphic (Mid-century poster art, bold color blocks).

OUTPUT FORMAT:
Return strictly a JSON object:
{
  "enhancedPrompt": "The complete, detailed English prompt sentence conforming to all rules",
  "styleNotes": "Brief Korean summary explaining camera gear, lens, aperture, lighting preset, and composition notes",
  "negativePrompt": "no illustration, no painting, no vector, no cartoon, no anime, no 3D render, no CGI, no flat shading, no cell shading, no plastic skin, no watermark, no logo artifacts, no posterization, no excessive HDR, no unreal colors, blurry, low quality, distorted hands, extra limbs, bad anatomy"
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
