"use client";

// 브라우저 안에서만 도는 변환·콜라주 엔진. 이미지는 서버로 올라가지 않는다.
//  · 변환: createImageBitmap → (필요하면 pica로 리샘플링) → canvas.toBlob
//  · 업스케일/축소: pica(Lanczos 등) + 언샵 마스크. AI 업스케일이 아니라 수학적 보간이다.
//  · ZIP: JSZip
import JSZip from "jszip";
import {
  FORMAT_LABEL,
  FORMAT_MIME,
  MAX_CANVAS_PIXELS,
  cellOrigin,
  collageGrid,
  collageSize,
  dedupeNames,
  exceedsCanvasLimit,
  fitRect,
  targetSize,
  type CollageFit,
  type CollageLayout,
  type OutputFormat,
  type ResampleFilter,
} from "./formats";
import { planTransform, type Focus, type PostPreset, type Rotation } from "./geometry";

export interface ConvertOptions {
  format: OutputFormat;
  /** 0.1~1.0 (PNG는 무시) */
  quality: number;
  scale: number;
  maxWidth?: number;
  maxHeight?: number;
  /** 배율이 1이 아니거나 크기 제한이 있을 때 쓰는 리샘플링 필터 */
  filter?: ResampleFilter;
  /** 0~300, 업스케일(>1×)일 때만 적용 */
  unsharpAmount?: number;
  /** F3(v1.12): 회전·반전·가운데 비율 자르기·게시처 규격(프리셋이면 정확한 크기, 배율·크기 제한보다 우선) */
  rotate?: Rotation;
  flipH?: boolean;
  flipV?: boolean;
  cropRatio?: number | null;
  preset?: PostPreset | null;
  /** v1.13: 그림마다 고른 자를 위치(없으면 가운데) */
  focus?: Focus | null;
}

export class ImageToolError extends Error {
  constructor(public code: "decode" | "canvas" | "unsupported" | "too_large" | "encode", message: string) {
    super(message);
  }
}

let picaInstance: import("pica").Pica | null = null;
async function getPica() {
  if (!picaInstance) {
    const mod = await import("pica");
    const Ctor = (mod as unknown as { default?: new () => import("pica").Pica }).default ?? (mod as unknown as new () => import("pica").Pica);
    // ww(웹 워커)는 번들러에서 webworkify가 멈추는 문제가 있어 메인 스레드(js·wasm)로만 돌린다
    picaInstance = new (Ctor as unknown as new (o: { features: string[] }) => import("pica").Pica)({ features: ["js", "wasm"] });
  }
  return picaInstance;
}

async function decode(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    throw new ImageToolError("decode", "이 이미지를 읽을 수 없습니다(지원하지 않는 형식이거나 손상된 파일일 수 있습니다).");
  }
}

function toBlob(canvas: HTMLCanvasElement, format: OutputFormat, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new ImageToolError("encode", "이미지를 만들지 못했습니다."));
        // 브라우저가 지원하지 않는 형식이면 조용히 PNG로 바뀌어 나오므로 확인한다(AVIF 등)
        if (blob.type !== FORMAT_MIME[format]) {
          return reject(new ImageToolError("unsupported", `이 브라우저는 ${FORMAT_LABEL[format]} 형식으로 저장하지 못합니다. 다른 형식을 고르거나 최신 Chrome/Edge를 사용하세요.`));
        }
        resolve(blob);
      },
      FORMAT_MIME[format],
      quality
    );
  });
}

/** 한 장 변환. JPEG는 투명 부분이 검게 되지 않도록 흰색으로 채운다. */
export async function convertImage(file: Blob, options: ConvertOptions): Promise<Blob> {
  const bitmap = await decode(file);
  try {
    // F3: 회전·반전·자르기를 먼저 적용한 원본(source)을 만들고, 아래 크기 조정은 그 원본으로 한다
    const plan = planTransform(bitmap.width, bitmap.height, { rotate: options.rotate, flipH: options.flipH, flipV: options.flipV, cropRatio: options.cropRatio, preset: options.preset, focus: options.focus });
    if (exceedsCanvasLimit(plan.rotW, plan.rotH)) {
      throw new ImageToolError("too_large", `이미지가 너무 큽니다(${plan.rotW}×${plan.rotH}px).`);
    }
    let source: CanvasImageSource = bitmap;
    let srcW = bitmap.width, srcH = bitmap.height;
    if (!plan.identity) {
      const rot = document.createElement("canvas");
      rot.width = plan.rotW;
      rot.height = plan.rotH;
      const rc = rot.getContext("2d");
      if (!rc) throw new ImageToolError("canvas", "Canvas를 만들 수 없습니다.");
      rc.translate(plan.rotW / 2, plan.rotH / 2);
      // 반전은 회전한 결과(화면에 보이는 방향) 기준 — scale을 rotate보다 먼저 걸어야 한다(2026-10-22 실화면 검수에서 발견)
      rc.scale(options.flipH ? -1 : 1, options.flipV ? -1 : 1);
      rc.rotate(((options.rotate ?? 0) * Math.PI) / 180);
      rc.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
      const cut = document.createElement("canvas");
      cut.width = plan.crop.width;
      cut.height = plan.crop.height;
      const cc = cut.getContext("2d");
      if (!cc) throw new ImageToolError("canvas", "Canvas를 만들 수 없습니다.");
      cc.drawImage(rot, plan.crop.x, plan.crop.y, plan.crop.width, plan.crop.height, 0, 0, plan.crop.width, plan.crop.height);
      source = cut;
      srcW = cut.width;
      srcH = cut.height;
    }
    const { width: outW, height: outH } = plan.exact ?? targetSize(srcW, srcH, { scale: options.scale, maxWidth: options.maxWidth, maxHeight: options.maxHeight });
    if (exceedsCanvasLimit(outW, outH)) {
      throw new ImageToolError("too_large", `출력 크기(${outW}×${outH}px)가 너무 큽니다. 배율을 낮추거나 크기 제한을 사용하세요.`);
    }
    const out = document.createElement("canvas");
    out.width = outW;
    out.height = outH;
    const resized = outW !== srcW || outH !== srcH;
    const ctxOut = out.getContext("2d");
    if (!ctxOut) throw new ImageToolError("canvas", "Canvas를 만들 수 없습니다.");
    if (options.format === "jpeg") {
      ctxOut.fillStyle = "#ffffff";
      ctxOut.fillRect(0, 0, outW, outH);
    }
    if (resized && options.filter) {
      const src = document.createElement("canvas");
      src.width = srcW;
      src.height = srcH;
      const ctxSrc = src.getContext("2d");
      if (!ctxSrc) throw new ImageToolError("canvas", "Canvas를 만들 수 없습니다.");
      ctxSrc.drawImage(source, 0, 0);
      bitmap.close?.();
      const pica = await getPica();
      const amount = options.unsharpAmount ?? 0;
      const tmp = document.createElement("canvas");
      tmp.width = outW;
      tmp.height = outH;
      await pica.resize(src, tmp, {
        filter: options.filter,
        quality: 3,
        alpha: true,
        unsharpAmount: amount,
        unsharpRadius: amount ? 0.6 : undefined,
        unsharpThreshold: amount ? 1 : undefined,
      } as Parameters<typeof pica.resize>[2]);
      ctxOut.drawImage(tmp, 0, 0);
    } else {
      ctxOut.imageSmoothingEnabled = true;
      ctxOut.imageSmoothingQuality = "high";
      ctxOut.drawImage(source, 0, 0, outW, outH);
      bitmap.close?.();
    }
    return await toBlob(out, options.format, options.quality);
  } finally {
    try {
      bitmap.close?.();
    } catch {
      /* 이미 닫힘 */
    }
  }
}

export async function buildZip(items: { name: string; blob: Blob }[]): Promise<Blob> {
  const zip = new JSZip();
  const names = dedupeNames(items.map((item) => item.name));
  items.forEach((item, index) => zip.file(names[index], item.blob));
  return zip.generateAsync({ type: "blob" });
}

export interface CollageOptions {
  layout: CollageLayout;
  columns: number;
  cellW: number;
  cellH: number;
  gap: number;
  padding: number;
  background: string;
  fit: CollageFit;
  format: OutputFormat;
  quality: number;
}

/** 콜라주 한 장을 만들어 캔버스에 그리고 파일(Blob)로 돌려준다. 미리보기용 캔버스를 같이 받는다. */
export async function renderCollage(files: Blob[], options: CollageOptions, canvas: HTMLCanvasElement): Promise<Blob> {
  const { cols, rows } = collageGrid(options.layout, files.length, options.columns);
  const spec = { cols, rows, cellW: options.cellW, cellH: options.cellH, gap: options.gap, padding: options.padding };
  const { width, height } = collageSize(spec);
  if (exceedsCanvasLimit(width, height)) {
    throw new ImageToolError("too_large", `콜라주 크기(${width}×${height}px, ${(width * height / 1e6).toFixed(0)}백만 화소)가 한계(한 변 16384px, 약 ${MAX_CANVAS_PIXELS / 1e6}백만 화소)를 넘습니다. 칸 크기·열 수를 줄여 주세요.`);
  }
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageToolError("canvas", "Canvas를 만들 수 없습니다.");
  if (options.format === "jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.fillStyle = options.background;
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  for (let i = 0; i < files.length; i += 1) {
    const bitmap = await decode(files[i]);
    try {
      const { x, y } = cellOrigin(spec, i);
      const r = fitRect(bitmap.width, bitmap.height, x, y, options.cellW, options.cellH, options.fit);
      ctx.drawImage(bitmap, r.sx, r.sy, r.sw, r.sh, r.dx, r.dy, r.dw, r.dh);
    } finally {
      bitmap.close?.();
    }
  }
  return toBlob(canvas, options.format, options.quality);
}
