import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { getDefaults, getProductForRegister, listJobs, JOB_STATUS, ownExtraPaths, getLastStepValue } from "@/lib/data";
import { buildFillSteps, lastCategory, type SimpleOption } from "@/lib/esm/fields";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { RegisterForm } from "@/components/RegisterForm";
import { usesCollectedPhoto } from "@/lib/collectedPhoto";
import { SHOP_DETAIL_SITE } from "@/lib/version";

export const dynamic = "force-dynamic";

const showValue = (s: { action: string; value: string; key: string }, mainImage: boolean, sections: number) =>
  s.key === "category" ? "(오른쪽 검색어)"
  : s.action === "images" ? (mainImage ? `${s.value}장` : "없음")
  : s.action === "detail_images" ? `섹션 이미지 ${sections}장`
  : s.action === "notice_fill" ? "누름"
  : s.action === "sites" ? (s.value === "both" ? "G마켓·옥션" : s.value === "gmarket" ? "G마켓" : "옥션")
  : s.value || "—";

export default async function ProductRegisterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireProgramAccess();
  const [loaded, defaults, jobs, lastOption, lastBrand] = await Promise.all([
    getProductForRegister(user.id, id), getDefaults(user.id), listJobs(user.id, id), getLastStepValue(user.id, id, "option"), getLastStepValue(user.id, id, "brand"),
  ]);
  if (!loaded) notFound();
  const { product, mainImage, sections } = loaded;
  const extra = ownExtraPaths(user.id, product.reference_image_urls).length;
  const preview = buildFillSteps(product, defaults, { mode: "fill_only", categoryKeyword: lastCategory(product.category), detailImageCount: sections.length, mainImage: Boolean(mainImage), extraImageCount: extra });
  const opt = lastOption && typeof lastOption === "object" ? (lastOption as SimpleOption) : null;

  return (
    <div className="space-y-4">
      <PageHeader emoji="🛒" title={product.name || product.product_label || "상품"} description="ESM+ 「상품등록」 화면에 확장이 넣을 값입니다. 빠진 필수값이 있으면 보내기 전에 고쳐 주세요.">
        <a className="btn-3d-secondary !py-2 !px-4 text-xs" href={`${SHOP_DETAIL_SITE}/products/${product.id}`} target="_blank" rel="noreferrer">상세페이지에서 고치기 ↗</a>
      </PageHeader>

      {!product.reviewed_at && (
        <Notice tone="warn">
          📝 아직 상세페이지에서 「검토 완료」를 누르지 않은 상품입니다. 상세페이지·가격·이미지를 확인한 뒤 보내기를 권장합니다(보내기는 막지 않습니다).{" "}
          <a className="font-bold underline" href={`${SHOP_DETAIL_SITE}/products/${product.id}`} target="_blank" rel="noreferrer">상세페이지에서 검토하기 ↗</a>
        </Notice>
      )}
      {preview.errors.filter((e) => !e.startsWith("카테고리")).map((e) => <Notice key={e} tone="warn">⚠️ {e}</Notice>)}
      {preview.warnings.map((w) => <Notice key={w}>ℹ️ {w}</Notice>)}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="slw-card overflow-x-auto p-4">
          <p className="mb-2 text-sm font-extrabold text-slate-900">확장이 채울 칸 ({preview.steps.length}개, 위에서부터 순서대로)</p>
          <table className="w-full text-left text-[13px]">
            <thead className="text-[11px] text-slate-500"><tr><th className="py-1 pr-2">구역</th><th className="py-1 pr-2">칸</th><th className="py-1">넣을 값</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {preview.steps.map((s) => (
                <tr key={s.key}>
                  <td className="py-1.5 pr-2 text-slate-500">{s.section || "끝"}</td>
                  <td className="py-1.5 pr-2 font-bold text-slate-800">{s.label}{s.required && <span className="text-rose-600"> *</span>}</td>
                  <td className="max-w-[260px] truncate py-1.5 text-slate-700">{showValue(s, Boolean(mainImage), sections.length)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3">
          {/* key=상품 ID: 다른 상품으로 바뀌면 폼 입력·오류·확인 상자를 새로 시작한다(같은 상품이면 오류 뒤 입력 유지, QA016). */}
          <RegisterForm
            key={product.id}
            collectedPhoto={usesCollectedPhoto(product)}
            productId={product.id}
            initialPrice={product.price}
            initialSalePrice={product.sale_price}
            defaultKeyword={lastCategory(product.category)}
            initialOption={{ name: opt?.name ?? "", values: (opt?.values ?? []).join(", ") }}
            initialBrand={typeof lastBrand === "string" ? lastBrand : ""}
          />
          <div className="slw-card p-3">
            <p className="mb-2 text-xs font-extrabold text-slate-700">대표·추가 사진 {mainImage ? 1 + extra : 0}장 · 상세 이미지 {sections.length}장</p>
            <div className="grid grid-cols-4 gap-1.5">
              {mainImage?.url && <img src={mainImage.url} alt="대표 사진" className="aspect-square w-full rounded-md object-cover ring-2 ring-emerald-600" />}
              {sections.slice(0, 11).map((s) => s.url && <img key={s.path} src={s.url} alt={s.sectionKey} className="aspect-square w-full rounded-md object-cover" />)}
            </div>
          </div>
        </div>
      </div>

      {jobs.rows.length > 0 && (
        <div className="slw-card p-4">
          <p className="mb-2 text-sm font-extrabold text-[#111827]">이 상품의 등록 작업</p>
          <ul className="divide-y divide-slate-100 text-sm">
            {jobs.rows.map((j) => (
              <li key={j.id} className="flex items-center justify-between gap-2 py-2">
                <span className="truncate text-slate-700">{new Date(j.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} · {j.category_keyword}{j.market_product_no ? ` · 상품번호 ${j.market_product_no}` : ""}{j.failed_step ? ` · 멈춘 칸: ${j.failed_step}` : ""}</span>
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
