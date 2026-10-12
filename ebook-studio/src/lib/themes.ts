import {
  ThemeKey,
  ThemeDef,
  FontKey,
  FontDef,
  DesignPreset,
  CoverTemplate,
} from "./types";

export const THEMES: Record<ThemeKey, ThemeDef> = {
  warm: {
    label: "따뜻한 종이",
    bg: "#f8f5ed",
    paper: "#fffdf8",
    fg: "#292d29",
    muted: "#6c7269",
    line: "#dfdfd4",
    accent: "#8a6a37",
  },
  white: {
    label: "클래식 화이트",
    bg: "#f2f4f6",
    paper: "#ffffff",
    fg: "#1f2328",
    muted: "#67707d",
    line: "#e0e4e9",
    accent: "#3d5a80",
  },
  sepia: {
    label: "빈티지 세피아",
    bg: "#efe6d4",
    paper: "#f9f2e2",
    fg: "#3b2f21",
    muted: "#75654e",
    line: "#ddd0b6",
    accent: "#905925",
  },
  linen: {
    label: "리넨 그레이",
    bg: "#eeeeea",
    paper: "#f9f9f6",
    fg: "#2b2c2a",
    muted: "#696b67",
    line: "#dcdcd6",
    accent: "#616e55",
  },
  paperback: {
    label: "페이퍼백",
    bg: "#f3e9d8",
    paper: "#fdf6e8",
    fg: "#34291d",
    muted: "#77664f",
    line: "#e0d2b8",
    accent: "#ad4d26",
  },
  sand: {
    label: "샌드 베이지",
    bg: "#f0ebe1",
    paper: "#faf7f1",
    fg: "#2f2b24",
    muted: "#6f685b",
    line: "#ded6c7",
    accent: "#846537",
  },
  rose: {
    label: "로즈 쿼츠",
    bg: "#f7edef",
    paper: "#fffafb",
    fg: "#33262a",
    muted: "#7b676c",
    line: "#e8d5da",
    accent: "#ab4f68",
  },
  lavender: {
    label: "라벤더",
    bg: "#f1eef8",
    paper: "#fbfaff",
    fg: "#2b2637",
    muted: "#706984",
    line: "#ddd7ec",
    accent: "#7259b8",
  },
  coral: {
    label: "코럴 페이퍼",
    bg: "#fff0e6",
    paper: "#fff9f5",
    fg: "#1a1a1a",
    muted: "#796b62",
    line: "#f3ddcd",
    accent: "#c73c00",
  },
  crisp: {
    label: "크리스프 오렌지",
    bg: "#f9fafb",
    paper: "#ffffff",
    fg: "#1a1a1a",
    muted: "#6b7280",
    line: "#e5e7eb",
    accent: "#d13f00",
  },
  amberLinen: {
    label: "앰버 리넨",
    bg: "#f2ede4",
    paper: "#faf8f5",
    fg: "#1c1917",
    muted: "#706965",
    line: "#ddd6c9",
    accent: "#aa4f09",
  },
  slateWhite: {
    label: "슬레이트 화이트",
    bg: "#f8fafc",
    paper: "#ffffff",
    fg: "#0f172a",
    muted: "#64748b",
    line: "#e2e8f0",
    accent: "#ac5f05",
  },
  navy: {
    label: "미드나이트 (다크)",
    bg: "#17222f",
    paper: "#1e2c3b",
    fg: "#e4e8ed",
    muted: "#adb7c4",
    line: "#354454",
    accent: "#d4b276",
  },
  forest: {
    label: "딥 포레스트 (다크)",
    bg: "#152420",
    paper: "#1c302a",
    fg: "#e0e9e3",
    muted: "#a3b7ab",
    line: "#31473f",
    accent: "#8ec9a3",
  },
  mocha: {
    label: "다크 모카 (다크)",
    bg: "#241d19",
    paper: "#2f2621",
    fg: "#ece3db",
    muted: "#b3a599",
    line: "#453931",
    accent: "#d8a877",
  },
  blueprint: {
    label: "블루프린트 (다크)",
    bg: "#12243a",
    paper: "#172d47",
    fg: "#dce8f6",
    muted: "#9db3cc",
    line: "#2c4463",
    accent: "#6fb2e8",
  },
  charcoal: {
    label: "차콜 (다크)",
    bg: "#1b1c1e",
    paper: "#242628",
    fg: "#e6e7e9",
    muted: "#a9adb2",
    line: "#3a3d41",
    accent: "#9fc2d8",
  },
  carbon: {
    label: "카본 오렌지 (다크)",
    bg: "#121212",
    paper: "#1c1c1c",
    fg: "#f4f4f5",
    muted: "#a1a1aa",
    line: "#27272a",
    accent: "#ff4d00",
  },
  indigo: {
    label: "딥 인디고 (다크)",
    bg: "#090d16",
    paper: "#131b2e",
    fg: "#f1f5f9",
    muted: "#94a3b8",
    line: "#1e293b",
    accent: "#60a5fa",
  },
  cyanNight: {
    label: "사이언 나이트 (다크)",
    bg: "#080e1e",
    paper: "#0f1a36",
    fg: "#f1f5f9",
    muted: "#94a3b8",
    line: "#1e3a8a",
    accent: "#22d3ee",
  },
  ink: {
    label: "고대비 잉크",
    bg: "#ffffff",
    paper: "#ffffff",
    fg: "#0b0b0b",
    muted: "#3c3c3c",
    line: "#0b0b0b",
    accent: "#1345c9",
  },
};

const SYSTEM_FONT_FALLBACK =
  'system-ui, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", "맑은 고딕", sans-serif';
const SERIF_FALLBACK = 'AppleMyungjo, Batang, "바탕", Georgia, serif';

export const FONTS: Record<FontKey, FontDef> = {
  notoSans: {
    label: "본고딕",
    note: "Noto Sans KR · 화면에서 또렷한 고딕",
    stack: `"Noto Sans KR", ${SYSTEM_FONT_FALLBACK}`,
    family: "Noto Sans KR",
  },
  notoSerif: {
    label: "본명조",
    note: "Noto Serif KR · 단정한 본문 명조",
    stack: `"Noto Serif KR", ${SERIF_FALLBACK}`,
    family: "Noto Serif KR",
  },
  ridi: {
    label: "리디바탕",
    note: "Ridibatang · 고전적인 책 느낌",
    stack: `"Ridibatang", "Noto Serif KR", ${SERIF_FALLBACK}`,
    family: "Ridibatang",
  },
  maru: {
    label: "마루부리",
    note: "MaruBuri · 부드럽고 읽기 편한 부리",
    stack: `"MaruBuri", "Noto Serif KR", ${SERIF_FALLBACK}`,
    family: "MaruBuri",
  },
  paperlogy: {
    label: "페이퍼로지",
    note: "Paperlogy · 현대적이고 단정한 고딕",
    stack: `"Paperlogy", "Noto Sans KR", ${SYSTEM_FONT_FALLBACK}`,
    family: "Paperlogy",
  },
};

// 10대 디자인 조합 프리셋
export const DESIGN_PRESETS: DesignPreset[] = [
  {
    label: "문학 에세이",
    note: "리넨 그레이 · 마루부리",
    style: { theme: "linen", font: "maru", leading: 1.8, size: 17, skin: "classic" },
  },
  {
    label: "고전 문고",
    note: "빈티지 세피아 · 리디바탕",
    style: { theme: "sepia", font: "ridi", leading: 1.8, size: 17, skin: "classic" },
  },
  {
    label: "출판 원고",
    note: "페이퍼백 · 본명조",
    style: { theme: "paperback", font: "notoSerif", leading: 1.55, size: 17, skin: "classic" },
  },
  {
    label: "실용 안내서",
    note: "클래식 화이트 · 본고딕",
    style: { theme: "white", font: "notoSans", leading: 1.55, size: 17, skin: "classic" },
  },
  {
    label: "기술 문서",
    note: "블루프린트 · 페이퍼로지",
    style: { theme: "blueprint", font: "paperlogy", leading: 1.55, size: 17, skin: "classic" },
  },
  {
    label: "야간 독서",
    note: "다크 모카 · 마루부리",
    style: { theme: "mocha", font: "maru", leading: 1.8, size: 17, skin: "classic" },
  },
  {
    label: "연구 노트",
    note: "차콜 · 페이퍼로지",
    style: { theme: "charcoal", font: "paperlogy", leading: 1.35, size: 16.5, skin: "classic" },
  },
  {
    label: "접근성 우선",
    note: "고대비 잉크 · 본고딕",
    style: { theme: "ink", font: "notoSans", leading: 1.8, size: 17, skin: "classic" },
  },
  {
    label: "검증 워크북",
    note: "코럴 페이퍼 · 페이퍼로지 · 스튜디오",
    style: { theme: "coral", font: "paperlogy", leading: 1.55, size: 17, skin: "studio" },
  },
  {
    label: "다크 스튜디오",
    note: "카본 오렌지 · 페이퍼로지 · 스튜디오",
    style: { theme: "carbon", font: "paperlogy", leading: 1.55, size: 17, skin: "studio" },
  },
];

// 4대 표지 프롬프트 템플릿
export const COVER_TEMPLATES: CoverTemplate[] = [
  {
    id: "checklist",
    label: "체크리스트형",
    note: "기준·점검 항목을 보여 줄 때",
    body: [
      "위에서 아래로 다섯 층으로 나눈다.",
      "1층: 가는 가로줄 위에 작은 부제 한 줄, 오른쪽 끝에 둥근 사각형 배지 하나.",
      "2층: 지면 폭을 꽉 채우는 아주 굵은 고딕 제목 두 줄. 가운데 핵심 낱말 한 덩이만 빨강, 나머지는 먹색.",
      "3층: 제목 아래 가는 가로줄과 한 줄짜리 설명.",
      "4층: 지면의 절반을 쓰는 그림. 왼쪽에는 둥근 모서리 카드 위에 체크 표시가 붙은 점검 항목 목록, 오른쪽에는 그 목록을 비추는 큼직한 돋보기. 카드 한 장에는 붉은 가위표를 크게 얹어 걸러진 것을 보여 준다.",
      "5층: 가는 가로줄 아래 아이콘 네 개를 같은 간격으로 늘어놓고 각 아이콘 밑에 두 줄짜리 짧은 설명.",
    ].join("\n"),
  },
  {
    id: "versus",
    label: "대비형",
    note: "두 부류를 가를 때",
    body: [
      "위에서 아래로 네 층으로 나눈다.",
      "1층: 가운데 정렬한 작은 부제 한 줄, 양옆에 작은 마름모 장식, 오른쪽 끝에 둥근 사각형 배지 하나.",
      "2층: 아주 굵은 고딕 제목 두 줄. 두 부류를 가르는 낱말만 보라색, 나머지는 먹색.",
      "3층: 왼쪽 카드와 오른쪽 카드를 나란히 놓고 그 사이 가운데에 작은 VS 원. 왼쪽 카드에는 체크 표시가 붙은 서류와 방패, 오른쪽 카드에는 엉킨 전선과 느낌표. 카드 아래에 각각 한 줄짜리 이름표와 설명.",
      "4층: 짙은 남색 띠를 지면 폭으로 깔고 그 위에 아이콘 다섯 개를 같은 간격으로. 아이콘마다 제목 한 줄과 설명 두 줄.",
    ].join("\n"),
  },
  {
    id: "points",
    label: "요점 나열형",
    note: "세 가지 습관·원칙을 꼽을 때",
    body: [
      "짙은 남색 바탕에 흰 카드를 얹고, 카드 안을 네 층으로 나눈다.",
      "1층: 작은 부제 한 줄, 오른쪽 끝에 둥근 사각형 배지 하나.",
      "2층: 아주 굵은 고딕 제목 세 줄. 가운데 줄만 파랑, 나머지는 먹색.",
      "3층: 왼쪽에 둥근 아이콘이 붙은 요점 세 개를 세로로 쌓고, 오른쪽에는 체크 표시가 든 큰 방패와 대화 상자 그림. 요점 아래에 따옴표로 묶은 한 문장을 둔다.",
      "4층: 옅은 띠 위에 아이콘 네 개를 같은 간격으로 늘어놓고, 오른쪽 끝에 별 셋이 붙은 둥근 인증 배지 하나.",
    ].join("\n"),
  },
  {
    id: "silhouette",
    label: "인물 대비형",
    note: "사실과 착각을 가를 때",
    body: [
      "짙은 남색 바탕 위에 아주 옅은 회로 무늬를 깔고, 위에서 아래로 세 층으로 나눈다.",
      "1층: 왼쪽에 세로 강조 막대를 세우고 그 옆에 부제 한 줄, 오른쪽 끝에 둥근 사각형 배지 하나.",
      "2층: 지면 폭을 꽉 채우는 아주 굵은 고딕 제목 두 줄. 첫 낱말만 빨강, 나머지는 흰색. 그 아래 가는 줄과 두 줄짜리 설명.",
      "3층: 지면의 절반을 쓰는 그림. 왼쪽에 사람 얼굴 옆모습 실루엣, 가운데에 큰 돋보기, 돋보기 안팎으로 같은 얼굴이 두 갈래로 갈라져 한쪽에는 체크와 '사실', 다른 쪽에는 느낌표와 '착각'을 붙인다. 주변에 흐릿한 대화 상자 몇 개.",
    ].join("\n"),
  },
];

// 유튜브 자막 추출 콘솔 스크립트
export const YOUTUBE_TRANSCRIPT_SCRIPT = `(async () => {
  const id = new URL(location.href).searchParams.get("v") || location.pathname.split("/").pop();
  if (!id) return console.log("영상 페이지에서 실행해 주세요.");
  const html = await (await fetch("https://www.youtube.com/watch?v=" + id)).text();
  const at = html.indexOf('"captionTracks":');
  if (at < 0) return console.log("이 영상에는 자막 목록이 없습니다.");
  let start = html.indexOf("[", at), depth = 0, quoted = false, escaped = false, end = -1;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (escaped) { escaped = false; continue; }
    if (c === "\\\\") { escaped = true; continue; }
    if (c === '"') { quoted = !quoted; continue; }
    if (quoted) continue;
    if (c === "[") depth++;
    else if (c === "]" && --depth === 0) { end = i; break; }
  }
  const list = JSON.parse(html.slice(start, end + 1)).filter(t => t.baseUrl);
  if (!list.length) return console.log("이 영상에는 자막이 없습니다.");
  console.log("자막:", list.map(t => t.languageCode + (t.kind === "asr" ? "(자동)" : "")).join(", "));
  const order = [
    t => /^ko/.test(t.languageCode) && t.kind !== "asr",
    t => /^ko/.test(t.languageCode),
    t => /^en/.test(t.languageCode) && t.kind !== "asr",
    t => /^en/.test(t.languageCode),
    () => true,
  ];
  const read = (body) => {
    const trimmed = body.trim();
    if (!trimmed) return "";
    if (trimmed[0] === "{") {
      const data = JSON.parse(trimmed);
      return (data.events || []).flatMap(e => (e.segs || []).map(s => s.utf8 || "")).join("");
    }
    const doc = new DOMParser().parseFromString(trimmed, "text/xml");
    if (doc.querySelector("parsererror")) return "";
    return [...doc.querySelectorAll("text, p")].map(n => n.textContent).join(" ");
  };
  const tidy = (s) => s.replace(/\\s*\\n\\s*/g, " ").replace(/\\s+/g, " ").trim();
  for (const wanted of order) {
    const track = list.find(wanted);
    if (!track) continue;
    const base = track.baseUrl.replace(/([?&])fmt=[^&]*/g, "$1").replace(/[?&]+$/, "");
    for (const fmt of ["&fmt=json3", "", "&fmt=srv3"]) {
      try {
        const res = await fetch(base + fmt);
        const text = tidy(read(await res.text()));
        if (!text) { console.log("빈 응답:", track.languageCode, fmt || "(기본)", res.status); continue; }
        try { await navigator.clipboard.writeText(text); console.log("클립보드에 복사했습니다:", text.length + "자 (" + track.languageCode + ")"); }
        catch { try { copy(text); console.log("복사했습니다:", text.length + "자"); }
                catch { console.log(text); console.log("^ 위 글을 직접 복사해 주세요."); } }
        return;
      } catch (e) { console.log("실패:", track.languageCode, fmt || "(기본)", String(e).slice(0, 60)); }
    }
  }
  console.log("자막을 받지 못했습니다. 영상 설명 아래 '스크립트 표시'로 복사해 주세요.");
})()`;
