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
  const { data: programs, error } = await supabase
    .from("programs")
    .select("id, name, slug, app_url, short_desc, version, is_active, category:categories(name, slug)")
    .order("sort_order");

  if (error) {
    console.error(error);
    return;
  }

  console.log(`=== Total ${programs.length} programs ===`);
  programs.forEach((p, idx) => {
    console.log(`${idx + 1}. [${p.category?.name || "기타"}] ${p.name} | slug: ${p.slug} | ver: ${p.version}`);
  });
}

main().catch(console.error);
