"use client";

import { useState } from "react";
import { X, BookOpen, Sparkles, ShoppingBag, Image, Sliders, MessageSquare } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<"routine" | "ad" | "ref" | "skin" | "caption">("routine");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm md:text-base">
                AI 인플루언서 자동화 사용 가이드
              </h3>
              <p className="text-[11px] text-slate-500">PRO 버전 핵심 기능 완벽 활용법</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-100 bg-white overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab("routine")}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "routine"
                ? "border-pink-500 text-pink-600 bg-pink-50/40"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI 일과 플래닝 & 변형</span>
          </button>
          <button
            onClick={() => setActiveTab("ad")}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "ad"
                ? "border-pink-500 text-pink-600 bg-pink-50/40"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>광고 / 공구 모드</span>
          </button>
          <button
            onClick={() => setActiveTab("ref")}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "ref"
                ? "border-pink-500 text-pink-600 bg-pink-50/40"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Image className="w-3.5 h-3.5" />
            <span>레퍼런스 이미지 (일관성)</span>
          </button>
          <button
            onClick={() => setActiveTab("skin")}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "skin"
                ? "border-pink-500 text-pink-600 bg-pink-50/40"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>피부 텍스처 디테일</span>
          </button>
          <button
            onClick={() => setActiveTab("caption")}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "caption"
                ? "border-pink-500 text-pink-600 bg-pink-50/40"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>캡션 & 미세 보정</span>
          </button>
        </div>

        {/* 탭 내용 영역 */}
        <div className="p-6 overflow-y-auto text-xs text-slate-600 space-y-4 leading-relaxed">
          {activeTab === "routine" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-pink-50/50 border border-pink-100">
                <h4 className="font-bold text-slate-900 text-sm mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-pink-500" />
                  자동 일과 생성 (Routine Planner)
                </h4>
                <p>
                  &quot;오늘 친구랑 성수동 카페 갔다가 저녁에 한강 러닝 뛸거야&quot;라고 간단히 입력해보세요. AI가 시간대별로 가장 인스타그래머블한 <strong>5가지 순간(모닝 셀카 → 카페 브이로그 → 오운완 짐벌 → 엘리베이터 OOTD → 루프탑 선셋)</strong>을 자동으로 기획하고 조명과 의상을 즉시 세팅합니다.
                </p>
                <div className="mt-2 text-[11px] text-pink-700 font-medium">
                  💡 <strong>Tip</strong>: 캐릭터 국적 설정(한국인, 일본인, 서양인 등)에 따라 AI가 추천하는 핫플레이스와 무드가 맞춤형으로 달라집니다.
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-slate-900 text-sm mb-1.5">
                  🎲 주사위 랜덤 일과 (20대 K-인플루언서 루틴)
                </h4>
                <p>
                  아이디어가 떠오르지 않을 때는 주사위 버튼을 눌러보세요. &quot;성공한 CEO의 월요일&quot;, &quot;도산공원 명품관 쇼핑&quot;, &quot;해운대 요트 투어&quot; 등 20가지 검증된 시나리오 세트 중 하나가 랜덤으로 자동 플래닝됩니다.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-slate-900 text-sm mb-1.5">
                  📐 단일 이벤트 변형 (Event Variations)
                </h4>
                <p>
                  하나의 단일 사건(예: &quot;브랜드 런칭 파티&quot;, &quot;풀빌라 호캉스&quot;)을 입력하면, 같은 행사에서도 <strong>전신 룩북 화보, 클로즈업 셀카, 샴페인 소품 컷, 퇴근 거울 셀카 등 5가지 상이한 앵글</strong>로 촬영 시나리오를 자동 분할 제안합니다.
                </p>
              </div>
            </div>
          )}

          {activeTab === "ad" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-pink-50/50 border border-pink-100">
                <h4 className="font-bold text-slate-900 text-sm mb-1.5">
                  🛍️ 광고/공구 모드 (Ad & Sponsored PPL)
                </h4>
                <p>
                  실제 상품 판매나 마케팅 홍보를 위한 특수 모드입니다. 상품 실물 사진(최대 3장)을 업로드하면 AI가 자연스럽게 손에 쥐거나 전면에 부각된 PPL 사진을 합성합니다.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="font-bold text-slate-800 block mb-1">🔥 공동구매 (Group Buy)</span>
                  <p className="text-[11px] text-slate-500">
                    긴박감 넘치는 톤앤매너, &quot;프로필 링크 클릭&quot; 유도 포즈, 파격 할인 강조형 인스타 캡션 자동 생성.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="font-bold text-slate-800 block mb-1">🎁 단순협찬 (Seeding)</span>
                  <p className="text-[11px] text-slate-500">
                    자연스러운 실사용 후기 느낌, 제품을 얼굴 가까이 대는 뷰티 인플루언서 특유의 밀착 샷.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="font-bold text-slate-800 block mb-1">✨ 브랜디드 (Paid Ad)</span>
                  <p className="text-[11px] text-slate-500">
                    공식 브랜드 화보 룩북 퀄리티, 브랜드 로고와 패키지가 가장 돋보이는 프리미엄 조명과 구도.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="font-bold text-slate-800 block mb-1">👑 앰버서더 (Ambassador)</span>
                  <p className="text-[11px] text-slate-500">
                    최고급 브랜드 앰버서더의 럭셔리 감성, 우아하고 절제된 하이엔드 무드 연출.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "ref" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-slate-900 text-sm mb-1.5">
                  👤 인물 고정 (얼굴 일관성 유지)
                </h4>
                <p>
                  사용자 본인이나 특정 모델의 얼굴 사진을 업로드하면, Gemini 멀티모달 엔진이 해당 인물의 고유 이목구비와 눈매를 분석하여 일관된 페이스로 생성합니다.
                </p>
                <div className="mt-2 text-[11px] text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                  ✨ <strong>헤어스타일 팁</strong>: 옵션에서 <span className="font-semibold text-pink-600">&apos;✨ 레퍼런스와 동일 (고정)&apos;</span>을 선택하시면 머리 모양과 색상까지 원본 사진과 100% 동일하게 유지됩니다.
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-slate-900 text-sm mb-1.5">
                  📍 장소 고정 (배경 일관성 유지)
                </h4>
                <p>
                  특정 카페, 침실, 전시장 등 원하는 배경 사진을 업로드하면 해당 공간의 인테리어 구조와 앰비언트 조명을 유지한 채 인물만 자연스럽게 합성된 것처럼 화보를 만듭니다.
                </p>
              </div>
            </div>
          )}

          {activeTab === "skin" && (
            <div className="space-y-3">
              <p>
                초현실적인 리얼리티를 위해 30가지 피부 질감 옵션을 멀티 체크박스로 믹스매치할 수 있습니다:
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <strong>Pores (모공)</strong>: 초고해상도 접사 화보 필수
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <strong>Dewy (물광)</strong>: 한국 뷰티 K-Glass Skin
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <strong>Peach Fuzz (솜털)</strong>: 역광 사진에서 극강의 리얼함
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <strong>Sweat (미세한 땀)</strong>: 오운완/헬스 짐웨어 컨셉
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <strong>Freckles (주근깨)</strong>: 내추럴 서머 뷰티 화보
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <strong>Matte (보송 매트)</strong>: 클래식 도자기 베이스 룩
                </div>
              </div>
            </div>
          )}

          {activeTab === "caption" && (
            <div className="space-y-3">
              <p>
                이미지 생성과 동시에 인스타그램 3종 캡션(감성형, 위트/트렌디형, 질문/소통형)과 5~10개의 추천 해시태그가 자동 작성됩니다.
              </p>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h5 className="font-bold text-slate-800">💬 2중 미세 보정 루프 활용법:</h5>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                  <li><strong>캡션 수정 요청</strong>: &quot;조금 더 신나는 톤으로&quot;, &quot;제품 할인 혜택을 강조해줘&quot; 입력 시 캡션만 즉시 재생성됩니다.</li>
                  <li><strong>이미지 미세 보정</strong>: &quot;머리를 조금 더 밝게 해줘&quot;, &quot;배경에 카페 분위기 더해줘&quot; 입력 시 직전 결과물을 참조하여 자연스럽게 연속 수정합니다.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* 모달 푸터 */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
