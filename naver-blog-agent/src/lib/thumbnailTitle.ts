// 병합 A-6(올인원 → 에이전트, naver-blog-allinone/src/lib/blog/canvas.ts overlayThumbnailTitle): 대표 이미지 아래쪽에 제목 글자를 합성한다.
// AI는 한글 글자를 깨뜨리므로 이미 만든 대표 이미지 위에 브라우저 캔버스로 따로 그린다 — 이미지를 다시 만들지 않아 AI 비용이 없다.
import type { DraftImage } from "@/lib/draftImages";

export const THUMBNAIL_TITLE_MAX_LINES = 3;
const ACCENT = "#03c75a";

/** 글자 폭을 재는 함수로 제목을 줄 나눈다. 넘치는 줄은 잘라 마지막 줄 끝에 …를 붙인다. */
export function wrapTitle(title: string, measure: (text: string) => number, maxWidth: number, maxLines = THUMBNAIL_TITLE_MAX_LINES): string[] {
  const lines: string[] = [];
  let line = "";
  for (const ch of Array.from(title.replace(/\s+/g, " ").trim())) {
    const test = line + ch;
    if (measure(test) > maxWidth && line) {
      lines.push(line.trimEnd());
      line = ch.trim() ? ch : "";
    } else line = test;
  }
  if (line.trim()) lines.push(line.trimEnd());
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1].replace(/.$/u, "")}…`;
  return kept;
}

/** 생성된 공개 대표 이미지만 대상 — 회원 비공개 사진(storagePath)은 공개 저장소로 올리지 않는다. */
export function canTitleThumbnail(image: DraftImage): boolean {
  return image.type === "thumbnail" && Boolean(image.url) && !image.storagePath;
}

/** 대표 이미지 주소를 글자 넣은 주소로 바꾼다. 원본 주소는 처음 한 번만 originalUrl에 남긴다(다시 넣어도 원본 기준). */
export function applyThumbnailUrl<T extends DraftImage>(images: T[], url: string): T[] {
  return images.map((image) => canTitleThumbnail(image) ? { ...image, originalUrl: image.originalUrl || image.url, url } : image);
}

/** 글자 없는 원본으로 되돌린다. */
export function restoreThumbnailUrl<T extends DraftImage>(images: T[]): T[] {
  return images.map((image) => {
    if (image.type !== "thumbnail" || !image.originalUrl) return image;
    const { originalUrl, ...rest } = image;
    return { ...rest, url: originalUrl } as T;
  });
}

/** (브라우저 전용) 이미지 주소를 불러와 아래쪽에 어두운 띠·강조 막대·흰 제목 글자를 그려 JPEG로 돌려준다. */
export async function overlayThumbnailTitle(url: string, title: string): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error(String(res.status));
    bitmap = await createImageBitmap(await res.blob());
  } catch {
    throw new Error("대표 이미지를 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지를 처리하지 못했습니다.");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const fontSize = Math.round(canvas.width * 0.055);
  ctx.font = `800 ${fontSize}px "Pretendard", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;
  const lines = wrapTitle(title, (text) => ctx.measureText(text).width, canvas.width * 0.84);
  if (!lines.length) throw new Error("원고 제목이 비어 있습니다.");
  const lineHeight = fontSize * 1.3;
  const blockHeight = lines.length * lineHeight + fontSize * 1.2;
  const top = canvas.height - blockHeight;

  const grad = ctx.createLinearGradient(0, top - fontSize, 0, canvas.height);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.35, "rgba(0,0,0,0.55)");
  grad.addColorStop(1, "rgba(0,0,0,0.78)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, top - fontSize, canvas.width, blockHeight + fontSize);

  ctx.fillStyle = ACCENT;
  ctx.fillRect(canvas.width * 0.08, top + fontSize * 0.3, fontSize * 0.14, lines.length * lineHeight);

  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = fontSize * 0.2;
  lines.forEach((text, i) => ctx.fillText(text, canvas.width * 0.08 + fontSize * 0.45, top + fontSize * 0.3 + i * lineHeight));

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("이미지를 저장 형식으로 바꾸지 못했습니다.");
  return blob;
}
