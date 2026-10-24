// PDF 미리보기(pdfjs-dist) 작업자 파일을 public/pdf/로 복사한다(빌드·개발 전 자동 실행, 저장소에는 넣지 않음).
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "pdf");
mkdirSync(out, { recursive: true });
copyFileSync(join(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs"), join(out, "pdf.worker.min.mjs"));
console.log("pdf.worker.min.mjs → public/pdf/");
