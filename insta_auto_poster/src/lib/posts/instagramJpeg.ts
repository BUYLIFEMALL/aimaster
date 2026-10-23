import sharp from "sharp";

// 인스타 피드 게시 API는 JPEG만 받는다(Meta 콘텐츠 게시 문서). 피드 게시는 저장된 공개 주소를 그대로 넘기므로
// 저장할 때 JPEG로 맞춘다(2026-10-23, 미배포 대기). JPEG는 그대로 두고, PNG·WEBP 등은 흰 배경 위 JPEG(품질 92)로.
export async function toInstagramJpeg(bytes: Buffer, mimeType: string): Promise<{ bytes: Buffer; mimeType: "image/jpeg"; ext: "jpg" }> {
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") return { bytes, mimeType: "image/jpeg", ext: "jpg" };
  const out = await sharp(bytes).rotate().flatten({ background: "#ffffff" }).jpeg({ quality: 92 }).toBuffer();
  return { bytes: out, mimeType: "image/jpeg", ext: "jpg" };
}
