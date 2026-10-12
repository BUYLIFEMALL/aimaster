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
  const { data: before, error: err } = await supabase
    .from("programs")
    .select("id, slug, name, version, app_url, category_id, badges, short_desc")
    .eq("slug", "cardnews-studio")
    .single();

  console.log("BEFORE:", before, "ERROR:", err);


  if (before) {
    const { data: updated, error } = await supabase
      .from("programs")
      .update({
        name: "인스타 카드뉴스 자동화",
        version: "v1.04",
        short_desc: "AI가 인스타 4:5·1:1 카드뉴스를 기획·디자인하고 피드 캡션과 해시태그까지 완성하는 올인원 스튜디오",
        updated_at: new Date().toISOString(),
      })
      .eq("slug", "cardnews-studio")
      .select("id, slug, name, version, short_desc, updated_at")
      .single();

    if (error) {
      console.error("UPDATE ERROR:", error);
    } else {
      console.log("AFTER:", updated);
    }
  } else {
    console.log("cardnews-studio not found in programs table.");
  }
}

main().catch(console.error);
