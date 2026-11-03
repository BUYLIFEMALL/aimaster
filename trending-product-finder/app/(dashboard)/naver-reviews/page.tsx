import { PageHero } from "@/components/ui/PageHero";
import { requireProgramAccess } from "@/lib/access";
import { APP_VERSION } from "@/lib/version";
import { listReviewRunsAction } from "@/lib/actions/coupangResults";
import { ExtensionConnect } from "@/components/coupang/ExtensionConnect";
import { ReviewResults } from "@/components/coupang/ReviewResults";
import { DeviceNotice } from "@/components/coupang/DeviceNotice";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const DOWNLOAD_URL = "/downloads/trending-product-finder-extension-latest.zip";

// 쿠팡 상품소싱기와 같은 확장·같은 저장 표를 쓴다(마켓 칸으로 구분). 확장을 이미 설치했으면 새 버전으로 덮어쓰기만 하면 된다.
const INSTALL_STEPS = [
  { title: "확장 받기·설치", desc: "쿠팡 상품소싱기와 같은 확장입니다. 처음이면 아래에서 받아 크롬에 올리고, 이미 설치했다면 새 버전 ZIP을 기존 폴더에 덮어쓴 뒤 chrome://extensions에서 새로고침합니다." },
  { title: "네이버 로그아웃 권장", desc: "자동 검색은 네이버 쇼핑에 여러 번 접속합니다. 내 네이버 계정에 영향이 가지 않게 네이버에 로그아웃한 크롬(또는 다른 크롬 프로필)에서 쓰기를 권합니다." },
  { title: "네이버 쇼핑에서 검색", desc: "search.shopping.naver.com에서 키워드를 검색하고 확장 아이콘 → 「이 페이지 읽어 담기」. 또는 확장 창 「키워드 자동 검색」에서 마켓을 「네이버 쇼핑」으로 고르고 시작합니다." },
  { title: "리뷰·구매로 거르기", desc: "리뷰 수와 구매 수 기준으로 거릅니다. 결과는 아래 「내 네이버쇼핑 검색 기록」에 저장되어 휴대폰에서도 봅니다." },
];

const FAQ = [
  { q: "구매 수는 어떻게 나오나요?", a: "네이버 쇼핑 검색 화면이 상품마다 보여 주는 「구매」 숫자를 그대로 씁니다. 판매처가 여러 곳으로 묶인 「가격비교」 상품에는 구매 수가 나오지 않아 0으로 담기고, 대신 「가격비교 N곳」과 리뷰 수가 나옵니다. 구매 기준으로 거르면 판매처가 한 곳인 상품만 남습니다." },
  { q: "어떤 순서로 읽나요?", a: "네이버 쇼핑 기본 정렬인 「네이버 랭킹순」 1페이지(상품 40여 개)를 읽습니다. 랭킹순에는 판매 실적과 인기도가 반영되므로 읽은 순서를 순위로 붙여 둡니다. 네이버 쇼핑에는 「구매 많은순」 정렬이 없습니다." },
  { q: "쿠팡 상품소싱기와 같이 쓸 수 있나요?", a: "같은 확장입니다. 확장 창의 「마켓」에서 쿠팡·네이버 쇼핑을 고릅니다. 하루 자동 검색 30개는 두 마켓 합계이고, 한쪽에서 확인 화면 같은 거부 징후가 보이면 두 마켓 모두 그날 멈춥니다. 「⏰ 매일 예약」은 마켓마다 따로 시각·키워드를 정합니다. 두 예약이 같은 시간대에 걸치면 나중 마켓이 앞 마켓이 끝난 뒤 이어서 돕니다(동시에 두 마켓을 검색하지는 않음)." },
  { q: "네이버가 막는 것 같으면 어떻게 되나요?", a: "사람 확인 화면, 「검색결과 없음」, 검색 화면이 아닌 곳으로 튕김, 화면이 30초 안에 열리지 않음, 상품 0개 중 하나라도 보이면 자동 검색과 매일 예약을 바로 일시정지합니다. 그날은 쉬고, 다음 날 네이버 쇼핑에서 직접 검색이 정상인지 확인한 뒤 확장 창의 「확인했고 다시 사용」을 눌러 주세요." },
  { q: "우리 서버가 네이버에 접속하나요?", a: "아닙니다. 네이버 쇼핑 접속은 회원 PC의 확장에서만 합니다. 확장이 읽은 공개 상품 정보(상품명·가격·리뷰 수·구매 수·판매처·주소)만 내 계정에 저장되고, 1년 뒤 자동으로 지워집니다." },
];

export default async function NaverReviewsPage() {
  await requireProgramAccess();
  const { runs, error } = await listReviewRunsAction("naver");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHero
        badge="🟢 스마트스토어 상품소싱기"
        title="네이버 쇼핑 구매 수와 리뷰 수로 팔리는 상품 찾기"
        description="네이버 쇼핑 검색 결과(랭킹순)를 크롬 확장이 읽어, 구매와 리뷰가 쌓인 상품만 골라 표로 보여 줍니다. 스마트스토어에 올릴 소싱 후보를 판매 실적으로 검증합니다."
      />

      <DeviceNotice market="네이버 쇼핑" />

      <section className="mx-card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-sm font-bold text-mx-text">📦 크롬 확장 다운로드 (쿠팡·네이버 공용)</p>
          <p className="mt-1 text-xs text-mx-muted">최신 버전 {APP_VERSION} · 새 버전을 받으면 기존 폴더에 덮어쓰고 chrome://extensions에서 새로고침해 주세요.</p>
        </div>
        <a href={DOWNLOAD_URL} download className="mx-btn-primary shrink-0 whitespace-nowrap px-5 py-3 text-sm font-bold">
          ⬇ 확장 ZIP 받기 <span className="ml-1 rounded-md bg-white/20 px-2 py-0.5 text-xs font-extrabold">{APP_VERSION}</span>
        </a>
      </section>

      <ExtensionConnect />

      <section className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-4 text-sm leading-relaxed text-[#fde68a]">
        <p className="font-bold">⚠️ 먼저 읽어 주세요</p>
        <p className="mt-1">이 기능은 네이버 약관 위반·계정 이용 정지·법적 책임의 소지가 있으며, 사용 책임은 회원 본인에게 있습니다. 네이버나 스마트스토어 판매자 계정에 로그인한 브라우저에서 쓰면 그 계정에 영향이 갈 수 있으니 로그아웃한 브라우저에서 써 주세요.</p>
      </section>

      <p className="text-xs text-mx-muted">
        처음이라면 설치·연결·자동 검색까지 차근차근 따라 하는{" "}
        <a href="/guide#coupang" className="font-bold text-[#93c5fd] hover:underline">📖 단계별 사용법</a>을 먼저 보세요(확장 설치·연결은 쿠팡과 같습니다).
      </p>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {INSTALL_STEPS.map((step, index) => (
          <div key={step.title} className="mx-card p-4">
            <p className="text-xs font-bold text-[#86efac]">STEP {index + 1}</p>
            <p className="mt-1 text-sm font-bold text-mx-text">{step.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-mx-muted">{step.desc}</p>
          </div>
        ))}
      </section>

      {error ? <p className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-[#fde68a]">⚠️ {error} 잠시 뒤 새로고침해 주세요.</p> : <ReviewResults initialRuns={runs} market="naver" />}

      <section className="mx-card p-5">
        <h2 className="text-sm font-bold text-mx-text">💡 자주 묻는 질문</h2>
        <div className="mt-3 space-y-3">
          {FAQ.map((item) => (
            <div key={item.q}>
              <p className="text-sm font-semibold text-mx-text">{item.q}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-mx-muted">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
