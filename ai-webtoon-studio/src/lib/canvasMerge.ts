import JSZip from "jszip";
import { CutScene } from "./types";

// 1. 전체 컷을 세로로 이어붙여 단일 JPG로 병합 및 다운로드
export async function mergeAndDownloadLongScrollJpg(
  cuts: CutScene[],
  coverUrl?: string,
  projectTitle: string = "webtoon"
): Promise<void> {
  const imagesToLoad: { label: string; src: string; dialogue?: string }[] = [];

  if (coverUrl) {
    imagesToLoad.push({ label: "[표지]", src: coverUrl });
  }

  for (const c of cuts) {
    if (c.imageUrl) {
      imagesToLoad.push({
        label: `CUT ${c.cutIndex}`,
        src: c.imageUrl,
        dialogue: c.dialogue,
      });
    }
  }

  if (imagesToLoad.length === 0) {
    alert("병합할 이미지가 없습니다. 먼저 표지나 컷을 생성해주세요.");
    return;
  }

  // 이미지 비동기 로딩
  const loadedImages: { img: HTMLImageElement; dialogue?: string }[] = [];
  for (const item of imagesToLoad) {
    try {
      const img = await loadImage(item.src);
      loadedImages.push({ img, dialogue: item.dialogue });
    } catch (e) {
      console.warn("Image load failed for item:", item.label, e);
    }
  }

  if (loadedImages.length === 0) {
    alert("이미지 로드에 실패했습니다.");
    return;
  }

  // 네이버 웹툰 표준 너비 690px 또는 고화질 1080px
  const targetWidth = 1080;
  const gap = 60; // 컷과 컷 사이 세로 여백
  const padding = 40;

  // 총 높이 계산
  let totalHeight = padding;
  for (const item of loadedImages) {
    const scale = targetWidth / item.img.naturalWidth;
    const h = item.img.naturalHeight * scale;
    totalHeight += h + gap;

    // 대사 텍스트가 있으면 추가 높이 확보
    if (item.dialogue) {
      totalHeight += 80;
    }
  }
  totalHeight += padding;

  // 캔버스 생성 및 드로잉
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 흰색 배경
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let currentY = padding;
  for (const item of loadedImages) {
    const scale = targetWidth / item.img.naturalWidth;
    const renderHeight = item.img.naturalHeight * scale;

    ctx.drawImage(item.img, 0, currentY, targetWidth, renderHeight);
    currentY += renderHeight;

    // 대사/말풍선 텍스트 렌더링
    if (item.dialogue) {
      currentY += 20;
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";

      // 텍스트 감싸기 박스 (부드러운 말풍선 형태)
      const textWidth = ctx.measureText(item.dialogue).width;
      const boxWidth = Math.min(textWidth + 60, targetWidth - 100);
      const boxHeight = 54;
      const boxX = (targetWidth - boxWidth) / 2;
      const boxY = currentY;

      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 3;
      roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 20);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#0f172a";
      ctx.fillText(item.dialogue, targetWidth / 2, boxY + 36);

      currentY += boxHeight + 40;
    } else {
      currentY += gap;
    }
  }

  // JPG 다운로드
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const a = document.createElement("a");
  const cleanTitle = (projectTitle || "webtoon").replace(/[^a-zA-Z0-9가-힣_-]/g, "_");
  a.download = `${cleanTitle}_full_webtoon_scroll.jpg`;
  a.href = dataUrl;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// 2. 전체 이미지를 번호순 ZIP 파일로 일괄 압축 다운로드
export async function downloadAllImagesAsZip(
  cuts: CutScene[],
  coverUrl?: string,
  projectTitle: string = "webtoon",
  scriptText?: string
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder("webtoon_cuts");
  if (!folder) return;

  let addedCount = 0;

  if (coverUrl) {
    const coverData = await fetchImageBlob(coverUrl);
    if (coverData) {
      folder.file("00_main_cover.jpg", coverData);
      addedCount++;
    }
  }

  for (const c of cuts) {
    if (c.imageUrl) {
      const cutData = await fetchImageBlob(c.imageUrl);
      if (cutData) {
        const num = String(c.cutIndex).padStart(2, "0");
        folder.file(`${num}_cut_${c.cutIndex}.jpg`, cutData);
        addedCount++;
      }
    }
  }

  if (scriptText) {
    folder.file("storyboard_script.txt", scriptText);
  }

  if (addedCount === 0) {
    alert("ZIP으로 압축할 이미지가 없습니다.");
    return;
  }

  const content = await zip.generateAsync({ type: "blob" });
  const cleanTitle = (projectTitle || "webtoon").replace(/[^a-zA-Z0-9가-힣_-]/g, "_");
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.download = `${cleanTitle}_cuts.zip`;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// 도우미 함수: 이미지 로딩
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

// 도우미 함수: 이미지 Blob 가져오기
async function fetchImageBlob(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url);
    if (res.ok) {
      return await res.blob();
    }
  } catch (e) {
    console.warn("Failed to fetch blob for zip:", url, e);
  }
  return null;
}

// 둥근 모서리 사각형 그리기 도우미
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
