export const SCREENS = [
  {
    id: "dashboard",
    label: "대시보드",
    detail: "번역 현황 & 파이프라인",
    icon: "⌂",
  },
  {
    id: "translator",
    label: "문서번역",
    detail: "원문 · 번역 · 검수",
    step: 1,
  },
  { id: "glossary", label: "용어집", detail: "회원님의 번역 기준", step: 2 },
  {
    id: "history",
    label: "작업 보관함",
    detail: "저장한 번역 다시 열기",
    step: 3,
  },
  {
    id: "settings",
    label: "API키등록·플랫폼연동",
    detail: "본인 Gemini 키 · 모델",
    icon: "⚙",
  },
  {
    id: "guide",
    label: "📖 연동 & 사용 매뉴얼",
    detail: "4단계 프로세스 & 포맷 매트릭스",
    icon: "📖",
  },
] as const;
export type Screen = (typeof SCREENS)[number]["id"];
