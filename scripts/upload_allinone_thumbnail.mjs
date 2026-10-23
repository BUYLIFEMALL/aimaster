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

const sourcePath = "C:/Users/Administrator/.gemini/antigravity-cli/brain/4f5c1467-5b51-43c6-9a0c-101992cfa96d/allinone_graphic_thumbnail_1791830303974.jpg";
const destPublic = "D:/Antigravity/AIMaster/allinone-graphic/public/allinone-graphic-thumbnail.jpg";
const destScratch = "D:/Antigravity/AIMaster/scratch/allinone-graphic-thumbnail.jpg";

// 1. 파일 복사
fs.copyFileSync(sourcePath, destPublic);
fs.copyFileSync(sourcePath, destScratch);
console.log("Copied thumbnail to local public and scratch");

// 2. Supabase Storage 업로드
const fileBuffer = fs.readFileSync(destPublic);
const storagePath = "catalog/allinone-graphic-thumbnail.jpg";

async function run() {
  console.log("Uploading to Supabase Storage:", storagePath);
  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from("program-images")
    .upload(storagePath, fileBuffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (uploadErr) {
    console.error("Storage upload error:", uploadErr);
    return;
  }
  console.log("Storage upload success:", uploadData);

  const timestamp = Date.now();
  const publicUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/program-images/${storagePath}?v=${timestamp}`;
  console.log("Public URL:", publicUrl);

  // 3. programs 테이블 업데이트
  const { error: progErr } = await supabase
    .from("programs")
    .update({
      thumbnail_url: publicUrl,
      images: [publicUrl],
      updated_at: new Date().toISOString(),
    })
    .eq("slug", "allinone-graphic");

  if (progErr) {
    console.error("Program update error:", progErr);
    return;
  }
  console.log("Updated programs thumbnail_url successfully!");
}

run();
