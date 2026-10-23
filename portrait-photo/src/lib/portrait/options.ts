// AI 인물사진 자동화 — 촬영 옵션 데이터(순수 데이터, 서버·클라이언트 공용, 비밀 값 없음).
// 문구·프롬프트 조각은 이 프로그램에서 새로 작성했다. 프롬프트 조각은 이미지 모델용 영어 고정 문장이다.

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9" | "1:4" | "4:1" | "1:8" | "8:1";
export type ModelLevel = "flash" | "pro";
export type Resolution = "1K" | "2K" | "4K";
export type PurposeId = "id-photo" | "business" | "sns" | "cinematic" | "custom";

export interface Option { id: string; label: string; fragment: string }
export interface OutfitOption extends Option { desc: string; category: "formal" | "casual" | "editorial" | "cozy" | "keep" }
/** name은 이미지 모델용 영어 색 이름 */
export interface ColorOption { id: string; label: string; name: string; hex: string }
export interface AspectOption { value: AspectRatio; label: string; desc: string; extended: boolean }

export const LIGHTING: Option[] = [
  { id: "flat-studio", label: "증명사진용 무그림자 조명", fragment: "perfectly even, shadowless high-key studio lighting with no visible shadows on the face or backdrop" },
  { id: "golden-hour", label: "골든아워", fragment: "warm late-afternoon golden hour sunlight with a soft directional glow and gentle long shadows" },
  { id: "window-soft", label: "아침 창가광", fragment: "soft diffused morning window light that wraps gently around the face" },
  { id: "softbox", label: "스튜디오 소프트박스", fragment: "professional studio softbox lighting with smooth gradients and natural catchlights in the eyes" },
  { id: "blue-hour", label: "블루아워", fragment: "cool dusk blue-hour lighting with deep calm tones and a quiet moody atmosphere" },
  { id: "mixed", label: "혼합광", fragment: "mixed lighting where a warm indoor lamp meets cool daylight from a window" },
];

export const CAMERA: Option[] = [
  { id: "dslr-50", label: "DSLR 50mm", fragment: "shot on a full-frame camera with a 50mm f/1.8 lens, sharp focus on the eyes, shallow depth of field" },
  { id: "dslr-85", label: "DSLR 85mm", fragment: "shot on a full-frame camera with an 85mm f/1.4 portrait lens, smooth background blur, flattering compression" },
  { id: "phone", label: "스마트폰 셀카", fragment: "modern smartphone front camera, slightly handheld framing, candid everyday feel" },
  { id: "street-35", label: "35mm 스냅", fragment: "35mm lens street-photography framing with an authentic documentary feel" },
];

export const SKIN: Option[] = [
  { id: "pores", label: "미세 모공", fragment: "fine visible pores and natural skin micro-texture" },
  { id: "peach-fuzz", label: "잔털", fragment: "fine vellus peach-fuzz hairs catching the light" },
  { id: "asymmetry", label: "자연스러운 비대칭", fragment: "natural subtle facial asymmetry for human realism" },
  { id: "glow", label: "건강한 광채", fragment: "healthy skin radiance with smooth highlight roll-off" },
  { id: "freckles", label: "주근깨", fragment: "subtle realistic freckles across the nose and cheeks" },
  { id: "sweat", label: "미세 땀방울", fragment: "tiny beads of sweat reflecting the light" },
  { id: "blush", label: "은은한 홍조", fragment: "natural rosy undertones with subtle blood circulation" },
  { id: "matte", label: "매트 피부", fragment: "matte skin finish with minimal specular highlights" },
  { id: "dewy", label: "물광 피부", fragment: "hydrated dewy skin with soft strong highlights" },
  { id: "imperfect", label: "자연스러운 잡티", fragment: "minor natural skin irregularities such as tiny moles" },
];

export const BACKGROUND: Option[] = [
  { id: "id-white", label: "증명사진 순백", fragment: "a seamless, perfectly uniform pure white backdrop (RGB 255,255,255) with no gradient, shadow or texture, suitable for official identification photos" },
  { id: "solid", label: "단색 (기본 색 적용)", fragment: "a seamless solid backdrop in {colorName} with sophisticated contrast" },
  { id: "studio", label: "스튜디오 배경", fragment: "a professional photo-studio backdrop with subtle texture" },
  { id: "modern-gray", label: "모던 그레이", fragment: "a clean minimalist modern gray wall with soft shadows" },
  { id: "warm-bokeh", label: "따뜻한 보케", fragment: "warm out-of-focus bokeh lights in the distance" },
  { id: "olive", label: "올리브 캔버스", fragment: "a textured olive-green painted canvas backdrop" },
  { id: "blue-muslin", label: "쿨블루 머슬린", fragment: "a cool blue hand-painted muslin photography backdrop" },
  { id: "sepia", label: "클래식 세피아", fragment: "a timeless sepia-toned classic backdrop" },
  { id: "city-night", label: "도시 야경", fragment: "a softly defocused urban night scene with city bokeh" },
  { id: "mist-blue", label: "푸른 안개", fragment: "an atmospheric misty blue ethereal backdrop" },
  { id: "light-leak", label: "빛 번짐", fragment: "abstract light leaks and a gentle creative lens flare" },
  { id: "smoky-brown", label: "스모키 브라운", fragment: "a dark smoky brown moody studio backdrop" },
  { id: "crimson", label: "붉은 안개", fragment: "deep crimson mist in a dramatic dark environment" },
  { id: "concrete", label: "콘크리트 벽", fragment: "a raw industrial concrete wall with a brutalist feel" },
  { id: "forest", label: "울창한 숲", fragment: "deep out-of-focus lush green forest foliage" },
  { id: "velvet", label: "벨벳 커튼", fragment: "heavy luxurious velvet curtain folds in the background" },
  { id: "neon", label: "네온 도시", fragment: "vibrant neon city lights at night with cyberpunk bokeh" },
  { id: "library", label: "빈티지 서재", fragment: "a blurred vintage library with rows of old books" },
  { id: "watercolor", label: "수채화 배경", fragment: "an artistic watercolor wash texture" },
];

export const POSE: Option[] = [
  { id: "id-front", label: "증명사진 정면", fragment: "formal head-on identification-style portrait with neutral, level alignment and a calm closed-mouth expression" },
  { id: "soft-smile", label: "부드러운 미소", fragment: "a gentle soft smile, warm eyes and an approachable demeanor" },
  { id: "intense", label: "강렬한 표정", fragment: "a confident posture with a strong, focused facial expression" },
  { id: "stare", label: "정면 응시", fragment: "looking directly into the lens with deep engagement" },
  { id: "contemplate", label: "사색적인 시선", fragment: "a thoughtful gaze looking slightly away from the camera" },
  { id: "profile", label: "측면 프로필", fragment: "a sharp side profile that highlights the facial contours" },
  { id: "dynamic", label: "역동적인 포즈", fragment: "a dynamic slightly angled pose that suggests movement" },
  { id: "arms-crossed", label: "팔짱", fragment: "a professional pose with arms crossed over the chest" },
  { id: "chin-hand", label: "턱을 괸 포즈", fragment: "leaning the chin on one hand in a thoughtful pose" },
  { id: "lean-forward", label: "앞으로 기댄 포즈", fragment: "leaning slightly toward the camera in an engaging way" },
  { id: "over-shoulder", label: "어깨 너머 보기", fragment: "looking back over the shoulder toward the camera" },
  { id: "pockets", label: "주머니에 손", fragment: "a casual relaxed pose with hands in pockets" },
  { id: "wall", label: "벽에 기댄 포즈", fragment: "effortlessly leaning against a textured wall" },
  { id: "hair-flip", label: "머리 넘기기", fragment: "a mid-action moment of brushing fingers through the hair" },
  { id: "heroic", label: "당당한 시선", fragment: "an upward determined gaze with a heroic expression" },
  { id: "laugh", label: "자연스러운 웃음", fragment: "genuine natural laughter with crinkling eyes, spontaneous" },
  { id: "sitting", label: "앉아서 사색", fragment: "sitting down in a relaxed contemplative state" },
  { id: "walking", label: "걸어오는 모습", fragment: "captured mid-stride, walking toward the camera" },
];

export const OUTFIT: OutfitOption[] = [
  { id: "keep-original", label: "원본 복장 유지", desc: "참조 사진의 옷 스타일과 질감을 그대로 살립니다.", category: "keep", fragment: "the same clothing as in the reference photo, with natural fabric texture and realistic draping" },
  { id: "classic-suit", label: "클래식 정장", desc: "단정한 다크 수트와 흰 셔츠", category: "formal", fragment: "a well-tailored dark formal business suit with a crisp white collared shirt" },
  { id: "smart-casual", label: "스마트 캐주얼", desc: "블레이저와 오픈 칼라 셔츠", category: "formal", fragment: "an unstructured navy or charcoal blazer over a crisp open-collar shirt, smart business casual" },
  { id: "silk-blouse", label: "실크 블라우스", desc: "부드러운 드레이프와 은은한 광택", category: "formal", fragment: "an elegant champagne silk satin blouse with a subtle sheen and fluid drape" },
  { id: "white-shirt", label: "미니멀 흰 셔츠", desc: "깔끔한 코튼 셔츠", category: "casual", fragment: "a minimalist crisp white cotton button-down shirt with natural folds and the top button open" },
  { id: "denim", label: "데님 & 티셔츠", desc: "워싱 데님 재킷과 코튼 티", category: "casual", fragment: "a washed blue denim trucker jacket over a soft neutral cotton t-shirt" },
  { id: "linen", label: "린넨 셔츠", desc: "통기성 좋은 아이보리 린넨", category: "casual", fragment: "a relaxed breathable ivory linen shirt with an organic open weave" },
  { id: "turtleneck", label: "터틀넥 니트", desc: "미니멀하고 지적인 무드", category: "editorial", fragment: "a fitted black fine-knit turtleneck sweater with a delicate knit texture, minimalist look" },
  { id: "leather", label: "레더 재킷", desc: "블랙 가죽 재킷", category: "editorial", fragment: "a stylish black leather motorcycle jacket with subtle metal zippers over a dark crewneck" },
  { id: "trench", label: "트렌치 코트", desc: "카멜 더블 브레스티드", category: "editorial", fragment: "a timeless camel double-breasted trench coat with a structured collar and cinematic silhouette" },
  { id: "hoodie", label: "오버핏 후디", desc: "편안한 스트리트 무드", category: "cozy", fragment: "a heavyweight oversized cotton hoodie in clean heather gray, modern street style" },
  { id: "cardigan", label: "울 가디건", desc: "포근한 케이블 니트", category: "cozy", fragment: "a soft chunky cable-knit wool cardigan in oatmeal over a comfortable base layer" },
];

export const FILM: Option[] = [
  { id: "portra", label: "코닥 포트라 400", fragment: "a Kodak Portra 400 film look with warm tones and fine grain" },
  { id: "fuji-h", label: "후지 400H", fragment: "a Fuji 400H film look with airy greens and blues and neutral shadows" },
  { id: "kodak-gold", label: "코닥 골드 200", fragment: "a Kodak Gold 200 film look with vintage warmth and rich saturation" },
  { id: "instax", label: "인스탁스", fragment: "an instant-film look with higher contrast and nostalgia" },
  { id: "bw", label: "흑백 필름", fragment: "a classic black-and-white film look with deep tonal range and fine grain" },
];

export const COLOR: ColorOption[] = [
  { id: "pure-white", label: "순백 (#FFFFFF)", name: "pure white", hex: "#FFFFFF" },
  { id: "ivory", label: "아이보리", name: "ivory white", hex: "#FFFFF0" },
  { id: "charcoal", label: "차콜 그레이", name: "charcoal gray", hex: "#36454F" },
  { id: "classic-black", label: "클래식 블랙", name: "classic black", hex: "#000000" },
  { id: "deep-blue", label: "딥 블루", name: "deep blue", hex: "#00008B" },
  { id: "midnight-navy", label: "미드나잇 네이비", name: "midnight navy", hex: "#000033" },
  { id: "burgundy", label: "버건디", name: "burgundy wine", hex: "#800020" },
  { id: "emerald", label: "에메랄드", name: "emerald green", hex: "#009B77" },
  { id: "forest-green", label: "포레스트 그린", name: "forest green", hex: "#228B22" },
  { id: "royal-purple", label: "로열 퍼플", name: "royal purple", hex: "#7851A9" },
  { id: "golden-ochre", label: "골든 오커", name: "golden ochre", hex: "#C68D3C" },
  { id: "crimson", label: "크림슨 레드", name: "crimson red", hex: "#990000" },
  { id: "teal", label: "틸", name: "teal", hex: "#008080" },
];

export const ASPECTS: AspectOption[] = [
  { value: "1:1", label: "정사각형", desc: "1:1 프로필·인스타", extended: false },
  { value: "3:4", label: "인물 세로", desc: "3:4 스튜디오 인물·증명사진", extended: false },
  { value: "4:3", label: "가로 표준", desc: "4:3 클래식", extended: false },
  { value: "9:16", label: "스마트폰 세로", desc: "9:16 릴스·스토리", extended: false },
  { value: "16:9", label: "시네마틱 가로", desc: "16:9 와이드", extended: false },
  { value: "1:4", label: "울트라 세로", desc: "1:4 북마크", extended: true },
  { value: "4:1", label: "파노라마 가로", desc: "4:1 헤더", extended: true },
  { value: "1:8", label: "슈퍼 톨", desc: "1:8 초세로", extended: true },
  { value: "8:1", label: "울트라 파노라마", desc: "8:1 초광각", extended: true },
];

export const RESOLUTIONS: Resolution[] = ["1K", "2K", "4K"];

export const RETOUCH_KEYS = ["mouth", "shoulder", "hair", "axis"] as const;
export type RetouchKey = (typeof RETOUCH_KEYS)[number];
export type Retouch = Record<RetouchKey, boolean>;

export const RETOUCH: { key: RetouchKey; label: string; desc: string; fragment: string }[] = [
  { key: "mouth", label: "입꼬리·입술 균형", desc: "삐뚤어진 입꼬리를 자연스러운 수평으로 맞춥니다.", fragment: "Gently balance an uneven mouth line or lip corners into a relaxed, natural horizontal alignment without looking forced." },
  { key: "shoulder", label: "어깨 수평·자세", desc: "짝어깨와 처진 어깨를 수평으로 맞춥니다.", fragment: "Level uneven or slouched shoulders to a balanced horizontal line and give an upright, poised posture." },
  { key: "hair", label: "잔머리·헝클어진 머리", desc: "뻗친 잔머리를 깔끔하게 정돈합니다.", fragment: "Tidy stray flyaway hairs around the crown, temples and ears while keeping the real haircut, texture and volume." },
  { key: "axis", label: "얼굴 중심축·눈높이", desc: "기울어진 고개와 눈높이를 바로잡습니다.", fragment: "Correct a slight head tilt so the facial midline is upright and both pupils sit on a horizontal line." },
];

export const ALL_RETOUCH: Retouch = { mouth: true, shoulder: true, hair: true, axis: true };
export const NO_RETOUCH: Retouch = { mouth: false, shoulder: false, hair: false, axis: false };

export function byId<T extends { id: string }>(list: T[], id: string): T | undefined {
  return list.find((x) => x.id === id);
}
