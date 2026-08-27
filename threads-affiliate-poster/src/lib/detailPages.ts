import "server-only";

// auto-detail-page(상세페이지 자동화, "15P")가 만드는 detail_pages 테이블을 읽기
// 전용으로 조회한다. 같은 AIMaster Supabase 프로젝트를 공유하지만 서로 다른
// 서브프로젝트라, 이 프로젝트의 Database 타입에는 없는 테이블이다 — FK 제약을 걸지
// 않고, 선택한 id/product_name만 애플리케이션 레벨에서 느슨하게 참고용으로 저장한다.
// (이 프로젝트의 SupabaseClient<Database> 제네릭과 타입이 맞지 않아 any로 느슨하게 받는다.)
type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface DetailPageSummary {
  id: string;
  product_name: string;
  template: string;
  created_at: string;
}

export async function listUserDetailPages(
  supabase: unknown,
  userId: string,
): Promise<DetailPageSummary[]> {
  const sb = supabase as unknown as SupabaseLike;
  const { data } = await sb
    .from("detail_pages")
    .select("id, product_name, template, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as DetailPageSummary[];
}

export async function getDetailPageExcerpt(
  supabase: unknown,
  userId: string,
  detailPageId: string,
): Promise<string | null> {
  const sb = supabase as unknown as SupabaseLike;
  const { data } = await sb
    .from("detail_pages")
    .select("html")
    .eq("id", detailPageId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data?.html) return null;
  return stripHtmlToExcerpt(data.html, 600);
}

function stripHtmlToExcerpt(html: string, maxLength: number): string {
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}
