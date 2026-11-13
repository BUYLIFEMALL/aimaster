import Link from "next/link";
import { getMyStores, requireUser } from "@/lib/store";
import { getMySupplierStores } from "@/lib/supplier-store";
import { SUPPLIER_STATUS_LABEL } from "@/lib/supplier";
import CreateStoreForm from "./create-store-form";
import LogoutButton from "./logout-button";
import { canCreateStore, SAMPLE_MALL_SLUG } from "@/lib/platform-admin";
import { PLATFORM_AIMASTER } from "@/lib/platform";
import { APP_VERSION } from "@/lib/version";
import { resaleDaysLeft } from "@/lib/resale";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser("/");
  const [stores, supplied, canCreate] = await Promise.all([getMyStores(user.id), getMySupplierStores(), canCreateStore(user.id)]);
  // D31 몰 여러 개 — 대표인 몰은 5개까지, 직원으로 들어간 몰도 함께 보인다
  const owned = stores.filter((s) => s.owner_id === user.id);
  const MAX_OWNED = 5;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">AI 쇼핑몰 빌더 <span className="align-middle text-xs font-normal text-gray-400" data-version>{APP_VERSION}</span></h1>
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
            {canCreate ? (
              <>
                <p className="mt-2 text-sm text-gray-600">아직 개설한 쇼핑몰이 없습니다. 이름과 주소를 정해 바로 만들어 보세요.</p>
                <CreateStoreForm />
              </>
            ) : (
              <p className="mt-2 text-sm text-gray-600">운영 중인 몰이 없습니다.</p>
            )}
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
                  {store.kind === "resale" && (
                    <span className={`rounded px-2 py-1 text-xs ${resaleDaysLeft(store.resale_expires_at) ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`} data-resale-badge>
                      분양몰 · {resaleDaysLeft(store.resale_expires_at) ? `${resaleDaysLeft(store.resale_expires_at)}일 남음` : "기간 끝남"}
                    </span>
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
          !canCreate ? null : owned.length < MAX_OWNED ? (
            <details className="mt-4" data-more-store>
              <summary className="cursor-pointer text-sm font-medium text-blue-700">+ 몰 하나 더 만들기 ({owned.length}/{MAX_OWNED})</summary>
              <CreateStoreForm sources={owned.map((s) => ({ id: s.id, name: s.name }))} label="새 몰 만들기" />
            </details>
          ) : (
            <p className="mt-4 text-sm text-gray-500">몰은 대표 1명당 {MAX_OWNED}개까지 만들 수 있습니다.</p>
          )
        )}
      </section>
      {PLATFORM_AIMASTER && (
        <section className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4" data-sample-mall>
          <h2 className="text-base font-semibold">🛒 샘플몰 둘러보기</h2>
          <p className="mt-1 text-sm text-gray-700">공급사가 입점해 상품을 올리고, 소비자·사업자 등급에 따라 실제 구입가가 달라지는 B2B 입점몰 샘플입니다. 회원가입·사업자 신청·주문(실제 결제 없음)을 직접 해 보세요.</p>
          <Link href={`/s/${SAMPLE_MALL_SLUG}`} className="mt-3 inline-block min-h-11 rounded bg-blue-700 px-4 py-2.5 text-sm text-white">B2B 입점몰 샘플 열기</Link>
        </section>
      )}
      <section className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4" data-resale-card>
        <h2 className="text-base font-semibold">🏪 쇼핑몰 분양</h2>
        <p className="mt-1 text-sm text-gray-700">내 이름의 쇼핑몰을 분양받아 본사 상품을 팔고 마진을 받으세요. 상품·재고·발송은 본사가 맡습니다.</p>
        <Link href="/resale" className="mt-3 inline-block min-h-11 rounded bg-emerald-700 px-4 py-2.5 text-sm text-white">분양 안내·신청</Link>
      </section>
    </main>
  );
}
