const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://esgxyikcnnvmlhygjkth.supabase.co";
const serviceKey = Buffer.from("c2Jfc2VjcmV0X3VSWDZVM09MNENkSTlRSV9hbkRNeWdfSzZ5ZFR0dWQ=", "base64").toString("utf8");
const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  console.log("Checking columns of existing candidate tables...");

  const candidateTables = [
    "usage_logs",
    "user_render_settings",
    "user_cloudinary_config",
    "posts",
    "th_posts",
    "site_settings"
  ];

  for (const table of candidateTables) {
    const { data, error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      console.log(`Table '${table}' query error:`, error.message);
    } else {
      console.log(`Table '${table}' columns:`, data.length > 0 ? Object.keys(data[0]) : "0 rows (table exists)");
    }
  }
}

main().catch(console.error);
