// 클라이언트 컴포넌트(카테고리 선택 UI)에서도 import해야 해서 "server-only" 의존성이 없는 별도 파일로 분리.

export const YOUTUBE_CATEGORY_OPTIONS: { id: string; label: string }[] = [
  { id: "1", label: "영화/애니메이션" },
  { id: "2", label: "자동차" },
  { id: "10", label: "음악" },
  { id: "15", label: "동물" },
  { id: "17", label: "스포츠" },
  { id: "19", label: "여행/이벤트" },
  { id: "20", label: "게임" },
  { id: "22", label: "인물/블로그" },
  { id: "23", label: "코미디" },
  { id: "24", label: "엔터테인먼트" },
  { id: "25", label: "뉴스/정치" },
  { id: "26", label: "노하우/스타일" },
  { id: "27", label: "교육" },
  { id: "28", label: "과학기술" },
  { id: "29", label: "비영리/사회운동" },
];
