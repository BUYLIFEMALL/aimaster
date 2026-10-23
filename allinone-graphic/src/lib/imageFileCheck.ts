// 공용 기준 코드 `image-file-check` — 기준: portrait-photo/src/lib/imageFileCheck.ts (docs/SHARED_MODULES.md)
// 사본은 직접 고치지 않는다. 기준만 고치고 `node scripts/check-shared-modules.mjs --sync`로 사본에 반영한다.
// 올린 사진을 브라우저 안에서 실제로 풀어 보고(서버 전송 없음), 깨졌거나 그림이 아니면 한글 안내를 돌려준다.

export const IMAGE_READ_FAIL_MESSAGE = "사진을 읽지 못했어요. 파일이 깨졌거나 사진 파일이 아닐 수 있어요. 다른 사진으로 다시 올려 주세요.";

export type ImageFileCheck = { ok: true; width: number; height: number; checked: boolean } | { ok: false; message: string };

const fail = (): ImageFileCheck => ({ ok: false, message: IMAGE_READ_FAIL_MESSAGE });

function viaImageElement(file: Blob): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    const done = (v: { width: number; height: number } | null) => { URL.revokeObjectURL(url); resolve(v); };
    img.onload = () => done(img.naturalWidth > 0 && img.naturalHeight > 0 ? { width: img.naturalWidth, height: img.naturalHeight } : null);
    img.onerror = () => done(null);
    img.src = url;
  });
}

/**
 * 사진을 실제로 풀어 본다. `createImageBitmap`이 실패하면 `Image`로 한 번 더 확인하고, 둘 다 실패할 때만 실패로 본다
 * (정상 사진을 잘못 막지 않도록). 확인 수단이 없는 환경(서버 등)에서는 막지 않고 `checked: false`로 통과시킨다.
 */
export async function checkImageFile(file: Blob): Promise<ImageFileCheck> {
  const hasBitmap = typeof createImageBitmap === "function";
  const hasImage = typeof Image === "function" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function";
  if (!hasBitmap && !hasImage) return { ok: true, width: 0, height: 0, checked: false };
  if (hasBitmap) {
    try {
      const bmp = await createImageBitmap(file);
      const size = { width: bmp.width, height: bmp.height };
      bmp.close?.();
      if (size.width > 0 && size.height > 0) return { ok: true, ...size, checked: true };
    } catch { /* 아래 Image 방식으로 한 번 더 확인 */ }
  }
  if (hasImage) {
    const size = await viaImageElement(file);
    if (size) return { ok: true, ...size, checked: true };
  }
  return fail();
}

/** 여러 장 중 읽히는 사진만 고른다(순서 유지). `failed`는 읽지 못한 사진 */
export async function splitReadableImages<T extends Blob>(files: T[]): Promise<{ readable: T[]; failed: T[] }> {
  const checks = await Promise.all(files.map((f) => checkImageFile(f)));
  return { readable: files.filter((_, i) => checks[i].ok), failed: files.filter((_, i) => !checks[i].ok) };
}
