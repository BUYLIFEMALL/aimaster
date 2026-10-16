import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.replace(/\r/g, "").trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = val;
  }
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, (env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim()));

async function main() {
  const slug = "naver-blog-allinone";
  console.log(`Updating ${slug} version to v1.13...`);

  const { data, error } = await supabase
    .from("programs")
    .update({
      version: "v1.13",
      extension_version: "v1.13",
    })
    .eq("slug", slug)
    .select("slug, name, version, extension_version")
    .single();

  if (error) {
    console.error("Error updating program version:", error);
    process.exit(1);
  }

  console.log("Updated program version successfully:", data);
}

main().catch(console.error);
