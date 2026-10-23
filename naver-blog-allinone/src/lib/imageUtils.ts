// 클라이언트 사이드 이미지 압축 및 Base64 변환 유틸리티
export interface UploadedPhoto {
  id: string;
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
  name: string;
  isThumbnail: boolean;
}

export async function processImageFile(file: File): Promise<UploadedPhoto> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const maxWidth = 1280;
        const maxHeight = 1280;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context is not available"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const base64 = dataUrl.split(",")[1];

        resolve({
          id: Math.random().toString(36).substring(2, 9),
          file,
          previewUrl: dataUrl,
          base64,
          mimeType: "image/jpeg",
          name: file.name,
          isThumbnail: false,
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
