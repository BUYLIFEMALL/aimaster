"use client";

import React from "react";
import { X, HelpCircle, Check, Lightbulb, TrendingUp, Layers, Eye } from "lucide-react";

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GuideModal({ isOpen, onClose }: GuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-7 shadow-2xl border border-slate-200 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-5 text-indigo-600">
          <HelpCircle className="w-6 h-6" />
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            AI 유튜브 썸네일 프로 활용 가이드
          </h2>
        </div>

        <div className="space-y-6 text-sm text-slate-700">
          {/* Section 1 */}
          <div className="p-4 bg-indigo-50/70 rounded-xl border border-indigo-100">
            <h3 className="font-bold text-indigo-900 flex items-center gap-2 mb-2 text-base">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              1. A/B 테스트 전략의 3가지 핵심 공식
            </h3>
            <ul className="space-y-2 text-xs text-indigo-950">
              <li className="flex items-start gap-2">
                <span className="font-bold text-indigo-600">① 호기심 유발형:</span>
                결말이나 숨겨진 진실을 감추고 질문을 던져 높은 클릭률(CTR)을 유도합니다.
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-indigo-600">② 가치/혜택 중심형:</span>
                "이 영상을 보면 무엇을 얻을 수 있는가?"를 명확히 제시하여 높은 시청 지속시간을 만듭니다.
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-indigo-600">③ 스토리/감성 후킹형:</span>
                극적인 상황, 주인공의 감정선, 서사적 반전을 통해 깊은 공감대를 형성합니다.
              </li>
            </ul>
          </div>

          {/* Section 2 */}
          <div>
            <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-2 text-base">
              <Layers className="w-4 h-4 text-slate-700" />
              2. 유튜브 스튜디오 전용 태그 & 고정 댓글 100% 활용법
            </h3>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              AI가 생성한 [유튜브 스튜디오 전용 태그]는 500자 한도에 맞춰 쉼표(,)로 구분되어 있으므로, 유튜브 스튜디오 동영상 세부정보의 태그 입력란에 그대로 붙여넣으시면 됩니다.
              또한 [고정 댓글 전략]의 유도 질문을 첫 번째 댓글로 등록하고 상단 고정하면 시청자 댓글 참여율이 300% 이상 상승합니다.
            </p>
          </div>

          {/* Section 3 */}
          <div>
            <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-2 text-base">
              <Eye className="w-4 h-4 text-slate-700" />
              3. 피사체(인물) 일관성 및 레퍼런스 이미지 활용
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="font-bold text-slate-900 block mb-1">본인 얼굴 사진 등록</span>
                크리에이터 본인의 사진을 [레퍼런스 이미지]로 업로드하면, AI가 얼굴 특징을 반영하여 실제 본인이 등장하는 실감나는 썸네일을 렌더링합니다.
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="font-bold text-slate-900 block mb-1">피드백 수정 루프</span>
                생성된 결과물이 마음에 들 때 표정이나 배경 조명만 살짝 바꾸고 싶다면, 3단계의 [결과물 수정 요청]에 텍스트를 입력하여 자연스럽게 재생성하세요.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
          >
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
}
