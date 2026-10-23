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

export async function uploadAndApplyThumbnail() {
  const thumbPath = "D:/Antigravity/AIMaster/scratch/youtube-playlist-auto-thumbnail.jpg";
  if (!fs.existsSync(thumbPath)) {
    console.error("Thumbnail file not found at:", thumbPath);
    return;
  }

  const fileBuffer = fs.readFileSync(thumbPath);
  const storagePath = "catalog/youtube-playlist-auto-thumbnail.jpg";

  console.log("Uploading thumbnail to Supabase Storage...");
  const { error: uploadErr } = await supabase.storage
    .from("program-images")
    .upload(storagePath, fileBuffer, { contentType: "image/jpeg", upsert: true });

  if (uploadErr) {
    console.error("Upload error:", uploadErr);
    return;
  }

  const { data: pubUrl } = supabase.storage.from("program-images").getPublicUrl(storagePath);
  const newThumbnailUrl = `${pubUrl.publicUrl}?v=${Date.now()}`;
  console.log("New public thumbnail URL:", newThumbnailUrl);

  const { data, error: updateErr } = await supabase
    .from("programs")
    .update({
      thumbnail_url: newThumbnailUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", "yt-playlist-studio")
    .select();

  if (updateErr) {
    console.error("Program update error:", updateErr);
  } else {
    console.log("Program thumbnail updated successfully:", data[0].name, data[0].thumbnail_url);
  }
}

uploadAndApplyThumbnail().catch(console.error);
