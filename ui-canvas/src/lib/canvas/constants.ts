import type { ComponentType, Preset, CanvasComponent } from "./types";

export const TOOLBOX: { type: ComponentType; label: string; tip: string }[] = [
  { type: "Container", label: "컨테이너", tip: "다른 요소들을 묶거나 레이아웃을 구성하는 기본 컨테이너입니다." },
  { type: "Text", label: "텍스트", tip: "텍스트를 입력하고 스타일을 지정합니다. 더블클릭해서 내용을 수정하세요." },
  { type: "Button", label: "버튼", tip: "클릭을 유도하는 버튼입니다. 다양한 스타일 프리셋을 쓸 수 있습니다." },
  { type: "Input", label: "입력 필드", tip: "텍스트 입력 필드입니다. 안내 문구(placeholder)를 설정할 수 있습니다." },
  { type: "Listbox", label: "목록상자", tip: "여러 항목을 목록으로 보여주고 하나를 선택하는 컴포넌트입니다." },
  { type: "Image", label: "이미지", tip: "URL로 이미지를 추가합니다." },
  { type: "Tabs", label: "탭", tip: "여러 콘텐츠 영역을 전환하는 탭입니다." },
  { type: "Accordion", label: "아코디언", tip: "섹션을 접고 펼치는 아코디언입니다." },
  { type: "Dropdown", label: "드롭다운", tip: "여러 옵션 중 하나를 고르는 드롭다운입니다." },
  { type: "Radio", label: "라디오", tip: "여러 선택지 중 하나만 고르는 라디오 버튼입니다." },
  { type: "Checkbox", label: "체크박스", tip: "옵션을 선택/해제하는 체크박스입니다." },
  { type: "Toggle", label: "토글", tip: "켜짐/꺼짐을 전환하는 스위치입니다." },
  { type: "Slider", label: "슬라이더", tip: "범위 안의 값을 조절하는 슬라이더입니다." },
  { type: "Alert", label: "알림", tip: "정보·성공·경고·오류 메시지를 전달하는 알림입니다." },
  { type: "Loader", label: "로더", tip: "불러오는 중임을 나타내는 로딩 표시입니다." },
  { type: "Progress", label: "진행률", tip: "작업 진행 상태를 보여주는 막대입니다." },
  { type: "Tooltip", label: "툴팁", tip: "마우스를 올리면 설명이 나타나는 말풍선입니다." },
  { type: "Modal", label: "모달", tip: "화면 위에 겹쳐 중요한 내용을 보여주는 창입니다." },
  { type: "Popover", label: "팝오버", tip: "클릭하면 나타나는 작은 정보 창입니다." },
  { type: "Icon", label: "아이콘", tip: "벡터 아이콘을 추가합니다." },
  { type: "BarChart", label: "막대 차트", tip: "데이터를 막대로 시각화합니다." },
  { type: "LineChart", label: "선 차트", tip: "추세를 선으로 나타냅니다." },
  { type: "PieChart", label: "파이 차트", tip: "비율을 원형으로 나타냅니다." },
  { type: "Misc", label: "기타", tip: "설명을 입력해 사용자 정의 컴포넌트를 만듭니다." },
];

export const TYPE_LABEL: Record<ComponentType, string> = {
  ...(Object.fromEntries(TOOLBOX.map((t) => [t.type, t.label])) as Record<ComponentType, string>),
  Group: "그룹",
};

// 흰색 캔버스에 맞춘 기본 스타일(라이트)
const common = { backgroundColor: "#ffffff", borderColor: "#cbd5e1", borderWidth: 1, borderRadius: 6, color: "#0f172a" };

export const DEFAULTS: Record<ComponentType, Pick<CanvasComponent, "props" | "size" | "styles">> = {
  Button: { props: { text: "버튼", kind: "text", icon: null }, size: { width: 88, height: 40 }, styles: { ...common, backgroundColor: "#2563eb", color: "#ffffff", borderWidth: 0, fontSize: 14, fontWeight: 600 } },
  Input: { props: { placeholder: "텍스트 입력..." }, size: { width: 200, height: 40 }, styles: { ...common, paddingLeft: 12 } },
  Listbox: { props: { items: ["항목 1", "항목 2", "항목 3"], selectedIndex: 0 }, size: { width: 200, height: 120 }, styles: { ...common } },
  Text: { props: { text: "텍스트를 입력하세요" }, size: { width: 180, height: 36 }, styles: { fontSize: 16, fontWeight: 400, color: "#0f172a", textAlign: "left", backgroundColor: "transparent", padding: "4px 8px" } },
  Tabs: { props: { tabs: ["탭 1", "탭 2"], activeTab: 0, style: "line" }, size: { width: 240, height: 40 }, styles: {} },
  Accordion: { props: { items: [{ title: "항목 1", content: "첫 번째 항목의 내용입니다." }, { title: "항목 2", content: "두 번째 항목의 내용입니다." }], openItem: 0 }, size: { width: 300, height: 150 }, styles: { ...common, backgroundColor: "#f8fafc" } },
  Dropdown: { props: { options: ["옵션 1", "옵션 2", "옵션 3"], isOpen: false }, size: { width: 200, height: 40 }, styles: { ...common } },
  Radio: { props: { name: "radio-group", checked: false, label: "라디오 버튼" }, size: { width: 140, height: 24 }, styles: { color: "#0f172a", fontSize: 14 } },
  Checkbox: { props: { checked: false, label: "체크박스" }, size: { width: 140, height: 24 }, styles: { color: "#0f172a", fontSize: 14 } },
  Toggle: { props: { isOn: false, leftLabel: "", rightLabel: "" }, size: { width: 120, height: 28 }, styles: { color: "#0f172a" } },
  Slider: { props: { value: 50 }, size: { width: 200, height: 24 }, styles: {} },
  Alert: { props: { text: "알림 메시지입니다.", type: "info", dismissible: false }, size: { width: 320, height: 60 }, styles: {} },
  Loader: { props: { style: "spinner" }, size: { width: 32, height: 32 }, styles: {} },
  Progress: { props: { progress: 60, showLabel: false }, size: { width: 200, height: 10 }, styles: { backgroundColor: "#e2e8f0", barColor: "#2563eb" } },
  Tooltip: { props: { text: "툴팁 텍스트" }, size: { width: 32, height: 32 }, styles: {} },
  Modal: { props: { title: "모달 제목", content: "모달 내용입니다." }, size: { width: 384, height: 220 }, styles: { ...common, borderRadius: 12 } },
  Popover: { props: { title: "팝오버 제목", placement: "bottom" }, size: { width: 256, height: 120 }, styles: { ...common, backgroundColor: "#f8fafc" } },
  Icon: { props: { icon: "HomeIcon" }, size: { width: 24, height: 24 }, styles: { color: "#475569" } },
  Image: { props: { src: "https://picsum.photos/200/300" }, size: { width: 200, height: 150 }, styles: { objectFit: "cover", borderRadius: 8 } },
  Container: { props: {}, size: { width: 250, height: 180 }, styles: { ...common, backgroundColor: "#f8fafc" } },
  BarChart: { props: { colors: ["#6366f1", "#22c55e"] }, size: { width: 400, height: 250 }, styles: { ...common, backgroundColor: "#f8fafc" } },
  LineChart: { props: { colors: ["#6366f1", "#22c55e"] }, size: { width: 400, height: 250 }, styles: { ...common, backgroundColor: "#f8fafc" } },
  PieChart: { props: { colors: ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF", "#FF4560", "#775DD0"] }, size: { width: 250, height: 250 }, styles: { ...common, backgroundColor: "#f8fafc" } },
  Group: { props: {}, size: { width: 200, height: 200 }, styles: { backgroundColor: "rgba(99,102,241,0.06)", borderColor: "rgba(99,102,241,0.5)", borderWidth: 1, borderRadius: 6, borderStyle: "dashed" } },
  Misc: { props: {}, size: { width: 150, height: 50 }, styles: { backgroundColor: "rgba(250,204,21,0.2)", borderColor: "#eab308", borderWidth: 2, borderRadius: 6, borderStyle: "dashed", color: "#854d0e", fontSize: 14, fontWeight: 500 } },
};

export const ICON_NAMES = [
  "MailIcon", "BellIcon", "HomeIcon", "UserIcon", "CogIcon", "SearchIcon", "CheckCircleIcon", "XCircleIcon",
  "InformationCircleIcon", "ExclamationTriangleIcon", "PlayIcon", "PauseIcon", "ForwardIcon", "BackwardIcon", "XMarkIcon",
] as const;

const light = { backgroundColor: "#ffffff", borderColor: "#cbd5e1", borderWidth: 1 };

export const PRESETS: Partial<Record<ComponentType, Preset[]>> = {
  Button: [
    { name: "Standard", label: "기본", props: { text: "버튼", icon: null, kind: "text" }, styles: {}, type: "functional" },
    { name: "Play", label: "재생", props: { text: "", icon: "PlayIcon", kind: "icon" }, styles: { borderRadius: 9999 }, type: "functional" },
    { name: "Pause", label: "일시정지", props: { text: "", icon: "PauseIcon", kind: "icon" }, styles: { borderRadius: 9999 }, type: "functional" },
    { name: "Next", label: "다음", props: { text: "", icon: "ForwardIcon", kind: "icon" }, styles: { borderRadius: 9999 }, type: "functional" },
    { name: "Previous", label: "이전", props: { text: "", icon: "BackwardIcon", kind: "icon" }, styles: { borderRadius: 9999 }, type: "functional" },
    { name: "Close", label: "닫기", props: { text: "", icon: "XMarkIcon", kind: "icon" }, styles: { borderRadius: 9999, backgroundColor: "#64748b" }, type: "functional" },
    { name: "Primary", label: "기본(파랑)", styles: { backgroundColor: "#2563eb", color: "#ffffff", borderWidth: 0 }, type: "style" },
    { name: "Secondary", label: "보조", styles: { backgroundColor: "#475569", color: "#ffffff", borderWidth: 0 }, type: "style" },
    { name: "Outline", label: "윤곽선", styles: { backgroundColor: "transparent", color: "#334155", borderWidth: 1, borderColor: "#94a3b8" }, type: "style" },
    { name: "Ghost", label: "고스트", styles: { backgroundColor: "transparent", color: "#475569", borderWidth: 0 }, type: "style" },
    { name: "Link", label: "링크", styles: { backgroundColor: "transparent", color: "#2563eb", borderWidth: 0, textDecoration: "underline" }, type: "style" },
    { name: "Success", label: "성공", styles: { backgroundColor: "#16a34a", color: "#ffffff", borderWidth: 0 }, type: "style" },
    { name: "Danger", label: "위험", styles: { backgroundColor: "#dc2626", color: "#ffffff", borderWidth: 0 }, type: "style" },
    { name: "Pill", label: "알약", styles: { borderRadius: 9999 }, type: "style" },
  ],
  Input: [
    { name: "Standard", label: "기본", styles: { ...light } },
    { name: "Quiet", label: "조용한", styles: { backgroundColor: "transparent", borderColor: "#94a3b8", borderWidth: 0, borderBottomWidth: 1, borderRadius: 0 } },
    { name: "Pill", label: "알약", styles: { ...light, borderRadius: 9999 } },
    { name: "Modern", label: "모던", styles: { backgroundColor: "#f8fafc", borderColor: "#e2e8f0", borderWidth: 1, borderRadius: 8 } },
  ],
  Listbox: [
    { name: "Standard", label: "기본", styles: { ...light } },
    { name: "Quiet", label: "조용한", styles: { backgroundColor: "transparent", borderWidth: 0 } },
  ],
  Container: [
    { name: "Card", label: "카드", styles: { backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderWidth: 1, borderRadius: 12, boxShadow: "0 10px 15px -3px rgba(15,23,42,0.1), 0 4px 6px -2px rgba(15,23,42,0.05)" } },
    { name: "Glassmorphism", label: "글래스", styles: { backgroundColor: "rgba(255,255,255,0.5)", borderColor: "rgba(148,163,184,0.4)", borderWidth: 1, borderRadius: 16, backdropFilter: "blur(10px)" } },
    { name: "Well", label: "웰", styles: { backgroundColor: "#f1f5f9", borderColor: "#e2e8f0", borderWidth: 1, borderRadius: 8 } },
    { name: "Subtle", label: "은은한", styles: { backgroundColor: "rgba(148,163,184,0.15)", borderWidth: 0 } },
  ],
  Alert: [
    { name: "Info (Solid)", label: "정보(채움)", props: { type: "info" }, styles: { backgroundColor: "#3b82f6", color: "#ffffff", borderWidth: 0 } },
    { name: "Success (Subtle)", label: "성공(은은)", props: { type: "success" }, styles: { backgroundColor: "#f0fdf4", color: "#166534", borderColor: "#22c55e", borderLeftWidth: 4, borderWidth: 0 } },
    { name: "Warning (Top Accent)", label: "경고(상단선)", props: { type: "warning" }, styles: { backgroundColor: "#fffbeb", color: "#92400e", borderTopWidth: 4, borderColor: "#f59e0b", borderLeftWidth: 0, borderWidth: 0, borderRadius: 4 } },
    { name: "Error (Outline)", label: "오류(윤곽)", props: { type: "error" }, styles: { backgroundColor: "transparent", color: "#b91c1c", borderWidth: 1, borderColor: "#ef4444" } },
  ],
  Text: [
    { name: "Heading", label: "제목", styles: { fontSize: 24, fontWeight: "bold" } },
    { name: "Subheading", label: "부제목", styles: { fontSize: 18, fontWeight: "600", color: "#334155" } },
    { name: "Body", label: "본문", styles: { fontSize: 14, fontWeight: "400", color: "#475569" } },
    { name: "Muted", label: "흐린 글", styles: { fontSize: 12, fontWeight: "400", color: "#94a3b8" } },
  ],
  Image: [
    { name: "Rounded", label: "둥근", styles: { borderRadius: 16 } },
    { name: "Circle", label: "원형", styles: { borderRadius: "50%" } },
    { name: "Shadow", label: "그림자", styles: { boxShadow: "0 10px 15px -3px rgba(15,23,42,0.15), 0 4px 6px -2px rgba(15,23,42,0.05)" } },
    { name: "No Radius", label: "각진", styles: { borderRadius: 0 } },
  ],
  Tabs: [
    { name: "Line", label: "라인", props: { style: "line" }, styles: {} },
    { name: "Pill", label: "알약", props: { style: "pill" }, styles: {} },
    { name: "Segmented", label: "분할", props: { style: "segmented" }, styles: {} },
    { name: "Modern", label: "모던", props: { style: "pill" }, styles: { backgroundColor: "#f1f5f9", borderRadius: 8 } },
    { name: "Minimal", label: "미니멀", props: { style: "line" }, styles: { backgroundColor: "transparent" } },
  ],
  Accordion: [
    { name: "Minimal", label: "미니멀", styles: { borderWidth: 0, backgroundColor: "transparent" } },
    { name: "Separated", label: "구분", styles: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8 } },
    { name: "Flush", label: "각진", styles: { borderRadius: 0 } },
  ],
  Dropdown: [
    { name: "Standard", label: "기본", styles: { ...light } },
    { name: "Quiet", label: "조용한", styles: { backgroundColor: "transparent", borderColor: "#94a3b8", borderWidth: 0, borderBottomWidth: 1, borderRadius: 0 } },
  ],
  Progress: [
    { name: "Blue", label: "파랑", styles: { barColor: "#2563eb" } },
    { name: "Green", label: "초록", styles: { barColor: "#16a34a" } },
    { name: "Slim", label: "얇게", styles: { borderRadius: 2, height: 4 } },
    { name: "Striped", label: "줄무늬", styles: { barColor: "#2563eb", backgroundImage: "linear-gradient(45deg, rgba(255,255,255,0.3) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.3) 75%, transparent 75%, transparent)" } },
  ],
  Tooltip: [
    { name: "Dark", label: "어둡게", props: { text: "툴팁 텍스트" }, styles: { backgroundColor: "#0f172a", color: "#ffffff" } },
    { name: "Light", label: "밝게", props: { text: "툴팁 텍스트" }, styles: { backgroundColor: "#e2e8f0", color: "#0f172a" } },
  ],
  Icon: [
    { name: "Gray", label: "회색", styles: { color: "#64748b" } },
    { name: "Blue", label: "파랑", styles: { color: "#2563eb" } },
    { name: "Black", label: "검정", styles: { color: "#0f172a" } },
  ],
};
