"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  TemplateType,
  TemplateInput,
  CoupangInput,
  SmartstoreInput,
  PremiumInput,
  UploadedImage,
  Specification,
} from "@/types/product";
import type { ApiKeyProvider } from "@/types/database.types";
import { createDefaultForm } from "@/lib/form-defaults";
import { PROVIDER_LABELS } from "@/lib/apiKeyLabels";
import { ApiKeyRequiredModal } from "./settings/ApiKeyRequiredModal";
import ImageUploader from "./ImageUploader";
import ImageGenSection from "./ImageGenSection";
import SpecsEditor from "./SpecsEditor";
import TemplateSelector from "./TemplateSelector";
import TemplateBadge from "./TemplateBadge";
import VideoUrlInput from "./VideoUrlInput";

type Step = "select-template" | "fill-form";

interface ProductFormProps {
  registeredProviders: ApiKeyProvider[];
}

export default function ProductForm({ registeredProviders }: ProductFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("select-template");
  const [form, setForm] = useState<TemplateInput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingKeyModal, setMissingKeyModal] = useState<string[] | null>(null);
  const registeredSet = new Set(registeredProviders);

  function handleTemplateSelect(template: TemplateType) {
    setForm(createDefaultForm(template));
    setStep("fill-form");
    setError(null);
  }

  function update(key: string, value: unknown) {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  function updateSellingPoint(index: number, value: string) {
    if (!form) return;
    const updated = [...form.keySellingPoints];
    updated[index] = value;
    update("keySellingPoints", updated);
  }

  function addSellingPoint() {
    if (!form || form.keySellingPoints.length >= 5) return;
    update("keySellingPoints", [...form.keySellingPoints, ""]);
  }

  function removeSellingPoint(index: number) {
    if (!form || form.keySellingPoints.length <= 1) return;
    update("keySellingPoints", form.keySellingPoints.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);

    if (!form.productName.trim()) {
      setError("제품명을 입력해주세요.");
      return;
    }

    if (!registeredSet.has("anthropic")) {
      setMissingKeyModal([PROVIDER_LABELS.anthropic]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "생성 중 오류가 발생했습니다.");
        return;
      }
      router.push(data.previewUrl);
    } catch {
      setError("서버에 연결할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "select-template") {
    return <TemplateSelector onSelect={handleTemplateSelect} />;
  }

  if (!form) return null;

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 템플릿 변경 + 배지 */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep("select-template")}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
        >
          ← 템플릿 변경
        </button>
        <TemplateBadge template={form.template} />
      </div>

      {/* ── 공통 섹션 ──────────────────────── */}

      <Section
        title="📸 제품 이미지"
        subtitle="직접 업로드하거나 AI로 생성하세요 (최대 5개)"
      >
        <div className="space-y-4">
          <ImageUploader
            images={form.uploadedImages}
            onChange={(images: UploadedImage[]) => update("uploadedImages", images)}
          />
          {form.uploadedImages.length < 5 && (
            <details className="group">
              <summary className="cursor-pointer select-none text-sm font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1 list-none">
                <span className="group-open:hidden">▶</span>
                <span className="hidden group-open:inline">▼</span>
                🎨 AI로 이미지 생성하기
              </summary>
              <div className="mt-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
                <ImageGenSection
                  productName={form.productName}
                  description={form.description}
                  keySellingPoints={form.keySellingPoints}
                  onImageGenerated={(img) =>
                    update("uploadedImages", [...form.uploadedImages, img])
                  }
                />
              </div>
            </details>
          )}
        </div>
      </Section>

      <Section title="📝 제품 기본 정보">
        <div className="space-y-4">
          <Field label="제품명" required>
            <input
              type="text"
              value={form.productName}
              onChange={(e) => update("productName", e.target.value)}
              placeholder="예: 프리미엄 항균 에어프라이어 5.5L"
              className="input"
            />
          </Field>
          <Field label="제품 설명">
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="제품의 특징, 장점, 사용법 등을 자세히 입력하세요"
              rows={4}
              className="input resize-none"
            />
          </Field>
          <Field label="타겟 고객">
            <input
              type="text"
              value={form.targetAudience}
              onChange={(e) => update("targetAudience", e.target.value)}
              placeholder="예: 1인 가구, 건강을 중시하는 30-40대"
              className="input"
            />
          </Field>
        </div>
      </Section>

      <Section
        title="✨ 핵심 셀링포인트"
        subtitle="고객에게 어필할 핵심 장점 (최대 5개)"
      >
        <div className="space-y-2">
          {form.keySellingPoints.map((point, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-blue-500 font-bold text-sm w-5">{i + 1}.</span>
              <input
                type="text"
                value={point}
                onChange={(e) => updateSellingPoint(i, e.target.value)}
                placeholder={`셀링포인트 ${i + 1}`}
                className="flex-1 input-sm"
              />
              {form.keySellingPoints.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSellingPoint(i)}
                  className="text-red-400 hover:text-red-600 text-lg font-bold px-2"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {form.keySellingPoints.length < 5 && (
            <button
              type="button"
              onClick={addSellingPoint}
              className="text-sm text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1 mt-1"
            >
              + 셀링포인트 추가
            </button>
          )}
        </div>
      </Section>

      <Section title="📊 제품 스펙" subtitle="규격, 소재, 용량 등 상세 제원">
        <SpecsEditor
          specs={form.specifications}
          onChange={(specs: Specification[]) => update("specifications", specs)}
        />
      </Section>

      {/* ── 공통: 신뢰 & 전환 데이터 ────── */}
      <Section
        title="📊 신뢰 & 전환 데이터"
        subtitle="입력할수록 AI가 더 설득력 있는 상세페이지를 생성합니다"
      >
        <div className="space-y-4">
          <Field label="고객이 겪는 문제">
            <textarea
              value={form.problemStatement}
              onChange={(e) => update("problemStatement", e.target.value)}
              placeholder="예: 기존 제품을 써도 효과가 없고, 피부 자극이 심했어요"
              rows={2}
              className="input resize-none"
            />
          </Field>
          <Field label="사용 전/후 변화 수치">
            <input
              type="text"
              value={form.beforeAfterData}
              onChange={(e) => update("beforeAfterData", e.target.value)}
              placeholder="예: 7일 만에 톤업 체감, 4주 후 민낯 자신감 회복"
              className="input"
            />
          </Field>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              수치 기반 신뢰 데이터
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">누적 판매량</label>
                <input
                  type="text"
                  value={form.trustData.salesCount}
                  onChange={(e) => update("trustData", { ...form.trustData, salesCount: e.target.value })}
                  placeholder="예: 3만개+"
                  className="input-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">고객 만족도</label>
                <input
                  type="text"
                  value={form.trustData.satisfactionRate}
                  onChange={(e) => update("trustData", { ...form.trustData, satisfactionRate: e.target.value })}
                  placeholder="예: 98.7%"
                  className="input-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">후기 수</label>
                <input
                  type="text"
                  value={form.trustData.reviewCount}
                  onChange={(e) => update("trustData", { ...form.trustData, reviewCount: e.target.value })}
                  placeholder="예: 1,247개"
                  className="input-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">재구매율</label>
                <input
                  type="text"
                  value={form.trustData.repurchaseRate}
                  onChange={(e) => update("trustData", { ...form.trustData, repurchaseRate: e.target.value })}
                  placeholder="예: 67%"
                  className="input-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── 공통: 구매 보장 정보 ────────── */}
      <Section
        title="🔒 구매 보장 정보"
        subtitle="배송·환불·AS 정보로 구매 불안을 제거합니다"
      >
        <div className="space-y-3">
          <Field label="배송 정책">
            <input
              type="text"
              value={form.policyInfo.delivery}
              onChange={(e) => update("policyInfo", { ...form.policyInfo, delivery: e.target.value })}
              placeholder="예: 주문 후 2~3일 내 도착"
              className="input"
            />
          </Field>
          <Field label="환불/교환 정책">
            <input
              type="text"
              value={form.policyInfo.refund}
              onChange={(e) => update("policyInfo", { ...form.policyInfo, refund: e.target.value })}
              placeholder="예: 수령 후 7일 이내 무료 반품"
              className="input"
            />
          </Field>
          <Field label="AS 안내">
            <input
              type="text"
              value={form.policyInfo.as}
              onChange={(e) => update("policyInfo", { ...form.policyInfo, as: e.target.value })}
              placeholder="예: 1년 무상 AS 보장"
              className="input"
            />
          </Field>
        </div>
      </Section>

      {/* ── 템플릿별 전용 섹션 ─────────────── */}

      {form.template === "coupang" && (
        <CoupangFields
          form={form as CoupangInput}
          update={update}
        />
      )}

      {form.template === "smartstore" && (
        <SmartstoreFields
          form={form as SmartstoreInput}
          update={update}
        />
      )}

      {form.template === "premium" && (
        <PremiumFields
          form={form as PremiumInput}
          update={update}
        />
      )}

      {/* 에러 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* 생성 버튼 */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 text-white font-bold py-4 px-8 rounded-2xl text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
      >
        {loading ? (
          <>
            <span className="animate-spin text-2xl">✨</span>
            <span>AI가 상세페이지를 만들고 있어요...</span>
          </>
        ) : (
          <>
            <span>🚀</span>
            <span>상세페이지 생성하기</span>
          </>
        )}
      </button>
      {loading && (
        <p className="text-center text-sm text-gray-500 animate-pulse">
          이미지 분석 및 카피라이팅 중... 약 20-40초 소요됩니다
        </p>
      )}
    </form>
    {missingKeyModal && (
      <ApiKeyRequiredModal missingLabels={missingKeyModal} onClose={() => setMissingKeyModal(null)} />
    )}
    </>
  );
}

/* ──────────────────────────────────────────
   쿠팡 전용 필드
────────────────────────────────────────── */
function CoupangFields({
  form,
  update,
}: {
  form: CoupangInput;
  update: (key: string, value: unknown) => void;
}) {
  function updateBadge(index: number, value: string) {
    const updated = [...form.certificationBadges];
    updated[index] = value;
    update("certificationBadges", updated);
  }

  function updateReview(index: number, value: string) {
    const updated = [...form.reviewHighlights];
    updated[index] = value;
    update("reviewHighlights", updated);
  }

  return (
    <>
      <Section title="💰 가격 정보" subtitle="할인 강조를 위한 가격 정보">
        <div className="grid grid-cols-3 gap-3">
          <Field label="원가">
            <input
              type="text"
              value={form.originalPrice}
              onChange={(e) => update("originalPrice", e.target.value)}
              placeholder="89,000원"
              className="input-sm"
            />
          </Field>
          <Field label="할인율">
            <div className="relative">
              <input
                type="text"
                value={form.discountRate}
                onChange={(e) => update("discountRate", e.target.value)}
                placeholder="35"
                className="input-sm pr-6"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
          </Field>
          <Field label="판매가">
            <input
              type="text"
              value={form.finalPrice}
              onChange={(e) => update("finalPrice", e.target.value)}
              placeholder="57,850원"
              className="input-sm"
            />
          </Field>
        </div>
      </Section>

      <Section title="🚚 배송 & 뱃지">
        <div className="space-y-4">
          <Field label="배송 정보">
            <input
              type="text"
              value={form.deliveryInfo}
              onChange={(e) => update("deliveryInfo", e.target.value)}
              placeholder="로켓배송 · 내일 도착 보장"
              className="input"
            />
          </Field>
          <div className="flex items-center gap-3">
            <input
              id="rocketBadge"
              type="checkbox"
              checked={form.rocketBadge}
              onChange={(e) => update("rocketBadge", e.target.checked)}
              className="w-4 h-4 accent-red-600"
            />
            <label htmlFor="rocketBadge" className="text-sm font-medium text-gray-700">
              로켓배송 뱃지 표시
            </label>
          </div>
          <Field label="인증 배지 (최대 5개)">
            <div className="space-y-2">
              {form.certificationBadges.map((badge, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={badge}
                    onChange={(e) => updateBadge(i, e.target.value)}
                    placeholder={`인증 ${i + 1} (예: KC인증, 친환경마크)`}
                    className="flex-1 input-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      update("certificationBadges", form.certificationBadges.filter((_, j) => j !== i))
                    }
                    className="text-red-400 hover:text-red-600 font-bold px-1"
                  >
                    ×
                  </button>
                </div>
              ))}
              {form.certificationBadges.length < 5 && (
                <button
                  type="button"
                  onClick={() => update("certificationBadges", [...form.certificationBadges, ""])}
                  className="text-sm text-red-500 hover:text-red-700 font-medium"
                >
                  + 인증 배지 추가
                </button>
              )}
            </div>
          </Field>
        </div>
      </Section>

      <Section title="⭐ 고객 리뷰 하이라이트" subtitle="실제 리뷰에서 발췌한 문구 (최대 3개)">
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <textarea
              key={i}
              value={form.reviewHighlights[i] || ""}
              onChange={(e) => updateReview(i, e.target.value)}
              placeholder={`리뷰 ${i + 1} (예: 배송도 빠르고 품질이 정말 좋아요!)`}
              rows={2}
              className="w-full input-sm resize-none"
            />
          ))}
        </div>
      </Section>

      <Section title="⚡ 긴박감 문구" subtitle="한정 수량·마감 시간 등 즉시 구매를 유도하는 문구">
        <input
          type="text"
          value={form.urgencyMessage}
          onChange={(e) => update("urgencyMessage", e.target.value)}
          placeholder="예: 오늘 자정 특가 마감 / 재고 47개 남음"
          className="input"
        />
      </Section>

    </>
  );
}

/* ──────────────────────────────────────────
   스마트스토어 전용 필드
────────────────────────────────────────── */
function SmartstoreFields({
  form,
  update,
}: {
  form: SmartstoreInput;
  update: (key: string, value: unknown) => void;
}) {
  function updateHashtag(index: number, value: string) {
    const updated = [...form.hashtags];
    updated[index] = value.startsWith("#") ? value : "#" + value;
    update("hashtags", updated);
  }

  function updateCert(index: number, value: string) {
    const updated = [...form.certifications];
    updated[index] = value;
    update("certifications", updated);
  }

  function updateQA(index: number, field: "question" | "answer", value: string) {
    const updated = form.qaItems.map((q, i) =>
      i === index ? { ...q, [field]: value } : q
    );
    update("qaItems", updated);
  }

  return (
    <>
      <Section title="📖 브랜드 스토리" subtitle="브랜드 철학과 스토리를 입력하세요">
        <div className="space-y-4">
          <Field label="브랜드 스토리">
            <textarea
              value={form.brandStory}
              onChange={(e) => update("brandStory", e.target.value)}
              placeholder="2026년 설립된 저희 브랜드는..."
              rows={5}
              className="input resize-none"
            />
          </Field>
          <Field label="원산지/생산지">
            <input
              type="text"
              value={form.productOrigin}
              onChange={(e) => update("productOrigin", e.target.value)}
              placeholder="국내산 · 전남 나주"
              className="input"
            />
          </Field>
          <Field label="소싱 스토리">
            <textarea
              value={form.sourcingStory}
              onChange={(e) => update("sourcingStory", e.target.value)}
              placeholder="직접 계약한 농장에서..."
              rows={3}
              className="input resize-none"
            />
          </Field>
        </div>
      </Section>

      <Section title="🏷️ 해시태그 & 인증">
        <div className="space-y-4">
          <Field label="해시태그 (최대 10개)">
            <div className="space-y-2">
              {form.hashtags.map((tag, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => updateHashtag(i, e.target.value)}
                    placeholder="#친환경"
                    className="flex-1 input-sm"
                  />
                  <button
                    type="button"
                    onClick={() => update("hashtags", form.hashtags.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-600 font-bold px-1"
                  >
                    ×
                  </button>
                </div>
              ))}
              {form.hashtags.length < 10 && (
                <button
                  type="button"
                  onClick={() => update("hashtags", [...form.hashtags, ""])}
                  className="text-sm text-green-600 hover:text-green-800 font-medium"
                >
                  + 해시태그 추가
                </button>
              )}
            </div>
          </Field>
          <Field label="성분/소재 상세">
            <textarea
              value={form.ingredientDetails}
              onChange={(e) => update("ingredientDetails", e.target.value)}
              placeholder="주성분: 유기농 귀리 70%..."
              rows={3}
              className="input resize-none"
            />
          </Field>
          <Field label="인증 정보 (최대 5개)">
            <div className="space-y-2">
              {form.certifications.map((cert, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={cert}
                    onChange={(e) => updateCert(i, e.target.value)}
                    placeholder="HACCP, 유기농인증..."
                    className="flex-1 input-sm"
                  />
                  <button
                    type="button"
                    onClick={() => update("certifications", form.certifications.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-600 font-bold px-1"
                  >
                    ×
                  </button>
                </div>
              ))}
              {form.certifications.length < 5 && (
                <button
                  type="button"
                  onClick={() => update("certifications", [...form.certifications, ""])}
                  className="text-sm text-green-600 hover:text-green-800 font-medium"
                >
                  + 인증 추가
                </button>
              )}
            </div>
          </Field>
          <div className="flex items-center gap-3">
            <input
              id="naverPayBadge"
              type="checkbox"
              checked={form.naverPayBadge}
              onChange={(e) => update("naverPayBadge", e.target.checked)}
              className="w-4 h-4 accent-green-600"
            />
            <label htmlFor="naverPayBadge" className="text-sm font-medium text-gray-700">
              네이버페이 뱃지 표시
            </label>
          </div>
        </div>
      </Section>

      <Section title="📋 사용 방법 가이드" subtitle="단계별 사용법 (SEO 및 신뢰도 향상)">
        <textarea
          value={form.usageGuide}
          onChange={(e) => update("usageGuide", e.target.value)}
          placeholder={"1단계: 세안 후 물기를 닦아냅니다\n2단계: 적당량을 덜어 얼굴 전체에 부드럽게 펴 바릅니다\n3단계: 가볍게 두드려 흡수시킵니다"}
          rows={4}
          className="input resize-none"
        />
      </Section>

      <Section title="❓ Q&A" subtitle="자주 묻는 질문 (최대 5개)">
        <div className="space-y-4">
          {form.qaItems.map((qa, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Q{i + 1}</span>
                {form.qaItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => update("qaItems", form.qaItems.filter((_, j) => j !== i))}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    삭제
                  </button>
                )}
              </div>
              <input
                type="text"
                value={qa.question}
                onChange={(e) => updateQA(i, "question", e.target.value)}
                placeholder="질문을 입력하세요"
                className="w-full input-sm"
              />
              <textarea
                value={qa.answer}
                onChange={(e) => updateQA(i, "answer", e.target.value)}
                placeholder="답변을 입력하세요"
                rows={2}
                className="w-full input-sm resize-none"
              />
            </div>
          ))}
          {form.qaItems.length < 5 && (
            <button
              type="button"
              onClick={() => update("qaItems", [...form.qaItems, { question: "", answer: "" }])}
              className="text-sm text-green-600 hover:text-green-800 font-medium"
            >
              + Q&A 추가
            </button>
          )}
        </div>
      </Section>
    </>
  );
}

/* ──────────────────────────────────────────
   프리미엄 전용 필드
────────────────────────────────────────── */
function PremiumFields({
  form,
  update,
}: {
  form: PremiumInput;
  update: (key: string, value: unknown) => void;
}) {
  function updateEndorsement(
    index: number,
    field: "name" | "quote" | "platform",
    value: string
  ) {
    const updated = form.endorsements.map((e, i) =>
      i === index ? { ...e, [field]: value } : e
    );
    update("endorsements", updated);
  }

  return (
    <>
      <Section title="👑 브랜드 헤리티지">
        <div className="space-y-4">
          <Field label="브랜드 헤리티지 / 역사">
            <textarea
              value={form.brandHeritage}
              onChange={(e) => update("brandHeritage", e.target.value)}
              placeholder="1987년 파리에서 시작된..."
              rows={4}
              className="input resize-none"
            />
          </Field>
          <Field label="컬렉션명">
            <input
              type="text"
              value={form.collectionName}
              onChange={(e) => update("collectionName", e.target.value)}
              placeholder="Prestige Collection 2025"
              className="input"
            />
          </Field>
          <Field label="한정판 정보 (선택)">
            <input
              type="text"
              value={form.limitedEditionInfo}
              onChange={(e) => update("limitedEditionInfo", e.target.value)}
              placeholder="전세계 500개 한정"
              className="input"
            />
          </Field>
        </div>
      </Section>

      <Section title="💎 소재 & 언박싱">
        <div className="space-y-4">
          <Field label="소재/장인정신 스토리">
            <textarea
              value={form.materialsStory}
              onChange={(e) => update("materialsStory", e.target.value)}
              placeholder="이탈리아산 풀그레인 가죽..."
              rows={4}
              className="input resize-none"
            />
          </Field>
          <Field label="언박싱 경험">
            <textarea
              value={form.unboxingDescription}
              onChange={(e) => update("unboxingDescription", e.target.value)}
              placeholder="블랙 리본으로 묶인 매트 블랙 박스..."
              rows={3}
              className="input resize-none"
            />
          </Field>
        </div>
      </Section>

      <Section title="🌟 인플루언서 추천" subtitle="최대 3개">
        <div className="space-y-4">
          {form.endorsements.map((e, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">추천 {i + 1}</span>
                {form.endorsements.length > 1 && (
                  <button
                    type="button"
                    onClick={() => update("endorsements", form.endorsements.filter((_, j) => j !== i))}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    삭제
                  </button>
                )}
              </div>
              <input
                type="text"
                value={e.name}
                onChange={(ev) => updateEndorsement(i, "name", ev.target.value)}
                placeholder="이름 또는 @계정"
                className="w-full input-sm"
              />
              <textarea
                value={e.quote}
                onChange={(ev) => updateEndorsement(i, "quote", ev.target.value)}
                placeholder="추천 문구"
                rows={2}
                className="w-full input-sm resize-none"
              />
              <select
                value={e.platform}
                onChange={(ev) => updateEndorsement(i, "platform", ev.target.value)}
                className="w-full input-sm"
              >
                <option>Instagram</option>
                <option>YouTube</option>
                <option>TikTok</option>
                <option>기타</option>
              </select>
            </div>
          ))}
          {form.endorsements.length < 3 && (
            <button
              type="button"
              onClick={() =>
                update("endorsements", [
                  ...form.endorsements,
                  { name: "", quote: "", platform: "Instagram" },
                ])
              }
              className="text-sm text-yellow-600 hover:text-yellow-800 font-medium"
            >
              + 추천 추가
            </button>
          )}
        </div>
      </Section>

      <Section title="🎬 영상 (선택)" subtitle="YouTube 또는 Vimeo URL (최대 2개)">
        <VideoUrlInput
          videos={form.videos}
          onChange={(videos) => update("videos", videos)}
          maxVideos={2}
        />
      </Section>
    </>
  );
}

/* ──────────────────────────────────────────
   공통 UI 컴포넌트
────────────────────────────────────────── */
function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
      <h2 className="text-lg font-bold text-gray-800 mb-1">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
