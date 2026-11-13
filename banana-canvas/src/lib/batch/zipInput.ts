// 메이커 P3-F(2026-11-13) 공급사가 준 ZIP·폴더를 그대로 넣기 — ZIP은 회원 브라우저 안에서만 푼다(서버 업로드 없음).
// 꺼낸 사진의 이름은 ZIP 안 경로(예: 「A-1001/main.jpg」)이고, 폴더 이름이 상품코드가 된다(productJobs.ts rowsFromPaths).
import JSZip from "jszip";

export const ZIP_MAX_IMAGES = 250; // 상품 50개 × 사진 4장 + 여유
export const ZIP_MAX_PHOTO_BYTES = 25 * 1024 * 1024;
export const ZIP_MAX_TOTAL_BYTES = 600 * 1024 * 1024;

const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** ZIP 안 파일 이름: UTF-8이 아니면 한글 윈도우에서 만든 ZIP(EUC-KR)로 읽는다 */
function decodeName(bytes: Uint8Array | string[] | Buffer): string {
  const u8 = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes as unknown as number[]);
  try { return new TextDecoder("utf-8", { fatal: true }).decode(u8); } catch { /* 아래로 */ }
  try { return new TextDecoder("euc-kr").decode(u8); } catch { return new TextDecoder().decode(u8); }
}

/** 폴더로 고른 파일의 키: 폴더 경로가 있으면 경로, 없으면 파일 이름 */
export function fileKey(f: File): string {
  const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath;
  return rel || f.name;
}

/** ZIP에서 사진(JPG·PNG·WEBP)만 꺼낸다. 맥 임시 폴더·숨김 파일·다른 형식·한도 초과는 건너뛰고 이유를 돌려준다 */
export async function imagesFromZip(zip: Blob | ArrayBuffer | Uint8Array): Promise<{ files: File[]; skipped: string[] }> {
  const z = await JSZip.loadAsync(zip, { decodeFileName: decodeName as (b: string[] | Uint8Array | Buffer) => string });
  const files: File[] = [];
  const skipped: string[] = [];
  let total = 0;
  let other = 0;
  for (const entry of Object.values(z.files)) {
    if (entry.dir) continue;
    const path = entry.name.replace(/\\/g, "/");
    const base = path.split("/").pop() ?? "";
    if (path.startsWith("__MACOSX/") || base.startsWith(".")) continue;
    const type = TYPES[(base.split(".").pop() ?? "").toLowerCase()];
    if (!type) { other++; continue; }
    if (files.length >= ZIP_MAX_IMAGES) { skipped.push(`${path}(사진 ${ZIP_MAX_IMAGES}장 초과)`); continue; }
    const data = await entry.async("uint8array");
    if (data.byteLength === 0 || data.byteLength > ZIP_MAX_PHOTO_BYTES) { skipped.push(`${path}(25MB 초과 또는 빈 파일)`); continue; }
    if (total + data.byteLength > ZIP_MAX_TOTAL_BYTES) { skipped.push(`${path}(ZIP 전체 600MB 초과)`); continue; }
    total += data.byteLength;
    files.push(new File([data as BlobPart], path, { type }));
  }
  if (other) skipped.push(`사진이 아닌 파일 ${other}개`);
  return { files, skipped };
}
