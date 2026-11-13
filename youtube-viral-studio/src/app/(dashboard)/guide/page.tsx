"use client";

import { HelpCircle, CheckCircle, AlertTriangle, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
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
      title: "6. 발굴한 공식을 쇼츠 영상으로 바로 만들려면?",
      desc: "영상 카드의 「👑 AI 황금 대본 공식 분석」 결과 창이나, 채널·키워드 분석의 「영상 요약」 결과 아래에 있는 「🎬 이 대사로 쇼츠 만들기」 버튼을 누르세요. 새 탭에서 AI 쇼츠 원스톱 프로그램의 주제 화면이 열리고 그 대사가 참고 자료로 넘어갑니다(대사는 주소의 # 뒤에 실려 서버로 보내지지 않습니다). 영상 제작은 그 프로그램에서 이어서 진행합니다.",
      badge: "원스톱 연계",
    },
    {
      title: "7. AI 분석에는 어떤 키가 필요한가요?",
      desc: "영상 카드의 「👑 AI 황금 대본 공식 분석」은 Google Gemini 또는 OpenAI 키가 필요합니다. 「채널 심층 분석」·「키워드 점유율 분석」의 AI 분석은 Gemini·OpenAI·Claude 중 등록한 키의 엔진을 골라 씁니다. AI 키는 메인 사이트 API 설정(www.buylife.xyz/api-settings)에 한 번 등록하면 되고, AI 호출 요금은 회원님 키의 계정에서 나갑니다. YouTube 데이터 조회는 AI 키 없이 YouTube Data API 키만으로 됩니다.",
      badge: "AI 키",
    },
    {
      title: "8. 보관함에 담은 자료는 얼마나 보관되나요?",
      desc: "🔖로 담은 채널·영상은 회원님 계정에만 저장되며 저장일로부터 30일이 지나면 목록에서 사라집니다. 보관함에는 최신 1,000개까지 보입니다. 검색 결과 자체는 저장되지 않으니 필요한 결과는 담거나 CSV로 내려받아 두세요.",
      badge: "보관 기간",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 헤더 배너 */}
      <div className="rounded-3xl border border-amber-500/30 bg-[#131B2A] p-6 shadow-xl shadow-black/40 md:p-8">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0B0F17] border border-amber-500/30 text-[#FBBF24]">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-100 md:text-2xl">
              유튜브 황금 법칙 브리프 (인텔리전스 가이드북)
            </h1>
            <p className="mt-0.5 text-xs text-slate-400">
              구독자 수가 적어도 알고리즘의 선택을 받는 3대 황금 공식과 금융 터미널 급 지표 해석법
            </p>
          </div>
        </div>
      </div>

      {/* 2026-11-13 처음 시작하기 — 준비물과 메뉴별 사용 순서 */}
      <div className="rounded-3xl border border-amber-500/25 bg-[#131B2A] p-6 shadow-md">
        <h2 className="mb-3 text-sm font-black text-[#FBBF24]">🚀 처음 시작하기 — 준비물과 메뉴별 사용 순서</h2>
        <ol className="space-y-1.5 text-xs text-slate-300">
          <li>1. <b className="text-slate-100">YouTube Data API 키 등록(필수·무료)</b>: 🔑 API키등록·플랫폼연동 → 「1. YouTube Data API v3 등록」에 키를 붙여 넣고 「검증 및 금고 보관」을 누릅니다. 「● 정상 금고 보관됨」이 보이면 끝입니다. 발급 방법은 같은 칸의 「YouTube Data API 키 발급 방법 매뉴얼」 버튼으로 열 수 있습니다.</li>
          <li>2. <b className="text-slate-100">AI 키(선택)</b>: AI 대본 분석·AI 요약을 쓰려면 메인 사이트 API 설정에 Gemini·OpenAI·Claude 중 하나 이상을 등록합니다. 데이터 조회만 할 때는 필요 없습니다.</li>
          <li>3. <b className="text-slate-100">찾기</b>: 「황금 채널 스캐너」(구독자는 적은데 조회수가 터진 채널), 「급상승 VPH 매트릭스」(지금 빠르게 오르는 영상), 「쇼츠 떡상 트리거」(주제·키워드로 조회수 폭발 쇼츠 찾기), 「영상 출처 추적기」(쇼츠 링크를 넣어 원본 롱폼 찾기), 「협업 크리에이터 찾기」(협업할 채널과 공개 연락처) 중 필요한 메뉴를 고릅니다.</li>
          <li>4. <b className="text-slate-100">분석</b>: 영상 카드의 「👑 AI 황금 대본 공식 분석」으로 대본 구조를 보고, 「채널 심층 분석」·「키워드 점유율 분석」으로 채널과 키워드를 깊게 봅니다. 내 채널이 궁금하면 「내 채널 진짜 지표」를 씁니다(내 구글 앱 연결 필요, 아래 안내).</li>
          <li>5. <b className="text-slate-100">담기·만들기</b>: 마음에 드는 결과는 🔖로 「황금 공식 보관함」에 담고, 「🎬 이 대사로 쇼츠 만들기」로 AI 쇼츠 원스톱 프로그램에 넘겨 영상을 만듭니다.</li>
        </ol>
        <p className="mt-3 text-xs text-slate-400">💡 조회할 때마다 회원님 YouTube API 무료 할당량(하루 기본 10,000유닛)이 줄어듭니다. 각 화면에 예상 사용량이 함께 표시됩니다. AI 분석 버튼은 회원님 AI 키로 요금이 나가니 필요한 영상에만 눌러 주세요.</p>
      </div>

      {/* 3단계 황금 공식 인포그래픽 */}
      <div className="rounded-3xl border border-amber-500/25 bg-[#131B2A] p-6 shadow-md">
        <h2 className="mb-4 text-sm font-black text-[#FBBF24]">👑 3단계 골든 엠파이어 알고리즘 파이프라인</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-amber-500/30 bg-[#0B0F17] p-4">
            <span className="text-[10px] font-black text-[#FBBF24] uppercase tracking-wider">STEP 01</span>
            <h3 className="mt-1 text-sm font-black text-slate-100">황금 레이더 VPH 스캔</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              시간당 조회수(VPH)가 채널 평균 대비 5배 이상 급상승 중인 핫 트렌드 소재를 감지합니다.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-500/30 bg-[#0B0F17] p-4">
            <span className="text-[10px] font-black text-[#FBBF24] uppercase tracking-wider">STEP 02</span>
            <h3 className="mt-1 text-sm font-black text-slate-100">구독자 역전 배수 검증</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              구독자 1만 이하 소형 채널인데 조회수 20~50배 폭발한 순수 알고리즘 떡상 공식을 필터링합니다.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-500/30 bg-[#0B0F17] p-4">
            <span className="text-[10px] font-black text-[#FBBF24] uppercase tracking-wider">STEP 03</span>
            <h3 className="mt-1 text-sm font-black text-slate-100">원스톱 대본화 & 영상 제작</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              검증된 1초 킬러 훅을 AI로 내 카테고리에 맞게 재창작하고 쇼츠 원스톱 스튜디오로 직결합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 2026-11-10 협업 크리에이터 찾기 */}
      <div className="rounded-3xl border border-amber-500/25 bg-[#131B2A] p-6 shadow-md">
        <h2 className="mb-3 text-sm font-black text-[#FBBF24]">🤝 협업 크리에이터 찾기 — 함께 일할 유튜버와 공개 연락처</h2>
        <ol className="space-y-1.5 text-xs text-slate-300">
          <li>1. 협업할 분야 키워드와 구독자 범위(예: 1천~10만 명)를 고르고 「크리에이터 찾기」를 누릅니다.</li>
          <li>2. 채널 운영자가 채널·영상 설명에 직접 적어 둔 이메일·전화·SNS 계정·주소·웹사이트가 채널별로 모여 나옵니다. 각 연락처 옆에 어디에 적혀 있었는지 표시됩니다.</li>
          <li>3. 「CSV 내려받기」로 내 PC에 저장하고, 마음에 드는 채널은 🔖로 보관함에 담습니다(검색 결과 자체는 저장되지 않습니다).</li>
          <li>4. 유튜브 「채널 정보 → 이메일 주소 보기」(보안문자 확인 뒤 나오는 비즈니스 이메일)는 자동으로 가져오지 않습니다. 각 카드의 「채널 정보에서 직접 보기」 링크로 확인하세요.</li>
        </ol>
        <p className="mt-3 text-xs text-slate-400">💡 회원님 YouTube API 무료 할당량만 씁니다(영상 50개 검색 약 102유닛, 하루 기본 10,000유닛). 연락은 협업·광고 제안 목적으로 회원님이 직접 정중하게 해 주세요.</p>
      </div>

      {/* 2026-11-11 v1.27 내 채널 진짜 지표 */}
      <div className="rounded-3xl border border-amber-500/25 bg-[#131B2A] p-6 shadow-md">
        <h2 className="mb-3 text-sm font-black text-[#FBBF24]">📈 내 채널 진짜 지표 — 채널 주인만 보는 숫자</h2>
        <ol className="space-y-1.5 text-xs text-slate-300">
          <li>0. 처음이면 <a href="https://www.buylife.xyz/guides/523e7401-7393-44f5-ba45-dd437e10fa2d" target="_blank" rel="noopener noreferrer" className="font-bold text-amber-400 underline">내 구글 앱 만들기 매뉴얼</a>을 먼저 따라 합니다(회원 각자 본인 구글 계정·본인 앱).</li>
          <li>1. 구글 클라우드에서 「YouTube Analytics API」와 「YouTube Data API v3」를 사용 설정합니다.</li>
          <li>2. 「사용자 인증 정보」의 OAuth 클라이언트(웹 애플리케이션) 승인된 리디렉션 URI에 <span className="font-mono text-amber-300 break-all">https://youtube-viral-studio.buylife.xyz/api/youtube/my-channel/callback</span> 을 추가합니다.</li>
          <li>3. 🔑 API키등록·플랫폼연동에 클라이언트 ID·보안 비밀을 저장합니다(유튜브 댓글·shots에 이미 등록했다면 생략).</li>
          <li>4. 「내 채널 진짜 지표」에서 「내 유튜브 채널 연결」 → 구글 동의 화면에서 허용하면 7·28·90일 지표가 바로 나옵니다.</li>
        </ol>
        <p className="mt-3 text-xs text-slate-400">💡 조회수·시청 시간·평균 시청 비율·구독 증감·잘 된 영상·유입 경로·시청자 나이·성별·국가를 보여 주고, 숫자를 바탕으로 다음 할 일 힌트를 적어 줍니다(AI 비용 없음). 숫자는 저장하지 않고 열 때마다 불러옵니다.</p>
        <p className="mt-1 text-xs text-slate-500">⚠️ 노출수·클릭률(CTR)은 유튜브 분석 API가 제공하지 않아 유튜브 스튜디오에서만 보입니다. 구글 앱이 「테스트 중」이면 7일마다 연결이 끊깁니다 — 「Google 인증 플랫폼 → 대상 → 앱 게시」로 프로덕션에 올리면 계속 연결됩니다(연결 때 「확인되지 않은 앱」 경고는 「고급 → 이동」으로 진행).</p>
      </div>

      {/* 지표 해석 Do's & Don'ts */}
      <div className="rounded-3xl border border-amber-500/25 bg-[#131B2A] p-6 shadow-md">
        <h2 className="mb-4 text-sm font-black text-[#FBBF24]">⚖️ 지표 해석 실전 원칙 (Do's & Don'ts)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-black text-emerald-400">
              <CheckCircle size={16} />
              <span>권장하는 벤치마킹 접근법 (Do's)</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-300">
              <li>• 구독자가 적은데 조회수가 터진 채널의 첫 1~3초 훅을 집중 분석하세요.</li>
              <li>• 댓글 창에서 시청자가 감탄하거나 공유한 핵심 포인트를 대본에 담으세요.</li>
              <li>• 시간당 VPH가 높게 유지되는 영상의 빠른 화면 전환 속도를 벤치마킹하세요.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-5">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-black text-rose-400">
              <AlertTriangle size={16} />
              <span>피해야 할 잘못된 접근법 (Don'ts)</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-300">
              <li>• 100만 대형 유튜버의 단순 총 조회수만 보고 무작정 따라 하지 마세요.</li>
              <li>• 도입부 후킹만 강하고 본문에서 실속이 없는 낚시성 대본은 역풍을 맞습니다.</li>
              <li>• 내 채널의 주제와 전혀 무관한 엉뚱한 바이럴 키워드를 끼워 넣지 마세요.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* FAQ 6종 아코디언 리스트 */}
      <div className="rounded-3xl border border-amber-500/25 bg-[#131B2A] p-6 shadow-md">
        <h2 className="mb-4 text-sm font-black text-[#FBBF24]">❓ 자주 묻는 질문 (FAQ)</h2>
        <div className="space-y-3">
          {guides.map((g, idx) => (
            <div key={idx} className="rounded-2xl border border-slate-800 bg-[#0B0F17] p-4 transition-colors hover:border-amber-500/30">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-black text-slate-100">{g.title}</h3>
                <span className="shrink-0 rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-[#FBBF24] border border-amber-500/30">
                  {g.badge}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{g.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex justify-center pt-2">
        <Link href="/golden-channels" className="btn-3d-gold px-8 py-3 text-sm">
          💎 황금 채널 스캐너 탐색 시작하기 ➔
        </Link>
      </div>
    </div>
  );
}
