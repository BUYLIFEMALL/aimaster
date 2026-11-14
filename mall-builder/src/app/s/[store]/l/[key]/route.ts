import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mallSlugFromHost } from "@/lib/host";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// M4-C3 리셀러 짧은 링크 `/s/<몰>/l/<키>`(하위 도메인이면 `/l/<키>`) — DB 0078이 키를 확인하고 누른 수 +1,
// 상품 화면(또는 몰 첫 화면)에 ?ref=<코드>를 붙여 보낸다. 쿠키는 손님 화면의 ref-catcher가 심는다(기존 링크와 같은 길).
// 키가 없거나 리셀러가 정지됐으면 코드 없이 몰 첫 화면으로.
export async function GET(request: NextRequest, { params }: { params: Promise<{ store: string; key: string }> }) {
  const { store: slug, key } = await params;
  const host = request.headers.get("host") ?? "";
  const onSub = mallSlugFromHost(host, process.env.MALL_ROOT_DOMAIN) === slug;
  const base = onSub ? "" : `/s/${slug}`;
  let target = base || "/";
  if (/^[A-Za-z0-9]{7}$/.test(key)) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("mall_builder_reseller_link_open", { p_slug: slug, p_key: key });
    const row = (data as { product_id: string | null; code: string }[] | null)?.[0];
    if (row?.code) target = `${row.product_id ? `${base}/p/${row.product_id}` : base || "/"}?ref=${encodeURIComponent(row.code)}`;
  }
  return NextResponse.redirect(new URL(target, request.nextUrl.origin), 302);
}
