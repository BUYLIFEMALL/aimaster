// 화면 문구(한국어·English·日本語). 번역은 화면 표시용이며 사이드바 등 플랫폼 공통 메뉴는 한국어로 유지한다.
export type Lang = "ko" | "en" | "ja";
export const LANGS: Lang[] = ["ko", "en", "ja"];
export const LANG_STORAGE_KEY = "image_convert_studio_lang";

const ko = {
  tagline: "이미지 변환 · 업스케일 · 콜라주 · WebP/PNG/JPEG/AVIF 일괄 처리",
  help: "사용 안내",
  privacy: "모든 처리는 이 브라우저 안에서만 이뤄지며 이미지가 서버로 전송되지 않습니다.",
  dropzone: { convert: "이미지를 드래그하거나 클릭하여 선택하세요", collage: "콜라주에 사용할 이미지를 추가하세요", sub: "JPG, PNG, WebP, GIF, BMP, AVIF 등 지원", tooMany: "한 번에 최대 {max}장까지 올릴 수 있습니다. 처음 {n}장만 추가했습니다.", many: "{n}장이 넘으면 브라우저 메모리 부담이 커집니다. 나눠서 처리하는 것을 권장합니다." },
  convert: {
    options: "변환 옵션", format: "출력 형식", quality: "품질", qualityPng: "PNG는 무손실이라 품질을 쓰지 않습니다", scale: "업스케일 배율",
    scaleHalf: "0.5× (축소)", scaleOne: "1× (원본)", scaleOneHalf: "1.5×", scaleTwo: "2×", scaleThree: "3×", scaleFour: "4×",
    filter: "리샘플링 필터", sharpen: "선명도 보정", sizeLimit: "크기 제한", maxW: "최대 너비 (px)", maxH: "최대 높이 (px)",
    total: "총 {n}장", selected: "선택 {n}", done: "완료 {n}", selectAll: "모두 선택", deselectAll: "선택 해제", clearAll: "전체 삭제",
    convertSelected: "선택 {n}장 변환", converting: "변환 중...", zip: "ZIP 다운로드", one: "변환", save: "저장", error: "오류", empty: "이미지를 추가하면 여기에 목록이 나타납니다.",
    saved: "{p}% 절약", bigger: "{p}% 증가", outTooLarge: "출력 크기가 너무 큽니다",
  },
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
    introBody: "여러 이미지를 한 번에 WebP · PNG · JPEG · AVIF로 변환하고, Lanczos 계열 보간으로 확대·축소하며, 여러 장을 한 장의 콜라주로 합칩니다. 모든 처리는 브라우저 안에서 이뤄집니다.",
    introNote: "이미지는 서버로 전송되지 않고, 다운로드하기 전까지 어떤 파일도 저장되지 않습니다. 원본은 그대로 보존됩니다.",
    convertHeading: "1. 변환 사용법",
    convertSteps: [
      "이미지 추가 — 점선 영역을 클릭하거나 파일을 끌어다 놓습니다. 여러 장을 한 번에 올릴 수 있습니다.",
      "출력 형식 — WebP(권장), PNG(무손실), JPEG(호환성 최고), AVIF(최신·고압축).",
      "품질 — 0.1~1.0. PNG는 무손실이라 사용하지 않습니다. WebP·JPEG는 0.85~0.95가 보통의 균형점입니다.",
      "업스케일 배율 — 0.5×(축소)~4×(확대). 배율을 바꾸면 리샘플링 필터를 고를 수 있습니다.",
      "리샘플링 필터 — Lanczos3(기본·선명), Lanczos2(부드러움), MKS2013(최고 품질), Mitchell(사진), Hamming·Box(빠름).",
      "선명도 보정 — 확대(1× 초과)할 때 쓰는 언샵 마스크 강도입니다. 80~150이 자연스럽습니다.",
      "크기 제한 — 최대 너비·높이를 정해 큰 이미지를 줄입니다.",
      "변환 — 카드의 [변환] 버튼으로 한 장씩, 또는 체크한 여러 장을 [선택 N장 변환]으로 한꺼번에 처리합니다.",
      "저장 — 카드의 [저장] 또는 [ZIP 다운로드]로 완료된 결과를 받습니다.",
    ],
    collageHeading: "2. 콜라주 사용법",
    collageSteps: [
      "이미지 추가 — 끌어다 놓거나 클릭해서 올립니다.",
      "레이아웃 — 격자(열 수 지정), 가로(한 줄), 세로(한 열).",
      "셀 크기 — 칸 하나의 가로·세로(px). 큰 결과가 필요하면 값을 올리세요(예: 800×800).",
      "간격 · 여백 — 사진 사이 공백과 바깥 테두리 여백.",
      "배경색 — 간격·여백·남는 부분에 칠해집니다.",
      "맞춤 — cover(칸을 꽉 채움, 일부 잘림) 또는 contain(전체 표시, 여백 생김).",
      "순서 · 삭제 — 썸네일의 ◀ ▶로 순서를 바꾸고 ✕로 뺍니다.",
      "[콜라주 만들기] → 미리보기 확인 → [다운로드].",
    ],
    tipsHeading: "실전 팁",
    tips: ["웹용 최적화: WebP · 품질 0.85 · 최대 너비 1920px", "아이콘·로고: PNG(무손실) 또는 WebP 품질 1.0", "사진 확대: 2× + Lanczos3 + 선명도 100 정도가 자연스럽습니다", "호환성 최우선: JPEG", "최소 용량: AVIF(최신 브라우저 필요)", "100장이 넘으면 나눠서 처리하는 것을 권장합니다"],
    notesHeading: "알아두세요",
    notes: ["AI 업스케일이 아닙니다 — 수학적 보간(Lanczos)이라 없던 디테일을 만들지는 않습니다.", "AVIF 저장은 최신 Chrome·Edge·Firefox에서만 동작합니다.", "투명 배경은 PNG·WebP·AVIF에서 유지됩니다. JPEG는 투명을 지원하지 않아 흰색으로 채워집니다.", "한 변 16384px 또는 약 1억 2천만 화소를 넘는 결과는 만들 수 없습니다."],
  },
};

type Dict = typeof ko;

const en: Dict = {
  tagline: "Image convert · upscale · collage · batch WebP/PNG/JPEG/AVIF",
  help: "Guide",
  privacy: "Everything runs inside this browser. Your images are never sent to a server.",
  dropzone: { convert: "Drag images here or click to choose", collage: "Add images for the collage", sub: "JPG, PNG, WebP, GIF, BMP, AVIF and more", tooMany: "Up to {max} images at a time. Only the first {n} were added.", many: "More than {n} images can strain browser memory. Consider processing in batches." },
  convert: {
    options: "Conversion options", format: "Output format", quality: "Quality", qualityPng: "PNG is lossless, so quality is not used", scale: "Upscale factor",
    scaleHalf: "0.5× (shrink)", scaleOne: "1× (original)", scaleOneHalf: "1.5×", scaleTwo: "2×", scaleThree: "3×", scaleFour: "4×",
    filter: "Resampling filter", sharpen: "Sharpening", sizeLimit: "Limit size", maxW: "Max width (px)", maxH: "Max height (px)",
    total: "{n} total", selected: "{n} selected", done: "{n} done", selectAll: "Select all", deselectAll: "Deselect", clearAll: "Clear all",
    convertSelected: "Convert {n} selected", converting: "Converting...", zip: "Download ZIP", one: "Convert", save: "Save", error: "Error", empty: "Added images will be listed here.",
    saved: "{p}% smaller", bigger: "{p}% larger", outTooLarge: "Output size is too large",
  },
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

const ja: Dict = {
  tagline: "画像変換 · アップスケール · コラージュ · WebP/PNG/JPEG/AVIF 一括処理",
  help: "使い方",
  privacy: "すべての処理はこのブラウザ内で行われ、画像がサーバーに送信されることはありません。",
  dropzone: { convert: "画像をドラッグするかクリックして選択してください", collage: "コラージュに使う画像を追加してください", sub: "JPG, PNG, WebP, GIF, BMP, AVIF などに対応", tooMany: "一度に最大 {max} 枚までです。最初の {n} 枚のみ追加しました。", many: "{n} 枚を超えるとブラウザのメモリ負荷が大きくなります。分けて処理することをおすすめします。" },
  convert: {
    options: "変換オプション", format: "出力形式", quality: "品質", qualityPng: "PNG は可逆圧縮のため品質は使いません", scale: "アップスケール倍率",
    scaleHalf: "0.5× (縮小)", scaleOne: "1× (原寸)", scaleOneHalf: "1.5×", scaleTwo: "2×", scaleThree: "3×", scaleFour: "4×",
    filter: "リサンプリングフィルター", sharpen: "シャープネス", sizeLimit: "サイズ制限", maxW: "最大幅 (px)", maxH: "最大高さ (px)",
    total: "全 {n} 枚", selected: "選択 {n}", done: "完了 {n}", selectAll: "すべて選択", deselectAll: "選択解除", clearAll: "すべて削除",
    convertSelected: "選択した {n} 枚を変換", converting: "変換中...", zip: "ZIP ダウンロード", one: "変換", save: "保存", error: "エラー", empty: "画像を追加するとここに一覧が表示されます。",
    saved: "{p}% 削減", bigger: "{p}% 増加", outTooLarge: "出力サイズが大きすぎます",
  },
  filters: { lanczos3: "Lanczos3 (シャープ, 既定)", lanczos2: "Lanczos2 (やや柔らかい)", mks2013: "MKS2013 (最高品質)", mitchell: "Mitchell (柔らかい)", hamming: "Hamming (高速)", box: "Box (最速)" },
  collage: {
    options: "コラージュ設定", layout: "レイアウト", grid: "グリッド", horizontal: "横", vertical: "縦", columns: "列数", cellW: "セル幅 (px)", cellH: "セル高さ (px)",
    gap: "間隔", padding: "余白", bg: "背景色", fit: "フィット", cover: "塗りつぶし (cover)", contain: "全体表示 (contain)", format: "出力形式", quality: "品質",
    make: "コラージュを作成", making: "作成中...", download: "ダウンロード", clearAll: "すべて削除", order: "画像の順序 ({n} 枚)", preview: "プレビュー",
    previewEmpty: "画像を追加して「コラージュを作成」を押してください。", error: "コラージュの作成中にエラーが発生しました", size: "結果 {w}×{h}px · {s}", moveLeft: "前へ", moveRight: "後ろへ", remove: "削除",
  },
  guide: {
    title: "使い方",
    introHeading: "このツールでできること",
    introBody: "複数の画像を WebP・PNG・JPEG・AVIF にまとめて変換し、Lanczos 系の補間で拡大・縮小し、複数枚を 1 枚のコラージュにまとめます。処理はすべてブラウザ内で行われます。",
    introNote: "画像はアップロードされず、ダウンロードするまで何も保存されません。元の画像はそのまま残ります。",
    convertHeading: "1. 変換",
    convertSteps: [
      "画像を追加 — 点線の枠をクリックするか、ファイルをドロップします。複数枚を同時に追加できます。",
      "出力形式 — WebP(推奨)、PNG(可逆)、JPEG(互換性最高)、AVIF(最新・高圧縮)。",
      "品質 — 0.1〜1.0。PNG では使いません。WebP・JPEG は 0.85〜0.95 が一般的です。",
      "アップスケール倍率 — 0.5×(縮小)〜4×(拡大)。倍率を変えるとフィルターを選べます。",
      "フィルター — Lanczos3(既定・シャープ)、Lanczos2(柔らかい)、MKS2013(最高品質)、Mitchell(写真)、Hamming/Box(高速)。",
      "シャープネス — 拡大(1× 超)時のアンシャープマスク強度。80〜150 が自然です。",
      "サイズ制限 — 最大幅・高さを指定して大きな画像を縮小します。",
      "変換 — カードの [変換] で 1 枚ずつ、またはチェックした複数枚を [選択した N 枚を変換] で一括処理します。",
      "保存 — カードの [保存] または [ZIP ダウンロード] で完了分を取得します。",
    ],
    collageHeading: "2. コラージュ",
    collageSteps: [
      "画像を追加 — ドロップまたはクリックでアップロード。",
      "レイアウト — グリッド(列数指定)、横(1 行)、縦(1 列)。",
      "セルサイズ — 1 マスの幅・高さ (px)。大きな結果が必要なら値を上げます(例: 800×800)。",
      "間隔・余白 — 写真の間と外周の余白。",
      "背景色 — 間隔・余白・余った部分に塗られます。",
      "フィット — cover(マスを埋める、一部切れる)または contain(全体表示、余白あり)。",
      "順序・削除 — サムネイルの ◀ ▶ で並べ替え、✕ で削除します。",
      "[コラージュを作成] → プレビュー確認 → [ダウンロード]。",
    ],
    tipsHeading: "ヒント",
    tips: ["Web 用: WebP · 品質 0.85 · 最大幅 1920px", "アイコン・ロゴ: PNG(可逆)または WebP 品質 1.0", "写真の拡大: 2× + Lanczos3 + シャープネス 100 前後が自然", "互換性重視: JPEG", "最小容量: AVIF(最新ブラウザが必要)", "100 枚を超える場合は分けて処理してください"],
    notesHeading: "ご注意",
    notes: ["AI アップスケールではありません — Lanczos 補間は存在しないディテールを作りません。", "AVIF 保存は最新の Chrome・Edge・Firefox でのみ動作します。", "透明は PNG・WebP・AVIF で保持されます。JPEG は透明に対応しないため白で塗りつぶされます。", "一辺 16384px または約 1 億 2 千万画素を超える結果は作成できません。"],
  },
};

export const DICTS: Record<Lang, Dict> = { ko, en, ja };
export const LANG_NAMES: Record<Lang, string> = { ko: "KO", en: "EN", ja: "JA" };

/** "{n}장" 같은 자리표시자를 값으로 바꾼다 */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_m, key: string) => (key in values ? String(values[key]) : `{${key}}`));
}

export type { Dict };
