"use client";

import {
  HelpCircle,
  Flame,
  Search,
  Sparkles,
  Link2,
  TrendingUp,
  Key,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

export default function GuidePage() {
  const guides = [
    {
      title: "1. VPH(시간당 조회수 속도)란 무엇인가요?",
      desc: "Views Per Hour의 약자로, 영상이 업로드된 후 시간당 얼마나 빠른 속도로 조회수가 증가하고 있는지를 나타내는 실시간 바이럴 속도 지표입니다. 예를 들어 '+7.5만/h'는 1시간에 75,000회씩 조회수가 폭증하고 있다는 의미이며, 현재 유튜브 알고리즘의 강력한 추천을 받고 있음을 뜻합니다.",
      badge: "핵심 지표",
    },
    {
      title: "2. vsRatio(구독자 대비 배수)가 왜 중요한가요?",
      desc: "대형 채널(구독자 100만)이 50만 뷰를 기록한 것은 알고리즘 떡상이 아니라 기존 팬덤의 시청일 수 있습니다. 반면 구독자 2,000명인 소형 채널이 30만 뷰(150배)를 기록했다면, 이는 100% 알고리즘의 간택을 받은 순수 기여도(Viral) 콘텐츠입니다. vsRatio가 높을수록 벤치마킹 가치가 극대화됩니다.",
      badge: "소형 채널 발굴",
    },
    {
      title: "3. '쇼츠 원본 찾기'는 어떻게 활용하나요?",
      desc: "인기 쇼츠는 보통 10~30분짜리 롱폼 영상에서 가장 흥미진진한 40~60초 하이라이트를 편집한 경우가 많습니다. 쇼츠 링크를 입력하면 설명란 역추적 및 동일 채널 내 롱폼 영상의 텍스트 유사도를 분석하여 원본 풀영상을 자동으로 찾아줍니다. 원본을 시청하면 쇼츠에서 다루지 못한 풍부한 비하인드 스토리와 추가 숏폼 소재를 무한히 발굴할 수 있습니다.",
      badge: "소재 무한 발굴",
    },
    {
      title: "4. YouTube API 일일 한도가 소진되면 어떻게 되나요?",
      desc: "Google은 각 프로젝트마다 매일 10,000 units의 무료 쿼리를 제공합니다. 일반적인 쇼츠 탐색 기준 수백 회 이상 넉넉히 사용 가능하며, 태평양 표준시(PST) 자정(한국 시간 오후 4시)에 매일 자동으로 10,000 units가 다시 충전됩니다. 추가 비용은 일절 발생하지 않습니다.",
      badge: "무료 한도",
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 상단 타이틀 */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-red-100 text-red-600 rounded-lg">
            <HelpCircle className="w-5 h-5" />
          </span>
          <h1 className="text-xl font-bold text-gray-900">
            YouTube Viral Studio 이용 가이드
          </h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          골든 파인더 엔진의 핵심 지표를 이해하고, 알고리즘을 뚫어내는 떡상 쇼츠를 찾는 마스터 가이드입니다.
        </p>
      </div>

      {/* 4단계 마스터 워크플로우 */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-gray-900">
          🚀 떡상 콘텐츠 발굴 4단계 실전 워크플로우
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs">
              1
            </div>
            <h3 className="text-sm font-bold text-gray-900">
              API 키 1분 연동
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              [설정] 메뉴에서 본인의 무료 YouTube Data API v3 키를 등록합니다.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs">
              2
            </div>
            <h3 className="text-sm font-bold text-gray-900">
              소형 채널 떡상 쇼츠 검색
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              구독자 1만~5만 이하 필터로 소형 채널에서 터진 순수 알고리즘 영상을 발굴합니다.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs">
              3
            </div>
            <h3 className="text-sm font-bold text-gray-900">
              VPH 속도 & 썸네일 분석
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              시간당 조회수 속도(VPH)와 제목의 훅킹 키워드, 첫 3초 시각 요소를 분석합니다.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs">
              4
            </div>
            <h3 className="text-sm font-bold text-gray-900">
              롱폼 원본 역추적 & 재구성
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              [쇼츠 원본 찾기]로 풀영상을 확인하여 남들이 놓친 숨은 숏폼 소재를 시리즈로 제작합니다.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ 아코디언 */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-gray-900 mb-2">
          자주 묻는 질문 (FAQ)
        </h2>
        <div className="space-y-4">
          {guides.map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-gray-50/70 border border-gray-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">
                  {item.title}
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">
                  {item.badge}
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
