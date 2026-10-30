"use client";

import { HelpCircle, CheckCircle, AlertTriangle, PlaySquare, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function GuidePage() {
  const guides = [
    {
      title: "1. VPH(시간당 조회수 속도)는 무엇이며 왜 중요한가요?",
      desc: "Views Per Hour의 약자로, 영상이 업로드된 후 시간당 얼마나 빠른 속도로 조회수가 치솟고 있는지를 나타냅니다. 24시간 동안 단순히 많이 본 것이 아니라, '지금 이 순간 알고리즘이 추천 피드로 폭발적으로 밀어주는 영상'을 감지하는 가장 핵심적인 실시간 지표입니다.",
      badge: "핵심 지표",
    },
    {
      title: "2. vsRatio(구독자 대비 역전 배수)가 왜 중요한가요?",
      desc: "구독자 100만 대형 채널이 50만 조회수를 기록한 것은 팬덤의 기본 소비일 수 있습니다. 반면 구독자 8천 명인 소형 채널이 36만 조회수를 기록했다면 구독자 대비 44배 터진 '알고리즘 픽'입니다. 초기 크리에이터는 바로 이런 소형 채널의 공식을 벤치마킹해야 폭발적인 성장이 가능합니다.",
      badge: "소형 채널 발굴",
    },
    {
      title: "3. '쇼츠 원본 찾기'는 어떻게 활용하나요?",
      desc: "터진 인기 쇼츠의 80% 이상은 기존 10~30분짜리 롱폼 영상에서 가장 흥미진진한 40~60초 하이라이트를 재가공한 것입니다. 쇼츠 링크를 넣으면 영상의 모태가 된 원본 롱폼을 자동으로 역추적해 주며, 원본을 시청하면 쇼츠에서 다루지 못한 풍부한 비하인드 스토리와 추가 롱폼/쇼츠 소재를 무한히 발굴할 수 있습니다.",
      badge: "소재 무한 발굴",
    },
    {
      title: "4. YouTube API 무료 일일 한도는 언제 초기화되나요?",
      desc: "구글 클라우드에서 제공하는 무료 YouTube Data API v3 쿼터는 하루 10,000 units(search.list 약 100회)입니다. 매일 한국 시간 오후 4시(겨울철 5시), 미국 태평양 자정에 무료 한도가 완전히 새로 충전되므로 매일 무료로 넉넉하게 트렌드를 탐색하실 수 있습니다.",
      badge: "무료 한도",
    },
    {
      title: "5. 채널 분석 및 키워드 분석 시 쿼터 소모량은?",
      desc: "@핸들이나 채널 주소로 채널을 분석할 때는 약 5 units, 키워드 검색이나 공략 채널 발굴 시에는 약 100 units가 소모됩니다. 각 화면마다 예상 쿼터 사용량이 투명하게 안내됩니다.",
      badge: "쿼터 관리",
    },
    {
      title: "6. 발굴한 공식을 쇼츠 영상으로 즉시 제작하려면?",
      desc: "분석 완료 화면에서 '쇼츠 영상 제작하기 ➔' 버튼을 클릭하면, 분석된 킬러 훅과 씬별 대본이 'shorts-onestop-studio'의 제작 슬롯으로 즉시 전달되어 1분 만에 1080×1920 세로형 쇼츠 영상으로 완성할 수 있습니다.",
      badge: "원스톱 파이프라인",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 헤더 배너 */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-[#EA3323]">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 md:text-2xl">
              유튜브 트렌드 분석 & 황금 채널 발굴 실전 가이드북
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              구독자 수가 적어도 알고리즘의 선택을 받는 3단계 핵심 공식과 지표 해석법
            </p>
          </div>
        </div>
      </div>

      {/* 3단계 황금 공식 인포그래픽 */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="mb-4 text-sm font-black text-slate-900">🚀 3단계 알고리즘 공략 파이프라인</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-red-100 bg-red-50/40 p-4">
            <span className="text-[10px] font-black text-red-600 uppercase tracking-wider">STEP 01</span>
            <h3 className="mt-1 text-sm font-black text-slate-900">실시간 VPH 급상승 탐색</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              시간당 조회수(VPH)가 채널 평균 대비 5배 이상 급상승 중인 핫 트렌드 소재를 감지합니다.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
            <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">STEP 02</span>
            <h3 className="mt-1 text-sm font-black text-slate-900">구독자 역전 배수 검증</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              구독자 1만 이하 소형 채널인데 조회수 20~50배 폭발한 순수 알고리즘 떡상 공식을 필터링합니다.
            </p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
            <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider">STEP 03</span>
            <h3 className="mt-1 text-sm font-black text-slate-900">원스톱 대본화 & 영상 제작</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              검증된 1초 킬러 훅을 AI로 내 카테고리에 맞게 재창작하고 쇼츠 원스톱 스튜디오로 직결합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 지표 해석 Do's & Don'ts */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="mb-4 text-sm font-black text-slate-900">⚖️ 지표 해석 실전 원칙 (Do's & Don'ts)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-black text-emerald-800">
              <CheckCircle size={16} />
              <span>권장하는 벤치마킹 접근법 (Do's)</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700">
              <li>• 구독자가 적은데 조회수가 터진 채널의 첫 1~3초 훅을 집중 분석하세요.</li>
              <li>• 댓글 창에서 시청자가 감탄하거나 공유한 핵심 포인트를 대본에 담으세요.</li>
              <li>• 시간당 VPH가 높게 유지되는 영상의 빠른 화면 전환 속도를 벤치마킹하세요.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-black text-rose-800">
              <AlertTriangle size={16} />
              <span>피해야 할 잘못된 접근법 (Don'ts)</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700">
              <li>• 100만 대형 유튜버의 단순 총 조회수만 보고 무작정 따라 하지 마세요.</li>
              <li>• 도입부 후킹만 강하고 본문에서 실속이 없는 낚시성 대본은 역풍을 맞습니다.</li>
              <li>• 내 채널의 주제와 전혀 무관한 엉뚱한 바이럴 키워드를 끼워 넣지 마세요.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* FAQ 6종 아코디언 리스트 */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="mb-4 text-sm font-black text-slate-900">❓ 자주 묻는 질문 (FAQ)</h2>
        <div className="space-y-3">
          {guides.map((g, idx) => (
            <div key={idx} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 transition-colors hover:bg-slate-50">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-black text-slate-900">{g.title}</h3>
                <span className="shrink-0 rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-red-600 shadow-xs border border-slate-200">
                  {g.badge}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{g.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex justify-center pt-2">
        <Link href="/trending-videos" className="btn-3d-red px-8 py-3 text-sm">
          🔥 급상승 동영상 피드 탐색 시작하기 ➔
        </Link>
      </div>
    </div>
  );
}
