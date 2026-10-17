"use client";

import { HelpCircle } from "lucide-react";

export default function GuidePage() {
  const guides = [
    {
      title: "1. VPH(시간당 조회수 속도)란 무엇인가요?",
      desc: "Views Per Hour의 약자로, 영상이 업로드된 후 시간당 얼마나 빠른 속도로 조회수가 증가하고 있는지를 나타내는 업로드 이후 평균 조회수 지표입니다. 예를 들어 '+7.5만/h'는 누적 조회수를 업로드 후 경과 시간으로 나눈 값이 75,000회라는 의미입니다. 최근 1시간 증가량이나 추천 유입을 직접 측정한 값은 아닙니다.",
      badge: "핵심 지표",
    },
    {
      title: "2. vsRatio(구독자 대비 배수)가 왜 중요한가요?",
      desc: "대형 채널(구독자 100만)이 50만 뷰를 기록한 것은 알고리즘 떡상이 아니라 기존 팬덤의 시청일 수 있습니다. 반면 구독자 2,000명인 소형 채널이 30만 뷰(150배)를 기록했다면, 구독자 대비 조회수가 높은 영상입니다. 추천·검색·외부 공유 등 유입 경로는 이 수치만으로 확정할 수 없으며 다른 지표와 함께 참고해주세요.",
      badge: "소형 채널 발굴",
    },
    {
      title: "3. '쇼츠 원본 찾기'는 어떻게 활용하나요?",
      desc: "인기 쇼츠는 보통 10~30분짜리 롱폼 영상에서 가장 흥미진진한 40~60초 하이라이트를 편집한 경우가 많습니다. 쇼츠 링크를 입력하면 설명란 역추적 및 동일 채널 내 롱폼 영상의 텍스트 유사도를 분석하여 원본 풀영상을 자동으로 찾아줍니다. 원본을 시청하면 쇼츠에서 다루지 못한 풍부한 비하인드 스토리와 추가 숏폼 소재를 무한히 발굴할 수 있습니다.",
      badge: "소재 무한 발굴",
    },
    {
      title: "4. YouTube API 일일 한도가 소진되면 어떻게 되나요?",
      desc: "기본 일일 할당량은 search.list 요청100회와 기타 API 합산10,000 units로 나뉩니다. 화면에서 한 번 검색해도 여러 요청이 사용될 수 있습니다. 사용 가능한 횟수는 API 종류와 추가 조회 수에 따라 달라집니다. 미국 태평양 시간 자정에 초기화되어 한국에서는 서머타임 기간 오후4시, 겨울철 오후5시입니다. 페이지에 들어가거나 탭만 바꿀 때는 검색하지 않으며 버튼을 눌러 실행합니다. 대본 분석은 본인 AI 키의 별도 사용료가 발생할 수 있습니다.",
      badge: "무료 한도",
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* 상단 타이틀 */}
      <div className="bg-yt-surface p-6 rounded-2xl border border-yt-border shadow-xs">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-yt-red/10 text-yt-danger rounded-lg">
            <HelpCircle className="w-5 h-5" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-yt-text">
            YOUTUBE VIRAL FINDER 이용 가이드
          </h1>
        </div>
        <p className="text-sm text-yt-muted mt-1">
          핵심 지표를 이해하고, 알고리즘을 뚫어내는 떡상 쇼츠를 찾는 마스터 가이드입니다.
        </p>
      </div>

      {/* 캐릭터 말풍선 */}
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-yt-red text-2xl">🔎</div>
        <div className="rounded-2xl rounded-tl-none border border-yt-border bg-yt-surface p-4">
          <p className="text-sm leading-relaxed text-yt-text">
            안녕하세요, 떡상 탐정이에요! 조회수만 보면 큰 채널 영상만 보여요. 저는 <b>구독자에 비해 얼마나 터졌는지</b>와{" "}
            <b>지금 얼마나 빠르게 오르는지</b>를 같이 보고, 따라 만들 가치가 있는 영상과 채널만 골라 드려요.
          </p>
        </div>
      </div>

      <div className="yt-card text-sm text-yt-muted">즐겨찾기는 본인 계정으로 저장·해제하며 다른 기기에서도 이어집니다. 저장일 기준30일 후 자동 삭제됩니다. 같은 항목을 다시 눌러도 기존 저장일은 연장되지 않습니다.</div>
      {/* 4단계 마스터 워크플로우 */}
      <div className="bg-yt-surface p-6 rounded-2xl border border-yt-border shadow-xs space-y-4">
        <h2 className="text-base font-bold text-yt-text">
          🚀 떡상 콘텐츠 발굴 4단계 실전 워크플로우
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-yt-raised border border-yt-border space-y-2">
            <div className="w-7 h-7 rounded-lg bg-yt-red text-white flex items-center justify-center font-bold text-xs">
              1
            </div>
            <h3 className="text-sm font-bold text-yt-text">
              API 키 1분 연동
            </h3>
            <p className="text-xs text-yt-muted leading-relaxed">
              [설정] 메뉴에서 본인의 무료 YouTube Data API v3 키를 등록합니다.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-yt-raised border border-yt-border space-y-2">
            <div className="w-7 h-7 rounded-lg bg-yt-red text-white flex items-center justify-center font-bold text-xs">
              2
            </div>
            <h3 className="text-sm font-bold text-yt-text">
              소형 채널 떡상 쇼츠 검색
            </h3>
            <p className="text-xs text-yt-muted leading-relaxed">
              구독자 1만~5만 이하 필터로 소형 채널에서 터진 구독자 대비 조회수가 높은 영상을 발굴합니다.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-yt-raised border border-yt-border space-y-2">
            <div className="w-7 h-7 rounded-lg bg-yt-red text-white flex items-center justify-center font-bold text-xs">
              3
            </div>
            <h3 className="text-sm font-bold text-yt-text">
              VPH 속도 & 썸네일 분석
            </h3>
            <p className="text-xs text-yt-muted leading-relaxed">
              시간당 조회수 속도(VPH)와 제목의 훅킹 키워드, 첫 3초 시각 요소를 분석합니다.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-yt-raised border border-yt-border space-y-2">
            <div className="w-7 h-7 rounded-lg bg-yt-red text-white flex items-center justify-center font-bold text-xs">
              4
            </div>
            <h3 className="text-sm font-bold text-yt-text">
              롱폼 원본 역추적 & 재구성
            </h3>
            <p className="text-xs text-yt-muted leading-relaxed">
              [쇼츠 원본 찾기]로 풀영상을 확인하여 남들이 놓친 숨은 숏폼 소재를 시리즈로 제작합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 숫자 읽는 법 */}
      <div className="bg-yt-surface p-6 rounded-2xl border border-yt-border space-y-4">
        <h2 className="text-base font-bold text-yt-text">📐 숫자 읽는 법</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-yt-raised p-4">
            <span className="yt-chip bg-yt-red text-white">🔥 VPH</span>
            <p className="mt-2 text-xs leading-relaxed text-yt-muted">시간당 조회수. 「+7.5만/h」는 1시간에 7만 5천 회씩 늘고 있다는 뜻이에요.</p>
          </div>
          <div className="rounded-xl bg-yt-raised p-4">
            <span className="yt-chip bg-yt-warn text-black">✖ vsRatio</span>
            <p className="mt-2 text-xs leading-relaxed text-yt-muted">조회수 ÷ 구독자. 구독자 2천 명 채널이 30만 뷰면 150배 — 구독자 대비 조회수가 높다는 뜻이며 유입 경로는 별도 확인해야 해요.</p>
          </div>
          <div className="rounded-xl bg-yt-raised p-4">
            <span className="yt-chip">💯 바이럴 점수</span>
            <p className="mt-2 text-xs leading-relaxed text-yt-muted">VPH·vsRatio·조회수를 합친 0~100점. 아래 등급 기준 중 하나만 넘어도 그 등급이 붙어요.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead>
              <tr className="border-b border-yt-border text-yt-muted">
                <th className="px-3 py-2 font-semibold">등급</th>
                <th className="px-3 py-2 font-semibold">바이럴 점수</th>
                <th className="px-3 py-2 font-semibold">또는 vsRatio</th>
                <th className="px-3 py-2 font-semibold">또는 VPH</th>
              </tr>
            </thead>
            <tbody className="text-yt-text">
              <tr className="border-b border-yt-border">
                <td className="px-3 py-2"><span className="rounded-full bg-yt-red px-2 py-0.5 font-bold text-white">🚀 초대박</span></td>
                <td className="px-3 py-2">80점 이상</td><td className="px-3 py-2">50배 이상</td><td className="px-3 py-2">시간당 1만 이상</td>
              </tr>
              <tr className="border-b border-yt-border">
                <td className="px-3 py-2"><span className="rounded-full bg-yt-warn px-2 py-0.5 font-bold text-black">🔥 대박</span></td>
                <td className="px-3 py-2">65점 이상</td><td className="px-3 py-2">20배 이상</td><td className="px-3 py-2">시간당 3천 이상</td>
              </tr>
              <tr>
                <td className="px-3 py-2"><span className="rounded-full bg-yt-success px-2 py-0.5 font-semibold text-white">📈 떡상</span></td>
                <td className="px-3 py-2">45점 이상</td><td className="px-3 py-2">5배 이상</td><td className="px-3 py-2">시간당 800 이상</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* TIP / 주의 */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-yt-success/30 bg-yt-success/10 p-4">
          <p className="text-sm font-bold text-yt-success">💡 TIP</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-yt-text">
            <li>마음에 드는 영상·채널은 카드의 🔖 즐겨찾기 버튼으로 저장하고, 보관함에서 CSV로 내려받아 두세요.</li>
            <li>터진 쇼츠는 「쇼츠 원본 찾기」로 원본 롱폼을 보면 비슷한 소재를 더 찾을 수 있어요.</li>
            <li>검색 조건을 좁힐수록 하루 무료 한도를 오래 쓸 수 있어요.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-yt-warn/40 bg-yt-warn/10 p-4">
          <p className="text-sm font-bold text-yt-warn">⚠️ 꼭 알아 두세요</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-yt-text">
            <li>YouTube·AI 키는 회원님 <b>본인 것</b>만 사용해요(운영자 키 대신 사용 없음).</li>
            <li>다른 사람의 영상을 그대로 재업로드하면 저작권 문제가 생겨요. 소재와 구성만 참고하세요.</li>
            <li>즐겨찾기는 이 브라우저에만 저장돼요.</li>
          </ul>
        </div>
      </div>

      {/* FAQ 아코디언 */}
      <div className="bg-yt-surface p-6 rounded-2xl border border-yt-border shadow-xs space-y-4">
        <h2 className="text-base font-bold text-yt-text mb-2">
          자주 묻는 질문 (FAQ)
        </h2>
        <div className="space-y-4">
          {guides.map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-yt-raised border border-yt-border space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-yt-text">
                  {item.title}
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yt-red/10 text-yt-danger border border-yt-red/40">
                  {item.badge}
                </span>
              </div>
              <p className="text-xs text-yt-muted leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
