import "server-only";

type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export async function resolveApiKey(supabase: SupabaseLike, userId: string, provider: "openai" | "gemini") {
  const { data } = await supabase
    .from("user_api_keys")
    .select("api_key")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  return data?.api_key ?? null;
}
