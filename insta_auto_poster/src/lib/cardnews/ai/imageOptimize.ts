import "server-only";
import sharp from "sharp";

export type OptimizedImage = { bytes: Buffer; mime: string; ext: string };

/**
 * Gemini가 돌려주는 큰 PNG(약 2MB)를 WebP로 줄여 저장한다. 카드는 1080px 폭으로 그려지므로 폭 1620px(1.5배)이면 충분하다.
 * 변환에 실패하면 원본을 그대로 쓴다(저장 실패보다 큰 파일이 낫다).
 */
export async function optimizeBackground(bytes: Buffer, mime: string): Promise<OptimizedImage> {
  try {
    const out = await sharp(bytes).resize({ width: 1620, withoutEnlargement: true }).webp({ quality: 90 }).toBuffer();
    return { bytes: out, mime: "image/webp", ext: "webp" };
  } catch {
    const ext = mime.includes("jpeg") ? "jpg" : mime.includes("webp") ? "webp" : "png";
    return { bytes, mime, ext };
  }
}
