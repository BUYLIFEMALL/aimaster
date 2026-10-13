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
  const { data } = await supabase.from("programs").select("slug, badges");
  const badgesSet = new Set();
  for (const p of data || []) {
    if (Array.isArray(p.badges)) {
      p.badges.forEach((b) => badgesSet.add(b));
    }
  }
  console.log("All distinct badges in programs:", Array.from(badgesSet));
}

main().catch(console.error);
