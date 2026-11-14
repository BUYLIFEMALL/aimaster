import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { PageHero } from "@/components/ui/PageHero";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";
import { CoupangGuide } from "@/components/coupang/CoupangGuide";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const STEPS = [
  { step: 1, icon: "🔑", title: "본인 API 키 등록", desc: "네이버 쇼핑인사이트 + AI (OpenAI·Claude·Gemini)", time: "약 5분", href: "/settings" },
  { step: 2, icon: "🔍", title: "키워드 발굴 & 감시", desc: "관심 카테고리 등록 및 AI 추천 상품군 자동 추출", time: "2분", href: "/watchlist" },
  { step: 3, icon: "📊", title: "트렌드 기회점수 분석", desc: "24H 검색 급증도 및 경쟁강도 기반 점수 산출", time: "1분", href: "/reports" },
  { step: 4, icon: "🌏", title: "5대 마켓 최저가 소싱", desc: "알리·도매매·11번가 최저가 대조 및 순마진 시뮬레이션", time: "3분", href: "/sourcing" },
  { step: 5, icon: "🔔", title: "24H 시세/품절 알림", desc: "텔레그램·카카오 알림톡·SMTP 실시간 푸시", time: "상시 가동", href: "/settings" },
];

const FORMULAS = [
  {
    icon: "🧠",
    title: "1. AI 기회점수(Opportunity Score) 산출 공식",
    desc: "네이버 데이터랩의 7일간 검색 급증률(40%) + 쿠팡 실시간 연관검색어 가중치(30%) + 총 등록 상품수 대비 검색량 비율(경쟁강도 30%)을 결합하여 0~100점의 기회점수를 자동 산출합니다. 60점 이상은 소싱 유망군, 80점 이상은 초특급 고마진 기회군으로 분류됩니다.",
  },
  {
    icon: "🛡️",
    title: "2. 역마진 제로(0%) 방어 시뮬레이션 공식",
    desc: "플랫폼별 상이한 수수료(스마트스토어 5.8%, 쿠팡 윙 10.8%, 11번가 11%)와 배송비, 반품 충당금(3%), 부가세를 자동 반영하여 최소 목표 마진 25% 미만인 상품은 자동 필터링하여 안전한 마진만 남깁니다.",
  },
  {
    icon: "⚡",
    title: "3. 크롬 확장 프로그램 실시간 스크랩 연동",
    desc: "알리익스프레스나 쿠팡, 스마트스토어 상품 페이지 방문 시 확장 프로그램이 상품 이미지, 옵션, 가격, 리뷰 수를 원클릭으로 추출하여 본 프로그램의 소싱 후보함에 즉시 등록합니다.",
  },
];

const FAQ = [
  {
    q: "해외 공장 견적을 여러 곳에서 받았는데 한눈에 비교할 수 있나요?",
    a: "왼쪽 메뉴 「🏭 공장 견적 비교」에 견적서 PDF·위챗 대화 캡처를 넣거나 대화를 붙여 넣고 「AI로 비교표 만들기」를 누르면, 내 Claude 키로 1번 읽어 공장별 MOQ·단가·샘플비·기간·결제 조건, 아직 확인 안 된 점, 답을 못 받은 질문, 다음에 보낼 질문(한국어·영어·중국어)을 정리해 줍니다. 「마진 계산 →」을 누르면 그 단가가 마진 계산기의 외화 원가 칸에 채워집니다. 원본 파일은 저장하지 않고, 대화와 결과는 30일 보관됩니다. 엑셀 견적서는 CSV로 저장해 올려 주세요.",
  },
  {
    q: "쿠팡에서 리뷰 있는 상품만 골라 볼 수 있나요?",
    a: "왼쪽 메뉴 「🧩 쿠팡 상품소싱기」에서 크롬 확장을 받으면, 직접 검색해 「판매량순」으로 정렬한 쿠팡 화면을 읽고, 많이 팔리는 상품 가운데 리뷰 수가 기준 이상인 상품만 찾을 수 있어요. 쿠팡 약관 위반·계정 제재 소지가 있어 사용 책임은 회원 본인에게 있습니다.",
  },
  {
    q: "네이버 키는 어디서 발급받나요?",
    a: "네이버클라우드(NCP)에 회원가입 후 API HUB에서 「쇼핑인사이트」를 신청하면 무료로 발급받을 수 있습니다. 설정 화면의 발급 가이드를 클릭하시면 3분 안에 등록 가능합니다.",
  },
  {
    q: "AI 호출 비용은 어떻게 정산되나요?",
    a: "네이버·11번가·도매매·유튜브 키는 무료로 쓸 수 있어요. 추천 사유를 쓰는 AI(OpenAI·Claude·Gemini)만 회원님 본인 키로 소량 요금이 나가며, 리포트 1회에 등록 키워드 수만큼만 정밀하게 호출됩니다.",
  },
  {
    q: "알리익스프레스 소싱 시 KC인증 대상 상품은 어떻게 구분하나요?",
    a: "전기용품 및 생활용품 안전관리법상 220V 직결 제품이나 유아용품은 인증이 필수입니다. 본 프로그램은 USB 5V 저전압 기기나 무선 인증 기기 등 구매대행 적합 품목에 '인증 면제 배지'를 표시합니다.",
  },
  {
    q: "마진 계산 값을 그대로 믿어도 되나요?",
    a: "플랫폼 공식 수수료와 관세청 과세환율을 실시간 대조하여 1원 단위까지 정밀 산출합니다. 다만 판매자의 택배 계약 요율이나 프로모션 할인에 따라 실제 마진은 ±2% 내외 차이가 발생할 수 있습니다.",
  },
];

const GUIDE_LINKS = [
  { guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키 발급" },
  { guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키 발급" },
  { guideId: "93786aa7-6c30-4e09-913b-25256e29ee3e", label: "네이버 쇼핑인사이트 키 발급" },
  { guideId: "3dfce186-b4d2-4318-97c9-42b896942646", label: "네이버 검색광고 키 발급" },
];

export default async function GuidePage() {
  await requireProgramAccess();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHero
        badge="📖 QUANT SOURCING PLAYBOOK v1.37"
        title="실시간 급상승 소싱 트렌드 발굴 가이드북"
        description="초보 셀러부터 파워 셀러까지 역마진 없는 퀀트 소싱 자동화 공식과 5단계 파이프라인 운영 노하우를 안내합니다."
      />

      {/* 3대 핵심 퀀트 공식 카드 */}
      <div className="grid gap-4 md:grid-cols-3">
        {FORMULAS.map((f) => (
          <div key={f.title} className="mx-card flex flex-col justify-between">
            <div>
              <span className="text-3xl">{f.icon}</span>
              <h3 className="mt-3 text-sm font-black text-mx-text">{f.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-mx-muted">{f.desc}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-mx-border">
              <span className="rounded-full bg-mx-primary/10 px-2 py-0.5 text-[10px] font-bold text-mx-link">공식 검증 완료</span>
            </div>
          </div>
        ))}
      </div>

      {/* 5단계 실행 흐름 */}
      <div className="mx-card">
        <h2 className="mx-section-title">🧭 5단계 소싱 파이프라인 실행 가이드</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s) => (
            <Link
              key={s.step}
              href={s.href}
              className="group flex flex-col justify-between rounded-xl border border-mx-border bg-mx-raised p-3.5 transition-all hover:border-mx-primary/50 hover:bg-mx-surface"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xl">{s.icon}</span>
                  <span className="text-[10px] font-black text-mx-link">STEP {s.step}</span>
                </div>
                <strong className="mt-2 block text-xs font-bold text-mx-text group-hover:text-mx-link">{s.title}</strong>
                <p className="mt-1 text-[11px] leading-snug text-mx-muted">{s.desc}</p>
              </div>
              <span className="mt-3 block text-[10px] font-semibold text-mx-muted">소요 시간: {s.time}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* 쿠팡 상품소싱기 안내 */}
      <CoupangGuide />

      {/* API 키 발급 바로가기 가이드 */}
      <div className="mx-card">
        <h2 className="mx-section-title">🔑 공식 API 키 발급 가이드 링크</h2>
        <p className="text-xs text-mx-muted">각 플랫폼 개발자센터에서 본인 API 키를 안전하게 발급받아 [설정] 탭에 등록하세요.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {GUIDE_LINKS.map((g) => (
            <GuideLinkButton key={g.guideId} guideId={g.guideId} label={g.label} />
          ))}
        </div>
      </div>

      {/* 셀러 자주 묻는 질문 (FAQ) */}
      <div className="mx-card">
        <h2 className="mx-section-title">❓ 셀러 자주 묻는 질문 (FAQ)</h2>
        <div className="mt-4 space-y-3">
          {FAQ.map((item, idx) => (
            <div key={idx} className="rounded-xl border border-mx-border/80 bg-mx-raised p-4 transition-colors hover:border-mx-primary/30">
              <strong className="text-xs font-black text-mx-link">Q. {item.q}</strong>
              <p className="mt-1.5 text-xs leading-relaxed text-mx-muted">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
