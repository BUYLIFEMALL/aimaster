// 메이커 M2(2026-11-19, Master msg_c506ba34f9a0) 「사진 제안」 목록 — 보기만(적용·거절은 M3).
// 행은 회원 세션으로 읽는다(0106 RLS: 상품 권한 직원 = 이 몰 제안 전부, 그 밖 0). 미리보기는 행마다 누를 때 짧은 서명 주소를 받아
// 이미지로만 보여 준다(주소 글자는 화면·기록에 남기지 않음 — preview.tsx).
import Link from "next/link";
import { getStaffStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";
import { AdminShell, NoPermission } from "../../admin-shell";
import { ProposalPreview } from "./preview";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const STATUS_LABEL: Record<string, string> = {
  reserved: "저장 중(예약)", proposed: "제안됨", abandoned: "취소됨", rejected: "거절됨", expired: "만료", applied: "적용됨", reverted: "되돌림",
};

export default async function ProposalsPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/products/proposals`);
  if (!staff) return <NoPermission />;
  const supabase = await createClient();
  const { data: rows } = await supabase.from("mall_builder_photo_proposals")
    .select("id, product_id, origin, status, base_revision, file_path, created_at")
    .eq("store_id", store.id).in("status", ["reserved", "proposed"]).order("created_at", { ascending: false }).limit(200);
  const list = rows ?? [];
  const ids = [...new Set(list.map((r) => r.product_id as string))];
  const { data: prods } = ids.length
    ? await supabase.from("mall_builder_products").select("id, name, updated_at").eq("store_id", store.id).in("id", ids)
    : { data: [] as { id: string; name: string; updated_at: string }[] };
  const prod = new Map((prods ?? []).map((p) => [p.id as string, p as { id: string; name: string; updated_at: string }]));
  const base = `/s/${store.slug}/admin/products`;

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/products">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">사진 제안</h1>
        <Link href={base} className="text-sm underline">← 상품 목록</Link>
      </div>
      <p className="mt-1 text-xs text-gray-500">바나나에서 돌아온 대표사진 후보입니다. 손님에게는 보이지 않고, 상품 사진은 「적용」해야 바뀝니다(적용은 준비 중).</p>
      {list.length === 0 ? (
        <p className="mt-6 rounded border border-dashed p-8 text-center text-sm text-gray-500">사진 제안이 없습니다.</p>
      ) : (
        <ul className="mt-4 divide-y rounded border" data-proposals>
          {list.map((r) => {
            const p = prod.get(r.product_id as string);
            const changed = p ? new Date(p.updated_at).getTime() !== new Date(r.base_revision as string).getTime() : false;
            return (
              <li key={r.id as string} className="flex flex-wrap items-center gap-2 p-3 text-sm" data-proposal>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{STATUS_LABEL[r.status as string] ?? (r.status as string)}</span>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{r.origin === "supplier" ? "공급사" : "운영사"}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{p?.name ?? "상품"}</span>
                {changed && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-800" data-stale>그사이 상품이 바뀜</span>}
                {r.status === "proposed" && <ProposalPreview path={r.file_path as string} />}
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}
