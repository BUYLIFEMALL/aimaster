// 무료 지우기(browser-free-erase) 계산 파일을 같은 주소(public/ort/)로 복사 — 묶음에 합치면 하위 작업자가 뜨지 않으므로(docs/ERROR_LESSONS.md 2026-10-24) 같은 출처 정적 파일로 둔다.
// WebGPU 판(ort.webgpu.min.mjs)은 WebGPU가 없으면 같은 파일로 WASM 계산도 한다(asyncify 계산 파일 사용).
import fs from "node:fs";
import path from "node:path";
const src = path.resolve("node_modules/onnxruntime-web/dist");
const dst = path.resolve("public/ort");
fs.mkdirSync(dst, { recursive: true });
for (const f of ["ort.webgpu.min.mjs", "ort-wasm-simd-threaded.asyncify.mjs", "ort-wasm-simd-threaded.asyncify.wasm"]) fs.copyFileSync(path.join(src, f), path.join(dst, f));
console.log("copy-ort: public/ort 준비 완료");
