import { checkProgramAccessApi, getUserApiKey } from "@/lib/access";
import { getProviderAdapter, PROVIDERS_REGISTRY } from "@/lib/providers";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const AI_IMAGE_STUDIO_PROGRAM_ID = "26b9f0b2-b48b-4f9d-b751-ecb88e98e95e";

async function uploadToStorage(supabaseAdmin: any, userId: string, originalUrl: string): Promise<string> {
  try {
    let buffer: Buffer;
    let contentType = "image/png";

    if (originalUrl.startsWith("data:")) {
      const matches = originalUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (matches) {
        contentType = matches[1];
        buffer = Buffer.from(matches[2], "base64");
      } else {
        return originalUrl;
      }
    } else {
      const res = await fetch(originalUrl, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) return originalUrl;
      const arrayBuffer = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      const headersContentType = res.headers.get("content-type");
      if (headersContentType) {
        contentType = headersContentType;
      }
    }

    const ext = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : contentType.includes("webp") ? "webp" : "png";
    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from("ai-image-generations")
      .upload(fileName, buffer, { contentType, upsert: true });

    if (uploadErr) {
      console.warn("Storage upload failed, fallback to original URL:", uploadErr);
      return originalUrl;
    }

    const { data } = supabaseAdmin.storage.from("ai-image-generations").getPublicUrl(fileName);
    return data.publicUrl || originalUrl;
  } catch (err) {
    console.warn("Failed to upload generated image to Supabase storage:", err);
    return originalUrl;
  }
}

export async function POST(req: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

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

    const count = Math.min(Math.max(parseInt(options?.n || "1", 10), 1), 10);
    const adapter = getProviderAdapter(provider);
    const supabaseAdmin = createAdminClient();

    const results = [];
    for (let i = 0; i < count; i++) {
      const rawResult = await adapter.generateImage({
        prompt,
        negativePrompt,
        model,
        options: options || {},
        apiKey
      });

      // Upload image to permanent Supabase Storage bucket so URLs never expire
      const permanentUrl = await uploadToStorage(supabaseAdmin, user.id, rawResult.imageUrl);
      const result = { ...rawResult, imageUrl: permanentUrl };

      results.push(result);

      // Save permanent record to usage_logs DB table
      const { error: insertErr } = await supabaseAdmin.from("usage_logs").insert({
        user_id: user.id,
        program_id: AI_IMAGE_STUDIO_PROGRAM_ID,
        action: "image_generation",
        metadata: {
          provider,
          model,
          prompt,
          enhanced_prompt: result.revisedPrompt || prompt,
          options: options || {},
          image_url: permanentUrl
        }
      });

      if (insertErr) {
        console.error("Failed to save image generation to DB usage_logs:", insertErr);
      }
    }

    const primaryResult = results[0];

    return Response.json({
      success: true,
      imageUrl: primaryResult.imageUrl,
      images: results.map(r => ({ imageUrl: r.imageUrl, revisedPrompt: r.revisedPrompt, metadata: r.metadata })),
      revisedPrompt: primaryResult.revisedPrompt,
      metadata: primaryResult.metadata
    });
  } catch (err: any) {
    console.error("Image generation API error:", err);
    return Response.json({ error: err.message || "이미지 생성 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
