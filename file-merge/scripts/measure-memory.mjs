// 큰 파일 메모리·시간 실측(v1.04). 사용: node --expose-gc --import tsx scripts/measure-memory.mjs <행 수> <파일 수>
// 브라우저 Worker와 같은 처리 코드(sheetStore.handle)를 Node에서 돌려 단계별 힙·전체 메모리를 잰다(브라우저 수치와 비슷한 규모 참고용).
import * as XLSX from "xlsx";
import { handle } from "../src/lib/files/sheetStore.ts";

const ROWS = Number(process.argv[2] || 100000), FILES = Number(process.argv[3] || 3), COLS = 10;
const mb = (n) => Math.round(n / 1048576);
const snap = (label, t0) => { global.gc?.(); const m = process.memoryUsage(); console.log(`${label.padEnd(26)} heap ${String(mb(m.heapUsed)).padStart(5)}MB  rss ${String(mb(m.rss)).padStart(5)}MB  ${t0 ? ((performance.now() - t0) / 1000).toFixed(1) + "s" : ""}`); };

function make(seed) {
  const aoa = [["번호", "이름", "지역", "금액", "날짜", "메모", "c7", "c8", "c9", "c10"]];
  for (let i = 0; i < ROWS; i++) aoa.push([i, "이름" + (i % 5000), ["서울", "부산", "대구"][i % 3], (i * seed) % 100000, new Date(2026, 0, 1 + (i % 365)), "메모" + (i % 97), i % 7, i % 11, "x" + (i % 13), seed]);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa, { cellDates: true }), "S");
  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx", compression: true }));
}

snap("시작");
const files = Array.from({ length: FILES }, (_, i) => make(i + 1));
console.log(`파일 ${FILES}개 × ${ROWS.toLocaleString()}행 × ${COLS}열, 파일 크기 ${files.map((f) => (f.byteLength / 1048576).toFixed(1) + "MB").join(", ")}`);
snap("시험 파일 생성 후");
let t = performance.now();
files.forEach((f, i) => handle({ op: "load", fileId: "f" + i, name: `f${i}.xlsx`, bytes: f.buffer.slice(0), enc: "auto" }));
snap("읽기(보관) 후", t);
const picks = files.map((_, i) => ({ fileId: "f" + i, fileName: `f${i}.xlsx`, sheet: 0 }));
t = performance.now();
const p = handle({ op: "mergePreview", picks, headerRow: 1, addSource: true, shape: { cols: null, dedupe: true }, limit: 20 });
snap(`미리보기(${p.total.toLocaleString()}행)`, t);
t = performance.now();
const w = handle({ op: "mergeWrite", picks, headerRow: 1, addSource: true, shape: { cols: null, dedupe: false }, format: "xlsx" });
snap(`저장 xlsx ${(w.bytes.byteLength / 1048576).toFixed(1)}MB`, t);
if (process.argv[4] === "style") {
  t = performance.now();
  const s = await handle({ op: "mergeWrite", picks, headerRow: 1, addSource: true, shape: { cols: null, dedupe: false }, format: "xlsx", style: Object.fromEntries(files.map((f, i) => ["f" + i, f.buffer.slice(0)])) });
  snap(`서식 유지 저장 ${(s.bytes.byteLength / 1048576).toFixed(1)}MB`, t);
}
