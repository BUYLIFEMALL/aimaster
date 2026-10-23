// 영상 프롬프트 게시판(v1.14) — 이 프로그램 고유의 장면 예시 목록(다른 프로그램과 공유하지 않음, docs/IMAGE_PROMPT_RULES.md).
// 「이 설명으로 만들기」 → /create?preset=<id>가 설명·화풍·카메라를 채운다. 사람 장면은 한국인, 브랜드·실존 인물·연도 없음.

export type BoardCategory = "nature" | "city" | "food" | "product" | "people" | "fantasy";

export const BOARD_CATEGORIES: { id: BoardCategory; label: string; emoji: string }[] = [
  { id: "nature", label: "풍경·자연", emoji: "🏔️" },
  { id: "city", label: "도시·야경", emoji: "🌃" },
  { id: "food", label: "음식·카페", emoji: "☕" },
  { id: "product", label: "제품 광고", emoji: "🛍️" },
  { id: "people", label: "사람·일상", emoji: "🙂" },
  { id: "fantasy", label: "동물·판타지", emoji: "🦊" },
];

export interface BoardPreset {
  id: string;
  category: BoardCategory;
  title: string;
  /** 생성 화면 1단계 설명 칸에 들어갈 한국어 장면 설명 */
  idea: string;
  styleId: string;
  cameraId: string;
  /** photo: 시작 장면 사진을 넣으면 더 잘 나오는 장면(제품 등) */
  input: "text" | "photo";
}

export const BOARD_PRESETS: BoardPreset[] = [
  // 풍경·자연
  { id: "nature-sunrise-sea", category: "nature", title: "동해 일출", idea: "겨울 새벽 동해 바다 위로 붉은 해가 천천히 떠오르고, 잔잔한 파도가 바위에 부서지며 물보라가 금빛으로 반짝인다", styleId: "cinematic", cameraId: "push", input: "text" },
  { id: "nature-autumn-forest", category: "nature", title: "단풍 숲길", idea: "붉고 노란 단풍잎이 바람에 흩날리는 산속 오솔길, 햇살이 나뭇잎 사이로 비스듬히 들어와 낙엽 위에 얼룩진 그림자를 만든다", styleId: "cinematic", cameraId: "tracking", input: "text" },
  { id: "nature-rice-terrace", category: "nature", title: "황금 들판", idea: "가을 저녁 노을 아래 끝없이 펼쳐진 황금빛 논, 벼 이삭이 바람에 파도처럼 일렁이고 멀리 산 능선이 겹겹이 보인다", styleId: "drone", cameraId: "pan", input: "text" },
  { id: "nature-waterfall", category: "nature", title: "계곡 폭포", idea: "이끼 낀 바위 사이로 맑은 물줄기가 쏟아지는 깊은 계곡 폭포, 물안개가 피어오르고 초록 잎에 물방울이 맺혀 떨어진다", styleId: "cinematic", cameraId: "static", input: "text" },
  // 도시·야경
  { id: "city-seoul-rain", category: "city", title: "비 오는 서울 밤거리", idea: "비 오는 서울 밤 골목, 젖은 아스팔트에 간판 불빛이 번져 반사되고 우산을 쓴 사람들이 천천히 지나간다", styleId: "cinematic", cameraId: "tracking", input: "text" },
  { id: "city-han-river", category: "city", title: "한강 야경", idea: "해가 진 직후 한강 다리 위로 차량 불빛이 길게 이어지고, 강물에 도시 불빛이 일렁이며 하늘은 짙은 남색에서 보라색으로 물든다", styleId: "drone", cameraId: "orbit", input: "text" },
  { id: "city-hanok-alley", category: "city", title: "한옥 골목 아침", idea: "이른 아침 한옥이 늘어선 좁은 돌담 골목, 처마 끝에 햇살이 닿고 기와지붕 위로 옅은 안개가 걷힌다", styleId: "cinematic", cameraId: "push", input: "text" },
  { id: "city-timelapse", category: "city", title: "빌딩 숲 타임랩스", idea: "고층 빌딩 사이로 구름이 빠르게 흘러가고 낮에서 밤으로 바뀌며 창문 불빛이 하나둘 켜지는 도심 풍경", styleId: "documentary", cameraId: "static", input: "text" },
  // 음식·카페
  { id: "food-latte", category: "food", title: "창가 라테", idea: "비 오는 오후 카페 창가 원목 테이블 위 라테에서 김이 피어오르고, 창밖 빗방울이 유리를 타고 흘러내린다", styleId: "cinematic", cameraId: "push", input: "text" },
  { id: "food-sizzling", category: "food", title: "지글지글 삼겹살", idea: "숯불 석쇠 위에서 삼겹살이 지글지글 익으며 기름이 튀고 연기가 피어오르는 클로즈업, 옆에 마늘과 쌈채소가 놓여 있다", styleId: "product", cameraId: "static", input: "text" },
  { id: "food-noodle", category: "food", title: "국수 들어 올리기", idea: "뜨거운 국물에서 젓가락으로 면을 천천히 들어 올리자 김이 피어오르고 국물 방울이 떨어지는 클로즈업", styleId: "product", cameraId: "push", input: "text" },
  { id: "food-bakery", category: "food", title: "갓 구운 빵", idea: "빵집 오븐 문이 열리며 노릇하게 구워진 크루아상이 담긴 철판이 나오고, 따뜻한 조명 아래 김과 밀가루가 흩날린다", styleId: "cinematic", cameraId: "push", input: "text" },
  // 제품 광고
  { id: "product-cosmetic", category: "product", title: "화장품 병 공개", idea: "물결이 일렁이는 맑은 물 위에 놓인 화장품 병, 물방울이 병 표면을 타고 흐르고 부드러운 빛이 천천히 병을 비춘다", styleId: "product", cameraId: "orbit", input: "photo" },
  { id: "product-sneaker", category: "product", title: "운동화 회전", idea: "어두운 스튜디오 회전대 위의 운동화가 천천히 돌고, 측면 조명이 소재의 질감과 박음질을 하나씩 비춘다", styleId: "product", cameraId: "orbit", input: "photo" },
  { id: "product-perfume", category: "product", title: "향수 꽃잎", idea: "유리 향수병 주위로 분홍 꽃잎이 천천히 떨어지고, 병 안의 액체가 빛을 받아 반짝인다", styleId: "product", cameraId: "push", input: "photo" },
  { id: "product-gadget", category: "product", title: "전자기기 언박싱", idea: "흰 상자 뚜껑이 천천히 열리며 안에 담긴 전자기기가 드러나고, 깔끔한 흰 배경에 부드러운 그림자가 진다", styleId: "product", cameraId: "push", input: "photo" },
  // 사람·일상(한국인)
  { id: "people-runner", category: "people", title: "새벽 러닝", idea: "새벽 한강 공원 산책로를 달리는 20대 한국인 여성, 숨결이 하얗게 번지고 뒤로 해가 떠오르며 역광이 실루엣을 만든다", styleId: "cinematic", cameraId: "tracking", input: "text" },
  { id: "people-grandma", category: "people", title: "할머니의 손맛", idea: "시골집 부엌에서 70대 한국인 할머니가 미소 지으며 가마솥 뚜껑을 열자 하얀 김이 피어오르고 창으로 햇살이 들어온다", styleId: "documentary", cameraId: "static", input: "text" },
  { id: "people-study", category: "people", title: "밤샘 공부", idea: "늦은 밤 책상 스탠드 불빛 아래 공책에 필기하는 한국인 대학생, 창밖으로 도시 불빛이 흐릿하게 보인다", styleId: "cinematic", cameraId: "push", input: "text" },
  { id: "people-wedding", category: "people", title: "야외 웨딩", idea: "초여름 야외 정원에서 한국인 신랑 신부가 손을 잡고 걸어가고, 하객들이 뿌린 꽃잎이 햇살 속에 흩날린다", styleId: "cinematic", cameraId: "tracking", input: "text" },
  // 동물·판타지
  { id: "fantasy-cat", category: "fantasy", title: "창가 고양이", idea: "햇살 드는 창가에서 졸던 치즈 고양이가 하품을 하고 기지개를 켜며 꼬리를 천천히 흔든다", styleId: "cinematic", cameraId: "static", input: "text" },
  { id: "fantasy-fox", category: "fantasy", title: "눈 속 여우", idea: "눈 덮인 자작나무 숲에서 붉은 여우가 귀를 쫑긋 세우고 눈밭을 사뿐히 걸어간다", styleId: "pixar", cameraId: "tracking", input: "text" },
  { id: "fantasy-whale", category: "fantasy", title: "하늘을 나는 고래", idea: "노을 진 구름 바다 위로 거대한 고래가 천천히 헤엄치듯 날아가고, 지느러미에서 반짝이는 빛 가루가 흩날린다", styleId: "anime", cameraId: "pan", input: "text" },
  { id: "fantasy-lantern", category: "fantasy", title: "풍등 축제", idea: "밤하늘로 수백 개의 풍등이 천천히 떠오르고 호수 위에 불빛이 비치는 몽환적인 장면", styleId: "anime", cameraId: "orbit", input: "text" },
];

export function findPreset(id: unknown): BoardPreset | undefined {
  return typeof id === "string" ? BOARD_PRESETS.find((p) => p.id === id) : undefined;
}

/** 검색·분류 거르기(제목·설명에서 찾음, 띄어쓰기 무시) */
export function filterPresets(list: BoardPreset[], category: BoardCategory | "all", query: string): BoardPreset[] {
  const q = query.replace(/\s+/g, "").toLowerCase();
  return list.filter((p) => (category === "all" || p.category === category) && (!q || `${p.title}${p.idea}`.replace(/\s+/g, "").toLowerCase().includes(q)));
}
