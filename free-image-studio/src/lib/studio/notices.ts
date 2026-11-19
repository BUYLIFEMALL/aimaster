// 화면 안내 문구와 매뉴얼 내용 모음(순수 값 — 시험으로 문구를 고정한다).
// 사양 문구는 주인님이 확정한 것만 둔다. 확정되지 않은 다른 사양(더 큰 그래픽 메모리·애플 실리콘 등)의 지원 표기는 넣지 않는다.

/** 주인님 확정(2026-11-19, 세 안 가운데 두 번째). 「한 대에서 확인」이라는 말은 화면에 넣지 않는다 */
export const SPEC_NOTICE_8GB = "8GB 그래픽카드에서 동작을 확인했습니다. 다른 프로그램이 그래픽 메모리를 많이 쓰고 있으면 실패할 수 있으니, 그릴 때는 게임·영상 편집 프로그램을 닫아 주세요.";

/** 그래픽 메모리가 모자라 실패했을 때의 대처(주인님 확정 문구) */
export const MEMORY_FAIL_NOTICE = "그래픽 메모리가 부족했습니다. 다른 프로그램을 닫고 다시 시도하거나, 한 단계 가벼운 구성으로 바꿔 주세요.";

/** 접수 기록이 손상됐거나 읽을 수 없을 때 */
export const LEDGER_BROKEN = {
  title: "브라우저에 보관한 접수 기록을 읽지 못했습니다",
  body: "기록이 손상된 동안에는 새로 맡기기·다시 보내기·확인을 하지 않습니다(같은 그림을 두 번 그리지 않기 위해서입니다). 이미 엔진에 맡긴 그림은 계속 그려지고 엔진 창에서 볼 수 있습니다.",
  retry: "다시 읽기",
  reset: "접수 기록 새로 시작…",
  confirmTitle: "접수 기록을 새로 시작할까요?",
  confirmBody: "손상된 기록은 이 브라우저 안에 따로 옮겨 두고, 빈 기록으로 다시 시작합니다. 이 화면의 작업 기록 목록은 비워지지만 엔진이 그리던 그림과 이미 저장한 파일은 그대로입니다. 앞서 맡긴 그림은 엔진 창에서 확인해 주세요.",
  confirm: "새로 시작",
  cancel: "그만두기",
  done: "접수 기록을 새로 시작했습니다. 앞서 맡긴 그림은 엔진 창에서 볼 수 있습니다.",
} as const;

const MAIN_SITE_URL = "https://www.buylife.xyz";
/** 회원 본인 AI 키를 등록하는 곳(공용 — 한 번 등록하면 모든 프로그램이 쓴다). 이 프로그램에는 키 입력 칸이 없다 */
export const API_SETTINGS_PATH = "/api-settings";
export const mainSiteUrl = (base: string | undefined, path: string) => `${(base || MAIN_SITE_URL).replace(/\/+$/, "")}${path}`;

/**
 * 하단 「연동 매뉴얼」 버튼. 메인 사이트 매뉴얼 게시판(platform_guides)의 글 번호 — 다른 프로그램(naver-cafe-poster 등)이 이미 쓰는 번호만 적는다.
 * Claude 키 발급 글은 번호를 확인하지 못해 매뉴얼 목록으로 연결한다(확인되면 guideId를 채운다).
 */
export const KEY_GUIDES: readonly { provider: "openai" | "anthropic" | "gemini"; label: string; guideId: string | null }[] = [
  { provider: "openai", label: "OpenAI API 키 발급받기", guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a" },
  { provider: "anthropic", label: "Claude API 키 발급받기(매뉴얼 목록)", guideId: null },
  { provider: "gemini", label: "Google Gemini API 키 발급받기", guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4" },
];
export const guidePath = (guideId: string | null) => (guideId ? `/guides/${guideId}` : "/guides");

/** 사용 매뉴얼의 네 단계(화면의 실제 메뉴 순서) */
export const MANUAL_STEPS: readonly { no: number; emoji: string; title: string; minutes: string; lines: string[]; href: string; action: string }[] = [
  { no: 1, emoji: "🖥️", title: "내 PC 엔진 켜기", minutes: "처음 한 번 · 5분", lines: ["「시작하기」에서 엔진 프로그램을 받아 설치합니다.", "엔진을 실행하면 창에 연결 코드 6자리가 보입니다."], href: "/start", action: "시작하기 열기" },
  { no: 2, emoji: "🔗", title: "엔진과 연결하기", minutes: "처음 한 번 · 1분", lines: ["엔진 창의 숫자 6자리를 「시작하기」에 넣습니다.", "이 브라우저와 엔진이 연결되고, 다음부터는 묻지 않습니다."], href: "/start", action: "연결하러 가기" },
  { no: 3, emoji: "🎨", title: "용도 고르고 설명 적기", minutes: "매번 · 1분", lines: ["용도와 비율을 고르고, 그림 설명을 한 줄에 하나씩 적습니다.", "「일괄 시작」을 한 번 누르면 최대 24장을 차례로 맡깁니다."], href: "/create", action: "만들기 열기" },
  { no: 4, emoji: "📋", title: "결과 보고 저장하기", minutes: "그리는 동안 자유", lines: ["「작업 기록」에서 진행 상황과 완성된 그림을 봅니다.", "마음에 드는 그림을 내 PC에 저장합니다."], href: "/jobs", action: "작업 기록 열기" },
];

export const MANUAL_TIPS: readonly string[] = [
  "맡긴 뒤에는 이 화면을 닫아도 됩니다. 엔진이 켜져 있으면 계속 그리고, 다시 열면 이어서 보입니다.",
  "그림 설명은 영문으로 적습니다. 조명·구도·「글자 없음」 같은 표현은 고른 용도에 맞게 자동으로 덧붙습니다.",
  "같은 설명으로 두 장이 필요하면 줄 끝에 x2를 적거나 줄 옆의 「2장」을 누릅니다.",
];

export const MANUAL_CAUTIONS: readonly string[] = [
  "그림은 회원님 PC의 그래픽카드로 그립니다. 엔진 프로그램이 꺼져 있으면 그릴 수 없습니다.",
  SPEC_NOTICE_8GB,
  "엔진과의 연결을 끊거나 다른 브라우저로 옮기면, 앞서 맡긴 작업은 이 화면에서 볼 수 없습니다(엔진 창에서는 볼 수 있습니다).",
];

export const MANUAL_FAQ: readonly { q: string; a: string }[] = [
  { q: "엔진은 어디서 받나요?", a: "「시작하기」 1단계의 「엔진 받기」 버튼으로 받습니다. 설치한 뒤 실행하면 창에 연결 코드가 보입니다. 엔진을 켠 채로 「다시 확인」을 눌러 주세요." },
  { q: "내 PC에서 되는지 어떻게 아나요?", a: `엔진과 연결하면 「시작하기」 3단계에 엔진이 이 PC에 고른 구성이 보입니다. ${SPEC_NOTICE_8GB}` },
  { q: "그리다가 실패했어요. 메모리가 부족하다고 나옵니다.", a: MEMORY_FAIL_NOTICE + " 구성은 「만들기」의 「고급 설정」에서 바꿀 수 있습니다." },
  { q: "첫 그림이 오래 걸려요.", a: "모델 파일이 아직 없으면 첫 그림을 맡길 때 엔진이 알아서 받습니다. 파일이 커서 시간이 걸리고, 받는 동안 진행 상황이 「작업 기록」에 보입니다. 두 번째부터는 받지 않습니다." },
  { q: "화면을 닫으면 그림이 멈추나요?", a: "멈추지 않습니다. 맡긴 그림은 엔진이 차례로 그립니다. 다만 아직 엔진에 맡기지 않은 줄은 화면을 닫으면 맡겨지지 않으니, 「일괄 시작」 뒤 「맡겼습니다」 안내를 확인하고 닫아 주세요." },
  { q: "한글로 적을 수는 없나요?", a: "「만들기」의 「한글로 적고 영문으로 바꾸기」를 켜면 됩니다. 회원님이 등록한 AI 키로 유료 호출이 되고, 버튼을 누를 때 한 번만 부릅니다. 꺼 두면 AI 키 없이 영문으로 직접 적어 쓸 수 있습니다." },
  { q: "그림은 어디에 보관되나요?", a: "그림은 회원님 PC(엔진)에 있고 우리 서버에는 저장하지 않습니다. 이 화면의 작업 기록과 저장 기록도 이 브라우저에만 보관합니다." },
  { q: "「받았는지 알 수 없는 그림」이라고 나옵니다.", a: "맡기는 도중 연결이 끊긴 경우입니다. 같은 그림을 두 번 그리지 않도록 자동으로 다시 맡기지 않습니다. 「엔진에 확인」을 누르거나 엔진 창에서 그려졌는지 본 뒤 정리해 주세요." },
];
