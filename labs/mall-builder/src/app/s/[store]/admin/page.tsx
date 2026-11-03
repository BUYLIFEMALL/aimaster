import Link from "next/link";
import { getStoreBySlug, isStoreStaff, requireUser } from "@/lib/store";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 몰 운영자 관리 화면 — F01은 운영자 확인과 기본 정보만. 메뉴는 기능을 하나씩 만들 때마다 추가한다.
export default async function StoreAdminPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  await requireUser(`/s/${slug}/admin`);
  const store = await getStoreBySlug(slug);

  if (!(await isStoreStaff(store.id))) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-bold">관리 권한이 없습니다</h1>
        <p className="mt-2 text-sm text-gray-600">이 몰의 운영자만 관리 화면을 열 수 있습니다.</p>
        <Link href="/" className="mt-6 inline-block text-sm text-blue-700 underline">
          내 쇼핑몰로 돌아가기
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/" className="text-sm text-gray-500">← 내 쇼핑몰</Link>
      <h1 className="mt-2 text-2xl font-bold">{store.name} 관리</h1>

      <dl className="mt-6 grid grid-cols-[7rem_1fr] gap-y-2 rounded-lg border p-4 text-sm">
        <dt className="text-gray-500">몰 주소</dt>
        <dd>
          <Link href={`/s/${store.slug}`} className="text-blue-700 underline">/s/{store.slug}</Link>
        </dd>
        <dt className="text-gray-500">상태</dt>
        <dd>{store.status === "active" ? "영업 중" : "정지됨(플랫폼 관리자에게 문의)"}</dd>
        <dt className="text-gray-500">개설일</dt>
        <dd>{new Date(store.created_at).toLocaleDateString("ko-KR")}</dd>
      </dl>

      <p className="mt-6 text-sm text-gray-500">
        쇼핑몰 정보·카테고리·상품 관리 메뉴는 다음 기능부터 하나씩 추가됩니다.
      </p>
    </main>
  );
}
