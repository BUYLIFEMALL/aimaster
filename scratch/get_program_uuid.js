const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://esgxyikcnnvmlhygjkth.supabase.co";
const serviceKey = Buffer.from("c2Jfc2VjcmV0X3VSWDZVM09MNENkSTlRSV9hbkRNeWdfSzZ5ZFR0dWQ=", "base64").toString("utf8");
const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  const { data: progs, error } = await supabase
    .from("programs")
    .select("id, name, slug");

  if (error) {
    console.error("Failed to fetch programs:", error);
  } else {
    console.log("Programs in DB:", progs);
  }
}

main().catch(console.error);
