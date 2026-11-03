import Link from "next/link";
import { getMyStores, requireUser } from "@/lib/store";
import CreateStoreForm from "./create-store-form";
import LogoutButton from "./logout-button";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser("/");
  const stores = await getMyStores(user.id);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">AI 쇼핑몰 빌더</h1>
          <p className="mt-1 text-sm text-gray-500">{user.email}</p>
        </div>
        <LogoutButton />
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">내 쇼핑몰</h2>
        {stores.length === 0 ? (
          <>
            <p className="mt-2 text-sm text-gray-600">아직 개설한 쇼핑몰이 없습니다. 이름과 주소를 정해 바로 만들어 보세요.</p>
            <CreateStoreForm />
          </>
        ) : (
          <ul className="mt-3 space-y-3">
            {stores.map((store) => (
              <li key={store.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{store.name}</p>
                    <p className="text-sm text-gray-500">/s/{store.slug}</p>
                  </div>
                  {store.status === "suspended" && (
                    <span className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">정지됨</span>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <Link href={`/s/${store.slug}/admin`} className="min-h-11 flex-1 rounded bg-gray-900 py-2.5 text-center text-sm text-white">
                    관리하기
                  </Link>
                  <Link href={`/s/${store.slug}`} className="min-h-11 flex-1 rounded border py-2.5 text-center text-sm">
                    손님 화면 보기
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
