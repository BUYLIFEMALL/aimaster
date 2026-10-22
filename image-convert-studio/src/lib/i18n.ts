// 화면 문구(한국어·English). 번역은 화면 표시용이며 사이드바 등 플랫폼 공통 메뉴는 한국어로 유지한다.
export type Lang = "ko" | "en";
export const LANGS: Lang[] = ["ko", "en"];
export const LANG_STORAGE_KEY = "image_convert_studio_lang";

const ko = {
  tagline: "이미지 변환 · 업스케일 · 콜라주 · WebP/PNG/JPEG/AVIF 일괄 처리",
  help: "사용 안내",
  privacy: "모든 처리는 이 브라우저 안에서만 이뤄지며 이미지가 서버로 전송되지 않습니다.",
  dropzone: { convert: "이미지를 드래그하거나 클릭하여 선택하세요", collage: "콜라주에 사용할 이미지를 추가하세요", sub: "JPG, PNG, WebP, GIF, BMP, AVIF 등 지원", tooMany: "한 번에 최대 {max}장까지 올릴 수 있습니다. 처음 {n}장만 추가했습니다.", many: "{n}장이 넘으면 브라우저 메모리 부담이 커집니다. 나눠서 처리하는 것을 권장합니다.", unreadable: "사진을 읽지 못해 {n}장을 뺐어요(파일이 깨졌거나 사진 파일이 아닐 수 있어요): {names}" },
  convert: {
    options: "변환 옵션", format: "출력 형식", quality: "품질", qualityPng: "PNG는 무손실이라 품질을 쓰지 않습니다", scale: "업스케일 배율",
    scaleHalf: "0.5× (축소)", scaleOne: "1× (원본)", scaleOneHalf: "1.5×", scaleTwo: "2×", scaleThree: "3×", scaleFour: "4×",
    filter: "리샘플링 필터", sharpen: "선명도 보정", sizeLimit: "크기 제한", maxW: "최대 너비 (px)", maxH: "최대 높이 (px)",
    preset: "게시처 규격", presetNone: "직접 설정", presetNote: "고른 규격의 비율로 가운데를 자르고 정확한 크기로 맞춥니다(배율·크기 제한 대신).", rotate: "회전", rotLeft: "왼쪽 90°", rotRight: "오른쪽 90°", rot180: "180°", flip: "반전", flipH: "좌우", flipV: "상하", crop: "비율 자르기", cropOriginal: "원본", transformReset: "초기화", cropPos: "자를 위치", cropPosHint: "보라색 틀을 끌어 남길 부분을 고르세요. 그림마다 따로 저장됩니다.", cropCenter: "가운데로", cropDone: "완료", cropZoom: "확대(틀 크기)", compare: "⇆ 전후 비교", compareTitle: "전후 비교", compareBefore: "원본", compareAfter: "변환 결과", compareDiff: "색 차이", compareHint: "틀을 누르거나 끌면 선과 동그라미가 그 자리로 옵니다. 동그라미 자리의 두 색을 비교하세요(←/→ 좌우, ↑/↓ 위아래).", compareGeomNote: "회전·반전·자르기·규격을 바꾼 결과는 원본과 같은 자리가 어긋날 수 있습니다(품질·필터 비교에 알맞음).", comparePosition: "원본과 변환 결과 비교 위치", close: "닫기", comparePrev: "‹ 이전 그림", compareNext: "다음 그림 ›",
    total: "총 {n}장", selected: "선택 {n}", done: "완료 {n}", selectAll: "모두 선택", deselectAll: "선택 해제", clearAll: "전체 삭제",
    convertSelected: "선택 {n}장 변환", converting: "변환 중...", zip: "ZIP 다운로드", one: "변환", save: "저장", error: "오류", empty: "이미지를 추가하면 여기에 목록이 나타납니다.",
    saved: "{p}% 절약", bigger: "{p}% 증가", outTooLarge: "출력 크기가 너무 큽니다",
  },
  presets: { "insta-feed": "인스타 피드 1:1 (1080×1080)", "insta-portrait": "인스타 세로 4:5 (1080×1350)", story: "스토리·릴스 9:16 (1080×1920)", "youtube-thumb": "유튜브 썸네일 16:9 (1280×720)", "share-og": "블로그·카톡 공유 (1200×630)", "store-product": "스마트스토어 상품 1:1 (1000×1000)" } as Record<string, string>,
  filters: { lanczos3: "Lanczos3 (선명, 기본)", lanczos2: "Lanczos2 (약간 부드러움)", mks2013: "MKS2013 (최고 품질)", mitchell: "Mitchell (부드러움)", hamming: "Hamming (빠름)", box: "Box (가장 빠름)" },
  collage: {
    options: "콜라주 설정", layout: "레이아웃", grid: "격자", horizontal: "가로", vertical: "세로", columns: "열 수", cellW: "셀 너비 (px)", cellH: "셀 높이 (px)",
    gap: "간격", padding: "여백", bg: "배경색", fit: "맞춤", cover: "채우기 (cover)", contain: "맞추기 (contain)", format: "출력 형식", quality: "품질",
    make: "콜라주 만들기", making: "생성 중...", download: "다운로드", clearAll: "전체 삭제", order: "이미지 순서 ({n}장)", preview: "미리보기",
    previewEmpty: "이미지를 추가하고 \"콜라주 만들기\"를 눌러주세요.", error: "콜라주 생성 중 오류가 발생했습니다", size: "결과 크기 {w}×{h}px · {s}", moveLeft: "앞으로", moveRight: "뒤로", remove: "삭제",
  },
  guide: {
    title: "사용 안내",
    introHeading: "이 프로그램이 하는 일",
    introBody: "여러 이미지를 한 번에 WebP · PNG · JPEG · AVIF로 변환하고, Lanczos 기반 고품질 업스케일과 자유로운 콜라주까지 브라우저 안에서 처리합니다.",
    introNote: "모든 처리는 브라우저에서만 이뤄지며, 이미지가 서버로 전송되지 않습니다. (프라이버시 안전)",
    convertHeading: "1. 변환 탭 사용법",
    convertSteps: [
      "이미지 추가 — 점선 영역을 클릭하거나 파일을 드래그 앤 드롭으로 올립니다. 여러 장 동시 선택이 가능합니다.",
      "출력 형식 선택 — WebP(권장), PNG(무손실), JPEG(호환성 최고), AVIF(최신·고압축).",
      "품질 조절 — 0.1~1.0 슬라이더. PNG는 무손실이라 비활성화됩니다. WebP/JPEG는 0.85~0.95가 일반적인 균형점입니다.",
      "업스케일 배율 — 0.5×(축소) ~ 4×(확대) 선택. 선택하면 리샘플링 필터가 자동으로 표시됩니다.",
      "리샘플링 필터 — Lanczos3(기본, 선명), Lanczos2(부드러움), MKS2013(최고 품질), Mitchell(사진), Hamming/Box(빠름).",
      "선명도 보정 — 업스케일(1× 초과) 시 표시되는 언샵 마스크 강도입니다. 80~150이 자연스럽습니다.",
      "크기 제한 — 체크하면 최대 너비/높이를 지정합니다. 큰 이미지를 강제로 줄일 때 사용합니다.",
      "개별 변환 — 썸네일의 [변환] 버튼으로 한 장씩 처리합니다.",
      "일괄 변환 — 썸네일 좌상단 체크박스로 여러 장을 선택한 뒤 [선택 N장 변환]을 클릭합니다.",
      "다운로드 — 개별 [저장] 버튼, 또는 [ZIP 다운로드]로 변환된 결과를 한 번에 받습니다.",
    ],
    collageHeading: "2. 콜라주 탭 사용법",
    collageSteps: [
      "이미지 추가 — 드래그 앤 드롭 또는 클릭 업로드.",
      "레이아웃 선택 — 격자(열 수 지정), 가로(한 줄), 세로(스택).",
      "셀 크기 — 각 칸의 가로·세로 픽셀. 큰 최종 이미지를 원하면 값을 올리세요 (예: 800×800).",
      "간격 / 여백 — 사진 사이 공백, 전체 테두리 여백.",
      "배경색 — 컬러피커로 선택합니다. 여백과 투명 부분에 적용됩니다.",
      "맞춤 모드 — cover(셀 꽉 채움, 잘림) 또는 contain(전체 표시, 여백).",
      "순서 변경 — 썸네일의 ◀ ▶ 버튼으로 순서를 조정하고, ✕로 제거합니다.",
      "출력 형식·품질 — 변환 탭과 동일하게 선택합니다.",
      "[콜라주 만들기]를 클릭 → 미리보기 확인 → [다운로드].",
    ],
    tipsHeading: "실전 팁",
    tips: ["웹용 최적화: WebP · 품질 0.85 · 최대 너비 1920px", "아이콘·로고: PNG(무손실) 또는 WebP 품질 1.0", "사진 업스케일: 2× + Lanczos3 + 선명도 100 정도가 자연스럽습니다", "호환성 최우선: JPEG (모든 환경에서 열림)", "최소 용량: AVIF (최신 브라우저 필요)", "대량 처리: 100장을 넘기면 메모리 부담이 커지니 나눠서 처리하는 것을 권장합니다"],
    notesHeading: "알아두세요",
    notes: ["AI 업스케일이 아닙니다 — 수학적 보간(Lanczos)이므로 없던 디테일을 만들지는 않습니다.", "AVIF 인코딩은 Chrome/Edge/Firefox 최신 버전에서만 동작합니다.", "투명 배경은 PNG·WebP·AVIF에서 유지되며, JPEG는 투명을 지원하지 않아 흰색으로 채워집니다.", "원본은 보존되며, 다운로드 전까지 어떤 파일도 서버에 저장되지 않습니다."],
  },
};

type Dict = typeof ko;

const en: Dict = {
  tagline: "Image convert · upscale · collage · batch WebP/PNG/JPEG/AVIF",
  help: "Guide",
  privacy: "Everything runs inside this browser. Your images are never sent to a server.",
  dropzone: { convert: "Drag images here or click to choose", collage: "Add images for the collage", sub: "JPG, PNG, WebP, GIF, BMP, AVIF and more", tooMany: "Up to {max} images at a time. Only the first {n} were added.", many: "More than {n} images can strain browser memory. Consider processing in batches.", unreadable: "Could not read {n} image(s), so they were skipped (the file may be damaged or not an image): {names}" },
  convert: {
    options: "Conversion options", format: "Output format", quality: "Quality", qualityPng: "PNG is lossless, so quality is not used", scale: "Upscale factor",
    scaleHalf: "0.5× (shrink)", scaleOne: "1× (original)", scaleOneHalf: "1.5×", scaleTwo: "2×", scaleThree: "3×", scaleFour: "4×",
    filter: "Resampling filter", sharpen: "Sharpening", sizeLimit: "Limit size", maxW: "Max width (px)", maxH: "Max height (px)",
    preset: "Platform size", presetNone: "Custom", presetNote: "Center-crops to the preset ratio and resizes to the exact size (instead of scale/size limit).", rotate: "Rotate", rotLeft: "Left 90°", rotRight: "Right 90°", rot180: "180°", flip: "Flip", flipH: "Horizontal", flipV: "Vertical", crop: "Crop ratio", cropOriginal: "Original", transformReset: "Reset", cropPos: "Crop position", cropPosHint: "Drag the purple frame to choose what to keep. Saved per image.", cropCenter: "Center", cropDone: "Done", cropZoom: "Zoom (frame size)", compare: "⇆ Compare", compareTitle: "Before / after", compareBefore: "Original", compareAfter: "Converted", compareDiff: "Color diff", compareHint: "Click or drag in the frame to move the line and dot. Compare the two colors at the dot (←/→ horizontal, ↑/↓ vertical).", compareGeomNote: "Rotated, flipped, cropped or resized results may not line up with the original (best for quality/filter checks).", comparePosition: "Original vs converted compare position", close: "Close", comparePrev: "‹ Previous", compareNext: "Next ›",
    total: "{n} total", selected: "{n} selected", done: "{n} done", selectAll: "Select all", deselectAll: "Deselect", clearAll: "Clear all",
    convertSelected: "Convert {n} selected", converting: "Converting...", zip: "Download ZIP", one: "Convert", save: "Save", error: "Error", empty: "Added images will be listed here.",
    saved: "{p}% smaller", bigger: "{p}% larger", outTooLarge: "Output size is too large",
  },
  presets: { "insta-feed": "Instagram feed 1:1 (1080×1080)", "insta-portrait": "Instagram portrait 4:5 (1080×1350)", story: "Story/Reels 9:16 (1080×1920)", "youtube-thumb": "YouTube thumbnail 16:9 (1280×720)", "share-og": "Blog/link share (1200×630)", "store-product": "Store product 1:1 (1000×1000)" },
  filters: { lanczos3: "Lanczos3 (sharp, default)", lanczos2: "Lanczos2 (slightly softer)", mks2013: "MKS2013 (best quality)", mitchell: "Mitchell (soft)", hamming: "Hamming (fast)", box: "Box (fastest)" },
  collage: {
    options: "Collage settings", layout: "Layout", grid: "Grid", horizontal: "Horizontal", vertical: "Vertical", columns: "Columns", cellW: "Cell width (px)", cellH: "Cell height (px)",
    gap: "Gap", padding: "Padding", bg: "Background", fit: "Fit", cover: "Fill (cover)", contain: "Fit inside (contain)", format: "Output format", quality: "Quality",
    make: "Make collage", making: "Working...", download: "Download", clearAll: "Clear all", order: "Image order ({n})", preview: "Preview",
    previewEmpty: "Add images and press \"Make collage\".", error: "Failed to create the collage", size: "Result {w}×{h}px · {s}", moveLeft: "Move earlier", moveRight: "Move later", remove: "Remove",
  },
  guide: {
    title: "Guide",
    introHeading: "What this tool does",
    introBody: "Convert many images to WebP, PNG, JPEG or AVIF at once, enlarge or shrink them with Lanczos-family resampling, and combine several into one collage. Everything is processed in your browser.",
    introNote: "Images are never uploaded and nothing is stored before you download. Your originals stay untouched.",
    convertHeading: "1. Convert",
    convertSteps: [
      "Add images — click the dashed area or drop files. Several at once is fine.",
      "Output format — WebP (recommended), PNG (lossless), JPEG (most compatible), AVIF (newest, smallest).",
      "Quality — 0.1 to 1.0. Not used for PNG. 0.85–0.95 is a common balance for WebP/JPEG.",
      "Upscale factor — 0.5× (shrink) to 4× (enlarge). Changing it lets you pick a resampling filter.",
      "Resampling filter — Lanczos3 (default, sharp), Lanczos2 (softer), MKS2013 (best), Mitchell (photos), Hamming/Box (fast).",
      "Sharpening — unsharp-mask strength used when enlarging (above 1×). 80–150 looks natural.",
      "Limit size — set a max width/height to shrink large images.",
      "Convert — use a card's [Convert] button, or check several and press [Convert N selected].",
      "Save — [Save] on a card, or [Download ZIP] for everything finished.",
    ],
    collageHeading: "2. Collage",
    collageSteps: [
      "Add images — drop or click to upload.",
      "Layout — grid (set columns), horizontal (one row), vertical (one column).",
      "Cell size — width and height of each cell (px). Raise them for a bigger result (e.g. 800×800).",
      "Gap · padding — space between photos and around the edge.",
      "Background — fills gaps, padding and unused areas.",
      "Fit — cover (fills the cell, may crop) or contain (shows everything, may leave margins).",
      "Order · remove — use ◀ ▶ on a thumbnail to reorder and ✕ to remove.",
      "Press [Make collage] → check the preview → [Download].",
    ],
    tipsHeading: "Tips",
    tips: ["For the web: WebP · quality 0.85 · max width 1920px", "Icons and logos: PNG (lossless) or WebP at quality 1.0", "Enlarging photos: 2× + Lanczos3 + sharpening ~100 looks natural", "Maximum compatibility: JPEG", "Smallest files: AVIF (needs a recent browser)", "Above 100 images, process in batches"],
    notesHeading: "Good to know",
    notes: ["This is not AI upscaling — Lanczos interpolation cannot invent missing detail.", "Saving as AVIF works only in recent Chrome, Edge and Firefox.", "Transparency is kept for PNG, WebP and AVIF. JPEG has none, so it is filled with white.", "Results over 16384px on a side or about 120 megapixels cannot be created."],
  },
};

export const DICTS: Record<Lang, Dict> = { ko, en };
export const LANG_NAMES: Record<Lang, string> = { ko: "KO", en: "EN" };

/** "{n}장" 같은 자리표시자를 값으로 바꾼다 */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_m, key: string) => (key in values ? String(values[key]) : `{${key}}`));
}

export type { Dict };
