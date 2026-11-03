import { getStoreBySlug, isStoreStaff } from "@/lib/store";

export const dynamic = "force-dynamic";

// 손님 첫 화면 — F01은 틀만. 머리글·바닥글은 F02, 상품은 F06, 블록 편집 첫 화면은 F18에서 채운다.
export default async function StorefrontPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const store = await getStoreBySlug(slug);
  const staff = await isStoreStaff(store.id);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      {store.status === "suspended" && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          이 몰은 정지된 상태입니다. 운영자인 회원님에게만 보입니다.
        </p>
      )}
      <h1 className="text-center text-3xl font-bold">{store.name}</h1>
      <p className="mt-6 text-center text-gray-500">쇼핑몰을 준비하고 있습니다.</p>
      {staff && (
        <p className="mt-8 text-center">
          <a href={`/s/${store.slug}/admin`} className="text-sm text-blue-700 underline">
            운영자 관리 화면으로
          </a>
        </p>
      )}
    </main>
  );
}
