// 브라우저 UMD 스크립트 동적 로더
const scriptLoaders: Record<string, Promise<any>> = {};

function loadScript(src: string, globalVarName: string): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("브라우저 환경에서만 실행 가능합니다."));
  }

  if (!scriptLoaders[src]) {
    scriptLoaders[src] = new Promise((resolve, reject) => {
      if ((window as any)[globalVarName]) {
        return resolve((window as any)[globalVarName]);
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = true;

      script.onload = () => {
        if ((window as any)[globalVarName]) {
          resolve((window as any)[globalVarName]);
        } else {
          reject(new Error(`스크립트 ${src} 로드 후 전역 객체 ${globalVarName}을 찾을 수 없습니다.`));
        }
      };

      script.onerror = () => {
        reject(new Error(`스크립트 로드 실패: ${src}`));
      };

      document.head.appendChild(script);
    });
  }
  return scriptLoaders[src];
}

async function parsePdf(file: File): Promise<any[]> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;

  const parts: any[] = [
    {
      text: "다음 PDF 문서의 페이지 이미지에서 모든 텍스트 콘텐츠를 추출하세요. 당신의 임무는 이 이미지들에 대해 OCR을 수행하는 것입니다. 텍스트 출력물에서 원본 문서의 구조와 레이아웃을 최대한 보존하세요.",
    },
  ];

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("캔버스 2D 컨텍스트를 가져올 수 없습니다.");
  }

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };
    await (page as any).render(renderContext).promise;

    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const base64Data = imageDataUrl.split(",")[1];

    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: base64Data,
      },
    });

    if (i < numPages) {
      parts.push({ text: `\n--- 페이지 ${i} 끝 ---\n` });
    }
  }

  return parts;
}

async function parseDocx(file: File): Promise<string> {
  const mammoth = await loadScript(
    "https://cdn.jsdelivr.net/npm/mammoth@1.7.2/mammoth.browser.min.js",
    "mammoth"
  );
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

function parseTextBased(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve((event.target?.result as string) || "");
    };
    reader.onerror = () => {
      reject(new Error("파일을 읽는 중 오류가 발생했습니다."));
    };
    reader.readAsText(file);
  });
}

async function parseExcel(file: File): Promise<string> {
  const XLSX = await loadScript(
    "https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js",
    "XLSX"
  );
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "buffer" });
  let fullText = "";
  workbook.SheetNames.forEach((sheetName: string) => {
    const worksheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    fullText += `--- 시트: ${sheetName} ---\n${csv}\n\n`;
  });
  return fullText;
}

export async function parseUploadedFile(file: File): Promise<string | any[]> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "pdf":
      return parsePdf(file);
    case "docx":
      return parseDocx(file);
    case "txt":
    case "md":
    case "csv":
      return parseTextBased(file);
    case "xls":
    case "xlsx":
      return parseExcel(file);
    default:
      throw new Error(`지원하지 않는 파일 형식입니다: .${extension}`);
  }
}
