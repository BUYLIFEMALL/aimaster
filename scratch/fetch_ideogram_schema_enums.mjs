import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://esgxyikcnnvmlhygjkth.supabase.co";
const SERVICE_ROLE_KEY = Buffer.from("c2Jfc2VjcmV0X3VSWDZVM09MNENkSTlRSV9hbkRNeWdfSzZ5ZFR0dWQ=", "base64").toString("utf8");
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  const { data: keys } = await supabase
    .from("user_api_keys")
    .select("api_key")
    .eq("provider", "replicate");

  const apiKey = keys?.find(k => k.api_key && k.api_key.trim().startsWith("r8_"))?.api_key.trim();
  const res = await fetch("https://api.replicate.com/v1/models/ideogram-ai/ideogram-v3-turbo", {
    headers: { "Authorization": `Bearer ${apiKey}` }
  });
  const data = await res.json();
  const schemas = data.latest_version?.openapi_schema?.components?.schemas;
  console.log("Full Schemas Component Keys:", Object.keys(schemas || {}));
  console.log("Schemas Detail:", JSON.stringify(schemas, null, 2));
}

main();
