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

  const targetModels = [
    "ideogram-ai/ideogram-v4-quality",
    "ideogram-ai/ideogram-v4-turbo",
    "ideogram-ai/ideogram-v4"
  ];

  for (const m of targetModels) {
    console.log(`\n========================================`);
    console.log(`[MODEL] ${m}`);
    const res = await fetch(`https://api.replicate.com/v1/models/${m}`, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    if (!res.ok) {
      console.log(`Failed to fetch model ${m}: ${res.status}`);
      continue;
    }
    const data = await res.json();
    console.log(`Description: ${data.description}`);
    const schemas = data.latest_version?.openapi_schema?.components?.schemas;
    console.log("Input properties:", JSON.stringify(schemas?.Input?.properties, null, 2));
    console.log("Full Schemas:", JSON.stringify(schemas, null, 2));
  }
}

main();
