import fs from "node:fs";

const js = fs.readFileSync("D:/Antigravity/AIMaster/scratch/prompt-master-scrape/index-BHOxI2aX.js", "utf8");
console.log("JS Size:", js.length, "bytes");

// 1. Search for keywords: default prompts, categories, storage, models
const keywords = [
  "이메일 초안 작성",
  "PDS",
  "변수",
  "라이브러리 백업",
  "환경 설정",
  "Gemini",
  "models",
  "zustand",
  "localStorage",
  "export",
  "import",
];

for (const kw of keywords) {
  const count = (js.match(new RegExp(kw, "g")) || []).length;
  console.log(`Keyword '${kw}': ${count} occurrences`);
}

// 2. Extract preset prompts data if possible
// Look for JSON or objects containing "이메일 초안 작성"
const idx = js.indexOf("이메일 초안 작성");
if (idx !== -1) {
  const start = Math.max(0, idx - 500);
  const end = Math.min(js.length, idx + 3000);
  console.log("\n--- Context around '이메일 초안 작성' ---");
  console.log(js.substring(start, end));
}
