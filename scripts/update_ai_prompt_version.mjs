import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path) {
  const text = fs.readFileSync(path, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1).replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv("D:/Antigravity/AIMaster/.env.local");
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase
    .from("programs")
    .update({ version: "v1.02", updated_at: new Date().toISOString() })
    .eq("slug", "ai-prompt-studio")
    .select("id, name, slug, version");

  if (error) {
    console.error("DB version update failed:", error);
    process.exit(1);
  }

  console.log("Updated DB version successfully:", data);
}

main().catch(console.error);
