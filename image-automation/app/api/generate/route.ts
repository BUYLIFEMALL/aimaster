import { checkProgramAccessApi, getUserApiKey } from "@/lib/access";
import { getProviderAdapter, PROVIDERS_REGISTRY } from "@/lib/providers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(req: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse || !user) return errorResponse;

  try {
    const { provider, model, prompt, negativePrompt, options } = await req.json();

    if (!provider || !model || !prompt) {
      return Response.json({ error: "필수 파라미터(provider, model, prompt)가 누락되었습니다." }, { status: 400 });
    }

    const providerConfig = PROVIDERS_REGISTRY.find(p => p.id === provider);
    if (!providerConfig) {
      return Response.json({ error: `지원하지 않는 플랫폼입니다: ${provider}` }, { status: 400 });
    }

    // Lookup user API key
    const apiKey = await getUserApiKey(user.id, providerConfig.apiKeyProvider);
    if (!apiKey) {
      return Response.json({
        error: `[${providerConfig.name}] API 키가 필요합니다. 상단 'API키등록·플랫폼연동' 메뉴에서 ${providerConfig.name} API 키를 먼저 등록해주세요.`
      }, { status: 400 });
    }

    // Get adapter and generate image
    const adapter = getProviderAdapter(provider);
    const result = await adapter.generateImage({
      prompt,
      negativePrompt,
      model,
      options: options || {},
      apiKey
    });

    // Save to user_image_generations table
    const supabase = await createClient();
    await supabase.from("user_image_generations").insert({
      user_id: user.id,
      provider,
      model,
      prompt,
      enhanced_prompt: result.revisedPrompt || prompt,
      options: options || {},
      image_url: result.imageUrl
    });

    return Response.json({
      success: true,
      imageUrl: result.imageUrl,
      revisedPrompt: result.revisedPrompt,
      metadata: result.metadata
    });
  } catch (err: any) {
    console.error("Image generation API error:", err);
    return Response.json({ error: err.message || "이미지 생성 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
