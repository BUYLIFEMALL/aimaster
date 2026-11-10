import "server-only";
// 회원 본인 키(user_api_keys) — 없으면 null. 운영자·다른 회원 키로 대신하지 않는다(최상위 규칙).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminDb = { from: (table: string) => any };

export async function getMemberKey(admin: AdminDb, userId: string, provider: string): Promise<string | null> {
  const { data } = await admin.from("user_api_keys").select("api_key").eq("user_id", userId).eq("provider", provider).maybeSingle();
  const v = typeof data?.api_key === "string" ? data.api_key.trim() : "";
  return v || null;
}
