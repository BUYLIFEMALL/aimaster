const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

function getEnv(key) {
  if (process.env[key]) return process.env[key];
  const envPath = path.resolve(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const match = line.match(new RegExp(`^${key}=(.*)$`));
      if (match) return match[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  return "";
}

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL") || "https://esgxyikcnnvmlhygjkth.supabase.co";
const supabaseServiceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseServiceKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY not found in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log("Updating document-translator version to v1.20 in Supabase programs table...");
  const { data, error } = await supabase
    .from("programs")
    .update({ version: "v1.20", updated_at: new Date().toISOString() })
    .eq("slug", "document-translator")
    .select();

  if (error) {
    console.error("Update failed:", error);
    process.exit(1);
  }

  console.log("Update success:", data);
}

main();
