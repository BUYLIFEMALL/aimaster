import { getStoreBySlug } from "@/lib/store";

export const dynamic = "force-dynamic";

// 손님 첫 화면 — 머리글·바닥글은 (shop)/layout.tsx. 상품은 F06, 블록 편집 첫 화면은 F18에서 채운다.
export default async function StorefrontPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const store = await getStoreBySlug(slug);

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      {store.status === "suspended" && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          이 몰은 정지된 상태입니다. 운영자인 회원님에게만 보입니다.
        </p>
      )}
      <p className="text-center text-gray-500">쇼핑몰을 준비하고 있습니다.</p>
    </main>
  );
}
