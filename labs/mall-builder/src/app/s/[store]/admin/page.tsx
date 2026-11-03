import Link from "next/link";
import { getStaffStore } from "@/lib/store";
import { missingRequired, readBusinessInfo } from "@/lib/businessInfo";
import { AdminShell, NoPermission } from "./admin-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function StoreAdminPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin`);
  if (!staff) return <NoPermission />;

  const missing = missingRequired(readBusinessInfo(store.business_info));

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
      <p className="mt-6 text-sm text-gray-500">카테고리·상품 관리 메뉴는 다음 기능부터 하나씩 추가됩니다.</p>
    </AdminShell>
  );
}
