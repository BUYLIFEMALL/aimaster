import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/lib/extensionAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_RUNS_PER_DAY, sanitizeKeyword, sanitizeReviewItems } from "@/lib/coupangResults";

// 공용 DB 타입에 없는 표를 쓰므로 from()만 느슨하게 받는다(lib/access.ts와 같은 방식).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any };

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 확장이 회원 PC에서 읽은 공개 상품 정보를 회원별로 저장한다. 이 서버는 쿠팡을 호출하지 않는다.
export async function POST(request: Request) {
  const user = await verifyExtensionToken(request);
  if (!user) return NextResponse.json({ error: "연결 코드가 맞지 않거나 이용 권한이 없습니다. 사이트에서 다시 연결해 주세요." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { keyword?: unknown; items?: unknown } | null;
  const items = sanitizeReviewItems(body?.items);
  if (!items.length) return NextResponse.json({ error: "저장할 상품이 없습니다." }, { status: 400 });

  const admin = createAdminClient() as unknown as SupabaseLike;
  const { count } = await admin
    .from("coupang_review_runs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.userId)
    .gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
  if ((count ?? 0) >= MAX_RUNS_PER_DAY) return NextResponse.json({ error: "하루 저장 한도를 넘었습니다. 내일 다시 시도해 주세요." }, { status: 429 });

  const { data: run, error } = await admin
    .from("coupang_review_runs")
    .insert({ user_id: user.userId, keyword: sanitizeKeyword(body?.keyword), item_count: items.length })
    .select("id")
    .single();
  if (error || !run) return NextResponse.json({ error: "저장하지 못했습니다." }, { status: 500 });

  const { error: itemError } = await admin.from("coupang_review_items").insert(
    items.map((item) => ({
      run_id: run.id,
      user_id: user.userId,
      product_id: item.productId,
      name: item.name,
      price: item.price,
      reviews: item.reviews,
      is_ad: item.isAd,
      url: item.url,
    })),
  );
  if (itemError) {
    await admin.from("coupang_review_runs").delete().eq("id", run.id).eq("user_id", user.userId);
    return NextResponse.json({ error: "저장하지 못했습니다." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, runId: run.id, saved: items.length });
}
