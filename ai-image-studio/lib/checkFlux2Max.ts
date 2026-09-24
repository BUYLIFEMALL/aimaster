import { createAdminClient } from "@/lib/supabase/server";

export async function checkFlux2MaxSchema() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_api_keys")
    .select("api_key")
    .eq("provider", "replicate")
    .limit(1);

  const apiKey = data?.[0]?.api_key;
  if (!apiKey) {
    return { error: "No replicate API key in DB" };
  }

  const model = "black-forest-labs/flux-2-max";
  const res = await fetch(`https://api.replicate.com/v1/models/${model}`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });

  if (!res.ok) {
    return { status: res.status, text: await res.text() };
  }

  const json = await res.json();
  return {
    model,
    description: json.description,
    inputSchema: json.latest_version?.openapi_schema?.components?.schemas?.Input
  };
}
