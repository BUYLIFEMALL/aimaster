import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { getDefaults, listJobs, listProducts, JOB_STATUS } from "@/lib/data";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { TOOLS } from "@/lib/tools";
import { SHOP_DETAIL_SITE } from "@/lib/version";
import { HealthCard } from "@/components/HealthCard";
import { getLatestHealthAction } from "@/lib/actions/health";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireProgramAccess();
  const [products, jobs, defaults, health] = await Promise.all([listProducts(user.id), listJobs(user.id), getDefaults(user.id), getLatestHealthAction()]);
  const ready = Boolean(defaults.asPhone);
  const recent = jobs.rows.slice(0, 5);

  return (
    <div className="space-y-5">
      <PageHeader emoji="🛒" title="AI 스마트스토어 상품 자동등록기" description="상세페이지 자동화에서 만든 상품을 크롬 확장이 스마트스토어 「상품 등록」 화면에 대신 채워 넣습니다." />

      <Notice tone="tip">
        🧭 <b>순서</b>: ① 스토어 기본값 한 번 넣기 → ② 등록할 상품 고르고 카테고리 검색어 넣기 → ③ 확장으로 보내기(판매자센터에 로그인된 크롬) → ④ 등록 기록 확인. 확장은 「🧩 확장 연결」에서 내려받아 연결합니다.
      </Notice>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="slw-card p-4">
          <p className="text-xs font-bold text-slate-500">⚙ 스토어 기본값</p>
          <p className={`mt-1 text-lg font-extrabold ${ready ? "text-emerald-700" : "text-amber-700"}`}>{ready ? "준비됨" : "아직 없음"}</p>
          <Link href="/defaults" className="mt-2 inline-block text-xs font-bold text-emerald-700 hover:underline">기본값 {ready ? "고치기" : "넣기"} →</Link>
        </div>
        <div className="slw-card p-4">
          <p className="text-xs font-bold text-slate-500">📦 불러올 수 있는 상품</p>
          <p className="mt-1 text-lg font-extrabold text-slate-900">{products.rows.length}개</p>
          <Link href="/products" className="mt-2 inline-block text-xs font-bold text-emerald-700 hover:underline">상품 고르기 →</Link>
        </div>
        <div className="slw-card p-4">
          <p className="text-xs font-bold text-slate-500">🧾 등록 기록(30일)</p>
          <p className="mt-1 text-lg font-extrabold text-slate-900">{jobs.rows.length}건</p>
          <Link href="/history" className="mt-2 inline-block text-xs font-bold text-emerald-700 hover:underline">기록 보기 →</Link>
        </div>
        <HealthCard initial={health} />
      </div>

      {products.rows.length === 0 && !products.error && (
        <Notice>
          아직 상세페이지 자동화에서 만든 상품이 없습니다.{" "}
          <a className="font-bold text-emerald-700 underline" href={`${SHOP_DETAIL_SITE}/products/new`} target="_blank" rel="noreferrer">AI 상세페이지 자동화에서 상품 만들기 ↗</a>
        </Notice>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {TOOLS.map((t, i) => (
          <Link key={t.href} href={t.href} className="slw-card block p-4 transition hover:border-emerald-300">
            <p className="text-[11px] font-black text-emerald-700">STEP {i + 1}</p>
            <p className="mt-1 font-extrabold text-slate-900">{t.emoji} {t.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{t.description}</p>
          </Link>
        ))}
      </div>

      {recent.length > 0 && (
        <div className="slw-card p-4">
          <p className="mb-2 text-sm font-extrabold text-slate-900">최근 등록 작업</p>
          <ul className="divide-y divide-slate-100 text-sm">
            {recent.map((j) => (
              <li key={j.id} className="flex items-center justify-between gap-2 py-2">
                <Link href={`/products/${j.product_id}`} className="truncate text-slate-700 hover:underline">{j.category_keyword || "카테고리 없음"} · {new Date(j.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</Link>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${JOB_STATUS[j.status]?.tone ?? ""}`}>{JOB_STATUS[j.status]?.label ?? j.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
