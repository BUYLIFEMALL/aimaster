import { MediaType } from "@/types/vinyl";

/**
 * 원본 사각 이미지를 CD 또는 LP 바이닐 텍스처로 2D Canvas를 통해 합성 및 마스킹
 * @param imageBase64 - 원본 이미지 Base64 문자열
 * @param mediaType - 'cd' | 'vinyl'
 * @returns 처리된 투명 배경 PNG의 Base64 문자열
 */
export async function processDiscTexture(
  imageBase64: string,
  mediaType: MediaType
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      let size = Math.min(img.width, img.height);
      if (size % 2 !== 0) size -= 1; // 짝수 크기로 고정

      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Canvas context 생성 실패"));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const cx = size / 2;
      const cy = size / 2;
      const radius = size / 2;

      ctx.clearRect(0, 0, size, size);

      if (mediaType === "cd") {
        // [CD 컴팩트 디스크 렌더링]
        const innerHoleR = radius * 0.13;
        const mirrorRingR = radius * 0.23;
        const clampRingR = radius * 0.28;
        const dataOuterR = radius * 0.98;

        const cropX = (img.width - size) / 2;
        const cropY = (img.height - size) / 2;

        // 1. 원본 앨범 아트 전체 렌더
        ctx.drawImage(img, cropX, cropY, size, size, 0, 0, size, size);

        // 2. 중앙 투명 허브 플라스틱 & 메탈 클램프 링 렌더
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, clampRingR, 0, Math.PI * 2);
        const clampGrad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
        clampGrad.addColorStop(0, "#e5e7eb");
        clampGrad.addColorStop(0.5, "#f9fafb");
        clampGrad.addColorStop(1, "#d1d5db");
        ctx.fillStyle = clampGrad;
        ctx.fill();

        // 3. 미러 이너 링
        ctx.beginPath();
        ctx.arc(cx, cy, mirrorRingR, 0, Math.PI * 2);
        const innerMirror = ctx.createRadialGradient(cx, cy, innerHoleR, cx, cy, mirrorRingR);
        innerMirror.addColorStop(0, "#4b5563");
        innerMirror.addColorStop(1, "#1f2937");
        ctx.fillStyle = innerMirror;
        ctx.fill();

        // 미러 링 테두리
        ctx.beginPath();
        ctx.arc(cx, cy, mirrorRingR, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // 점선 레이저 서클 가이드
        ctx.beginPath();
        ctx.arc(cx, cy, (mirrorRingR + clampRingR) / 2, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([2, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // 4. CD 홀로그램 프리즘 무지개 반사광 (Conic Gradient + Color Dodge)
        ctx.save();
        const rainbow = ctx.createConicGradient(0, cx, cy);
        rainbow.addColorStop(0, "rgba(255,255,255,0)");
        rainbow.addColorStop(0.1, "rgba(255,0,0,0.10)");
        rainbow.addColorStop(0.2, "rgba(255,255,0,0.10)");
        rainbow.addColorStop(0.3, "rgba(0,255,0,0.10)");
        rainbow.addColorStop(0.4, "rgba(0,255,255,0.10)");
        rainbow.addColorStop(0.5, "rgba(0,0,255,0.10)");
        rainbow.addColorStop(0.6, "rgba(255,0,255,0.10)");
        rainbow.addColorStop(0.7, "rgba(255,0,0,0.10)");
        rainbow.addColorStop(1, "rgba(255,255,255,0)");

        ctx.globalCompositeOperation = "color-dodge";
        ctx.fillStyle = rainbow;
        ctx.beginPath();
        ctx.arc(cx, cy, dataOuterR, 0, Math.PI * 2);
        ctx.arc(cx, cy, mirrorRingR, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.restore();

        // 5. CD 외부 림 투명 베젤 효과
        ctx.globalCompositeOperation = "source-over";
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.arc(cx, cy, dataOuterR, 0, Math.PI * 2, true);
        ctx.fillStyle = "rgba(200, 255, 255, 0.25)";
        ctx.fill();

        // 6. 중앙 구멍 뚫기
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(cx, cy, innerHoleR, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        // 7. 전체 원형 클리핑
        ctx.globalCompositeOperation = "destination-in";
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      } else {
        // [Vinyl (LP 바이닐 레코드) 렌더링]
        const labelR = radius * 0.38; // 센터 라벨 반경
        const grooveStartR = labelR + radius * 0.05;
        const grooveEndR = radius * 0.95;

        // 1. 딥 블랙 바이닐 베이스 디스크
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#111111";
        ctx.fill();

        // 2. 센터 라벨 원형 아트워크 렌더링
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, labelR, 0, Math.PI * 2);
        ctx.clip();

        const imgMin = Math.min(img.width, img.height);
        const cropX = (img.width - imgMin) / 2;
        const cropY = (img.height - imgMin) / 2;
        const labelDiameter = labelR * 2;
        const labelX = cx - labelR;
        const labelY = cy - labelR;

        ctx.drawImage(img, cropX, cropY, imgMin, imgMin, labelX, labelY, labelDiameter, labelDiameter);
        ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
        ctx.fillRect(labelX, labelY, labelDiameter, labelDiameter);
        ctx.restore();

        // 3. LP 음반 미세 동심원 그루브 (음각 홈) 텍스처
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, grooveEndR, 0, Math.PI * 2);
        ctx.arc(cx, cy, grooveStartR, 0, Math.PI * 2, true);
        ctx.clip();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
        ctx.lineWidth = 1.5;
        const step = size * 0.004;
        for (let r = grooveStartR; r < grooveEndR; r += step) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();

        // 4. 바이닐 표면 45도 / 225도 코닉 회전 광택 (비닐 하이라이트)
        const shine = ctx.createConicGradient(Math.PI * 0.25, cx, cy);
        shine.addColorStop(0, "rgba(255, 255, 255, 0)");
        shine.addColorStop(0.12, "rgba(255, 255, 255, 0.20)");
        shine.addColorStop(0.24, "rgba(255, 255, 255, 0)");
        shine.addColorStop(0.5, "rgba(255, 255, 255, 0)");
        shine.addColorStop(0.62, "rgba(255, 255, 255, 0.20)");
        shine.addColorStop(0.74, "rgba(255, 255, 255, 0)");
        shine.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = shine;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.arc(cx, cy, labelR, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.restore();

        // 5. 센터 라벨 경계선
        ctx.beginPath();
        ctx.arc(cx, cy, labelR, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // 6. 중앙 스핀들 홀 뚫기
        ctx.globalCompositeOperation = "destination-out";
        const spindleHoleR = size * 0.014;
        ctx.beginPath();
        ctx.arc(cx, cy, spindleHoleR, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        // 7. 전체 외경 클리핑
        ctx.globalCompositeOperation = "destination-in";
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }

      const resultBase64 = canvas.toDataURL("image/png").split(",")[1];
      resolve(resultBase64);
    };

    img.onerror = (err) => reject(new Error("이미지 로드 실패: " + err));
    img.src = imageBase64.startsWith("data:") ? imageBase64 : `data:image/png;base64,${imageBase64}`;
  });
}
