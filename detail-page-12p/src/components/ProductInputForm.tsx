"use client";

import { useState, useRef } from "react";
import {
  Sparkles,
  Search,
  Upload,
  FileText,
  Image as ImageIcon,
  Trash2,
  Zap,
  ShoppingBag,
  Rocket,
  Tag,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import { ProductInputData, PlatformType, ModelType } from "@/types/detail";

interface ProductInputFormProps {
  initialData?: ProductInputData;
  onSubmit: (data: ProductInputData) => void;
  isGenerating: boolean;
  onOpenApiKey: () => void;
  hasKey: boolean;
}

export function ProductInputForm({
  initialData,
  onSubmit,
  isGenerating,
  onOpenApiKey,
  hasKey,
}: ProductInputFormProps) {
  const [productName, setProductName] = useState(initialData?.productName || "");
  const [platform, setPlatform] = useState<PlatformType>(initialData?.platform || "coupang");
  const [model, setModel] = useState<ModelType>(initialData?.model || "nano-banana");
  const [originalPrice, setOriginalPrice] = useState<number | undefined>(initialData?.originalPrice || 49000);
  const [salePrice, setSalePrice] = useState<number | undefined>(initialData?.salePrice || 29900);
  const [discountRate, setDiscountRate] = useState<number | undefined>(initialData?.discountRate || 39);
  const [description, setDescription] = useState(initialData?.description || "");
  const [targetAudience, setTargetAudience] = useState(initialData?.targetAudience || "");
  const [toneAndManner, setToneAndManner] = useState(initialData?.toneAndManner || "모던 프리미엄");
  const [eventBannerText, setEventBannerText] = useState(initialData?.eventBannerText || "선착순 런칭 특가 39% 할인 + 무료배송");
  const [specDocContent, setSpecDocContent] = useState(initialData?.specDocContent || "");
  const [productImages, setProductImages] = useState<string[]>(initialData?.productImages || []);

  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // 가격 변경 시 할인율 자동 계산
  const handlePriceChange = (orig?: number, sale?: number) => {
    if (orig && sale && orig > 0) {
      const rate = Math.round(((orig - sale) / orig) * 100);
      setDiscountRate(rate > 0 ? rate : 0);
    }
  };

  // 1초 스펙 자동검색
  const handleAutoSearch = async () => {
    if (!productName.trim()) {
      setSearchError("제품명을 먼저 입력해주세요.");
      return;
    }

    if (!hasKey) {
      onOpenApiKey();
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const res = await fetch("/api/auto-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName: productName.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.needApiKey) {
          onOpenApiKey();
        }
        throw new Error(data.error || "스펙 조사에 실패했습니다.");
      }

      const result = data.result;
      if (result.description) setDescription(result.description);
      if (result.targetAudience) setTargetAudience(result.targetAudience);
      if (result.toneAndManner) setToneAndManner(result.toneAndManner);
      if (result.recommendedDiscount) {
        setDiscountRate(result.recommendedDiscount);
        if (originalPrice) {
          setSalePrice(Math.round(originalPrice * (1 - result.recommendedDiscount / 100)));
        }
      }
      if (result.eventBannerText) setEventBannerText(result.eventBannerText);
      if (result.specs && result.specs.length > 0) {
        setSpecDocContent(result.specs.join("\n"));
      }
    } catch (err: any) {
      setSearchError(err.message || "오류가 발생했습니다.");
    } finally {
      setIsSearching(false);
    }
  };

  // 사진 업로드 핸들러
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setProductImages((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setProductImages((prev) => prev.filter((_, i) => i !== index));
  };

  // 문서 업로드 핸들러 (PDF, TXT, MD)
  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setSpecDocContent((prev) => (prev ? `${prev}\n\n[첨부문서: ${file.name}]\n${text}` : text));
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) {
      setSearchError("제품명을 입력해주세요.");
      return;
    }

    if (!hasKey) {
      onOpenApiKey();
      return;
    }

    onSubmit({
      productName: productName.trim(),
      platform,
      model,
      originalPrice,
      salePrice,
      discountRate,
      description,
      targetAudience,
      toneAndManner,
      eventBannerText,
      specDocContent,
      productImages,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* 1. 상단 안내 헤더 */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[11px] font-semibold">
            <Sparkles className="w-3 h-3 text-amber-300" />
            쿠팡 12단 & 스마트스토어 9단 초고속 생성기
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">
            1. 제품 정보 및 사양 입력
          </h2>
          <p className="text-xs md:text-sm text-blue-100">
            상품명만 입력하면 AI가 스펙, 타겟, 카피를 1초 만에 분석하여 12단 풀 패키지를 자동 기획합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!hasKey && (
            <button
              type="button"
              onClick={onOpenApiKey}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
            >
              <Zap className="w-3.5 h-3.5" />
              API 키 연동하기
            </button>
          )}
        </div>
      </div>

      {/* 2. AI 모델 & 플랫폼 선택 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 플랫폼 선택 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-2">
          <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span>판매 플랫폼 규격</span>
            <span className="text-[11px] text-blue-600 font-normal">자동 최적화</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPlatform("coupang")}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                platform === "coupang"
                  ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/10"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Rocket className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-xs text-slate-900">쿠팡 (12단+)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                로켓배송 860px 규격 · 12장면 풀패키지
              </p>
            </button>

            <button
              type="button"
              onClick={() => setPlatform("smartstore")}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                platform === "smartstore"
                  ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/10"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-xs text-slate-900">네이버 (9단+)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                스마트스토어 최적화 · 9장면 스토리형
              </p>
            </button>
          </div>
        </div>

        {/* AI 모델 선택 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-2">
          <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span>AI 렌더링 엔진</span>
            <span className="text-[11px] text-indigo-600 font-normal">Gemini Engine</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setModel("nano-banana")}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                model === "nano-banana"
                  ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/10"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-xs text-slate-900">⚡ Nano Banana</span>
              </div>
              <p className="text-[11px] text-slate-500">
                빠른 생성 속도 · 상업용 표준 렌더링
              </p>
            </button>

            <button
              type="button"
              onClick={() => setModel("nano-banana2")}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                model === "nano-banana2"
                  ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/10"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-xs text-slate-900">✨ Nano Banana2</span>
              </div>
              <p className="text-[11px] text-slate-500">
                초고해상도 · 극세사 매크로 질감
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* 3. 상품명 & 1초 자동검색 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-800 flex items-center justify-between mb-1.5">
            <span>상품명 (필수)</span>
            <span className="text-[11px] text-slate-400 font-normal">브랜드명이나 모델명을 포함하면 정확도가 올라갑니다</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="예: 초경량 접이식 티타늄 캠핑 화로대 M사이즈"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            />
            <button
              type="button"
              onClick={handleAutoSearch}
              disabled={isSearching || !productName.trim()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              {isSearching ? "조사 중..." : "🔍 1초 스펙 자동검색"}
            </button>
          </div>
          {searchError && (
            <p className="text-xs text-rose-600 flex items-center gap-1 mt-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> {searchError}
            </p>
          )}
        </div>

        {/* 가격 & 할인율 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              정상 소비자 가격 (원)
            </label>
            <input
              type="number"
              placeholder="49000"
              value={originalPrice || ""}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : undefined;
                setOriginalPrice(val);
                handlePriceChange(val, salePrice);
              }}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              실제 판매 할인가 (원)
            </label>
            <input
              type="number"
              placeholder="29900"
              value={salePrice || ""}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : undefined;
                setSalePrice(val);
                handlePriceChange(originalPrice, val);
              }}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              할인율 (% 자동계산)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="39"
                value={discountRate || ""}
                onChange={(e) => setDiscountRate(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-blue-600"
              />
              <span className="text-xs font-bold text-rose-600 shrink-0">
                {discountRate ? `${discountRate}% OFF` : ""}
              </span>
            </div>
          </div>
        </div>

        {/* 이벤트 / 프로모션 배너 문구 */}
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            상단 이벤트 / 한정 프로모션 문구 (선택)
          </label>
          <input
            type="text"
            placeholder="예: 기간 한정 런칭 기념 39% 즉시할인 + 전용 파우치 증정"
            value={eventBannerText}
            onChange={(e) => setEventBannerText(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* 4. 제품 사진 멀티 업로드 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
              제품 실물 사진 등록 (다각도 앵글 분석, 선택)
            </label>
            <p className="text-[11px] text-slate-500">
              #FFFFFF 흰색 배경 누끼 사진을 올리시면 AI가 제품 형태를 완벽하게 인식해 실물과 일치하게 렌더링합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-medium text-slate-700 transition-colors flex items-center gap-1"
          >
            <Upload className="w-3 h-3" /> 사진 추가
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {/* 사진 썸네일 그리드 */}
        {productImages.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-2">
            {productImages.map((img, idx) => (
              <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-square">
                <img src={img} alt={`제품 사진 ${idx + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-lg transition-colors opacity-80 group-hover:opacity-100"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                <span className="absolute bottom-1 left-1 px-1.5 py-0.2 bg-black/50 text-white text-[9px] rounded font-mono">
                  #{idx + 1}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50"
          >
            <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
            <p className="text-xs font-medium text-slate-600">
              클릭하여 제품 사진을 업로드하거나 여기로 드래그하세요
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              JPG, PNG, WebP 지원 (최대 10장)
            </p>
          </div>
        )}
      </div>

      {/* 5. 사양서 / 설명 문서 업로드 및 상세 정보 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        {/* 사양서 문서 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              제품 사양서 및 인증 내역 (선택)
            </label>
            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
            >
              <Upload className="w-3 h-3" /> 파일 불러오기 (PDF, TXT, MD)
            </button>
            <input
              ref={docInputRef}
              type="file"
              accept=".txt,.md,.pdf"
              onChange={handleDocUpload}
              className="hidden"
            />
          </div>
          <textarea
            rows={3}
            placeholder="제품의 세부 사양, 성분, KC 인증 번호, 크기 및 무게 등을 입력해주세요."
            value={specDocContent}
            onChange={(e) => setSpecDocContent(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-blue-600 transition-all font-mono"
          />
        </div>

        {/* 제품 설명 텍스트영역 */}
        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1">
            제품 핵심 설명 & 강점 카피
          </label>
          <textarea
            rows={3}
            placeholder="소비자가 꼭 알아야 할 가장 강력한 장점이나 차별점을 입력해주세요. (스펙 자동검색 시 자동 완성됩니다)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-blue-600 transition-all"
          />
        </div>

        {/* 타겟 고객 & 톤앤매너 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              타겟 고객층
            </label>
            <input
              type="text"
              placeholder="예: 2040 백패킹·오토캠핑 매니아, 1인 가구"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              추천 톤앤매너
            </label>
            <input
              type="text"
              placeholder="예: 모던 프리미엄, 감성 아웃도어, 미니멀리즘"
              value={toneAndManner}
              onChange={(e) => setToneAndManner(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>
      </div>

      {/* 6. 메인 생성 액션 버튼 */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isGenerating || !productName.trim()}
          className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-50 text-white text-base font-black rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 transform active:scale-[0.99]"
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>AI 12단 상세페이지 전체 시퀀스 기획 중...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>
                {platform === "coupang" ? "쿠팡 규격 12단 상세페이지 원클릭 일괄 기획하기 🚀" : "스마트스토어 9단 상세페이지 원클릭 일괄 기획하기 🚀"}
              </span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
