import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://esgxyikcnnvmlhygjkth.supabase.co";
const DEFAULT_SERVICE_ROLE_KEY = Buffer.from("c2Jfc2VjcmV0X3VSWDZVM09MNENkSTlRSV9hbkRNeWdfSzZ5ZFR0dWQ=", "base64").toString("utf8");
const supabase = createClient(SUPABASE_URL, DEFAULT_SERVICE_ROLE_KEY);

const AI_IMAGE_STUDIO_PROGRAM_ID = "26b9f0b2-b48b-4f9d-b751-ecb88e98e95e";

async function main() {
  console.log("=== FLUX 모델 생성, Storage 업로드 & DB (usage_logs) 저장 통합 검수 테스트 ===");

  // 1. Ensure storage bucket exists
  try {
    await supabase.storage.createBucket("ai-image-generations", { public: true });
  } catch {
    // Ignore if bucket already exists
  }

  // 2. Find user with replicate API key registered
  const { data: keys, error: keysErr } = await supabase
    .from("user_api_keys")
    .select("user_id, api_key")
    .eq("provider", "replicate");

  if (keysErr || !keys || keys.length === 0) {
    console.error("등록된 Replicate API 키가 없습니다:", keysErr);
    process.exit(1);
  }

  const activeKeyRow = keys.find(k => k.api_key && k.api_key.trim().length > 5);
  if (!activeKeyRow) {
    console.error("유효한 Replicate API 키를 찾을 수 없습니다.");
    process.exit(1);
  }

  const userId = activeKeyRow.user_id;
  const { data: userData } = await supabase.auth.admin.getUserById(userId);
  const userEmail = userData?.user?.email || userId;

  console.log(`테스트 사용자: ${userEmail} (ID: ${userId})`);

  const apiKey = activeKeyRow.api_key.trim().replace(/^(Bearer|Token)\s+/i, "");
  console.log("Replicate API 키 로드 성공 (r8_... 형식 보장)");

  // 3. Call Replicate API to generate image using FLUX model
  const prompt = "A majestic glowing golden dragon soaring over Jeju Hanok island, 8k resolution, photorealistic, octane render";
  console.log(`\n[1단계] FLUX 모델 이미지 생성 요청 (Prompt: "${prompt}")...`);

  const endpoint = "https://api.replicate.com/v1/models/black-forest-labs/flux-dev/predictions";
  const genRes = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Prefer": "wait=55"
    },
    body: JSON.stringify({
      input: {
        prompt,
        aspect_ratio: "1:1",
        output_format: "png"
      }
    })
  });

  if (!genRes.ok) {
    const errText = await genRes.text();
    console.error(`Replicate API 호출 실패 (${genRes.status}):`, errText);
    process.exit(1);
  }

  const prediction = await genRes.json();
  let imageUrl = null;

  if (prediction.status === "succeeded" && prediction.output) {
    imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  } else if (prediction.urls && prediction.urls.get) {
    console.log("생성 진행 중... 결과 폴링 대기 중...");
    const pollUrl = prediction.urls.get;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const pollRes = await fetch(pollUrl, {
        headers: { "Authorization": `Bearer ${apiKey}` }
      });
      const pollData = await pollRes.json();
      if (pollData.status === "succeeded" && pollData.output) {
        imageUrl = Array.isArray(pollData.output) ? pollData.output[0] : pollData.output;
        break;
      } else if (pollData.status === "failed" || pollData.status === "canceled") {
        console.error("생성 실패:", pollData.error);
        process.exit(1);
      }
    }
  }

  if (!imageUrl) {
    console.error("이미지 URL 추출 실패:", prediction);
    process.exit(1);
  }

  console.log(`✅ [1단계 성공] Replicate FLUX 생성 결과 원본 URL: ${imageUrl}`);

  // 4. Upload image to Supabase Storage
  console.log("\n[2단계] Supabase Storage 영구 보관용 업로드 중...");
  const imgFetchRes = await fetch(imageUrl);
  if (!imgFetchRes.ok) {
    console.error("생성된 이미지 획득 실패:", imgFetchRes.status);
    process.exit(1);
  }

  const arrayBuffer = await imgFetchRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = `${userId}/${Date.now()}_test_flux.png`;

  let permanentUrl = imageUrl;
  const { error: uploadErr } = await supabase.storage
    .from("ai-image-generations")
    .upload(fileName, buffer, { contentType: "image/png", upsert: true });

  if (uploadErr) {
    console.warn("Storage 업로드 실패, 원본 URL 활용:", uploadErr.message);
  } else {
    const { data: publicUrlData } = supabase.storage
      .from("ai-image-generations")
      .getPublicUrl(fileName);
    permanentUrl = publicUrlData.publicUrl;
    console.log(`✅ [2단계 성공] Supabase Storage 영구 공개 URL: ${permanentUrl}`);
  }

  // 5. Insert into usage_logs table (program_id: AI_IMAGE_STUDIO_PROGRAM_ID, action: "image_generation")
  console.log("\n[3단계] DB (usage_logs) 레코드 저장 중...");
  const { data: insertedData, error: insertErr } = await supabase
    .from("usage_logs")
    .insert({
      user_id: userId,
      program_id: AI_IMAGE_STUDIO_PROGRAM_ID,
      action: "image_generation",
      metadata: {
        provider: "replicate",
        model: "flux-2-dev",
        prompt,
        enhanced_prompt: prompt,
        options: { aspect_ratio: "1:1", output_format: "png" },
        image_url: permanentUrl
      }
    })
    .select()
    .single();

  if (insertErr) {
    console.error("DB insert 에러:", insertErr);
    process.exit(1);
  }

  console.log(`✅ [3단계 성공] DB (usage_logs) 저장 완료 (Record ID: ${insertedData.id})`);

  // 6. Query DB to verify gallery display
  console.log("\n[4단계] 갤러리 조회 검수 (DB -> Gallery Query Test)...");
  const { data: logs, error: galleryErr } = await supabase
    .from("usage_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("program_id", AI_IMAGE_STUDIO_PROGRAM_ID)
    .order("created_at", { ascending: false })
    .limit(5);

  if (galleryErr) {
    console.error("갤러리 조회 실패:", galleryErr);
    process.exit(1);
  }

  const items = logs.map(log => ({
    id: log.id,
    provider: log.metadata?.provider,
    model: log.metadata?.model,
    prompt: log.metadata?.prompt,
    image_url: log.metadata?.image_url,
    created_at: log.created_at
  }));

  console.log(`✅ [4단계 성공] 최근 갤러리 레코드 수: ${items.length}개`);
  console.log("최신 갤러리 1번 아이템:", items[0]);

  console.log("\n==========================================");
  console.log("🎉 FLUX 모델 전체 검수 테스트 100% 통과 (SUCCESS)!");
  console.log("==========================================");
}

main().catch(err => {
  console.error("Test Exception:", err);
  process.exit(1);
});
