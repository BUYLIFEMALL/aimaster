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
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, (env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim()));

async function run() {
  const { data: p, error } = await supabase.from("programs").select("*").eq("slug", "detail-page-12p").single();
  if (error) {
    console.error("Program select error:", error);
    return;
  }
  console.log("Program:", JSON.stringify(p, null, 2));

  const { data: plans } = await supabase.from("pricing_plans").select("*").eq("program_id", p.id);
  console.log("Plans count:", plans?.length, plans);
}

run();
