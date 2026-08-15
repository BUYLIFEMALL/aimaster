// 일회성 복구 스크립트: WAV 변환 웹훅 파싱 버그(data.audioWavUrl 대신 data.response.audioWavUrl에
// 온 케이스를 놓침)로 인해 실제로는 성공했는데 "실패"로 잘못 저장된 music_track_wav row를,
// Suno wav/record-info 폴링 엔드포인트로 직접 조회해서 웹훅이 했어야 할 저장 작업을 수행한다.
// API 키는 절대 로그에 출력하지 않는다.
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

const WAV_ID = process.argv[2];
if (!WAV_ID) {
  console.error("Usage: node scripts/fix-stuck-wav.mjs <musicTrackWavId>");
  process.exit(1);
}

const { data: wav, error: wavError } = await supabase
  .from("music_track_wav")
  .select("id, user_id, variant_id, task_id, status")
  .eq("id", WAV_ID)
  .single();
if (wavError || !wav) {
  console.error("WAV 요청을 찾을 수 없습니다:", wavError?.message);
  process.exit(1);
}
console.log("WAV 상태:", wav.status, "taskId:", wav.task_id);

const { data: keyRow, error: keyError } = await supabase
  .from("user_api_keys")
  .select("api_key")
  .eq("user_id", wav.user_id)
  .eq("provider", "suno")
  .maybeSingle();
if (keyError || !keyRow) {
  console.error("Suno API 키를 찾을 수 없습니다:", keyError?.message);
  process.exit(1);
}
const sunoKey = keyRow.api_key;

const res = await fetch(`https://api.sunoapi.org/api/v1/wav/record-info?taskId=${wav.task_id}`, {
  headers: { Authorization: `Bearer ${sunoKey}` },
});
if (!res.ok) {
  console.error("Suno 조회 실패:", res.status, await res.text());
  process.exit(1);
}
const payload = await res.json();
console.log("Suno 원본 응답:", JSON.stringify(payload));

const status = payload.data?.successFlag;
console.log("Suno 쪽 상태(successFlag):", status);

if (status !== "SUCCESS") {
  console.log("아직 완료되지 않았거나 실패 상태입니다.");
  process.exit(0);
}

const audioWavUrl = payload.data?.response?.audioWavUrl;
if (!audioWavUrl) {
  console.error("SUCCESS인데 audioWavUrl을 찾을 수 없습니다. 원본 응답을 확인하세요.");
  process.exit(1);
}

async function persistToStorage(path, sourceUrl, contentType) {
  const r = await fetch(sourceUrl);
  if (!r.ok) return sourceUrl;
  const buffer = Buffer.from(await r.arrayBuffer());
  const { error } = await supabase.storage.from("music-audio").upload(path, buffer, { contentType, upsert: true });
  if (error) {
    console.error("업로드 실패:", error.message);
    return sourceUrl;
  }
  const { data } = supabase.storage.from("music-audio").getPublicUrl(path);
  return data.publicUrl;
}

const wavUrl = await persistToStorage(`${wav.user_id}/${wav.variant_id}/converted.wav`, audioWavUrl, "audio/wav");

const { error: updateError } = await supabase
  .from("music_track_wav")
  .update({ status: "completed", wav_url: wavUrl, error_message: null })
  .eq("id", wav.id);
if (updateError) {
  console.error("업데이트 실패:", updateError.message);
  process.exit(1);
}

console.log("완료: WAV 저장됨 ->", wavUrl);
