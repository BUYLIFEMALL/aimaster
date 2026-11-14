import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { getDefaults, listJobs, listProducts, JOB_STATUS } from "@/lib/data";
import { TOOLS } from "@/lib/tools";
import { SHOP_DETAIL_SITE, APP_VERSION } from "@/lib/version";
import { HealthCard } from "@/components/HealthCard";
import { getLatestHealthAction } from "@/lib/actions/health";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireProgramAccess();
  const [products, jobs, defaults, health] = await Promise.all([
    listProducts(user.id),
    listJobs(user.id),
    getDefaults(user.id),
    getLatestHealthAction(),
  ]);
  const ready = Boolean(defaults.asPhone);
  const recent = jobs.rows.slice(0, 5);
  const successJobs = jobs.rows.filter((j) => j.status === "done" || j.status === "success").length;
  const successRate = jobs.rows.length > 0 ? Math.round((successJobs / jobs.rows.length) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* 110번 1안 상단 실시간 파이프라인 배너 */}
      <div className="relative overflow-hidden rounded-2xl border border-[#C6F2DB] bg-gradient-to-br from-[#E8F8F0] via-[#F0FDF4] to-[#FFFFFF] p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="rounded bg-[#03C75A] px-2 py-0.5 text-[10px] font-black text-white tracking-wide">
                REAL-TIME PIPELINE
              </span>
              <span className="text-xs font-bold text-[#03C75A]">
                네이버 스마트스토어 센터 자동화 연동 준비됨
              </span>
              <span className="rounded-full border border-[rgba(3,199,90,0.3)] bg-white px-2 py-0.5 text-[10px] font-bold text-[#03C75A]">
                {APP_VERSION}
              </span>
            </div>
            <h1 className="text-xl font-black tracking-tight text-[#111827] sm:text-2xl">
              상세페이지 자동화 상품 ➔ 네이버 스마트스토어 원클릭 자동 등록
            </h1>
            <p className="text-xs text-[#4B5563] sm:text-sm">
              크롬 확장이 네이버 커머스 센터 「상품 등록」 양식에 맞춰 카테고리, 속성, 태그, 옵션, 상세 HTML을 100% 자동 입력합니다.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <Link href="/guide" className="btn-3d-secondary text-xs">
              📋 셀러 가이드
            </Link>
            <Link href="/products" className="btn-3d-primary text-xs">
              🛒 상품 등록 스튜디오 ↗
            </Link>
          </div>
        </div>
      </div>

      {/* 4대 실시간 KPI 관제 카드 */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: 스토어 기본 설정 */}
        <div className="slw-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B7280]">스토어 기본 설정</span>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${ready ? "bg-[rgba(3,199,90,0.12)] text-[#03C75A]" : "bg-amber-50 text-amber-700"}`}>
              {ready ? "준비 완료" : "미등록"}
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-[#111827] truncate">
            {ready ? (defaults.deliveryCompany || "스토어 연동됨") : "기본값 필요"}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-[#9CA3AF] truncate">
              {ready ? `A/S: ${defaults.asPhone || "설정됨"}` : "A/S 및 배송지 설정"}
            </span>
            <Link href="/defaults" className="font-bold text-[#03C75A] hover:underline whitespace-nowrap">
              {ready ? "수정" : "설정"} →
            </Link>
          </div>
        </div>

        {/* KPI 2: 등록 대기 상품 */}
        <div className="slw-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B7280]">등록 대기 상품</span>
            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-extrabold text-blue-700">
              동기화됨
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-[#111827]">
            {products.rows.length} <span className="text-sm font-bold text-[#6B7280]">개 상품</span>
          </p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-[#9CA3AF]">AI 상세페이지 완성본</span>
            <Link href="/products" className="font-bold text-[#03C75A] hover:underline whitespace-nowrap">
              목록 보기 →
            </Link>
          </div>
        </div>

        {/* KPI 3: 30일 등록 성공 건수 */}
        <div className="slw-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B7280]">30일 등록 기록</span>
            <span className="rounded bg-[rgba(3,199,90,0.12)] px-1.5 py-0.5 text-[10px] font-extrabold text-[#03C75A]">
              {successRate}% SUCCESS
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-[#03C75A]">
            {jobs.rows.length} <span className="text-sm font-bold text-[#111827]">건 등록</span>
          </p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-[#9CA3AF]">
              {recent.length > 0 ? `최근: ${new Date(recent[0].created_at).toLocaleDateString("ko-KR")}` : "최근 내역 없음"}
            </span>
            <Link href="/history" className="font-bold text-[#03C75A] hover:underline whitespace-nowrap">
              기록 보기 →
            </Link>
          </div>
        </div>

        {/* KPI 4: 확장 프로그램 실시간 관제 */}
        <HealthCard initial={health} />
      </div>

      {products.rows.length === 0 && !products.error && (
        <div className="rounded-xl border border-[#E5E8EB] bg-white p-5 text-center shadow-sm">
          <p className="text-sm text-[#4B5563]">
            아직 상세페이지 자동화에서 만든 상품이 없습니다. 먼저 상품을 만들어 보세요.
          </p>
          <a
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#03C75A] px-4 py-2 text-xs font-extrabold text-white shadow hover:bg-[#029643]"
            href={`${SHOP_DETAIL_SITE}/products/new`}
            target="_blank"
            rel="noreferrer"
          >
            <span>AI 상세페이지 자동화에서 상품 만들기 ↗</span>
          </a>
        </div>
      )}

      {/* 3단계 작업 순서 워크스페이스 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-[#111827]">스마트스토어 등록 3단계 프로세스</h2>
          <span className="text-xs text-[#9CA3AF]">순서대로 진행하면 100% 자동 등록됩니다</span>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-3">
          {TOOLS.map((t, i) => (
            <Link
              key={t.href}
              href={t.href}
              className="slw-card group block p-5 transition-all hover:border-[#03C75A] hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="rounded bg-[rgba(3,199,90,0.12)] px-2 py-0.5 text-[10px] font-black text-[#03C75A]">
                  STEP {i + 1}
                </span>
                <span className="text-lg transition-transform group-hover:scale-110" aria-hidden>
                  {t.emoji}
                </span>
              </div>
              <p className="mt-3 text-base font-black text-[#111827] group-hover:text-[#03C75A]">
                {t.label}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-[#6B7280]">
                {t.description}
              </p>
              <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-[#03C75A]">
                <span>바로가기</span>
                <span>→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 최근 등록 작업 테이블 덱 */}
      {recent.length > 0 && (
        <div className="slw-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#E5E8EB] px-5 py-4">
            <div>
              <h3 className="text-sm font-extrabold text-[#111827]">최근 등록 전송 작업</h3>
              <p className="text-[11px] text-[#9CA3AF]">크롬 확장이 스마트스토어 센터로 보낸 최근 내역입니다.</p>
            </div>
            <Link href="/history" className="text-xs font-bold text-[#03C75A] hover:underline">
              전체 내역 보기 →
            </Link>
          </div>
          <ul className="divide-y divide-[#F1F5F9] text-xs">
            {recent.map((j) => (
              <li key={j.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-[#F9FAFB]">
                <div className="min-w-0 flex-1">
                  <Link href={`/products/${j.product_id}`} className="truncate font-bold text-[#111827] hover:text-[#03C75A] hover:underline">
                    {j.category_keyword || "카테고리 지정 없음"}
                  </Link>
                  <p className="mt-0.5 text-[11px] text-[#9CA3AF]">
                    {new Date(j.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${JOB_STATUS[j.status]?.tone ?? "bg-slate-100 text-slate-700"}`}>
                  {JOB_STATUS[j.status]?.label ?? j.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
