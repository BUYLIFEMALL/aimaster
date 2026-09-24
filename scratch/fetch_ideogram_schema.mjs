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
  if (!apiKey) {
    console.error("Replicate API 키 없음");
    process.exit(1);
  }

  const modelNames = [
    "ideogram-ai/ideogram-v3-turbo",
    "ideogram-ai/ideogram-v2-turbo",
    "ideogram-ai/ideogram-v2"
  ];

  for (const m of modelNames) {
    console.log(`\n=== Model: ${m} ===`);
    const res = await fetch(`https://api.replicate.com/v1/models/${m}`, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    if (!res.ok) {
      console.log(`HTTP ${res.status}:`, await res.text());
      continue;
    }
    const data = await res.json();
    console.log("Latest Version ID:", data.latest_version?.id);
    const schema = data.latest_version?.openapi_schema?.components?.schemas?.Input;
    console.log("Input Schema Properties:", JSON.stringify(schema?.properties, null, 2));
  }
}

main();
