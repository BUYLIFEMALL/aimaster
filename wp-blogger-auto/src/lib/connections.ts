import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 공용 연결 표(member_platform_accounts)에서 이 회원의 워드프레스·구글 블로그 연결만 읽는다.
// 토큰·비밀번호 칸은 읽지 않는다(화면 표시용 안전한 칸만). 서버 키로 읽으므로 user_id 조건을 반드시 건다.
export type BlogConnection = {
  id: string;
  platform: "wordpress" | "blogger";
  name: string; // 사이트 이름 또는 블로그 이름
  address: string; // 사이트 주소 또는 블로그 주소
  needsReconnect: boolean;
};

type Row = {
  id: string;
  platform: string;
  username: string | null;
  extra: Record<string, unknown> | null;
  needs_reconnect: boolean;
};

export async function listConnections(userId: string): Promise<BlogConnection[]> {
  const admin = createAdminClient() as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (k: string, v: string) => { in: (k: string, v: string[]) => Promise<{ data: Row[] | null; error: unknown }> };
      };
    };
  };
  const { data, error } = await admin
    .from("member_platform_accounts")
    .select("id, platform, username, extra, needs_reconnect")
    .eq("user_id", userId)
    .in("platform", ["wordpress", "blogger"]);
  if (error || !data) return [];
  return data.map((r) => {
    const extra = r.extra ?? {};
    const pick = (k: string) => (typeof extra[k] === "string" ? (extra[k] as string) : "");
    return {
      id: r.id,
      platform: r.platform as BlogConnection["platform"],
      name: pick("site_name") || pick("blog_name") || r.username || "",
      address: pick("site_url") || pick("blog_url"),
      needsReconnect: r.needs_reconnect,
    };
  });
}
