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
  const srcImage = "C:/Users/Administrator/.gemini/antigravity-cli/brain/4f5c1467-5b51-43c6-9a0c-101992cfa96d/emotion_writer_thumbnail_1791780803424.jpg";
  const buffer = fs.readFileSync(srcImage);

  // 1. 로컬 저장
  fs.mkdirSync("D:/Antigravity/AIMaster/emotion-writer/public", { recursive: true });
  fs.writeFileSync("D:/Antigravity/AIMaster/emotion-writer/public/emotion-writer-thumbnail.jpg", buffer);
  fs.mkdirSync("D:/Antigravity/AIMaster/scratch", { recursive: true });
  fs.writeFileSync("D:/Antigravity/AIMaster/scratch/emotion-writer-thumbnail.jpg", buffer);
  console.log("Local files saved successfully.");

  // 2. Storage 업로드
  const storagePath = "catalog/emotion-writer-thumbnail.jpg";
  const { error: uploadErr } = await supabase.storage
    .from("program-images")
    .upload(storagePath, buffer, { contentType: "image/jpeg", upsert: true });

  if (uploadErr) {
    console.error("Storage upload error:", uploadErr);
    process.exit(1);
  }
  console.log("Storage upload successful:", storagePath);

  // 3. 공개 URL 생성
  const { data: pubUrl } = supabase.storage.from("program-images").getPublicUrl(storagePath);
  const versionedUrl = `${pubUrl.publicUrl}?v=${Date.now()}`;
  console.log("Public Thumbnail URL:", versionedUrl);

  // 4. DB programs 갱신
  const { data: updated, error: updateErr } = await supabase
    .from("programs")
    .update({
      name: "감성 글귀 이미지",
      thumbnail_url: versionedUrl,
      sort_order: 122,
      badges: ["new", "best"],
      short_desc: "AI로 마음을 울리는 감성 글귀와 아름다운 배경 사진을 합성하여 완성도 높은 카드 이미지를 제작하는 스튜디오",
      description: "명언·좋은 글, 건강·행복 기원, 카톡·밴드 공유 문구를 본인 API 키로 생성합니다. 직접 입력한 문구도 사용할 수 있습니다. 나노바나나 배경 생성 또는 Pixabay·Pexels 사진 선택, 9:16·1:1·3:4 비율, 한글 글꼴·색·배치 조절, PNG·JPG 저장을 제공합니다. 모든 AI 호출은 회원 본인의 키로 이루어집니다.",
      is_active: true,
      app_url: "https://emotion-writer.buylife.xyz",
      updated_at: new Date().toISOString(),
    })
    .eq("slug", "emotion-writer")
    .select();

  if (updateErr) {
    console.error("DB update error:", updateErr);
    process.exit(1);
  }

  console.log("DB programs updated successfully:", JSON.stringify(updated, null, 2));
}

main().catch(console.error);
