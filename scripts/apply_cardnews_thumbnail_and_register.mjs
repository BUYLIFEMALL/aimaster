import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path) {
  const text = fs.readFileSync(path, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1).replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv("D:/Antigravity/AIMaster/.env.local");
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, (env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim()));

async function main() {
  const srcImage = "C:/Users/Administrator/.gemini/antigravity-cli/brain/4f5c1467-5b51-43c6-9a0c-101992cfa96d/cardnews_studio_thumbnail_1791779608210.jpg";
  const buffer = fs.readFileSync(srcImage);

  // 1. 로컬 파일 복사
  fs.mkdirSync("D:/Antigravity/AIMaster/cardnews-studio/public", { recursive: true });
  fs.writeFileSync("D:/Antigravity/AIMaster/cardnews-studio/public/cardnews-studio-thumbnail.jpg", buffer);
  fs.mkdirSync("D:/Antigravity/AIMaster/scratch", { recursive: true });
  fs.writeFileSync("D:/Antigravity/AIMaster/scratch/cardnews-studio-thumbnail.jpg", buffer);
  console.log("Local files saved successfully.");

  // 2. Supabase Storage program-images 버킷에 업로드
  const storagePath = "catalog/cardnews-studio-thumbnail.jpg";
  const { error: uploadErr } = await supabase.storage
    .from("program-images")
    .upload(storagePath, buffer, { contentType: "image/jpeg", upsert: true });

  if (uploadErr) {
    console.error("Storage upload error:", uploadErr);
    process.exit(1);
  }
  console.log("Storage upload successful:", storagePath);

  // 3. 공개 URL 가져오기 및 버전 쿼리스트링 추가
  const { data: pubUrl } = supabase.storage.from("program-images").getPublicUrl(storagePath);
  const versionedUrl = `${pubUrl.publicUrl}?v=${Date.now()}`;
  console.log("Public Thumbnail URL:", versionedUrl);

  // 4. DB programs 테이블 업데이트 (sort_order = 121로 최상단 배치, 썸네일 등록, 배지 설정)
  const { data: updated, error: updateErr } = await supabase
    .from("programs")
    .update({
      name: "인스타 카드뉴스 자동화",
      thumbnail_url: versionedUrl,
      sort_order: 121,
      badges: ["new", "best"],
      is_active: true,
      app_url: "https://cardnews-studio.buylife.xyz",
    })
    .eq("slug", "cardnews-studio")
    .select();

  if (updateErr) {
    console.error("DB update error:", updateErr);
    process.exit(1);
  }

  console.log("DB programs updated successfully:", JSON.stringify(updated, null, 2));
}

main().catch(console.error);
