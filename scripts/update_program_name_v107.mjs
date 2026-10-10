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
  const newName = "YOUTUBE VIRAL FINDER";
  const newVersion = "v1.07";
  console.log(`Updating program ${slug} name to "${newName}" and version to ${newVersion}...`);

  const { data, error } = await supabase
    .from("programs")
    .update({
      name: newName,
      version: newVersion,
    })
    .eq("slug", slug)
    .select()
    .single();

  if (error) {
    console.error("Error updating program:", error);
    process.exit(1);
  }

  console.log("Updated program successfully:", data.slug, data.name, data.version);
}

main().catch(console.error);
