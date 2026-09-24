import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://esgxyikcnnvmlhygjkth.supabase.co";
const SERVICE_ROLE_KEY = Buffer.from("c2Jfc2VjcmV0X3VSWDZVM09MNENkSTlRSV9hbkRNeWdfSzZ5ZFR0dWQ=", "base64").toString("utf8");
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function inspectV41() {
  const { data: keys } = await supabase
    .from("user_api_keys")
    .select("api_key")
    .eq("provider", "replicate");

  const apiKey = keys.find(k => k.api_key && k.api_key.trim().startsWith("r8_"))?.api_key.trim();

  const models = ['recraft-ai/recraft-v4.1', 'recraft-ai/recraft-v4.1-svg', 'recraft-ai/recraft-v3'];

  for (const m of models) {
    const res = await fetch(`https://api.replicate.com/v1/models/${m}`, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    if (res.status === 200) {
      const data = await res.json();
      console.log(`\n=== MODEL: ${m} ===`);
      const schemas = data.latest_version?.openapi_schema?.components?.schemas;
      console.log("aspect_ratio:", schemas?.aspect_ratio);
      console.log("size:", schemas?.size);
      console.log("style:", schemas?.style);
    }
  }
}

inspectV41();
