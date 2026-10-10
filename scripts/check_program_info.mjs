import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = val;
  }
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  const { data: program } = await supabase
    .from("programs")
    .select("id, slug, name, badges, is_active, required_grade_id, app_url")
    .eq("slug", "youtube-viral-studio")
    .single();

  console.log("PROGRAM INFO:", program);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, is_admin, role, grade_id, is_suspended")
    .in("email", ["buylifemall@gmail.com", "buylifemall@naver.com"]);

  console.log("PROFILES:", profiles);
}

main().catch(console.error);
