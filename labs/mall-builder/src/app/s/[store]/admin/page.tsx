import Link from "next/link";
import { getStaffStore } from "@/lib/store";
import { missingRequired, readBusinessInfo } from "@/lib/businessInfo";
import { canSeeMenu, type MyStaff } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import { AdminShell, NoPermission } from "./admin-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function StoreAdminPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin`);
  if (!staff) return <NoPermission />;

  // 사업자 정보는 설정 화면(대표만)에서 고치므로, 고칠 수 없는 직원에게는 안내하지 않는다(D22)
  const me = ((await (await createClient()).rpc("mall_builder_my_staff", { p_store_id: store.id })).data ?? null) as MyStaff;
  const missing = canSeeMenu("/settings", me) ? missingRequired(readBusinessInfo(store.business_info)) : [];

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="">
      {missing.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="font-semibold">손님 화면 바닥글에 꼭 필요한 사업자 정보가 비어 있습니다.</p>
          <p className="mt-1 text-gray-700">빠진 칸: {missing.join(", ")}</p>
          <Link href={`/s/${store.slug}/admin/settings`} className="mt-2 inline-block text-blue-700 underline">
            쇼핑몰 정보 입력하기
          </Link>
        </div>
      )}
      <dl className="grid grid-cols-[7rem_1fr] gap-y-2 rounded-lg border p-4 text-sm">
        <dt className="text-gray-500">몰 주소</dt>
        <dd>
          <Link href={`/s/${store.slug}`} className="text-blue-700 underline">/s/{store.slug}</Link>
        </dd>
        <dt className="text-gray-500">상태</dt>
        <dd>{store.status === "active" ? "영업 중" : "정지됨(플랫폼 관리자에게 문의)"}</dd>
        <dt className="text-gray-500">개설일</dt>
        <dd>{new Date(store.created_at).toLocaleDateString("ko-KR")}</dd>
      </dl>
    </AdminShell>
  );
}
