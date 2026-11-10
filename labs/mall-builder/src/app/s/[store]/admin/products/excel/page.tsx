import Link from "next/link";
import { getStaffStore } from "@/lib/store";
import { AdminShell, NoPermission } from "../../admin-shell";
import { ExcelForm } from "./excel-form";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ProductExcelPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/products/excel`);
  if (!staff) return <NoPermission />;
  const base = `/s/${store.slug}/admin/products/excel/download`;

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/products">
      <Link href={`/s/${store.slug}/admin/products`} className="text-sm text-gray-500 hover:underline">
        ← 상품 목록
      </Link>
      <h1 className="mt-2 text-lg font-semibold">엑셀로 등록·수정</h1>

      <ol className="mt-4 space-y-2 rounded-lg border bg-gray-50 p-4 text-sm text-gray-700">
        <li>1. 양식이나 지금 상품 전체를 내려받습니다. 품번이 없는 상품은 내려받을 때 P00001부터 번호가 매겨집니다.</li>
        <li>2. 엑셀에서 고치거나 줄을 추가합니다. <b>품번이 같으면 그 상품을 고치고, 새 품번이면 새로 등록</b>합니다.</li>
        <li>3. 올리면 먼저 미리보기가 나옵니다. 오류가 하나도 없을 때만 「적용」할 수 있습니다.</li>
        <li className="text-gray-500">
          옵션·구간 할인 시트에 그 상품 줄이 있으면 엑셀 내용으로 바뀌고, 줄이 없으면 그대로 둡니다. 사진은 이 몰에 올린 사진 주소만 쓸 수 있습니다(새 사진은 상품 화면에서). 상품
          삭제는 하지 않습니다(상태를 「숨김」으로).
        </li>
      </ol>

      <div className="mt-4 flex flex-wrap gap-2">
        <a href={`${base}?type=empty`} className="min-h-11 rounded border px-4 py-2.5 text-sm hover:bg-gray-50" data-excel-empty>
          📄 빈 양식 내려받기
        </a>
        <a href={`${base}?type=all`} className="min-h-11 rounded border px-4 py-2.5 text-sm hover:bg-gray-50" data-excel-all>
          📦 지금 상품 전체 내려받기
        </a>
      </div>

      <ExcelForm slug={store.slug} />
    </AdminShell>
  );
}
