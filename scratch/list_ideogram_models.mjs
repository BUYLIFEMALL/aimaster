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

  // Replicate에서 ideogram 관련 공식 모델 조회
  const res = await fetch("https://api.replicate.com/v1/models?query=ideogram", {
    headers: { "Authorization": `Bearer ${apiKey}` }
  });

  if (res.ok) {
    const data = await res.json();
    console.log("Search query=ideogram results count:", data.results?.length);
    for (const m of data.results || []) {
      console.log(`- ${m.owner}/${m.name} (description: ${m.description?.slice(0, 80)}...)`);
    }
  } else {
    console.log("Search failed:", res.status, await res.text());
  }
}

main();
