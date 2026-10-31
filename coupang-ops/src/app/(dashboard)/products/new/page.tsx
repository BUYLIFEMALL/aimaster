import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { PageHeader } from "@/components/ui/PageHeader";
import { QuickProductForm } from "@/components/QuickProductForm";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function NewProductPage() {
  const user = await requireProgramAccess();
  return (
    <div className="space-y-5">
      <Link href="/products" className="text-xs font-bold text-blue-700">← 상품 목록</Link>
      <PageHeader emoji="➕" title="상세페이지 없이 등록" description="가지고 있는 이미지와 상품명·가격만으로 쿠팡 등록을 시작합니다." />
      <QuickProductForm userId={user.id} />
    </div>
  );
}
