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
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: before } = await supabase
    .from("programs")
    .select("id, slug, name, version, app_url, thumbnail_url, badges")
    .eq("slug", "ebook-studio")
    .single();

  console.log("BEFORE:", before);

  if (before) {
    const { data: updated, error } = await supabase
      .from("programs")
      .update({ version: "v1.02", updated_at: new Date().toISOString() })
      .eq("slug", "ebook-studio")
      .select("id, slug, name, version, updated_at")
      .single();

    if (error) {
      console.error("UPDATE ERROR:", error);
    } else {
      console.log("AFTER:", updated);
    }
  } else {
    console.log("Program ebook-studio not found in programs table.");
  }
}

main().catch(console.error);
