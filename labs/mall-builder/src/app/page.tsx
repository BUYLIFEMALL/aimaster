import Link from "next/link";
import { getMyStores, requireUser } from "@/lib/store";
import { getMySupplierStores } from "@/lib/supplier-store";
import { SUPPLIER_STATUS_LABEL } from "@/lib/supplier";
import CreateStoreForm from "./create-store-form";
import LogoutButton from "./logout-button";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser("/");
  const [stores, supplied] = await Promise.all([getMyStores(user.id), getMySupplierStores()]);
  // D31 몰 여러 개 — 대표인 몰은 5개까지, 직원으로 들어간 몰도 함께 보인다
  const owned = stores.filter((s) => s.owner_id === user.id);
  const MAX_OWNED = 5;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">AI 쇼핑몰 빌더</h1>
          <p className="mt-1 text-sm text-gray-500">{user.email}</p>
        </div>
        <LogoutButton />
      </div>

      {supplied.length > 0 && (
        <section className="mt-8" data-supplier-stores>
          <h2 className="text-lg font-semibold">공급사로 입점한 몰</h2>
          <ul className="mt-3 space-y-2">
            {supplied.map((s) => (
              <li key={s.supplier_id} className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{s.store_name} <span className="ml-1 rounded bg-emerald-50 px-1.5 text-xs font-normal text-emerald-800">{SUPPLIER_STATUS_LABEL[s.status]}</span></p>
                  <p className="truncate text-xs text-gray-500">{s.supplier_name} · /s/{s.slug}</p>
                </div>
                <Link href={`/s/${s.slug}/supplier`} className="min-h-11 rounded bg-gray-900 px-4 py-2.5 text-white">공급사 화면</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

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
                    <p className="font-semibold">
                      {store.name}
                      <span className={`ml-2 rounded px-1.5 text-xs font-normal ${store.owner_id === user.id ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`} data-store-role>
                        {store.owner_id === user.id ? "대표" : "직원"}
                      </span>
                    </p>
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
        {stores.length > 0 && (
          owned.length < MAX_OWNED ? (
            <details className="mt-4" data-more-store>
              <summary className="cursor-pointer text-sm font-medium text-blue-700">+ 몰 하나 더 만들기 ({owned.length}/{MAX_OWNED})</summary>
              <CreateStoreForm sources={owned.map((s) => ({ id: s.id, name: s.name }))} label="새 몰 만들기" />
            </details>
          ) : (
            <p className="mt-4 text-sm text-gray-500">몰은 대표 1명당 {MAX_OWNED}개까지 만들 수 있습니다.</p>
          )
        )}
      </section>
    </main>
  );
}
