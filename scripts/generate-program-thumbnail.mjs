// 프로그램 카탈로그(programs.thumbnail_url)용 썸네일을 생성해서 반영하는 재사용 스크립트.
// docs/PLATFORM_PATTERNS.md §12 정책: Cloudinary의 generate-image(대행 생성, 월 50회 한도)를
// 거치지 않고 Gemini(나노바나나)를 직접 호출한 뒤, 결과를 Supabase Storage의 기존 public
// 버킷(program-images)에 업로드하고 그 공개 URL을 DB에 바로 반영한다(정적 파일이 아니라
// DB 값이라 재배포 불필요).
//
// Usage: node scripts/generate-program-thumbnail.mjs <program-slug> <geminiUserId> "<prompt>"
import { readFileSync, writeFileSync } from "node:fs";
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

const [slug, geminiUserId, prompt] = process.argv.slice(2);
if (!slug || !geminiUserId || !prompt) {
  console.error('Usage: node scripts/generate-program-thumbnail.mjs <program-slug> <geminiUserId> "<prompt>"');
  process.exit(1);
}

const env = loadEnvLocal(new URL("../.env.local", import.meta.url));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: keyRow, error: keyErr } = await supabase
  .from("user_api_keys")
  .select("api_key")
  .eq("user_id", geminiUserId)
  .eq("provider", "gemini")
  .maybeSingle();
if (keyErr || !keyRow?.api_key) {
  console.error("Gemini API 키를 찾지 못했습니다:", keyErr?.message ?? "no key registered");
  process.exit(1);
}
const geminiKey = keyRow.api_key;

// 나노바나나 프로(Gemini 3 Pro Image) 우선, 없으면 나노바나나(2.5 Flash Image)로 폴백.
const MODEL_CANDIDATES = [
  "gemini-3-pro-image-preview",
  "gemini-2.5-flash-image",
];

let imageBase64 = null;
let usedModel = null;
for (const model of MODEL_CANDIDATES) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    console.error(`[${model}] 실패 (${res.status}):`, errText.slice(0, 300));
    continue;
  }
  const json = await res.json();
  const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (part) {
    imageBase64 = part.inlineData.data;
    usedModel = model;
    break;
  }
  console.error(`[${model}] 응답에 이미지 데이터 없음:`, JSON.stringify(json).slice(0, 300));
}

if (!imageBase64) {
  console.error("모든 모델 후보로 이미지 생성 실패");
  process.exit(1);
}
console.log("사용된 모델:", usedModel);

const buffer = Buffer.from(imageBase64, "base64");
const localPath = new URL(`../scripts/.tmp-${slug}-thumbnail.jpg`, import.meta.url);
writeFileSync(localPath, buffer);
console.log("로컬 저장:", localPath.pathname, `${buffer.length} bytes`);

const storagePath = `catalog/${slug}-thumbnail.jpg`;
const { error: uploadErr } = await supabase.storage
  .from("program-images")
  .upload(storagePath, buffer, { contentType: "image/jpeg", upsert: true });
if (uploadErr) {
  console.error("업로드 실패:", uploadErr.message);
  process.exit(1);
}

const { data: pub } = supabase.storage.from("program-images").getPublicUrl(storagePath);
console.log("업로드 완료:", pub.publicUrl);

const { error: updateErr } = await supabase
  .from("programs")
  .update({ thumbnail_url: pub.publicUrl })
  .eq("slug", slug);
if (updateErr) {
  console.error("programs.thumbnail_url 갱신 실패:", updateErr.message);
  process.exit(1);
}
console.log(`programs.thumbnail_url 갱신 완료 (slug=${slug})`);
