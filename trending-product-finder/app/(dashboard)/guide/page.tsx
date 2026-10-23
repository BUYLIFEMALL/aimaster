import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { PageHero } from "@/components/ui/PageHero";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const STEPS = [
  { icon: "🔑", title: "본인 키 등록", desc: "네이버클라우드 쇼핑인사이트 + OpenAI 또는 Gemini (필수)", time: "약 10분", href: "/settings" },
  { icon: "🔍", title: "키워드 발굴", desc: "카테고리·키워드 등록 또는 「후보 상품군 추천받기」", time: "2분", href: "/watchlist" },
  { icon: "📊", title: "트렌드 리포트", desc: "「지금 리포트 생성」 또는 매일 오전 9시 자동 생성", time: "1분", href: "/reports" },
  { icon: "🌏", title: "소싱·마진계산", desc: "알리·도매매·11번가 원가로 예상 마진 계산", time: "3분", href: "/sourcing" },
  { icon: "🔔", title: "알림 받기", desc: "예약 소싱 알림·관심상품 가격 변동을 이메일·카카오·텔레그램으로", time: "선택", href: "/settings" },
];

const NUMBERS = [
  { chip: "📈 관심도 지수", desc: "최근 90일 중 가장 관심이 높았던 날을 100으로 본 상대값(검색 횟수 자체가 아님)" },
  { chip: "▲▼ 변화율", desc: "최근 1주 관심도 ÷ 90일 초반 평균. ▲면 요즘 오르는 중" },
  { chip: "🏪 11번가 경쟁", desc: "11번가에 등록된 관련 상품 수(많을수록 경쟁 치열, 점수에서 감점)" },
  { chip: "📺 유튜브 30일", desc: "최근 30일 관련 영상 수(유튜브 키 등록 시 점수에 반영)" },
  { chip: "🔥 기회점수", desc: "위 신호를 합친 0~100점. 60점 이상 눈여겨볼 만함, 35점 미만은 신호 약함" },
  { chip: "💰 마진율", desc: "판매가에서 원가·관세·부가세·운송비·수수료를 뺀 이익 비율(예상치)" },
];

const FAQ = [
  {
    q: "네이버 키는 어디서 받나요?",
    a: "옛 네이버 개발자센터 방식은 2026년 7월 31일로 신규 발급이 끝났어요. 네이버클라우드(NCP)에 개인 회원가입 후 API HUB에서 「쇼핑인사이트」를 신청하면 무료로 받을 수 있습니다. 설정 화면의 안내 링크를 따라가세요.",
  },
  {
    q: "검색광고 키가 인증 실패로 떠요.",
    a: "CUSTOMER ID는 광고 대시보드 주소의 숫자가 아니라, 광고시스템 → 도구 → 「SA API 사용 관리」 화면에 보이는 값이에요. 그 값으로 다시 넣어 보세요.",
  },
  {
    q: "비용이 드나요?",
    a: "네이버·11번가·도매매·유튜브 키는 무료로 쓸 수 있어요. 추천 사유를 쓰는 AI(OpenAI·Gemini)만 회원님 본인 키로 소량 요금이 나가며, 리포트 1회에 등록 키워드 수만큼 호출됩니다.",
  },
  {
    q: "알리 검색 결과가 엉뚱해요.",
    a: "알리 검색은 한글을 잘 못 알아들어서, AI 키가 있으면 검색 전에 영어로 바꿔 검색해요. 화면의 「실제 검색어」를 확인하고, 필요하면 영어로 직접 입력해 보세요.",
  },
  {
    q: "마진 계산 값을 그대로 믿어도 되나요?",
    a: "예상치예요. 관세·운송비·수수료는 상품과 플랫폼마다 달라서, 「판매수수료」 표와 실제 판매자 센터 값을 확인하고 입력값을 조정해 주세요.",
  },
  {
    q: "매일 리포트·알림은 무엇으로 돌아가나요? 내 cron-job.org로 돌릴 수 있나요?",
    a: "기본은 「AIMaster 기본(Vercel)」으로 따로 할 일이 없습니다. 본인 계정으로 돌리고 싶으면 설정 → ⏰ 예약 발행에서 본인 cron-job.org API 키를 저장하고 「내 cron-job.org」를 고르세요. 관심 목록이나 관심 상품 알림을 켜면 작업이 자동으로 켜지고, 모두 끄면 자동으로 멈춥니다. 매일 리포트는 하루 한 번(09시 이후)만 만들어지고, 「관심 키워드」 화면 위쪽 상태 줄에서 전체 일시정지·재개도 할 수 있습니다.",
  },
];

const GUIDE_LINKS = [
  { guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키" },
  { guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키" },
  { guideId: "0eb4180e-a076-4ee6-b75e-6b3c3c9ec442", label: "알리익스프레스 API 키" },
  { guideId: "1dbea19b-4c83-4453-ae41-0b59d7f27b5f", label: "네이버 메일(SMTP)" },
  { guideId: "eb8f5eaf-6ef7-46b8-9b05-994e944fe69a", label: "SOLAPI(카카오톡)" },
  { guideId: "f43e8ebe-a930-4933-b965-7068b38d79aa", label: "텔레그램 봇 만들기" },
];

export default async function GuidePage() {
  await requireProgramAccess();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHero
        badge="📖 연동 & 사용 매뉴얼"
        title="뜨는 상품 찾기부터 마진 계산까지 5단계"
        description="키를 한 번 등록해 두면, 그다음부터는 키워드만 넣고 리포트와 마진을 확인하면 됩니다."
      >
        <Link href="/settings" className="mx-btn-primary">
          🔑 키 등록하러 가기
        </Link>
      </PageHero>

      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-mx-primary text-2xl">🛒</div>
        <div className="mx-card rounded-tl-none p-4">
          <p className="text-sm leading-relaxed text-mx-text">
            안녕하세요, 소싱 비서예요! 관심 있는 키워드를 알려 주시면 <b>요즘 검색 관심이 오르는지</b>, <b>경쟁이 얼마나 치열한지</b>를
            점수로 비교해 드리고, 알리·도매매·11번가에서 <b>얼마에 떼어 와서 얼마나 남는지</b>까지 계산해 드릴게요.
          </p>
        </div>
      </div>

      <section className="mx-card">
        <h2 className="mx-section-title">🧭 사용 순서</h2>
        <ol className="grid gap-3 md:grid-cols-5">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative">
              <Link
                href={s.href}
                className="flex h-full flex-col rounded-xl border border-mx-border bg-mx-raised p-4 transition-colors hover:border-mx-primary"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mx-primary text-xs font-bold text-white">{i + 1}</span>
                  <span className="mx-chip px-2 py-0.5 text-[10px]">⏱ {s.time}</span>
                </div>
                <span className="mt-3 text-3xl">{s.icon}</span>
                <span className="mt-2 text-sm font-bold text-mx-text">{s.title}</span>
                <span className="mt-1 text-xs leading-relaxed text-mx-muted">{s.desc}</span>
              </Link>
              {i < STEPS.length - 1 && (
                <span className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-lg text-mx-accent md:block">›</span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-card">
        <h2 className="mx-section-title">📐 숫자 읽는 법</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {NUMBERS.map((n) => (
            <div key={n.chip} className="rounded-xl bg-mx-raised p-3">
              <span className="mx-chip-blue">{n.chip}</span>
              <p className="mt-2 text-xs leading-relaxed text-mx-muted">{n.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-[#065f46] bg-[#064e3b]/40 p-4">
          <p className="text-sm font-bold text-[#a7f3d0]">💡 TIP</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-[#d1fae5]">
            <li>무엇을 등록할지 모르겠다면 「카테고리로 후보 상품군 추천받기」로 월간 검색수가 높은 후보부터 보세요.</li>
            <li>리포트 표의 「🌏 소싱」을 누르면 그 키워드로 마진계산기가 바로 열려요.</li>
            <li>「🎯 프로모션 상품만 골라보기」를 켜면 공동구매·특가 상품 중 마진 조건을 넘는 것만 골라 줘요.</li>
            <li>관심 키워드 전체를 한 번에 계산하고 CSV로 받아 엑셀에서 비교할 수 있어요.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-[#92400e] bg-[#78350f]/40 p-4">
          <p className="text-sm font-bold text-[#fde68a]">⚠️ 꼭 알아 두세요</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-[#fef3c7]">
            <li>모든 키는 회원님 <b>본인 것</b>만 사용해요(운영자 키 대신 사용 없음).</li>
            <li>기회점수·마진율은 참고용 추정치예요. 실제 판매 결과를 보장하지 않습니다.</li>
            <li>11번가 API 키는 180일마다 다시 발급해야 해요.</li>
          </ul>
        </div>
      </div>

      <section className="mx-card">
        <h2 className="mx-section-title">🔑 키·알림 연결 매뉴얼 (팝업으로 열려요)</h2>
        <div className="flex flex-wrap gap-2">
          {GUIDE_LINKS.map((g) => (
            <GuideLinkButton key={g.guideId} guideId={g.guideId} label={g.label} />
          ))}
        </div>
        <p className="mt-3 text-xs text-mx-muted">
          네이버클라우드·검색광고·도매매·11번가·유튜브 키는 「API키등록·플랫폼연동」 화면의 각 항목 옆 안내 링크를 참고하세요.
        </p>
      </section>

      <section className="mx-card">
        <h2 className="mx-section-title">❓ 자주 묻는 질문</h2>
        <div className="space-y-2">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-xl bg-mx-raised p-3">
              <summary className="cursor-pointer list-none text-sm font-semibold text-mx-text">
                <span className="mr-1 text-mx-accent group-open:hidden">＋</span>
                <span className="mr-1 hidden text-mx-accent group-open:inline">－</span>
                {f.q}
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-mx-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
