// 검증/백필용 스크립트: 이미 완료된 트랙에 나노바나나 고퀄리티 커버를 새로 만들어
// 기존 variant들의 image_url을 교체한다. lib/ai/musicPrompts.ts의 ALBUM_COVER_SYSTEM_PROMPT,
// lib/ai/nanobanana.ts의 generateAlbumCoverImage()와 동일한 로직을 그대로 씀.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
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

const env = loadEnvLocal();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const TRACK_ID = process.argv[2];
if (!TRACK_ID) {
  console.error("Usage: node scripts/backfill-album-cover.mjs <trackId>");
  process.exit(1);
}

const { data: track, error: trackError } = await supabase
  .from("music_tracks")
  .select("id, user_id, title, style_description, prompt_text")
  .eq("id", TRACK_ID)
  .single();
if (trackError || !track) {
  console.error("트랙을 찾을 수 없습니다:", trackError?.message);
  process.exit(1);
}

const { data: keys } = await supabase
  .from("user_api_keys")
  .select("provider, api_key")
  .eq("user_id", track.user_id)
  .in("provider", ["openai", "gemini"]);
const openaiKey = keys?.find((k) => k.provider === "openai")?.api_key;
const geminiKey = keys?.find((k) => k.provider === "gemini")?.api_key;
if (!openaiKey || !geminiKey) {
  console.error("OpenAI 또는 Gemini 키가 없습니다.");
  process.exit(1);
}

const ALBUM_COVER_SYSTEM_PROMPT = `당신은 세계적으로 유명한 음반 커버 아트 디렉터입니다. 주어진 곡의 제목, 스타일, 가사(또는
분위기 설명)를 바탕으로, 그 곡의 정서와 장르를 시각적으로 정확히 담아내는 고퀄리티 정사각형
앨범 커버 이미지를 만들기 위한 영어 프롬프트를 작성하세요.

규칙:
1. 반드시 영어로, 하나의 자연스러운 문단으로 작성하세요.
2. 곡의 장르/분위기/가사 내용에 맞는 구체적인 시각 요소(장소, 조명, 색감, 구도, 오브젝트, 계절감
   등)를 포함하세요 — 추상적인 미사여구보다 실제로 그릴 수 있는 구체적 묘사를 우선하세요.
3. "professional album cover art, highly detailed, sharp focus, cinematic lighting, ultra high
   quality" 같은 고퀄리티 지시문을 자연스럽게 포함하세요.
4. 텍스트, 로고, 타이포그래피를 이미지에 넣으라는 지시는 절대 포함하지 마세요(순수 비주얼만).
5. 인물이 등장하는 장면을 묘사할 경우, 별다른 지시가 없으면 기본적으로 한국인(동아시아인)
   외모로 묘사하세요. 가사나 곡 설명이 해외의 특정 유명인·정치인·연예인·스포츠인을 명시하거나
   명확히 해외 상황/장소를 요구하는 경우에만 그 맥락에 맞게 묘사하세요.
6. 다른 설명/주석 없이 프롬프트 문장만 출력하세요.`;

const userPrompt = `제목: ${track.title}\n스타일: ${track.style_description ?? ""}\n가사/설명:\n${track.prompt_text.slice(0, 1500)}`;

console.log("=== 커버 프롬프트 생성 중 (OpenAI) ===");
const promptRes = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: ALBUM_COVER_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.9,
  }),
});
if (!promptRes.ok) {
  console.error("OpenAI 요청 실패:", promptRes.status, await promptRes.text());
  process.exit(1);
}
const promptData = await promptRes.json();
const coverPrompt = promptData.choices[0].message.content.trim();
console.log("생성된 이미지 프롬프트:\n", coverPrompt);

const NO_TEXT_SUFFIX =
  " Absolutely no text, no words, no letters, no titles, no typography, no captions, no watermark, no logo anywhere in the image — pure visual artwork only.";

console.log("\n=== 앨범 커버 생성 중 (나노바나나, 4K) ===");
const imgRes = await fetch(
  "https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent?key=" + geminiKey,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: coverPrompt + NO_TEXT_SUFFIX }] }],
      generationConfig: {
        responseModalities: ["Image"],
        imageConfig: { aspectRatio: "1:1", imageSize: "4K" },
        temperature: 0.4,
      },
    }),
  },
);
if (!imgRes.ok) {
  console.error("나노바나나 요청 실패:", imgRes.status, await imgRes.text());
  process.exit(1);
}
const imgData = await imgRes.json();
const imagePart = imgData.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
const base64 = imagePart?.inlineData?.data?.replace(/\s+/g, "");
const mimeType = imagePart?.inlineData?.mimeType ?? "image/png";
if (!base64) {
  console.error("나노바나나가 이미지를 반환하지 않았습니다:", JSON.stringify(imgData).slice(0, 500));
  process.exit(1);
}

const ext = mimeType.includes("png") ? "png" : "jpg";
const path = `${track.user_id}/${track.id}/cover.${ext}`;
const buffer = Buffer.from(base64, "base64");
const { error: uploadError } = await supabase.storage.from("music-audio").upload(path, buffer, {
  contentType: mimeType,
  upsert: true,
});
if (uploadError) {
  console.error("업로드 실패:", uploadError.message);
  process.exit(1);
}
const { data: publicUrlData } = supabase.storage.from("music-audio").getPublicUrl(path);
console.log("\n새 커버 URL:", publicUrlData.publicUrl);

const { error: updateError } = await supabase
  .from("music_track_variants")
  .update({ image_url: publicUrlData.publicUrl })
  .eq("track_id", track.id);
if (updateError) {
  console.error("variant 업데이트 실패:", updateError.message);
  process.exit(1);
}
console.log("완료: 이 트랙의 모든 variant 커버를 새 나노바나나 이미지로 교체했습니다.");
