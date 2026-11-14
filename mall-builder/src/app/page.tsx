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
  const [stores, supplied, canCreate] = await Promise.all([
    getMyStores(user.id),
    getMySupplierStores(),
    canCreateStore(user.id),
  ]);
  // D31 몰 여러 개 — 대표인 몰은 5개까지, 직원으로 들어간 몰도 함께 보인다
  const owned = stores.filter((s) => s.owner_id === user.id);
  const MAX_OWNED = 5;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* 최상단 네비게이션 & 사용자 헤더 */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 text-white shadow-md shadow-blue-500/20">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                AI 쇼핑몰 빌더
              </h1>
              <span className="rounded-full bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 text-[11px] font-bold font-mono text-blue-700" data-version>
                {APP_VERSION}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 font-medium">
              B2B 입점·분양·등급별 도매가 멀티 스토어 엔진
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="text-right">
            <span className="block text-xs font-semibold text-slate-800">{user.email}</span>
            <span className="text-[10px] text-slate-400 font-medium">AIMaster 통합 회원</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      {/* 4대 핵심 기능 히어로 배너 */}
      <section className="mt-6 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 sm:p-8 text-white shadow-xl shadow-slate-900/10 border border-slate-800/80">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 px-3 py-1 text-[11px] font-bold text-blue-300">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            AIMASTER B2B COMMERCE ENGINE
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
            원클릭으로 시작하는 나만의 B2B 입점 & 분양 쇼핑몰
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
            공급사 자동 입점부터 일반/사업자/VIP 등급별 차등 단가, 무재고 분양몰, 외상 원장과 전자세금계산서 발행까지 완벽한 도매 생태계를 제공합니다.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4 border-t border-slate-800/80 pt-6">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
            <span className="text-blue-400">🏢</span>
            <span>공급사 수수료 자동 정산</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
            <span className="text-emerald-400">💼</span>
            <span>회원·사업자 등급가</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
            <span className="text-amber-400">🏪</span>
            <span>무재고 자동 분양몰</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
            <span className="text-purple-400">📊</span>
            <span>AI 견적 & 대량 주문</span>
          </div>
        </div>
      </section>

      {/* 2단 대시보드 레이아웃: 좌측 내 상점 & 공급사 / 우측 둘러보기 & 분양 */}
      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        {/* 좌측: 상점 목록 및 개설 (8열) */}
        <div className="space-y-8 lg:col-span-7">
          {/* 공급사로 입점한 몰 */}
          {supplied.length > 0 && (
            <section className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs" data-supplier-stores>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 text-xs font-bold">
                    🏭
                  </span>
                  <h2 className="text-base font-bold text-slate-900">공급사로 입점한 몰</h2>
                </div>
                <span className="text-xs font-semibold text-slate-500">{supplied.length}개 입점</span>
              </div>
              <ul className="mt-4 space-y-3">
                {supplied.map((s) => (
                  <li key={s.supplier_id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 transition-all hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900 truncate">{s.store_name}</p>
                        <span className="rounded-md bg-emerald-100/80 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                          {SUPPLIER_STATUS_LABEL[s.status]}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500 font-mono">
                        {s.supplier_name} · /s/{s.slug}
                      </p>
                    </div>
                    <Link
                      href={`/s/${s.slug}/supplier`}
                      className="btn-3d-dark px-4 py-2 text-xs font-semibold"
                    >
                      공급사 전용 화면 →
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 내 쇼핑몰 */}
          <section className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600 text-xs font-bold">
                  🛍️
                </span>
                <h2 className="text-base font-bold text-slate-900">내 쇼핑몰</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                보유 {owned.length} / 최대 {MAX_OWNED}개
              </span>
            </div>

            {stores.length === 0 ? (
              <div className="py-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600">
                  🏪
                </div>
                <h3 className="mt-3 text-base font-bold text-slate-900">아직 개설한 쇼핑몰이 없습니다</h3>
                {canCreate ? (
                  <>
                    <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                      이름과 주소만 정하면 즉시 나만의 B2B 쇼핑몰이 생성됩니다. 바로 만들어 보세요.
                    </p>
                    <div className="mt-4 text-left">
                      <CreateStoreForm />
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">운영 중인 몰이 없습니다.</p>
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <ul className="space-y-3.5">
                  {stores.map((store) => (
                    <li key={store.id} className="rounded-2xl border border-slate-200/90 bg-slate-50/40 p-4 sm:p-5 transition-all hover:border-slate-300 hover:shadow-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-slate-900">
                              {store.name}
                            </h3>
                            <span
                              className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                store.owner_id === user.id
                                  ? "bg-slate-900 text-white"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                              data-store-role
                            >
                              {store.owner_id === user.id ? "대표" : "직원"}
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-mono text-slate-500">
                            /s/{store.slug}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {store.status === "suspended" && (
                            <span className="rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-xs font-bold text-rose-700">
                              정지됨
                            </span>
                          )}
                          {store.kind === "resale" && (
                            <span
                              className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                                resaleDaysLeft(store.resale_expires_at)
                                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                                  : "bg-rose-50 border border-rose-200 text-rose-700"
                              }`}
                              data-resale-badge
                            >
                              분양몰 · {resaleDaysLeft(store.resale_expires_at) ? `${resaleDaysLeft(store.resale_expires_at)}일 남음` : "기간 끝남"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2.5">
                        <Link
                          href={`/s/${store.slug}/admin`}
                          className="btn-3d-dark flex-1 py-2.5 text-xs font-bold text-center"
                        >
                          🔧 상점 관리 대시보드
                        </Link>
                        <Link
                          href={`/s/${store.slug}`}
                          className="btn-3d-blue flex-1 py-2.5 text-xs font-bold text-center"
                        >
                          🛒 손님 화면 바로가기
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>

                {canCreate && owned.length < MAX_OWNED && (
                  <details className="group rounded-2xl border border-dashed border-blue-300 bg-blue-50/40 p-4 transition-all" data-more-store>
                    <summary className="flex cursor-pointer items-center justify-between text-xs font-bold text-blue-700 hover:text-blue-800">
                      <span className="flex items-center gap-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-xs">+</span>
                        몰 하나 더 만들기 ({owned.length}/{MAX_OWNED})
                      </span>
                      <span className="text-[11px] font-normal text-slate-500 group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="mt-3 pt-3 border-t border-blue-200/60">
                      <CreateStoreForm sources={owned.map((s) => ({ id: s.id, name: s.name }))} label="새 몰 만들기" />
                    </div>
                  </details>
                )}

                {canCreate && owned.length >= MAX_OWNED && (
                  <p className="rounded-xl bg-slate-100 p-3 text-center text-xs font-medium text-slate-500">
                    쇼핑몰은 대표 1명당 최대 {MAX_OWNED}개까지 개설할 수 있습니다.
                  </p>
                )}
              </div>
            )}
          </section>
        </div>

        {/* 우측: 라이브 샘플 & 분양 솔루션 (5열) */}
        <div className="space-y-6 lg:col-span-5">
          {PLATFORM_AIMASTER && (
            <section
              className="rounded-3xl bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 p-6 text-white shadow-xl shadow-blue-900/10 border border-blue-700/40 relative overflow-hidden"
              data-sample-mall
            >
              <div className="absolute top-0 right-0 -mr-6 -mt-6 h-28 w-28 rounded-full bg-blue-500/20 blur-2xl pointer-events-none" />
              
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-blue-400/20 border border-blue-400/40 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-blue-200">
                  LIVE DEMO · B2B SAMPLE
                </span>
                <span className="text-xl">🛒</span>
              </div>

              <h2 className="mt-3 text-lg font-black tracking-tight text-white">
                B2B 입점몰 둘러보기
              </h2>
              <p className="mt-1.5 text-xs text-blue-100 leading-relaxed">
                공급사가 입점해 상품을 올리고, 소비자·사업자 승인 등급에 따라 구입가가 실시간 차등 계산되는 완성형 B2B 입점몰 샘플입니다.
              </p>

              <div className="mt-4 space-y-1.5 rounded-2xl bg-slate-950/40 p-3 text-xs text-slate-300 border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✔</span>
                  <span>사업자 승인 신청 및 전용가 확인</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✔</span>
                  <span>대량 구매 수량별 구간 할인 테이블</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✔</span>
                  <span>모의 주문 및 장바구니/결제 프로세스</span>
                </div>
              </div>

              <Link
                href={`/s/${SAMPLE_MALL_SLUG}`}
                className="mt-5 btn-3d-blue w-full py-3 text-xs font-bold text-center shadow-lg"
              >
                B2B 입점몰 샘플 열기 →
              </Link>
            </section>
          )}

          <section
            className="rounded-3xl bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 p-6 text-white shadow-xl shadow-emerald-950/10 border border-emerald-700/40 relative overflow-hidden"
            data-resale-card
          >
            <div className="absolute top-0 right-0 -mr-6 -mt-6 h-28 w-28 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between">
              <span className="rounded-full bg-emerald-400/20 border border-emerald-400/40 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-emerald-200">
                ZERO INVENTORY · RESALE
              </span>
              <span className="text-xl">🏪</span>
            </div>

            <h2 className="mt-3 text-lg font-black tracking-tight text-white">
              무재고 쇼핑몰 분양 안내
            </h2>
            <p className="mt-1.5 text-xs text-emerald-100 leading-relaxed">
              내 도메인과 상호로 쇼핑몰을 분양받아 본사 상품을 판매하세요. 상품 소싱, 재고 관리, 물류 발송은 본사에서 모두 전담합니다.
            </p>

            <div className="mt-4 space-y-1.5 rounded-2xl bg-slate-950/40 p-3 text-xs text-slate-300 border border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✔</span>
                <span>재고 부담 0% 무자본 온라인 창업</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✔</span>
                <span>판매 발생 시 수수료 자동 정산</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✔</span>
                <span>원클릭 분양 신청 후 24시간 내 오픈</span>
              </div>
            </div>

            <Link
              href="/resale"
              className="mt-5 btn-3d-emerald w-full py-3 text-xs font-bold text-center shadow-lg"
            >
              분양 안내 및 신청 바로가기 →
            </Link>
          </section>

          {/* 쇼핑몰 퀵 가이드 */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>💡</span>
              <span>B2B 쇼핑몰 운영 3단계 퀵 가이드</span>
            </h3>
            <ol className="mt-3 space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-[10px] text-slate-700">1</span>
                <span><strong>상점 개설 & 공급사 초대:</strong> 상점을 만든 후 공급사를 초대하거나 본사 상품을 연결합니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-[10px] text-slate-700">2</span>
                <span><strong>회원 등급 및 가격 정책:</strong> 일반회원과 사업자회원의 구입가를 다르게 설정하고 수량별 할인을 적용합니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-[10px] text-slate-700">3</span>
                <span><strong>주문 수집 및 정산:</strong> 손님 주문 시 공급사 발송 요청 및 월별 정산서를 자동으로 관리합니다.</span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </main>
  );
}
