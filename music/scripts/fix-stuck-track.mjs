// 일회성 복구 스크립트: 웹훅 콜백 URL 버그(NEXT_PUBLIC_MAIN_SITE_URL을 잘못 써서 콜백이
// 도달하지 못함)로 인해 "생성 중" 상태에 멈춘 트랙을, Suno record-info 폴링 엔드포인트로
// 직접 조회해서 웹훅이 했어야 할 저장 작업을 그대로 수행한다. API 키는 절대 로그에 출력하지 않는다.
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
  console.error("Usage: node scripts/fix-stuck-track.mjs <trackId>");
  process.exit(1);
}

const { data: track, error: trackError } = await supabase
  .from("music_tracks")
  .select("id, user_id, planning_id, task_id, status")
  .eq("id", TRACK_ID)
  .single();
if (trackError || !track) {
  console.error("트랙을 찾을 수 없습니다:", trackError?.message);
  process.exit(1);
}
console.log("트랙 상태:", track.status, "taskId:", track.task_id);

const { data: keyRow, error: keyError } = await supabase
  .from("user_api_keys")
  .select("api_key")
  .eq("user_id", track.user_id)
  .eq("provider", "suno")
  .maybeSingle();
if (keyError || !keyRow) {
  console.error("Suno API 키를 찾을 수 없습니다:", keyError?.message);
  process.exit(1);
}
const sunoKey = keyRow.api_key;

const res = await fetch(`https://api.sunoapi.org/api/v1/generate/record-info?taskId=${track.task_id}`, {
  headers: { Authorization: `Bearer ${sunoKey}` },
});
if (!res.ok) {
  console.error("Suno 조회 실패:", res.status, await res.text());
  process.exit(1);
}
const payload = await res.json();
const status = payload.data?.status;
console.log("Suno 쪽 상태:", status);

if (status !== "SUCCESS") {
  console.log("아직 완료되지 않았거나 실패 상태입니다. payload:", JSON.stringify(payload).slice(0, 500));
  process.exit(0);
}

const sunoData = payload.data?.response?.sunoData ?? [];
console.log("받은 트랙 수:", sunoData.length);

async function persistToStorage(path, sourceUrl, contentType) {
  try {
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
  } catch (err) {
    console.error("다운로드 실패:", err.message);
    return sourceUrl;
  }
}

const variants = [];
for (let i = 0; i < sunoData.length; i++) {
  const item = sunoData[i];
  const sourceAudioUrl = item.audioUrl || item.streamAudioUrl;
  if (!sourceAudioUrl) continue;
  const audioUrl = await persistToStorage(`${track.user_id}/${track.id}/${i}.mp3`, sourceAudioUrl, "audio/mpeg");
  const imageUrl = item.imageUrl
    ? await persistToStorage(`${track.user_id}/${track.id}/${i}.jpg`, item.imageUrl, "image/jpeg")
    : null;
  variants.push({
    track_id: track.id,
    user_id: track.user_id,
    suno_audio_id: item.id ?? null,
    audio_url: audioUrl,
    image_url: imageUrl,
    duration_seconds: item.duration != null ? Math.round(item.duration) : null,
  });
}

if (variants.length === 0) {
  console.error("저장할 variant가 없습니다.");
  process.exit(1);
}

const { error: insertError } = await supabase.from("music_track_variants").insert(variants);
if (insertError) {
  console.error("variant 저장 실패:", insertError.message);
  process.exit(1);
}

await supabase.from("music_tracks").update({ status: "completed" }).eq("id", track.id);

const { data: siblingTracks } = await supabase.from("music_tracks").select("status").eq("planning_id", track.planning_id);
const stillGenerating = (siblingTracks ?? []).some((t) => t.status === "generating");
if (!stillGenerating) {
  const allFailed = (siblingTracks ?? []).every((t) => t.status === "failed");
  await supabase.from("music_plannings").update({ status: allFailed ? "error" : "completed" }).eq("id", track.planning_id);
}

console.log(`완료: variant ${variants.length}개 저장, 트랙 상태 completed로 갱신됨.`);
