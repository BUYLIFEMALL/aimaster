import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envPath = "D:/Antigravity/AIMaster/style-dna-analyzer/.env.local";
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || "";
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from("programs")
    .select("id, name, slug, short_desc, description, version")
    .eq("slug", "style-dna-analyzer")
    .single();

  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

run();
