import { UploadedImage } from "@/types/product";

const MAX_DIMENSION = 1024; // Claude API 토큰 절약을 위해 최대 1024px로 리사이징

export function fileToBase64(file: File): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // 최대 크기 초과시 비율 유지하며 축소
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);

        // JPEG로 변환 (품질 0.85, 용량 절감)
        const resizedBase64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
        resolve({
          base64: resizedBase64,
          mediaType: "image/jpeg",
          name: file.name,
        });
      };
      img.onerror = reject;
      img.src = result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function validateImageFile(file: File): string | null {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return "JPEG, PNG, WebP, GIF 형식만 지원합니다.";
  }
  if (file.size > 10 * 1024 * 1024) {
    return "파일 크기는 10MB 이하여야 합니다.";
  }
  return null;
}
