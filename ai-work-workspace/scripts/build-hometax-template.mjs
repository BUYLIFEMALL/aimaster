// 홈택스 「전자세금계산서 일괄발급(100건 이하)」 공식 엑셀 양식 → src/server/hometaxTemplate.ts(base64) (2026-11-12)
// 쓰는 법: node scripts/build-hometax-template.mjs <보호를 푼 양식.xlsx>
//   · 홈택스에서 받은 원본(.xls)은 엑셀 보호가 걸려 있어 서버가 바로 못 연다 → 엑셀로 열어 「xlsx로 저장」한 사본을 넣는다.
//   · 문서 속성(작성자·마지막 수정자)은 지운다. 시트 내용·서식·예시 시트는 그대로 둔다.
//   · 홈택스가 양식을 바꾸면 새 양식으로 이 스크립트를 다시 돌리고, receiptsCore의 HOMETAX_HEADERS 시험을 확인한다.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readZip, writeZip } from "../src/server/zipLite.ts";

const src = process.argv[2];
if (!src) {
  console.error("사용법: node scripts/build-hometax-template.mjs <양식.xlsx>");
  process.exit(1);
}
const entries = readZip(readFileSync(src));
for (const e of entries) {
  if (e.name === "docProps/core.xml") {
    e.data = Buffer.from(
      e.data
        .toString("utf8")
        .replace(/<dc:creator>[^<]*<\/dc:creator>/, "<dc:creator></dc:creator>")
        .replace(/<cp:lastModifiedBy>[^<]*<\/cp:lastModifiedBy>/, "<cp:lastModifiedBy></cp:lastModifiedBy>"),
      "utf8",
    );
  }
  if (e.name === "docProps/app.xml") e.data = Buffer.from(e.data.toString("utf8").replace(/<Company>[^<]*<\/Company>/, "<Company></Company>"), "utf8");
}
const sheet1 = entries.find((e) => e.name === "xl/worksheets/sheet1.xml")?.data.toString("utf8") ?? "";
if (!sheet1.includes('<c r="A7" ') || !sheet1.includes('<c r="BG106" ')) throw new Error("엑셀업로드양식 시트의 7~106행 칸을 찾지 못했습니다.");
const b64 = writeZip(entries).toString("base64");
const out = fileURLToPath(new URL("../src/server/hometaxTemplate.ts", import.meta.url));
const lines = b64.match(/.{1,120}/g) ?? [];
writeFileSync(
  out,
  `// 자동 생성 — scripts/build-hometax-template.mjs (손으로 고치지 않음)\n// 홈택스 전자(세금)계산서 일괄발급(100건 이하) 공식 엑셀 양식 「세금계산서등록양식(일반)」, 2026-11-12 홈택스에서 받음(보호만 풀고 xlsx로 저장).\nexport const HOMETAX_TEMPLATE_B64 =\n${lines.map((l) => `  "${l}"`).join(" +\n")};\n`,
);
console.log(`저장: ${out} (${b64.length}자)`);
