import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";

const STEPS = [
  { icon: "📍", title: "관심 지역 고르기", href: "/districts", body: "전국 시·군·구에서 볼 곳을 누릅니다. 설치할 것도, 직접 수집할 것도 없습니다." },
  { icon: "🎯", title: "조건 정하기", href: "/conditions", body: "상가·건물과 토지, 용도·지목, 금액·면적을 고릅니다. 비워 두면 제한 없이 받습니다." },
  { icon: "📨", title: "받는 곳 연결", href: "/settings", body: "텔레그램/이메일/카카오톡 중 켭니다. 다른 프로그램에 연결한 값이 있으면 그대로 씁니다." },
  { icon: "🏢", title: "거래 확인", href: "/trades", body: "목록에서 거르고 정렬하고, 상세에서 같은 동 평당가와 비교합니다. CSV로도 받습니다." },
  { icon: "🔔", title: "네이버 매물 감시", href: "/watch", body: "크롬 확장을 설치하고 네이버 지도에서 지역과 필터를 맞춘 뒤 「이 화면 감시」를 누릅니다. 새 매물과 가격 변동을 알려 드립니다." },
];

const FAQ = [
  { q: "데이터를 제가 수집해야 하나요?", a: "실거래는 서버가 하루 1회 자동으로 받습니다. 네이버 매물은 내 PC의 크롬 확장이 예약 시각에 자동으로 살펴봅니다. 크롬만 켜 두면 됩니다." },
  { q: "매물 정보가 서버에 저장되나요?", a: "아니요. 매물은 내 PC에만 저장하고, 서버에는 수집 건수 같은 숫자 상태만 보냅니다." },
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
