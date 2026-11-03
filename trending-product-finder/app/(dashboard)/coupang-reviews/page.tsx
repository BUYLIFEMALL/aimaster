import { PageHero } from "@/components/ui/PageHero";
import { requireProgramAccess } from "@/lib/access";
import { APP_VERSION } from "@/lib/version";
import { listReviewRunsAction } from "@/lib/actions/coupangResults";
import { ExtensionConnect } from "@/components/coupang/ExtensionConnect";
import { ReviewResults } from "@/components/coupang/ReviewResults";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const DOWNLOAD_URL = "/downloads/trending-product-finder-extension-latest.zip";

const INSTALL_STEPS = [
  { title: "ZIP 받아 압축 풀기", desc: "아래 버튼으로 받은 뒤 지우지 않을 폴더에 압축을 풉니다." },
  { title: "크롬에 올리기", desc: "chrome://extensions → 오른쪽 위 개발자 모드 켜기 → 「압축해제된 확장 프로그램 로드」 → 그 폴더 선택." },
  { title: "쿠팡에서 검색 · 판매량순", desc: "이 화면에서 「확장 연결하기」를 누른 뒤, 쿠팡에서 직접 검색하고 정렬을 「판매량순」으로 바꿉니다. 확장 아이콘을 눌러 첫 사용 확인에 동의합니다." },
  { title: "읽고 거르기", desc: "「이 페이지 읽어 담기」를 누르고 리뷰 기준을 고릅니다. 더 많은 상품은 키워드를 바꿔 검색한 뒤 다시 누르면 이어서 담깁니다." },
];

const FAQ = [
  { q: "판매량은 어떻게 보나요?", a: "쿠팡은 상품별 판매 개수를 화면에 보여 주지 않습니다. 대신 검색 결과를 「판매량순」으로 정렬하면 쿠팡이 판매량으로 매긴 순서대로 나오므로, 그 화면을 읽으면 많이 팔리는 상품 가운데 리뷰가 쌓인 상품을 고를 수 있습니다. 「쿠팡 랭킹순」 화면을 읽으면 판매량 순서가 아닙니다." },
  { q: "왜 쿠팡 API로 안 하나요?", a: "쿠팡 파트너스 검색 응답에 리뷰 수가 없습니다. 그래서 회원 PC의 확장이 회원이 보고 있는 화면만 읽습니다." },
  { q: "한 번에 몇 개까지 읽나요?", a: "지금 쿠팡 검색 화면은 페이지 단추 없이 한 번에 상품 카드 60개 안팎(같은 상품의 옵션을 합치면 30~40개)까지만 보여 줍니다. 더 많은 후보가 필요하면 「대용량 텀블러」처럼 키워드를 바꿔 검색한 뒤 다시 누르세요. 앞서 담은 목록 뒤에 이어서 담깁니다." },
  { q: "「검색결과 없음」이나 확인 화면이 나와요.", a: "쿠팡이 제한했을 수 있습니다. 다시 시도하지 말고 시간을 두었다가 사용해 주세요. 확인 화면이 뜨면 확장이 읽기를 멈춥니다." },
  { q: "읽은 자료는 어디에 저장되나요?", a: "확장을 연결하면 공개 상품 정보만 AIMaster의 내 계정에 저장되어 어느 PC에서든 보고 내려받을 수 있습니다. 1년 뒤 자동으로 지워지고 언제든 삭제할 수 있습니다. 쿠팡 접속은 회원 PC에서만 하며 우리 서버는 쿠팡을 호출하지 않습니다." },
  { q: "리뷰 없는 상품은 어떻게 보이나요?", a: "카드에 리뷰 수가 없으면 0개로 담깁니다. 쿠팡 화면 구조가 바뀌면 값이 틀릴 수 있으니 중요한 상품은 화면에서 한 번 더 확인해 주세요." },
];

export default async function CoupangReviewsPage() {
  await requireProgramAccess();
  const { runs, error } = await listReviewRunsAction();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHero
        badge="🧩 쿠팡 상품소싱기"
        title="쿠팡 판매량과 리뷰 수로 팔리는 상품 찾기"
        description="쿠팡 검색 결과를 「판매량순」으로 정렬하면 많이 팔리는 상품부터 나옵니다. 크롬 확장이 그 화면을 읽어 리뷰 수가 기준 이상인 상품만 골라, 판매와 리뷰로 검증된 소싱 후보를 표로 보여 줍니다."
      />

      <section className="mx-card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-sm font-bold text-mx-text">📦 크롬 확장 다운로드</p>
          <p className="mt-1 text-xs text-mx-muted">최신 버전 {APP_VERSION} · 새 버전을 받으면 기존 폴더에 덮어쓰고 chrome://extensions에서 새로고침해 주세요.</p>
        </div>
        <a href={DOWNLOAD_URL} download className="mx-btn-primary shrink-0 whitespace-nowrap px-5 py-3 text-sm font-bold">
          ⬇ 확장 ZIP 받기
        </a>
      </section>

      <ExtensionConnect />

      <section className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-4 text-sm leading-relaxed text-[#fde68a]">
        <p className="font-bold">⚠️ 먼저 읽어 주세요</p>
        <p className="mt-1">이 기능은 쿠팡 약관 위반·계정 제재·법적 책임의 소지가 있으며, 사용 책임은 회원 본인에게 있습니다. 판매자 계정을 함께 쓰는 브라우저에서는 그 계정에 영향이 갈 수 있으니 주의해 주세요.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {INSTALL_STEPS.map((step, index) => (
          <div key={step.title} className="mx-card p-4">
            <p className="text-xs font-bold text-[#93c5fd]">STEP {index + 1}</p>
            <p className="mt-1 text-sm font-bold text-mx-text">{step.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-mx-muted">{step.desc}</p>
          </div>
        ))}
      </section>

      {error ? <p className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-[#fde68a]">⚠️ {error} 잠시 뒤 새로고침해 주세요.</p> : <ReviewResults initialRuns={runs} />}

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
