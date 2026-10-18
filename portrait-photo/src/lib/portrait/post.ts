// 생성 결과 후처리의 순수 계산(캔버스 없이 테스트 가능). 실제 그리기는 canvas.ts(클라이언트)가 한다.

export interface WhitenResult { changed: number; ratio: number }

/**
 * 가장자리에서 시작해 밝고 채도가 낮은 픽셀로 이어진 영역(= 배경)만 순백(255,255,255)으로 칠한다.
 * 안쪽의 밝은 옷·피부는 가장자리와 이어지지 않으면 건드리지 않는다.
 * data는 RGBA(Uint8ClampedArray)이며 제자리에서 바뀐다.
 */
export function whitenBackground(data: Uint8ClampedArray, width: number, height: number, threshold = 205, maxSat = 0.35): WhitenResult {
  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const isBg = (idx: number): boolean => {
    const o = idx * 4;
    const r = data[o], g = data[o + 1], b = data[o + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    const max = Math.max(r, g, b);
    const sat = max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
    return luma >= threshold && sat <= maxSat;
  };
  const push = (idx: number) => {
    if (!visited[idx] && isBg(idx)) { visited[idx] = 1; queue[tail++] = idx; }
  };

  for (let x = 0; x < width; x++) { push(x); push((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { push(y * width); push(y * width + width - 1); }

  while (head < tail) {
    const cur = queue[head++];
    const cx = cur % width;
    const cy = (cur - cx) / width;
    if (cx > 0) push(cur - 1);
    if (cx < width - 1) push(cur + 1);
    if (cy > 0) push(cur - width);
    if (cy < height - 1) push(cur + width);
  }

  for (let i = 0; i < tail; i++) {
    const o = queue[i] * 4;
    data[o] = 255; data[o + 1] = 255; data[o + 2] = 255; data[o + 3] = 255;
  }
  return { changed: tail, ratio: total ? tail / total : 0 };
}

export interface CropRect { sx: number; sy: number; sw: number; sh: number }

/** 목표 비율로 꽉 채우도록 자를 영역(가로가 넓으면 좌우를, 세로가 길면 아래쪽을 더 잘라 머리 여백을 지킨다) */
export function coverCrop(srcW: number, srcH: number, targetW: number, targetH: number, topBias = 0.15): CropRect {
  const tr = targetW / targetH;
  const sr = srcW / srcH;
  if (sr > tr) {
    const sw = Math.round(srcH * tr);
    return { sx: Math.round((srcW - sw) / 2), sy: 0, sw, sh: srcH };
  }
  const sh = Math.round(srcW / tr);
  return { sx: 0, sy: Math.round((srcH - sh) * topBias), sw: srcW, sh };
}

/** 긴 변이 maxEdge를 넘지 않게 줄인 크기(확대는 하지 않는다) */
export function fitWithin(w: number, h: number, maxEdge: number): { width: number; height: number } {
  const longest = Math.max(w, h);
  if (longest <= maxEdge) return { width: w, height: h };
  const k = maxEdge / longest;
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
}

/** 해상도 이름 → 다운로드 긴 변(px) */
export function edgeFor(resolution: "1K" | "2K" | "4K"): number {
  return resolution === "1K" ? 1024 : resolution === "2K" ? 2048 : 4096;
}

/** 밝기·노출·대비(−50~50)를 CSS/canvas filter 문자열로 */
export function toneFilter(brightness: number, exposure: number, contrast: number): string {
  const clamp = (n: number) => Math.max(-50, Math.min(50, Number.isFinite(n) ? n : 0));
  return `brightness(${(100 + clamp(brightness) + clamp(exposure)) / 100}) contrast(${(100 + clamp(contrast)) / 100})`;
}

export const LICENSE = { width: 413, height: 531, maxBytes: 250 * 1024 } as const;

export interface SizePreset {
  id: string; label: string; width: number; height: number; maxBytes: number; note: string;
  /** 최소 용량(공식 안내에 있는 경우) */
  minBytes?: number;
  /** 저장 후 함께 보여 줄 주의 문구 */
  caution?: string;
  /** 공식 안내의 머리 높이(정수리~턱)가 사진 전체 높이에서 차지하는 비율 범위(0~1) */
  headRange?: [number, number];
  /** headRange의 출처(공식 사이트) */
  headSource?: string;
}

/** 자주 쓰는 증명사진 규격(300dpi 환산 픽셀). 제출 기관의 요구 사항이 우선이므로 통과를 보장하지 않는다. */
export const SIZE_PRESETS: SizePreset[] = [
  {
    id: "passport", label: "여권·주민등록증·운전면허·일본 여권 (3.5×4.5cm)", width: 413, height: 531, maxBytes: 250 * 1024, note: "413×531px(여권 온라인 허용 395~431×507~550) · 250KB 이하(공식 500KB 이하)",
    headRange: [32 / 45, 36 / 45], headSource: "외교부 여권안내 passport.go.kr(머리 3.2~3.6cm / 사진 4.5cm)",
    caution: "외교부 여권안내는 AI로 편집·가공·합성·생성한 사진을 허용하지 않으며 흰색 의상도 금지합니다. 행정안전부 주민등록증 안내도 보정·변형·스티커·복사 사진을 사용할 수 없다고 합니다. 이 파일은 크기 참고용입니다. 여권·주민등록증 신청에는 실제 촬영한 사진을 쓰세요.",
  },
  { id: "resume", label: "이력서·반명함 증명사진 (3×4cm)", width: 354, height: 472, maxBytes: 250 * 1024, note: "354×472px · 250KB 이하" },
  { id: "china-visa", label: "중국 비자 (33×48mm, 자료 간 차이 있음)", width: 380, height: 553, maxBytes: 120 * 1024, note: "380×553px · 120KB 이하" },
  { id: "us-visa", label: "미국 비자·DV (travel.state.gov 안내, 정사각)", width: 600, height: 600, maxBytes: 240 * 1024, note: "600×600px · 240KB 이하",
    headRange: [0.5, 0.69], headSource: "travel.state.gov(머리가 사진 높이의 50~69%)" },
  {
    id: "canada-passport", label: "캐나다 여권 온라인 (canada.ca 안내)", width: 1200, height: 1800, maxBytes: 5 * 1024 * 1024, minBytes: 200 * 1024, note: "1200×1800px · 200KB~5MB",
    headRange: [0.45, 0.5], headSource: "canada.ca(턱~정수리가 사진 높이의 45~50%)",
    caution: "캐나다는 상업 사진사가 직접 촬영한 카메라 원본 파일만 인정한다고 안내합니다. 이 파일은 크기 참고용이며 AI로 만든 사진은 접수되지 않을 수 있습니다.",
  },
  {
    id: "uk-passport", label: "영국 여권 온라인 (gov.uk 안내)", width: 600, height: 750, maxBytes: 10 * 1024 * 1024, minBytes: 50 * 1024, note: "600×750px(최소) · 50KB~10MB",
    headRange: [29 / 45, 34 / 45], headSource: "gov.uk 인화 사진 안내(머리 29~34mm / 사진 45mm)",
    caution: "영국은 컴퓨터 소프트웨어로 변경하지 않은 사진만 받습니다. 이 파일은 크기 참고용이며 AI로 만든 사진은 접수되지 않을 수 있습니다.",
  },
  {
    id: "india-passport", label: "인도 여권 온라인 (passportindia.gov.in 안내)", width: 630, height: 810, maxBytes: 2 * 1024 * 1024, note: "630×810px (용량 기준 안내 없음)",
    caution: "인도 여권 안내는 컴퓨터 소프트웨어로 변경하지 않은 ICAO 규격 사진을 요구합니다. 이 파일은 크기 참고용이며 AI로 만든 사진은 접수되지 않을 수 있습니다.",
  },
  {
    id: "india-visa", label: "인도 비자 온라인 (indianvisaonline.gov.in 안내)", width: 600, height: 600, maxBytes: 300 * 1024, minBytes: 10 * 1024, note: "600×600px 정사각 · 10KB~300KB",
    caution: "인도 비자 사진은 JPEG이며 가로·세로가 같아야 합니다. 얼굴이 정면이고 변형 없는 최근 사진이 필요하니 제출 사이트의 안내를 확인해 주세요.",
  },
  {
    id: "us-passport", label: "미국 여권 온라인 갱신 (travel.state.gov 안내)", width: 1200, height: 1200, maxBytes: 10 * 1024 * 1024, minBytes: 54 * 1024, note: "1200×1200px 정사각 · 54KB~10MB",
    caution: "미국 여권 갱신 사진은 촬영 후 6개월 이내의 변형하지 않은 사진이어야 합니다. 이 파일은 크기 참고용이며 AI로 만든 사진은 접수되지 않을 수 있습니다.",
  },
  {
    id: "sg-passport", label: "싱가포르 여권·ICA 온라인 (ica.gov.sg 안내)", width: 400, height: 514, maxBytes: 150 * 1024, note: "400×514px · 150KB 이하(안내 간 차이로 보수적)",
    caution: "싱가포르 ICA는 사진을 변경·보정하지 않은 것을 요구합니다(크기 조정만 허용). 이 파일은 크기 참고용이며 AI로 만든 사진은 접수되지 않을 수 있습니다.",
  },
  {
    id: "vn-evisa", label: "베트남 전자비자 4×6cm (evisa.gov.vn 안내)", width: 472, height: 709, maxBytes: 50 * 1024, note: "472×709px(300dpi 환산) · 50KB 이하(안내 간 차이로 보수적)",
    caution: "베트남 전자비자 사진은 정면·안경 없음·흰 배경의 최근 사진이어야 하며 픽셀 기준은 안내되지 않아 300dpi로 환산했습니다. 제출 사이트의 안내를 확인해 주세요.",
  },
  {
    id: "hk-passport", label: "홍콩 여권 온라인 (immd.gov.hk 안내, 40×50mm)", width: 1280, height: 1600, maxBytes: 5 * 1024 * 1024, note: "1280×1600px(최소 1200×1600) · 5MB 이하",
    headRange: [32 / 50, 36 / 50], headSource: "immd.gov.hk(턱~정수리 32~36mm / 사진 50mm)",
    caution: "홍콩 출입국처는 규격에 맞지 않는 사진을 반려할 수 있습니다. 이 파일은 크기 참고용이며 AI로 만든 사진은 접수되지 않을 수 있습니다.",
  },
  {
    id: "nz-passport", label: "뉴질랜드 여권 온라인 (passports.govt.nz 안내)", width: 900, height: 1200, maxBytes: 5 * 1024 * 1024, minBytes: 250 * 1024, note: "900×1200px(3:4) · 250KB~5MB",
    caution: "뉴질랜드는 인화 사진 스캔본을 받지 않으며 6개월 이내 촬영한 사진을 요구합니다. 이 파일은 크기 참고용이며 AI로 만든 사진은 접수되지 않을 수 있습니다.",
  },
  {
    id: "tw-passport", label: "대만 여권 온라인 (boca.gov.tw 안내, 3.5×4.5cm)", width: 413, height: 531, maxBytes: 5 * 1024 * 1024, note: "413×531px(최소) · JPEG ≤5MB",
    headRange: [32 / 45, 36 / 45], headSource: "boca.gov.tw(머리 3.2~3.6cm / 사진 4.5cm)",
    caution: "대만 영사사무국은 수정·합성·좌우 반전(거울상) 사진을 받지 않으며 어길 경우 재신청·수수료 재납부가 필요합니다. 이 파일은 크기 참고용이며 AI로 만든 사진은 접수되지 않을 수 있습니다.",
  },
  {
    id: "id-evisa", label: "인도네시아 전자비자 4×6cm (evisa.imigrasi.go.id 안내)", width: 400, height: 600, maxBytes: 200 * 1024, note: "400×600px(최소) · 200KB 이하(안내 간 차이로 보수적, 포털 최대 2MB)",
    headRange: [0.5, 0.6], headSource: "evisa.imigrasi.go.id(머리카락 끝~턱이 사진 높이의 50~60%)",
    caution: "인도네시아 전자비자 사진은 최근의 정면·무표정·변형하지 않은 사진이어야 합니다. 이 파일은 크기 참고용이며 제출 사이트의 안내를 확인해 주세요.",
  },
  {
    id: "ie-passport", label: "아일랜드 여권 온라인 (ireland.ie 안내)", width: 715, height: 951, maxBytes: 9 * 1024 * 1024, note: "715×951px(최소) · JPEG ≤9MB",
    caution: "아일랜드는 디지털 원본만 받으며(스캔·셀카·웹캠 불가) 보정·변형한 사진을 허용하지 않습니다. 이 파일은 크기 참고용이며 AI로 만든 사진은 접수되지 않을 수 있습니다.",
  },
  {
    id: "au-citizenship", label: "호주 시민권 신청 (immi.homeaffairs.gov.au 안내)", width: 1200, height: 1600, maxBytes: 3.5 * 1024 * 1024, minBytes: 70 * 1024, note: "1200×1600px(선호) · JPEG 70KB~3.5MB",
    headRange: [32 / 50, 36 / 45], headSource: "immi.homeaffairs.gov.au(턱~정수리 32~36mm, 인쇄 사진 45~50mm)",
    caution: "호주 내무부는 디지털 사진을 편집하지 않은 원본이어야 하며 스캔·사진의 사진을 받지 않는다고 안내합니다. 이 파일은 크기 참고용이며 AI로 만든 사진은 접수되지 않을 수 있습니다.",
  },
  {
    id: "pl-id", label: "폴란드 신분증 전자 신청 (gov.pl 안내, 35×45mm)", width: 492, height: 633, maxBytes: 2.5 * 1024 * 1024, note: "492×633px(최소) · 2.5MB 이하",
    headRange: [0.7, 0.8], headSource: "gov.pl 도지사청 안내(얼굴이 사진의 70~80%)",
    caution: "이 규격은 폴란드 gov.pl의 신분증 전자 신청 안내이며 안내 문서가 오래됐을 수 있습니다. 여권 전자 사양은 확인하지 못했습니다. 이 파일은 크기 참고용이며 AI로 만든 사진은 접수되지 않을 수 있습니다.",
  },
  {
    id: "jp-passport", label: "일본 여권 온라인 신청 (외무성 안내, 35×45mm)", width: 413, height: 531, maxBytes: 600 * 1024, note: "413×531px(300dpi 환산, 픽셀 규정 없음) · JPG 600KB 이하(마이나포털, ORRnet은 20KB~2MB)",
    headRange: [0.71, 0.8], headSource: "외무성 안내(머리 정수리~턱 34±2mm ÷ 세로 45mm)",
    caution: "일본 외무성 안내: 세로45×가로35mm·테두리 없음·무배경(흰색 권장)·6개월 이내·무모 정면. 온라인 업로드 규정은 JPG 형식·용량뿐이며 픽셀 수 규정은 없어 300dpi 환산값입니다. 이 파일은 크기 참고용이며 접수·합격을 보장하지 않습니다.",
  },
  {
    id: "kr-keta", label: "한국 전자여행허가 K-ETA 안면 사진 (법무부 안내)", width: 525, height: 700, maxBytes: 100 * 1024, note: "가로·세로 700px 이하(비율 규정 없어 3:4 525×700 사용) · JPG 100KB 이하",
    caution: "법무부 출입국·외국인정책본부 K-ETA 안내: 안면 사진은 JPG·100KB 이하·가로세로 700픽셀 이하(여권 인적면 사진은 선택, JPG 300KB 이하)이며 가로세로 비율·머리 비율 규정은 안내에 없습니다. 이 파일은 크기 참고용이며 접수·합격을 보장하지 않습니다. K-ETA 스마트폰 앱으로 촬영하면 자동 보정됩니다.",
  },
  { id: "print-hires", label: "인화용 고해상도 (3×4cm, 600dpi)", width: 709, height: 945, maxBytes: 400 * 1024, note: "709×945px · 400KB 이하" },
]

export function sizePresetById(id: string): SizePreset {
  return SIZE_PRESETS.find((p) => p.id === id) ?? SIZE_PRESETS[0];
}

/** 같은 시간에 만드는 후보 수의 범위(비용·시간 때문에 4장까지) */
export const MAX_CANDIDATES = 4;
export function clampCandidates(n: number): number {
  return Math.max(1, Math.min(MAX_CANDIDATES, Math.round(Number.isFinite(n) ? n : 1)));
}

/** 저장 파일 이름으로 쓸 수 있게 다듬는다(금지 문자 제거·공백 정리·길이 제한). 비면 fallback. */
export function safeFileName(name: string, fallback: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .slice(0, 40)
    .trim();
  return cleaned || fallback;
}

/** 업로드 파일 이름에서 확장자를 뗀 기본 이름 */
export function baseNameOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}

/** 머리 높이 비율을 공식 범위와 견준 결과 */
export interface HeadEvaluation { status: "ok" | "small" | "large"; ratio: number; range: [number, number] }

export function evaluateHead(ratio: number, range: [number, number], tolerance = 0.02): HeadEvaluation {
  const status = ratio < range[0] - tolerance ? "small" : ratio > range[1] + tolerance ? "large" : "ok";
  return { status, ratio, range };
}

/**
 * 원본 이미지(srcW×srcH)에서 추정한 정수리·턱 위치(0~1)를 규격 크기로 자른 결과(coverCrop)에 맞춰
 * 머리 높이 비율과 정수리 위 여백 비율을 계산한다. 잘린 영역 밖이면 값이 범위를 벗어날 수 있다.
 */
export function headInCrop(crownY: number, chinY: number, srcW: number, srcH: number, preset: { width: number; height: number }, topBias = 0.15): { ratio: number; topMargin: number; cropped: boolean } {
  const c = coverCrop(srcW, srcH, preset.width, preset.height, topBias);
  const crownPx = crownY * srcH;
  const chinPx = chinY * srcH;
  return {
    ratio: (chinPx - crownPx) / c.sh,
    topMargin: (crownPx - c.sy) / c.sh,
    cropped: crownPx < c.sy || chinPx > c.sy + c.sh,
  };
}

/** 배열에서 from 위치의 항목을 to 위치로 옮긴 새 배열(범위를 벗어나면 그대로) */
export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const next = arr.slice();
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
}

/**
 * 머리가 작게 나온 사진을 규격 비율로 더 가깝게 자를 영역을 계산한다.
 * 정수리~턱 높이가 잘린 영역 높이의 targetRatio가 되도록 하고, 얼굴 중심(centerX, 0~1)을 가로 중앙에 둔다.
 * 원본 범위를 넘으면 가능한 최대한만 확대하고 clamped=true, 실제 달성 비율을 돌려준다.
 */
export function tightCrop(
  crownY: number, chinY: number, srcW: number, srcH: number, preset: { width: number; height: number }, targetRatio: number, centerX = 0.5,
): { crop: CropRect; achievedRatio: number; clamped: boolean } {
  const aspect = preset.width / preset.height;
  const crownPx = crownY * srcH;
  const headPx = Math.max(1, (chinY - crownY) * srcH);
  let ch = headPx / Math.max(0.2, Math.min(0.95, targetRatio));
  let cw = ch * aspect;
  let clamped = false;
  if (cw > srcW) { cw = srcW; ch = cw / aspect; clamped = true; }
  if (ch > srcH) { ch = srcH; cw = ch * aspect; clamped = true; }
  const topMargin = ch * (1 - Math.min(0.95, targetRatio)) * 0.3;
  const sy = Math.max(0, Math.min(srcH - ch, crownPx - topMargin));
  const cxPx = Math.max(0.05, Math.min(0.95, centerX)) * srcW;
  const sx = Math.max(0, Math.min(srcW - cw, cxPx - cw / 2));
  const crop = { sx: Math.round(sx), sy: Math.round(sy), sw: Math.round(cw), sh: Math.round(ch) };
  return { crop, achievedRatio: headPx / crop.sh, clamped };
}

export interface CropControls { centerX: number; centerY: number; heightFrac: number }

/** 규격 비율을 유지하며 원본 안에 들어갈 수 있는 최대 높이 비율(0~1) */
export function maxHeightFrac(srcW: number, srcH: number, aspect: number): number {
  return Math.min(1, srcW / aspect / srcH);
}

/** 슬라이더 값(중심 위치·높이 비율)으로 자르기 영역을 만든다. 원본 밖으로 나가지 않게 보정한다. */
export function cropFromControls(c: CropControls, srcW: number, srcH: number, aspect: number): CropRect {
  const maxH = maxHeightFrac(srcW, srcH, aspect);
  const hf = Math.max(0.1, Math.min(maxH, c.heightFrac));
  const ch = hf * srcH;
  const cw = ch * aspect;
  const sx = Math.max(0, Math.min(srcW - cw, c.centerX * srcW - cw / 2));
  const sy = Math.max(0, Math.min(srcH - ch, c.centerY * srcH - ch / 2));
  return { sx: Math.round(sx), sy: Math.round(sy), sw: Math.round(cw), sh: Math.round(ch) };
}

/** 자르기 영역 → 슬라이더 값(cropFromControls의 역) */
export function controlsFromCrop(crop: CropRect, srcW: number, srcH: number): CropControls {
  return {
    centerX: (crop.sx + crop.sw / 2) / srcW,
    centerY: (crop.sy + crop.sh / 2) / srcH,
    heightFrac: crop.sh / srcH,
  };
}

/** localStorage에 저장한 자르기 조정 값을 검증해 읽는다(깨졌거나 범위를 벗어나면 null) */
export function parseStoredControls(raw: string | null | undefined): CropControls | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<CropControls>;
    const ok = (n: unknown, lo: number, hi: number): n is number => typeof n === "number" && Number.isFinite(n) && n >= lo && n <= hi;
    if (ok(v.centerX, 0, 1) && ok(v.centerY, 0, 1) && ok(v.heightFrac, 0.1, 1)) return { centerX: v.centerX, centerY: v.centerY, heightFrac: v.heightFrac };
  } catch { /* 무시 */ }
  return null;
}

/** 다른 크기의 이미지에 같은 비율 위치로 옮긴 자르기 영역(원본 크기가 달라졌을 때) */
export function scaleCrop(crop: CropRect, fromW: number, fromH: number, toW: number, toH: number): CropRect {
  if (fromW === toW && fromH === toH) return crop;
  const kx = toW / fromW;
  const ky = toH / fromH;
  return { sx: Math.round(crop.sx * kx), sy: Math.round(crop.sy * ky), sw: Math.round(crop.sw * kx), sh: Math.round(crop.sh * ky) };
}

export interface BatchDecision {
  status: "ok" | "small" | "large" | "notfound";
  ratio?: number;
  crop?: CropRect;
  achieved?: number;
  clamped?: boolean;
}

/**
 * 일괄 모드: 사진 한 장의 머리 위치 추정(AI·직접 지정)을 규격의 공식 범위와 견줘 자르기 영역을 정한다.
 * v1.24부터 단일 [규격 저장]과 같은 `recommendSizedCrop`을 쓴다 — 작음은 확대, 범위 안은 얼굴 가로 가운데,
 * 큼은 머리가 잘리지 않게 위치만 맞춤. 얼굴을 못 찾았거나 규격에 범위가 없으면 notfound.
 */
export function decideBatchCrop(
  m: { found: boolean; crownY: number; chinY: number; centerX?: number } | null,
  preset: { width: number; height: number; headRange?: [number, number] },
  srcW: number, srcH: number,
): BatchDecision {
  if (!m || !m.found) return { status: "notfound" };
  const r = recommendSizedCrop(m, preset, srcW, srcH);
  if (r.mode === "none" || !r.status) return { status: "notfound" };
  return { status: r.status, ratio: r.ratio, crop: r.crop, achieved: r.achieved, clamped: r.clamped };
}

/** 기본 자르기(coverCrop)와 같은 크기로, 얼굴 가로 중심(centerX 0~1)이 영역 가운데에 오도록 좌우만 옮긴 영역 */
export function centerFaceCrop(centerX: number, srcW: number, srcH: number, preset: { width: number; height: number }, topBias = 0.15): CropRect {
  const base = coverCrop(srcW, srcH, preset.width, preset.height, topBias);
  const cx = Math.max(0.05, Math.min(0.95, centerX)) * srcW;
  const sx = Math.max(0, Math.min(srcW - base.sw, cx - base.sw / 2));
  return { sx: Math.round(sx), sy: base.sy, sw: base.sw, sh: base.sh };
}

export interface SizedRecommendation {
  /** tight: 머리 비율을 기준 중앙값에 맞춰 확대/축소, center: 크기 유지·얼굴만 가로 가운데, none: 기본 가운데 자르기 */
  mode: "tight" | "center" | "none";
  status?: "ok" | "small" | "large";
  crop?: CropRect;
  ratio?: number;
  achieved?: number;
  clamped?: boolean;
}

/**
 * 단일 규격 저장의 기본 영역: 머리 위치(측정값)가 있고 규격에 공식 머리 비율 기준이 있으면
 * 작음·큼은 기준 중앙값으로 맞춘 영역(tightCrop), 범위 안은 얼굴만 가로 가운데로(centerFaceCrop).
 * 측정값이 없거나 기준이 없는 규격이면 none(기존 가운데 자르기).
 */
export function recommendSizedCrop(
  m: { crownY: number; chinY: number; centerX?: number } | null | undefined,
  preset: { width: number; height: number; headRange?: [number, number] },
  srcW: number, srcH: number,
): SizedRecommendation {
  if (!m || !preset.headRange || !(m.chinY > m.crownY)) return { mode: "none" };
  const cx = typeof m.centerX === "number" ? m.centerX : 0.5;
  const ratio = headInCrop(m.crownY, m.chinY, srcW, srcH, preset).ratio;
  const ev = evaluateHead(ratio, preset.headRange);
  if (ev.status === "ok") return { mode: "center", status: "ok", ratio, crop: centerFaceCrop(cx, srcW, srcH, preset), achieved: ratio };
  const t = tightCrop(m.crownY, m.chinY, srcW, srcH, preset, (preset.headRange[0] + preset.headRange[1]) / 2, cx);
  return { mode: "tight", status: ev.status, ratio, crop: t.crop, achieved: t.achievedRatio, clamped: t.clamped };
}

/** v1.24 프로필 사진 세트(SNS·메신저 프로필용). 증명사진 규격과 별개로 한 번에 ZIP 저장한다. */
export interface ProfileFormat { id: string; label: string; width: number; height: number; circle: boolean }
export const PROFILE_FORMATS: ProfileFormat[] = [
  { id: "square", label: "정사각 1:1", width: 1080, height: 1080, circle: false },
  { id: "portrait", label: "세로 4:5", width: 1080, height: 1350, circle: false },
  { id: "circle", label: "원형 프로필", width: 1080, height: 1080, circle: true },
];
/** 프로필 구도의 머리 높이 비율(증명사진보다 여유 있게 어깨까지 보이도록) */
export const PROFILE_HEAD_RATIO = 0.42;

/**
 * 프로필 사진 자르기 영역: 머리 위치가 있으면 머리가 영역 높이의 약 42%가 되도록 얼굴 기준으로(원본 한계면 최대한),
 * 없으면 위쪽으로 치우친 가운데 자르기(coverCrop).
 */
export function profileCrop(
  m: { crownY: number; chinY: number; centerX?: number } | null | undefined,
  fmt: { width: number; height: number },
  srcW: number, srcH: number,
): CropRect {
  if (!m || !(m.chinY > m.crownY)) return coverCrop(srcW, srcH, fmt.width, fmt.height, 0.15);
  return tightCrop(m.crownY, m.chinY, srcW, srcH, fmt, PROFILE_HEAD_RATIO, typeof m.centerX === "number" ? m.centerX : 0.5).crop;
}

/**
 * 사용자가 사진에서 직접 찍은 두 점(정수리, 턱 끝)을 머리 측정값(0~1)으로 바꾼다.
 * 위쪽 점이 정수리·아래쪽 점이 턱이며, 가로 중심은 두 점의 평균이다. 두 점이 너무 가까우면 null.
 */
export function marksToMeasure(
  a: { x: number; y: number }, b: { x: number; y: number },
): { crownY: number; chinY: number; centerX: number } | null {
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  const crownY = clamp(Math.min(a.y, b.y));
  const chinY = clamp(Math.max(a.y, b.y));
  if (chinY - crownY < 0.05) return null;
  return { crownY, chinY, centerX: clamp((a.x + b.x) / 2) };
}

/** 일괄 판정 결과를 사용자에게 보여 줄 한 줄 문구로 만든다(자동/수동 공용) */
export function describeBatchDecision(d: BatchDecision, manual = false): { text: string; tone: "ok" | "warn" } {
  const pct = (n: number) => Math.round(n * 100);
  if (d.status === "notfound") return { text: "얼굴 위치를 찾지 못해 자동 중앙 자르기를 씁니다.", tone: "warn" };
  const where = d.crop ? "얼굴 가로 중앙 맞춤" : "자동 중앙 자르기";
  if (d.status === "ok") return { text: `머리 약 ${pct(d.ratio ?? 0)}% — 범위 안(${where})`, tone: "ok" };
  if (d.status === "large") return { text: `머리 약 ${pct(d.ratio ?? 0)}% — 기준보다 큼(${d.crop ? "머리가 잘리지 않게 위치만 맞춤" : where} — 상체가 더 보이게 다시 만들거나 [자르기 영역 조정])`, tone: "warn" };
  const base = `머리 약 ${pct(d.ratio ?? 0)}% → 확대 자르기로 약 ${pct(d.achieved ?? 0)}%${d.clamped ? " (원본 한계로 더 확대하지 못함)" : ""}`;
  return { text: manual ? `수동 지정: ${base}` : base, tone: "ok" };
}
