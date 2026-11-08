import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv(envPath) {
  const text = fs.readFileSync(envPath, "utf8");
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

const env = loadEnv(".env.local");
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

export async function uploadAndRegisterThumbnail(inputPath) {
  if (!fs.existsSync(inputPath)) {
    console.error("Thumbnail file not found:", inputPath);
    process.exit(1);
  }

  const buffer = fs.readFileSync(inputPath);
  const ext = path.extname(inputPath).toLowerCase() === ".png" ? "png" : "jpg";
  const contentType = ext === "png" ? "image/png" : "image/jpeg";

  // 1. Supabase Storage `program-images` 버킷 업로드
  const storagePath = `catalog/free-music-studio-thumbnail.${ext}`;
  console.log(`Uploading to storage bucket 'program-images' path '${storagePath}'...`);
  
  const { error: uploadErr } = await supabase.storage
    .from("program-images")
    .upload(storagePath, buffer, {
      contentType,
      upsert: true
    });

  if (uploadErr) {
    console.error("Storage upload error:", uploadErr);
    process.exit(1);
  }
  console.log("Storage upload successful!");

  // 2. 공개 URL 가져오기 및 버전 타임스탬프 부여
  const { data: pubUrl } = supabase.storage.from("program-images").getPublicUrl(storagePath);
  const versionedUrl = `${pubUrl.publicUrl}?v=${Date.now()}`;
  console.log("Public Thumbnail URL:", versionedUrl);

  // 3. programs 테이블 업데이트
  const { data: updated, error: updateErr } = await supabase
    .from("programs")
    .update({
      thumbnail_url: versionedUrl,
      updated_at: new Date().toISOString()
    })
    .eq("slug", "free-music-studio")
    .select("id, name, slug, thumbnail_url, updated_at");

  if (updateErr) {
    console.error("DB update error:", updateErr);
    process.exit(1);
  }

  console.log("Updated programs table successfully:", JSON.stringify(updated, null, 2));
  return versionedUrl;
}

if (process.argv[1] && process.argv[1].endsWith("apply_free_music_studio_thumbnail.mjs")) {
  const file = process.argv[2] || "D:/Antigravity/AIMaster/scratch/free-music-studio-thumbnail.jpg";
  uploadAndRegisterThumbnail(file).catch(err => {
    console.error("Unexpected error:", err);
    process.exit(1);
  });
}
