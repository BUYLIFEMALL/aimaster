// 일회성 스크립트: 메인 사이트(programs 테이블)의 music 프로그램 카드용 썸네일을 생성해서
// Supabase Storage의 기존 program-images 버킷(다른 프로그램 썸네일도 이미 쓰는 공용 버킷)에
// 업로드하고 공개 URL을 출력한다. 이미지 자체는 나노바나나(Gemini)로 별도 생성한 뒤 로컬에
// 저장해뒀다가 이 스크립트로 업로드만 한다.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal(path) {
  const text = readFileSync(path, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return env;
}

const env = loadEnvLocal(new URL("../.env.local", import.meta.url));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node scripts/upload-music-thumbnail.mjs <localImagePath>");
  process.exit(1);
}
const buffer = readFileSync(filePath);

const storagePath = "catalog/music-automation-thumbnail.jpg";
const { error } = await supabase.storage
  .from("program-images")
  .upload(storagePath, buffer, { contentType: "image/jpeg", upsert: true });
if (error) {
  console.error("업로드 실패:", error.message);
  process.exit(1);
}

const { data } = supabase.storage.from("program-images").getPublicUrl(storagePath);
console.log("업로드 완료:", data.publicUrl);
