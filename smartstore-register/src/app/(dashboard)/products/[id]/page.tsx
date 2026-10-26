import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { getDefaults, getProductForRegister, listJobs, JOB_STATUS } from "@/lib/data";
import { buildFillSteps } from "@/lib/smartstore/fields";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { RegisterForm } from "@/components/RegisterForm";
import { SHOP_DETAIL_SITE } from "@/lib/version";

export const dynamic = "force-dynamic";

/** 상세페이지 분석 카테고리(예: 패션잡화 > 남성가방 > 백팩)의 마지막 단계만 검색어로 */
function lastCategory(c: string | null): string {
  return (c ?? "").split(/[>›/]/).map((s) => s.trim()).filter(Boolean).pop() ?? "";
}

export default async function ProductRegisterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireProgramAccess();
  const [loaded, defaults, jobs] = await Promise.all([getProductForRegister(user.id, id), getDefaults(user.id), listJobs(user.id, id)]);
  if (!loaded) notFound();
  const { product, mainImage, sections } = loaded;
  // 미리보기는 카테고리 검색어 칸을 비운 상태로 계산 — 실제 작업은 입력한 검색어로 다시 만든다.
  const preview = buildFillSteps(product, defaults, { mode: "fill_only", categoryKeyword: lastCategory(product.category), detailImageCount: sections.length, mainImage: Boolean(mainImage) });

  return (
    <div className="space-y-4">
      <PageHeader emoji="🧩" title={product.name || product.product_label || "상품"} description="스마트스토어 「상품 등록」 화면에 확장이 넣을 값입니다. 빠진 필수값이 있으면 보내기 전에 고쳐 주세요.">
        <a className="slw-btn" href={`${SHOP_DETAIL_SITE}/products/${product.id}`} target="_blank" rel="noreferrer">상세페이지에서 고치기 ↗</a>
      </PageHeader>

      {preview.errors.filter((e) => !e.startsWith("카테고리")).map((e) => <Notice key={e} tone="warn">⚠️ {e}</Notice>)}
      {preview.warnings.map((w) => <Notice key={w}>ℹ️ {w}</Notice>)}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="slw-card overflow-x-auto p-4">
          <p className="mb-2 text-sm font-extrabold text-slate-900">확장이 채울 칸 ({preview.steps.length}개)</p>
          <table className="w-full text-left text-[13px]">
            <thead className="text-[11px] text-slate-500"><tr><th className="py-1 pr-2">섹션</th><th className="py-1 pr-2">칸</th><th className="py-1">넣을 값</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {preview.steps.map((s) => (
                <tr key={s.key}>
                  <td className="py-1.5 pr-2 text-slate-500">{s.section}</td>
                  <td className="py-1.5 pr-2 font-bold text-slate-800">{s.label}{s.required && <span className="text-rose-600"> *</span>}</td>
                  <td className="max-w-[260px] truncate py-1.5 text-slate-700">{s.key === "category" ? "(오른쪽에서 검색어 입력)" : s.action === "images" ? (mainImage ? "대표 사진 1장" : "없음") : s.action === "html" ? `섹션 이미지 ${sections.length}장` : s.action === "check" || (s.action === "radio" && s.value === "true") ? "켬" : s.value || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3">
          <RegisterForm productId={product.id} defaultKeyword={lastCategory(product.category)} />
          <div className="slw-card p-3">
            <p className="mb-2 text-xs font-extrabold text-slate-700">대표 사진 · 상세 이미지 {sections.length}장</p>
            <div className="grid grid-cols-4 gap-1.5">
              {mainImage?.url && <img src={mainImage.url} alt="대표 사진" className="aspect-square w-full rounded-md object-cover ring-2 ring-emerald-500" />}
              {sections.slice(0, 11).map((s) => s.url && <img key={s.path} src={s.url} alt={s.sectionKey} className="aspect-square w-full rounded-md object-cover" />)}
            </div>
          </div>
        </div>
      </div>

      {jobs.rows.length > 0 && (
        <div className="slw-card p-4">
          <p className="mb-2 text-sm font-extrabold text-slate-900">이 상품의 등록 작업</p>
          <ul className="divide-y divide-slate-100 text-sm">
            {jobs.rows.map((j) => (
              <li key={j.id} className="flex items-center justify-between gap-2 py-2">
                <span className="truncate text-slate-700">{new Date(j.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} · {j.category_keyword}{j.failed_step ? ` · 멈춘 칸: ${j.failed_step}` : ""}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${JOB_STATUS[j.status]?.tone ?? ""}`}>{JOB_STATUS[j.status]?.label ?? j.status}</span>
              </li>
            ))}
          </ul>
          <Link href="/history" className="mt-2 inline-block text-xs font-bold text-emerald-700 hover:underline">전체 등록 기록 →</Link>
        </div>
      )}
    </div>
  );
}
