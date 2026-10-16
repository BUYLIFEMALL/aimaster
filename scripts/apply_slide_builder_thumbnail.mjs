import fs from "node:fs";
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

const env = loadEnv("D:/Antigravity/AIMaster/.env.local");
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, (env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim()));

async function main() {
  const possiblePaths = [
    "C:/Users/Administrator/.gemini/antigravity-cli/brain/4f5c1467-5b51-43c6-9a0c-101992cfa96d/ai_slide_builder_pro_thumbnail_1791860816048.jpg",
    "D:/Antigravity/AIMaster/scratch/ai-slide-builder-thumbnail.jpg",
    "D:/Antigravity/AIMaster/ai-slide-builder/public/ai-slide-builder-thumbnail.jpg",
  ];

  let srcImage = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      srcImage = p;
      break;
    }
  }

  if (!srcImage) {
    console.error("Thumbnail image not found in possible paths.");
    process.exit(1);
  }

  const buffer = fs.readFileSync(srcImage);

  // 1. 로컬 파일 복사
  fs.mkdirSync("D:/Antigravity/AIMaster/ai-slide-builder/public", { recursive: true });
  fs.writeFileSync("D:/Antigravity/AIMaster/ai-slide-builder/public/ai-slide-builder-thumbnail.jpg", buffer);
  fs.mkdirSync("D:/Antigravity/AIMaster/scratch", { recursive: true });
  fs.writeFileSync("D:/Antigravity/AIMaster/scratch/ai-slide-builder-thumbnail.jpg", buffer);
  console.log("Local files saved successfully.");

  // 2. Supabase Storage program-images 버킷에 업로드
  const storagePath = "catalog/ai-slide-builder-thumbnail.jpg";
  const { error: uploadErr } = await supabase.storage
    .from("program-images")
    .upload(storagePath, buffer, { contentType: "image/jpeg", upsert: true });

  if (uploadErr) {
    console.error("Storage upload error:", uploadErr);
    process.exit(1);
  }
  console.log("Storage upload successful:", storagePath);

  // 3. Public URL 생성
  const { data: publicUrlData } = supabase.storage
    .from("program-images")
    .getPublicUrl(storagePath);

  const finalUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;
  console.log("Final Public URL:", finalUrl);

  // 4. programs 테이블 ai-slide-builder 업데이트
  const { data: updated, error: updateErr } = await supabase
    .from("programs")
    .update({ thumbnail_url: finalUrl })
    .eq("slug", "ai-slide-builder")
    .select();

  if (updateErr) {
    console.error("Programs update error:", updateErr);
  } else {
    console.log("Program updated with thumbnail:", updated);
  }
}

main().catch(console.error);
