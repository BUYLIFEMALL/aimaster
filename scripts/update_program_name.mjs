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
  const slug = "youtube-viral-studio";
  const newName = "유튜브 떡상 쇼츠 발굴(골든 파인더) 자동화";

  console.log(`Updating program name for ${slug} to "${newName}"...`);

  const { data, error } = await supabase
    .from("programs")
    .update({
      name: newName,
      badges: ["free", "new", "best"],
    })
    .eq("slug", slug)
    .select()
    .single();

  if (error) {
    console.error("Error updating program name:", error);
    process.exit(1);
  }

  console.log("Updated program name successfully:", data.name);
}

main().catch(console.error);
