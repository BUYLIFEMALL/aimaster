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
  console.log("Checking if user_image_generations table exists...");
  const { data, error } = await supabase.from("user_image_generations").select("id").limit(1);

  if (error && error.code === "42P01") { // undefined_table
    console.log("Table does not exist. Creating via rpc or raw query if possible...");
    // Let's test if rpc exists or execute via supabase admin if available
  } else if (error) {
    console.log("Table query returned error:", error.message);
  } else {
    console.log("user_image_generations table already accessible!");
  }
}

main().catch(console.error);
