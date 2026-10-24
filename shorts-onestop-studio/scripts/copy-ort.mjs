// 무료 음성(browser-free-tts) 계산 파일을 같은 주소(public/ort/)로 복사 — 외부 주소면 여러 줄 계산 작업자가 막힐 수 있어 같은 출처로 둔다.
import fs from "node:fs";
import path from "node:path";
const src = path.resolve("node_modules/onnxruntime-web/dist");
const dst = path.resolve("public/ort");
fs.mkdirSync(dst, { recursive: true });
for (const f of ["ort.wasm.min.mjs", "ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"]) fs.copyFileSync(path.join(src, f), path.join(dst, f));
console.log("copy-ort: public/ort 준비 완료");
