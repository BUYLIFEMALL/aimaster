import { checkProgramAccessApi, getUserApiKey } from "@/lib/access";
import { promptSourceKey } from "@/lib/promptSource";
import { getProviderAdapter, PROVIDERS_REGISTRY } from "@/lib/providers";
import { createAdminClient } from "@/lib/supabase/server";
import { BUCKET, signPaths } from "@/lib/imageStorage";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const AI_IMAGE_STUDIO_PROGRAM_ID = "26b9f0b2-b48b-4f9d-b751-ecb88e98e95e";

// 비공개 저장소에 올리고 파일 경로를 돌려준다(실패하면 null — 공급사 주소를 그대로 쓴다). v1.23
async function uploadToStorage(supabaseAdmin: any, userId: string, originalUrl: string): Promise<string | null> {
  try {
    let buffer: Buffer;
    let contentType = "image/png";

    if (originalUrl.startsWith("data:")) {
      const matches = originalUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (matches) {
        contentType = matches[1];
        buffer = Buffer.from(matches[2], "base64");
      } else {
        return null;
      }
    } else {
      const res = await fetch(originalUrl, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) return null;
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
      .from(BUCKET)
      .upload(fileName, buffer, { contentType, upsert: true });

    if (uploadErr) {
      console.warn("Storage upload failed, fallback to original URL:", uploadErr);
      return null;
    }

    return fileName;
  } catch (err) {
    console.warn("Failed to upload generated image to Supabase storage:", err);
    return null;
  }
}

export async function POST(req: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { provider, model, prompt, negativePrompt, options, ideaSource } = await req.json();
    // v1.26: 다른 프로그램이 보낸 프롬프트의 보낸 곳(공용 이름표에 있는 이름만 기록)
    const source = promptSourceKey(ideaSource);

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
    const logIds: (string | null)[] = [];
    for (let i = 0; i < count; i++) {
      const rawResult = await adapter.generateImage({
        prompt,
        negativePrompt,
        model,
        options: options || {},
        apiKey
      });

      // 비공개 저장소에 보관하고 화면에는 서명 주소를 준다(기록에는 경로만)
      const imagePath = await uploadToStorage(supabaseAdmin, user.id, rawResult.imageUrl);
      const signed = imagePath ? await signPaths(supabaseAdmin, [imagePath]) : {};
      const displayUrl = (imagePath && signed[imagePath]) || rawResult.imageUrl;
      const result = { ...rawResult, imageUrl: displayUrl };

      results.push(result);

      // Save permanent record to usage_logs DB table
      const { data: logRow, error: insertErr } = await supabaseAdmin.from("usage_logs").insert({
        user_id: user.id,
        program_id: AI_IMAGE_STUDIO_PROGRAM_ID,
        action: "image_generation",
        metadata: {
          provider,
          model,
          prompt,
          enhanced_prompt: result.revisedPrompt || prompt,
          options: options || {},
          ...(source ? { ideaSource: source } : {}),
          ...(imagePath ? { image_path: imagePath } : { image_url: rawResult.imageUrl })
        }
      }).select("id").single();
      // v1.27: 화면이 다운로드·바나나로 보낸 것을 이 기록에 남길 수 있게 기록 번호를 돌려준다
      logIds.push(logRow?.id ?? null);

      if (insertErr) {
        console.error("Failed to save image generation to DB usage_logs:", insertErr);
      }
    }

    const primaryResult = results[0];

    return Response.json({
      success: true,
      imageUrl: primaryResult.imageUrl,
      logId: logIds[0] ?? null,
      images: results.map((r, i) => ({ imageUrl: r.imageUrl, revisedPrompt: r.revisedPrompt, metadata: r.metadata, logId: logIds[i] ?? null })),
      revisedPrompt: primaryResult.revisedPrompt,
      metadata: primaryResult.metadata
    });
  } catch (err: any) {
    console.error("Image generation API error:", err);
    return Response.json({ error: err.message || "이미지 생성 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
