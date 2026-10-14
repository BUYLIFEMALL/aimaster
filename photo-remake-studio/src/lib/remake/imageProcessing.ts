import sharp from "sharp";
import { MAX_OUTPUT_SIDE, type InputImage } from "./types";
import { InputError } from "./validation";
export async function readImage(x: InputImage) {
  const bytes = Buffer.from(x.data, "base64");
  if (!bytes.length || bytes.toString("base64") !== x.data) throw new InputError("사진 데이터가 올바르지 않습니다.");
  try {
    const meta = await sharp(bytes, { limitInputPixels: 16_000_000, animated: false }).metadata();
    const mime = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" }[meta.format as "jpeg" | "png" | "webp"];
    if (mime !== x.mimeType || !meta.width || !meta.height || (meta.pages ?? 1) !== 1) throw new Error();
    return { bytes, width: meta.width, height: meta.height };
  } catch { throw new InputError("사진 파일을 읽지 못했습니다. 정지된 JPEG·PNG·WebP 사진을 올려 주세요."); }
}
export async function prepareResult(bytes: Buffer, factor: 1 | 2 | 4) {
  const image = sharp(bytes, { limitInputPixels: 70_000_000, animated: false }).rotate();
  const meta = await image.metadata();
  if (!meta.width || !meta.height || !["jpeg", "png", "webp"].includes(meta.format || "") || (meta.pages ?? 1) !== 1) throw new Error("Invalid generated image");
  const scale = Math.min(factor, MAX_OUTPUT_SIDE / Math.max(meta.width, meta.height));
  const width = Math.max(1, Math.round(meta.width * scale)), height = Math.max(1, Math.round(meta.height * scale));
  let output: Buffer | undefined;
  for (const quality of [92, 82, 70, 58]) {
    output = await image.clone().flatten({ background: "#ffffff" }).resize(width, height, { kernel: "lanczos3" }).jpeg({ quality, mozjpeg: true }).toBuffer();
    if (output.length <= 2_850_000) break;
  }
  if (!output || output.length > 2_850_000) throw new InputError("결과 용량이 너무 큽니다. 확대 배율을 낮춰 다시 시도해 주세요.");
  return { data: output.toString("base64"), mimeType: "image/jpeg" as const, width, height, limited: scale < factor };
}
