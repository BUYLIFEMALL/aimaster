import JSZip from "jszip";

/**
 * 브라우저 로컬에서 TXT, MD, DOCX, 기타 텍스트 파일을 안전하게 파싱합니다.
 */
export async function parseUploadedFile(file: File): Promise<{
  name: string;
  text: string;
  charCount: number;
}> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";

  // 1. DOCX 파싱 (JSZip 활용)
  if (extension === "docx") {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const documentXml = await zip.file("word/document.xml")?.async("text");

      if (!documentXml) {
        throw new Error("DOCX 파일 내 document.xml을 찾을 수 없습니다.");
      }

      // XML 파싱하여 텍스트 추출
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(documentXml, "application/xml");
      const paragraphs = xmlDoc.getElementsByTagName("w:p");
      const textLines: string[] = [];

      for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        const texts = p.getElementsByTagName("w:t");
        let pText = "";
        for (let j = 0; j < texts.length; j++) {
          pText += texts[j].textContent || "";
        }
        if (pText.trim()) {
          textLines.push(pText.trim());
        }
      }

      const fullText = textLines.join("\n\n");
      return {
        name: file.name,
        text: fullText,
        charCount: fullText.length,
      };
    } catch (err: unknown) {
      console.error("DOCX 파싱 에러:", err);
      throw new Error(`DOCX 파일 읽기 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
    }
  }

  // 2. TXT / MD / JSON / 기타 텍스트 파일
  try {
    const text = await file.text();
    return {
      name: file.name,
      text: text.trim(),
      charCount: text.trim().length,
    };
  } catch (err: unknown) {
    throw new Error(`파일 읽기 실패: ${err instanceof Error ? err.message : "텍스트 인코딩 오류"}`);
  }
}
