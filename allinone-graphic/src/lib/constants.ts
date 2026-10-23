// 19개 직군 카테고리 정의
export const JOB_CATEGORIES = {
  DEV: "개발자/퍼블리셔",
  GAME: "게임 개발",
  ENGINEER: "엔지니어/제조",
  CREATOR: "콘텐츠 크리에이터",
  WEBTOON: "웹툰/스토리보드",
  PUBLISHING: "출판/작가",
  PHOTO_VIDEO: "사진/영상/음향",
  BUSINESS: "사업 기획/전략",
  MARKETING: "마케터/디자이너",
  FINANCE: "금융/회계/투자",
  SALES: "영업/고객관리",
  HR_LEGAL: "법률/인사/총무",
  ECOMMERCE: "이커머스/온라인셀러",
  FOOD: "요식업/자영업",
  FASHION: "패션/의류",
  EDUCATION: "교육/학술",
  MEDICAL: "의료/건강",
  INTERIOR: "인테리어/부동산",
  EVENT: "이벤트/웨딩",
} as const;

export type JobCategoryKey = keyof typeof JOB_CATEGORIES;

// 5대 대분류 그룹
export interface CategoryGroup {
  title: string;
  items: { key: JobCategoryKey; label: string; icon: string }[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    title: "IT 및 기술",
    items: [
      { key: "DEV", label: "개발자/퍼블리셔", icon: "Code" },
      { key: "GAME", label: "게임 개발", icon: "Gamepad2" },
      { key: "ENGINEER", label: "엔지니어/제조", icon: "Cpu" },
    ],
  },
  {
    title: "창작 및 예술",
    items: [
      { key: "CREATOR", label: "콘텐츠 크리에이터", icon: "Video" },
      { key: "WEBTOON", label: "웹툰/스토리보드", icon: "Palette" },
      { key: "PUBLISHING", label: "출판/작가", icon: "BookOpen" },
      { key: "PHOTO_VIDEO", label: "사진/영상/음향", icon: "Camera" },
    ],
  },
  {
    title: "비즈니스 및 마케팅",
    items: [
      { key: "BUSINESS", label: "사업 기획/전략", icon: "Briefcase" },
      { key: "MARKETING", label: "마케터/디자이너", icon: "Megaphone" },
      { key: "FINANCE", label: "금융/회계/투자", icon: "TrendingUp" },
      { key: "SALES", label: "영업/고객관리", icon: "Users" },
      { key: "HR_LEGAL", label: "법률/인사/총무", icon: "Scale" },
    ],
  },
  {
    title: "커머스 및 자영업",
    items: [
      { key: "ECOMMERCE", label: "이커머스/온라인셀러", icon: "ShoppingBag" },
      { key: "FOOD", label: "요식업/자영업", icon: "Utensils" },
      { key: "FASHION", label: "패션/의류", icon: "Shirt" },
    ],
  },
  {
    title: "전문 서비스 및 라이프",
    items: [
      { key: "EDUCATION", label: "교육/학술", icon: "GraduationCap" },
      { key: "MEDICAL", label: "의료/건강", icon: "Activity" },
      { key: "INTERIOR", label: "인테리어/부동산", icon: "Home" },
      { key: "EVENT", label: "이벤트/웨딩", icon: "Calendar" },
    ],
  },
];

// 11대 화풍 스타일 프리셋
export const STYLE_PRESETS = [
  { value: "Photorealistic, 8k", label: "실사" },
  { value: "3D Render, Unreal Engine 5", label: "3D 렌더링" },
  { value: "Anime style, Studio Ghibli", label: "애니메이션" },
  { value: "Oil painting, classical art", label: "유화" },
  { value: "Watercolor, soft edges", label: "수채화" },
  { value: "Pixel art, retro game", label: "픽셀 아트" },
  { value: "Cyberpunk, neon lights", label: "사이버펑크" },
  { value: "Minimalist, flat design", label: "미니멀리스트" },
  { value: "Sketch, pencil drawing", label: "스케치" },
  { value: "Vintage poster, retro colors", label: "빈티지 포스터" },
  { value: "Vector illustration, flat", label: "벡터 일러스트" },
];

// 5대 화면 비율
export const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1 (정방형)" },
  { value: "16:9", label: "16:9 (유튜브/가로)" },
  { value: "9:16", label: "9:16 (쇼츠/세로)" },
  { value: "4:3", label: "4:3 (일반)" },
  { value: "3:4", label: "3:4 (포스터)" },
];

// 3대 해상도
export const RESOLUTIONS = [
  { value: "1K", label: "1K (표준)" },
  { value: "2K", label: "2K (고화질)" },
  { value: "4K", label: "4K (초고화질)" },
];

// 텍스트 지원 언어
export const LANGUAGES = [
  { value: "한국어", label: "한국어" },
  { value: "영어", label: "영어" },
  { value: "일본어", label: "일본어" },
  { value: "중국어", label: "중국어" },
  { value: "스페인어", label: "스페인어" },
  { value: "프랑스어", label: "프랑스어" },
  { value: "독일어", label: "독일어" },
  { value: "러시아어", label: "러시아어" },
  { value: "아랍어", label: "아랍어" },
  { value: "포르투갈어", label: "포르투갈어" },
];
