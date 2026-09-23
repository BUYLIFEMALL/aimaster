const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env.local");
let envText = fs.readFileSync(envPath, "utf8");

function getEnv(key) {
  const match = envText.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : process.env[key];
}

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  console.log("Adding 'free' badge to 'ai-image-studio' in programs table...");

  const { data, error } = await supabase
    .from("programs")
    .update({
      badges: ["free", "new"]
    })
    .eq("slug", "ai-image-studio")
    .select();

  if (error) {
    console.error("Failed to update badges:", error);
  } else {
    console.log("Updated programs table with free badge:", data);
  }
}

main().catch(console.error);
