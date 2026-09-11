/**
 * 캡쳐 이미지를 다운로드해서 다른 곳에 무단으로 재사용하지 못하도록, 에디터에
 * 이미지를 첨부하는 순간 브라우저 Canvas로 "AIMaster" 텍스트를 반투명 대각선
 * 패턴으로 삽입한 뒤 업로드한다. 서버 이미지 처리 라이브러리(sharp 등) 설치 없이
 * 클라이언트에서 즉시 처리한다 — 반드시 브라우저 환경(클라이언트 컴포넌트)에서만 호출할 것.
 */
export async function applyWatermark(file: File, text = "AIMaster"): Promise<Blob> {
  const imageBitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = imageBitmap.width;
  canvas.height = imageBitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(imageBitmap, 0, 0);

  const fontSize = Math.max(18, Math.round(canvas.width / 16));
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = Math.max(1, fontSize / 22);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((-30 * Math.PI) / 180);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);

  // 잘라내기(크롭)로 제거하기 어렵게 이미지 전체에 타일 형태로 반복 삽입한다.
  const stepX = fontSize * (text.length * 0.65 + 4);
  const stepY = fontSize * 3.2;
  const diagonal = Math.sqrt(canvas.width ** 2 + canvas.height ** 2);
  for (let y = -diagonal; y < diagonal; y += stepY) {
    for (let x = -diagonal; x < diagonal; x += stepX) {
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
    }
  }
  ctx.restore();

  const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), outputType, 0.92);
  });
}
