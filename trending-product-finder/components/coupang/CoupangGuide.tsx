import Link from "next/link";
import { DeviceNotice } from "./DeviceNotice";

// 쿠팡 상품소싱기 사용법(매뉴얼 /guide#coupang). 단계마다 「어디서 하는 일인지」를 붙인다.
type Place = "메인프로그램" | "확장프로그램" | "쿠팡" | "크롬 확장 관리" | "내 PC";
type Step = { place: Place; title: string; lines: string[]; tip?: string };

const PLACE_STYLE: Record<Place, string> = {
  메인프로그램: "border-[#1d4ed8] bg-[#1e3a8a]/40 text-[#bfdbfe]",
  확장프로그램: "border-[#7c3aed] bg-[#4c1d95]/40 text-[#ddd6fe]",
  쿠팡: "border-[#b91c1c] bg-[#7f1d1d]/40 text-[#fecaca]",
  "크롬 확장 관리": "border-[#0f766e] bg-[#134e4a]/40 text-[#99f6e4]",
  "내 PC": "border-[#4b5563] bg-[#1f2937] text-[#e5e7eb]",
};

const PARTS: { id: string; icon: string; title: string; when: string; steps: Step[] }[] = [
  {
    id: "install",
    icon: "🧩",
    title: "1부. 설치하고 연결하기",
    when: "처음 한 번만 · 약 5분",
    steps: [
      {
        place: "메인프로그램",
        title: "확장 파일 받기",
        lines: ["왼쪽 메뉴 「🧩 쿠팡 상품소싱기」를 누릅니다.", "「⬇ 확장 ZIP 받기」를 누르면 ZIP 파일 하나가 내려받아집니다."],
      },
      {
        place: "내 PC",
        title: "압축 풀어 두기",
        lines: [
          "받은 ZIP 파일을 마우스 오른쪽 버튼으로 누르고 「압축 풀기」(또는 「모두 압축 풀기」)를 고릅니다.",
          "풀린 폴더는 「문서」처럼 지우지 않을 곳에 둡니다. 이 폴더를 지우면 확장도 사라집니다.",
        ],
        tip: "폴더를 열었을 때 manifest.json 파일이 바로 보이면 올바른 폴더입니다.",
      },
      {
        place: "크롬 확장 관리",
        title: "크롬에 설치하기",
        lines: [
          "크롬 주소창에 chrome://extensions 를 입력하고 Enter를 누릅니다.",
          "오른쪽 위 「개발자 모드」 스위치를 켭니다.",
          "왼쪽 위에 생긴 「압축해제된 확장 프로그램을 로드합니다」를 누르고, 앞에서 풀어 둔 폴더를 고릅니다.",
          "「상품소싱 자동화」 카드가 생기면 설치 완료입니다. 쿠팡 사이트 읽기 허용을 물으면 허용합니다.",
        ],
      },
      {
        place: "크롬 확장 관리",
        title: "툴바에 고정하기",
        lines: ["크롬 오른쪽 위 퍼즐 조각(🧩) 아이콘을 누릅니다.", "「상품소싱 자동화」 옆 핀(📌)을 눌러 툴바에 고정합니다. 이제 아이콘 한 번으로 확장 창이 열립니다."],
      },
      {
        place: "메인프로그램",
        title: "내 계정과 연결하기",
        lines: [
          "「🧩 쿠팡 상품소싱기」 화면을 새로고침하면 「🔗 내 계정과 연결」 칸에 「🟡 설치됨 · 연결 필요」가 보입니다.",
          "「확장 연결하기」를 누르고 「🟢 연결됨」으로 바뀌는지 확인합니다.",
          "연결해야 읽은 결과가 내 계정에 저장되어 다른 PC에서도 볼 수 있습니다.",
        ],
      },
      {
        place: "확장프로그램",
        title: "첫 사용 동의",
        lines: ["툴바의 확장 아이콘을 눌러 창을 엽니다.", "「⚠️ 사용 전 확인」을 읽고 「본인 책임으로 사용합니다」에 체크하면 기능 화면이 열립니다."],
      },
    ],
  },
  {
    id: "manual",
    icon: "👆",
    title: "2부. 직접 검색해서 읽기",
    when: "키워드 몇 개만 볼 때",
    steps: [
      {
        place: "쿠팡",
        title: "검색하고 「판매량순」으로 정렬",
        lines: [
          "coupang.com에서 찾을 상품 키워드(예: 스텐 텀블러)를 검색합니다.",
          "검색 결과 위의 정렬 메뉴에서 「판매량순」을 고릅니다. 많이 팔리는 상품부터 나옵니다.",
        ],
        tip: "「쿠팡 랭킹순」 화면을 읽으면 판매 순서가 아니니 꼭 판매량순으로 바꿔 주세요.",
      },
      {
        place: "확장프로그램",
        title: "「이 페이지 읽어 담기」",
        lines: [
          "쿠팡 검색 화면을 띄운 채 툴바의 확장 아이콘을 누릅니다.",
          "「이 페이지 읽어 담기」를 누르면 그 화면의 상품(30~40개 안팎)이 표에 담깁니다.",
        ],
      },
      {
        place: "확장프로그램",
        title: "리뷰 기준으로 거르기",
        lines: [
          "「리뷰 기준」에서 1개 이상·2개 이상·직접 입력(예: 100개)을 고릅니다.",
          "광고 상품을 빼고 싶으면 「광고 상품 빼기」를 체크합니다.",
          "표의 「순위」는 판매량순 화면에서 몇 번째였는지입니다. 순위가 높고 리뷰가 많을수록 검증된 상품입니다.",
        ],
      },
      {
        place: "쿠팡",
        title: "다른 키워드로 이어서 담기",
        lines: [
          "쿠팡은 검색 한 번에 1페이지만 보여 줍니다. 더 많은 후보가 필요하면 「대용량 텀블러」처럼 키워드를 바꿔 다시 검색하고 2·3단계를 반복합니다.",
          "앞에서 담은 목록 뒤에 이어서 담기고, 같은 상품은 한 번만 남습니다. 읽기 사이에는 10초를 기다려야 합니다.",
        ],
      },
    ],
  },
  {
    id: "auto",
    icon: "🔁",
    title: "3부. 키워드 자동 검색",
    when: "키워드 여러 개를 한 번에 맡길 때",
    steps: [
      {
        place: "확장프로그램",
        title: "키워드 적기",
        lines: ["확장 창의 「🔁 키워드 자동 검색」 칸에 키워드를 한 줄에 하나씩 적습니다.", "한 번에 최대 10개, 하루 최대 30개까지입니다."],
      },
      {
        place: "확장프로그램",
        title: "동의하고 시작",
        lines: ["노란 주의 문구를 읽고 「본인 책임으로 자동 검색을 씁니다」에 체크합니다.", "「자동 검색 시작」을 누릅니다."],
      },
      {
        place: "쿠팡",
        title: "알아서 하나씩 읽어요",
        lines: [
          "확장이 쿠팡 탭 하나를 뒤에 열고, 키워드마다 판매량순 1페이지만 읽어 담습니다.",
          "키워드 사이에는 3~5분을 쉽니다. 10개면 40분 안팎 걸립니다.",
          "확장 창은 닫아도 되지만, 크롬은 켜 두고 확장이 연 쿠팡 탭은 닫지 마세요.",
        ],
      },
      {
        place: "확장프로그램",
        title: "진행 상황 보기 · 멈추기",
        lines: [
          "확장 창을 다시 열면 「오늘 자동 검색 n/30개」, 다음 키워드까지 남은 시간, 키워드별 결과가 보입니다.",
          "중간에 그만두려면 「멈춤」을 누릅니다.",
        ],
      },
      {
        place: "확장프로그램",
        title: "⏰ 매일 예약 걸기(선택)",
        lines: [
          "키워드를 적어 둔 채 「⏰ 매일 예약」에서 「매일」을 체크하고 시각(예: 오전 9:00)을 고른 뒤 「예약 저장」을 누릅니다.",
          "「다음 예약: ○월 ○일 09:00」이 보이면 완료입니다. 매일 그 시각에 적어 둔 키워드로 자동 검색이 시작됩니다.",
          "그 시각에 PC와 크롬이 꺼져 있었으면, 같은 날 크롬을 다시 켤 때 한 번 늦게 시작합니다. 끄려면 「매일」 체크를 풀고 「예약 저장」.",
        ],
        tip: "출근 전처럼 PC를 켜 두는 시각으로 정하세요. 결과는 내 계정에 저장되어 휴대폰으로 볼 수 있습니다.",
      },
      {
        place: "확장프로그램",
        title: "⛔ 쿠팡이 막는 징후가 보이면",
        lines: [
          "확인 화면·「검색결과 없음」·다른 화면으로 튕김·화면 안 열림·상품 0개 중 하나라도 보이면 자동 검색과 매일 예약이 바로 일시정지됩니다.",
          "확장 아이콘에 빨간 「!」가 뜨고 컴퓨터 알림이 옵니다. 확장 창 맨 위 빨간 안내에서 이유를 확인하세요.",
          "그날은 쉬고, 다음 날 쿠팡에서 직접 검색해 정상인지 본 뒤 「확인했고 다시 사용」을 누르면 다시 돕니다.",
        ],
      },
    ],
  },
  {
    id: "results",
    icon: "🗂",
    title: "4부. 결과 보고 내려받기",
    when: "언제든",
    steps: [
      {
        place: "확장프로그램",
        title: "이 PC에서 바로 받기",
        lines: ["확장 창의 「CSV 저장」을 누르면 지금 기준에 맞는 상품이 엑셀 파일로 내려받아집니다.", "「목록 비우기」는 이 PC의 확장 목록만 지웁니다(내 계정 기록은 그대로)."],
      },
      {
        place: "메인프로그램",
        title: "「🗂 내 검색 기록」에서 보기",
        lines: [
          "「🧩 쿠팡 상품소싱기」 화면 아래 「🗂 내 검색 기록」에 키워드별 기록이 쌓입니다.",
          "왼쪽에서 기록을 고르면 순위·상품명·판매가·리뷰 표가 나오고, 리뷰 기준·광고 빼기·「⬇ CSV 받기」를 쓸 수 있습니다.",
          "기록에 이름을 붙이거나 「삭제」로 지울 수 있습니다. 기록은 저장한 날부터 1년 보관됩니다.",
        ],
      },
    ],
  },
];

const TROUBLE = [
  { q: "「쿠팡에서 직접 검색한 결과 화면을 연 뒤 눌러 주세요」가 떠요", a: "쿠팡 검색 결과 화면(주소가 coupang.com/np/search로 시작)을 앞에 띄운 상태에서 확장 아이콘을 눌러 주세요." },
  { q: "「○초 뒤에 다시 눌러 주세요」가 떠요", a: "쿠팡에 너무 자주 접속하지 않도록 읽기 사이에 10초를 기다리게 했습니다. 잠시 뒤 다시 누르세요." },
  { q: "「⛔ 쿠팡 확인 화면이 떠서 멈췄습니다」", a: "쿠팡이 사람인지 확인하는 화면을 띄운 것입니다. 우회하지 말고 그날은 쉬어 주세요." },
  { q: "「상품을 찾지 못했습니다」", a: "쿠팡 화면이 아직 다 열리지 않았거나 화면 구조가 바뀐 것일 수 있습니다. 쿠팡 탭을 새로고침한 뒤 다시 해 보고, 계속되면 문의해 주세요." },
  { q: "결과가 내 계정에 저장되지 않아요", a: "확장 창에 「확장을 연결하면 내 계정에 저장됩니다」가 보이면 1부 5단계(내 계정과 연결하기)를 해 주세요." },
  { q: "자동 검색이 시작되지 않아요", a: "주의 문구 체크를 했는지, 오늘 남은 개수(30개 중)보다 키워드가 많지 않은지 확인하세요. 빨간 일시정지 안내가 있으면 그 안내대로 「확인했고 다시 사용」을 먼저 눌러야 하고, 오늘 멈춤 표시가 있으면 다음 날 써 주세요." },
  { q: "예약 시각이 지났는데 돌지 않았어요", a: "그 시각에 PC가 꺼져 있었거나 절전 중이었을 수 있습니다. 같은 날 크롬을 다시 켜면 한 번 늦게 시작합니다. 확장 창의 「다음 예약」 시각과 일시정지 안내가 없는지 확인하세요." },
];

function PlaceChip({ place }: { place: Place }) {
  return <span className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold ${PLACE_STYLE[place]}`}>📍 {place}</span>;
}

export function CoupangGuide() {
  return (
    <section id="coupang" className="mx-card scroll-mt-6 space-y-5">
      <div>
        <h2 className="mx-section-title">🧩 쿠팡 상품소싱기 사용법 — 판매량과 리뷰 수로 팔리는 상품 찾기</h2>
        <p className="text-xs leading-relaxed text-mx-muted">
          쿠팡 검색 결과를 「판매량순」으로 정렬해 크롬 확장이 읽고, 리뷰가 기준 이상인 상품만 골라 줍니다. 쿠팡 접속은 회원님 PC에서만 하고 우리 서버는 쿠팡을 호출하지 않습니다.
          단계마다 붙은 <b>📍 표시</b>는 그 일을 어디서 하는지 알려 줍니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PARTS.map((part) => (
            <a key={part.id} href={`#coupang-${part.id}`} className="mx-chip px-3 py-1 text-xs hover:border-mx-primary">
              {part.icon} {part.title}
            </a>
          ))}
          <Link href="/coupang-reviews" className="mx-btn-primary px-3 py-1 text-xs">
            🧩 쿠팡 상품소싱기 화면 열기
          </Link>
        </div>
      </div>

      <DeviceNotice />

      {PARTS.map((part) => (
        <div key={part.id} id={`coupang-${part.id}`} className="scroll-mt-6">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="text-sm font-bold text-mx-text">
              {part.icon} {part.title}
            </h3>
            <span className="mx-chip px-2 py-0.5 text-[10px]">⏱ {part.when}</span>
          </div>
          <ol className="mt-3 grid gap-3 md:grid-cols-2">
            {part.steps.map((step, index) => (
              <li key={step.title} className="flex gap-3 rounded-xl border border-mx-border bg-mx-raised p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mx-primary text-xs font-bold text-white">{index + 1}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-mx-text">{step.title}</span>
                    <PlaceChip place={step.place} />
                  </div>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-mx-muted">
                    {step.lines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  {step.tip && <p className="mt-2 rounded-lg bg-[#064e3b]/40 px-2 py-1 text-[11px] leading-relaxed text-[#d1fae5]">💡 {step.tip}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ))}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-[#065f46] bg-[#064e3b]/40 p-4">
          <p className="text-sm font-bold text-[#a7f3d0]">🔄 새 버전으로 업데이트하는 법</p>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-xs leading-relaxed text-[#d1fae5]">
            <li>📍 메인프로그램: 「🧩 쿠팡 상품소싱기」에서 「⬇ 확장 ZIP 받기」로 새 ZIP을 받습니다(화면에 최신 버전이 보입니다).</li>
            <li>📍 내 PC: 압축을 풀어 예전 폴더에 덮어씁니다(폴더 위치는 그대로).</li>
            <li>📍 크롬 확장 관리: chrome://extensions에서 「상품소싱 자동화」 카드의 동그란 화살표(새로고침)를 누릅니다. 새 권한을 물으면 허용합니다.</li>
          </ol>
        </div>
        <div className="rounded-2xl border border-[#92400e] bg-[#78350f]/40 p-4">
          <p className="text-sm font-bold text-[#fde68a]">⚠️ 꼭 알아 두세요</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-[#fef3c7]">
            <li>쿠팡 약관 위반·계정 제재·법적 책임의 소지가 있으며, 사용 책임은 회원님 본인에게 있습니다.</li>
            <li>쿠팡 판매자 계정에 로그인한 크롬에서는 쓰지 않는 것이 안전합니다.</li>
            <li>자동 검색은 쿠팡에 여러 번 접속하므로 직접 읽기보다 위험이 큽니다. 꼭 필요한 키워드만 넣으세요.</li>
            <li>판매 개수 자체는 쿠팡이 보여 주지 않아, 「순위」는 판매량순 화면의 순서입니다. 리뷰 수와 가격은 쿠팡 화면에서 한 번 더 확인해 주세요.</li>
          </ul>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-mx-text">🛠 이럴 땐 이렇게</h3>
        <div className="mt-2 space-y-2">
          {TROUBLE.map((t) => (
            <details key={t.q} className="group rounded-xl bg-mx-raised p-3">
              <summary className="cursor-pointer list-none text-sm font-semibold text-mx-text">
                <span className="mr-1 text-mx-accent group-open:hidden">＋</span>
                <span className="mr-1 hidden text-mx-accent group-open:inline">－</span>
                {t.q}
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-mx-muted">{t.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
