const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://esgxyikcnnvmlhygjkth.supabase.co";
const serviceKey = Buffer.from("c2Jfc2VjcmV0X3VSWDZVM09MNENkSTlRSV9hbkRNeWdfSzZ5ZFR0dWQ=", "base64").toString("utf8");
const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  console.log("Checking tables via REST API...");
  const tables = [
    "user_image_generations",
    "user_api_keys",
    "programs",
    "pricing_plans",
    "user_subscriptions",
    "platform_guides",
    "image_generations",
    "generations",
    "image_history"
  ];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      console.log(`Table '${table}': ERROR -> ${error.message} (${error.code})`);
    } else {
      console.log(`Table '${table}': SUCCESS -> ${data.length} rows returned`);
    }
  }
}

main().catch(console.error);
