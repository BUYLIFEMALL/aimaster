import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path) {
  const text = fs.readFileSync(path, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1).replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv("D:/Antigravity/AIMaster/.env.local");
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, (env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim()));

async function main() {
  console.log("=== AI 12단 상세페이지 자동화 썸네일 V2 업로드 시작 ===");

  const thumbnailPath = "D:/Antigravity/AIMaster/scratch/detail-page-12p-thumbnail.jpg";
  if (!fs.existsSync(thumbnailPath)) {
    throw new Error("썸네일 파일이 존재하지 않습니다: " + thumbnailPath);
  }

  const fileBuffer = fs.readFileSync(thumbnailPath);
  const storagePath = "catalog/detail-page-12p-thumbnail.jpg";

  const { error: uploadErr } = await supabase.storage
    .from("program-images")
    .upload(storagePath, fileBuffer, { contentType: "image/jpeg", upsert: true });

  if (uploadErr) {
    throw uploadErr;
  }

  const { data: pubUrl } = supabase.storage.from("program-images").getPublicUrl(storagePath);
  const newThumbnailUrl = `${pubUrl.publicUrl}?v=${Date.now()}`;
  console.log("✓ 새 썸네일 업로드 완료:", newThumbnailUrl);

  const { error: updErr } = await supabase
    .from("programs")
    .update({
      thumbnail_url: newThumbnailUrl,
      category_id: "3f365685-a7d7-4372-817a-c38217239592", // 이커머스
      updated_at: new Date().toISOString(),
    })
    .eq("slug", "detail-page-12p");

  if (updErr) {
    throw updErr;
  }

  console.log("✓ programs 테이블 thumbnail_url 및 category_id 갱신 완료!");
}

main().catch(console.error);
