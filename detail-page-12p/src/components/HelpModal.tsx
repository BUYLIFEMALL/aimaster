"use client";

import { X, BookOpen, Sparkles, CheckCircle2, ShoppingBag, Zap, Layers, Image as ImageIcon } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm md:text-base">
                AI 12단 상세페이지 자동화 가이드
              </h3>
              <p className="text-xs text-slate-500">쿠팡 & 네이버 스마트스토어 완벽 호환 가이드</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 바디 (스크롤) */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          {/* 3단계 핵심 흐름 */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-amber-500" />
              1. 상세페이지 제작 3단계 워크플로우
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-xs font-bold text-blue-600 block mb-1">STEP 1</span>
                <p className="font-semibold text-slate-900 text-xs mb-1">제품 정보 & 스펙 입력</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  상품명 입력 후 <strong>1초 자동검색</strong>을 누르면 스펙/설명/타겟이 자동 입력됩니다. 실물 사진이나 사양서(PDF, TXT)를 함께 첨부할 수 있습니다.
                </p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-xs font-bold text-blue-600 block mb-1">STEP 2</span>
                <p className="font-semibold text-slate-900 text-xs mb-1">12단 스튜디오 자동 기획</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  헤드카피, 서브카피, 3대 체크포인트, Nano Banana 비주얼 프롬프트가 한 번에 완성됩니다. 씬별로 원하는 문구를 자유롭게 편집 가능합니다.
                </p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-xs font-bold text-blue-600 block mb-1">STEP 3</span>
                <p className="font-semibold text-slate-900 text-xs mb-1">이미지 렌더 & 일괄 다운</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  각 씬의 이미지를 원클릭으로 렌더링하고, 개별 고화질 컷 또는 쿠팡/네이버에 바로 올릴 수 있는 통상세페이지 규격으로 일괄 다운로드합니다.
                </p>
              </div>
            </div>
          </div>

          {/* 플랫폼 규격 차이 */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <ShoppingBag className="w-4 h-4 text-indigo-600" />
              2. 플랫폼별 최적화 규격
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex gap-2 items-start p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                <div className="p-1 rounded bg-blue-600 text-white font-bold text-[10px]">쿠팡</div>
                <div className="text-slate-700 leading-relaxed">
                  <strong>12+ 장면 풀 시퀀스</strong>: 모바일 가로 860px 규격에 최적화된 12개 장면(프로모션, 메인후킹, 스펙, 3대 특장점, 라이프스타일, 비교우위, 초근접, 활용팁, 추천고객, 패키지FAQ)을 빈틈없이 완성합니다.
                </div>
              </div>
              <div className="flex gap-2 items-start p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                <div className="p-1 rounded bg-emerald-600 text-white font-bold text-[10px]">스마트스토어</div>
                <div className="text-slate-700 leading-relaxed">
                  <strong>9+ 장면 감성 시퀀스</strong>: 네이버 블로그형 리뷰와 감성 스토리텔링에 맞춘 9단 시퀀스로 높은 브랜드 신뢰도를 형성합니다.
                </div>
              </div>
            </div>
          </div>

          {/* AI 렌더링 모델 팁 */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-amber-500" />
              3. AI 렌더링 모델 선택
            </h4>
            <ul className="text-xs space-y-1.5 text-slate-600 list-disc list-inside">
              <li><strong>⚡ Nano Banana (기본)</strong>: Gemini 2.5 Flash 기반의 초고속 기획 및 반응 속도를 제공합니다.</li>
              <li><strong>✨ Nano Banana2 (고화질)</strong>: Gemini 3 Pro / Imagen 기반의 매크로 질감과 디테일한 비주얼 렌더링을 제공합니다.</li>
            </ul>
          </div>
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors"
          >
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
}
