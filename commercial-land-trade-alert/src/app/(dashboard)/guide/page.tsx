import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";

const STEPS = [
  { icon: "🔔", title: "감시 대상 등록", href: "/watch", body: "크롬 확장을 설치하고 네이버 지도에서 지역과 필터를 맞춘 뒤 「이 화면 감시」를 누릅니다. 새 매물과 가격 변동을 알려 드립니다." },
  { icon: "📨", title: "받는 곳 연결", href: "/settings", body: "텔레그램/이메일/카카오톡 중 켭니다. 다른 프로그램에 연결한 값이 있으면 그대로 씁니다." },
  { icon: "⭐", title: "수집 결과 보기", href: "/results", body: "매매 매물의 평당 호가를 층·면적이 비슷한 실거래 중간값과 비교한 시세 대비와 후보 점수를 봅니다. 파일과 알림에도 함께 들어갑니다." },
  { icon: "📍", title: "관심 지역 고르기", href: "/districts", body: "전국 시·군·구에서 볼 곳을 누릅니다. 설치할 것도, 직접 수집할 것도 없습니다." },
  { icon: "🎯", title: "조건 정하기", href: "/conditions", body: "상가·건물과 토지, 용도·지목, 금액·면적을 고릅니다. 비워 두면 제한 없이 받습니다." },
  { icon: "🏢", title: "거래 확인", href: "/trades", body: "목록에서 거르고 정렬하고, 상세에서 같은 동 평당가와 비교합니다. CSV로도 받습니다." },
];

const FAQ = [
  { q: "데이터를 제가 수집해야 하나요?", a: "실거래는 서버가 하루 1회 자동으로 받습니다. 네이버 매물은 내 PC의 크롬 확장이 예약 시각에 자동으로 살펴봅니다. 크롬만 켜 두면 됩니다." },
  { q: "매물 정보가 서버에 저장되나요?", a: "아니요. 매물은 내 PC에만 저장하고, 서버에는 수집 건수 같은 숫자 상태만 보냅니다." },
  { q: "후보 점수는 어떻게 매기나요?", a: "시세보다 5·10·20% 낮으면 15·35·50점, 가격을 내릴 때마다 15점(최대 30점), 30일 이상 10점, 90일 이상 15점입니다. 40점 이상이면 후보로 표시합니다. 급매를 뜻하지는 않습니다." },
  { q: "추정 수익률은 어떻게 계산하나요?", a: "같은 화면에서 층·면적이 비슷한 월세 매물이 5건 이상이면, 그 ㎡당 월세·보증금 중간값으로 연 임대료 ÷ (매매가 - 보증금)을 계산합니다. 호가끼리 어림한 값이며 대출·세금·공실·실제 임대 현황은 반영하지 않습니다." },
  { q: "AI 요약은 무엇을 보내나요?", a: "버튼을 누를 때만 후보·변동 매물 최대 30건의 가격·면적·층·비교값을 회원님 본인 Claude 키로 Anthropic에 보냅니다. 중개사와 링크는 보내지 않습니다. 키는 메인 사이트 API 설정에 등록합니다." },
  { q: "통계와 그래프는 어디에 저장되나요?", a: "회원님 PC 크롬 확장에만 최근 1년 저장합니다. 요약 수치와 변동 매물만 담고 중개사 정보는 넣지 않으며, 1년이 지나면 자동으로 지웁니다. 그래프는 수집이 2회 이상 쌓이면 선으로 이어집니다." },
  { q: "주간 리포트는 어떻게 받나요?", a: "확장 팝업에서 「주간 리포트 받기」를 켜면 월요일 이후 첫 수집 때 켜 둔 텔레그램·이메일·카카오톡으로 보냅니다. 예약은 왼쪽 메뉴 2번 「예약 설정」에서 켭니다." },
  { q: "시세 대비가 안 나와요.", a: "매매 매물만 계산합니다. 상가는 같은 층 묶음(지하·1층·2층 이상), 모든 유형은 면적 절반~2배인 거래만 쓰고, 같은 동이나 같은 시군구에 5건 이상일 때만 나옵니다. 실거래에 층이 비어 있는 거래는 쓰지 않아 자료가 쌓일 때까지 빈칸이 많을 수 있습니다. 네이버에 고·중·저로만 적힌 상가도 비교하지 않습니다. 처음 보는 지역은 자료를 모은 뒤 다음 수집부터 나옵니다." },
  { q: "왜 일부만 읽었다고 나오나요?", a: "한 화면에 15페이지까지만 읽습니다. 동 단위로 좁히고 가격·면적 필터를 걸면 끝까지 읽어 사라진 매물도 알 수 있습니다." },
  { q: "네이버 확인 화면이 뜨면요?", a: "그날은 멈추고 알려 드립니다. 네이버를 직접 열어 확인을 풀어 주세요. 예약 간격을 길게 하면 줄어듭니다." },
  { q: "정확한 주소가 왜 안 보이나요?", a: "국토부가 토지와 일반 건물의 지번 일부를 가려서 제공합니다. 집합 건물은 지번이 공개됩니다." },
  { q: "어제 계약한 거래가 왜 없나요?", a: "계약 후 신고까지 시간이 걸립니다(신고 기한 30일). 신고되어 공개된 뒤에 들어옵니다." },
  { q: "임대료나 수익률도 나오나요?", a: "이 자료에는 없어 제공하지 않습니다. 매매 거래만 봅니다." },
  { q: "「취소」, 「지분」은 무엇인가요?", a: "취소는 신고 후 해제된 거래, 지분은 전체가 아니라 일부 지분만 사고판 거래입니다. 둘 다 비교 통계에서 뺍니다." },
  { q: "자료는 얼마나 보관하나요?", a: "계약일 기준 1년입니다. 지난 자료는 자동으로 지웁니다." },
];

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHero badge="📖 약 5분" title="연동 & 사용 매뉴얼" description="상가·건물·토지 실거래와 네이버 매물 변동을 텔레그램/이메일/카카오톡으로 받는 방법입니다." tip="공공데이터 키와 AI 키는 등록하지 않아도 됩니다. 알림 키와 계정은 본인 것을 씁니다." />
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {STEPS.map((s, i) => (
          <Link key={s.href} href={s.href} className="mx-card block p-5 hover:border-mx-primary">
            <p className="text-xs font-semibold text-mx-muted">STEP {i + 1}</p>
            <p className="mt-1 text-lg font-bold text-mx-text">
              {s.icon} {s.title}
            </p>
            <p className="mt-2 text-sm text-mx-muted">{s.body}</p>
          </Link>
        ))}
      </div>
      <section className="mx-card mt-6 border-l-4 border-l-mx-primary">
        <p className="text-sm text-mx-text">💡 도로·구거 같은 지목과 숙박은 건수가 많아 기본으로 꺼 두었습니다. 찾으시면 조건에서 켜 주세요.</p>
      </section>
      <section className="mx-card mt-3 border-l-4 border-l-mx-danger">
        <p className="text-sm text-mx-text">⚠️ 공개 신고 자료를 정리한 참고 정보입니다. 같은 동 비교는 위치·도로·건물 상태를 반영하지 않으며 투자 결과를 보증하지 않습니다.</p>
      </section>
      <section className="mt-6">
        <h2 className="mx-section-title mb-3">자주 묻는 질문</h2>
        <div className="space-y-2">
          {FAQ.map((f) => (
            <details key={f.q} className="mx-card p-4">
              <summary className="cursor-pointer text-sm font-semibold text-mx-text">{f.q}</summary>
              <p className="mt-2 text-sm text-mx-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
