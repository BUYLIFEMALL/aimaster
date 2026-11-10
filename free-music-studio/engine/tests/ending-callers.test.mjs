// 곡 끝 처리 호출부 시험(0.8.4, 2026-11-10 Admin PC 실물 시험 실패) — ending.mjs 시험은 문자열 "ffmpeg"를 직접 넘겨서,
// 호출하는 쪽(gateway.mjs·main.mjs)이 「ffmpeg가 있는가」 참·거짓 값을 실행 파일 자리에 넘긴 실수를 잡지 못했다.
// 0.8.3: 끝 이어 만들기는 「The "file" argument must be of type string. Received type boolean (true)」, 끝 자동 줄이기는 catch가 삼켜 한 번도 안 됨.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const src = (name) => readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", name), "utf8");

/** 소스에서 fn({ ... }) 호출마다 ffmpeg 인자 식을 뽑는다 */
function ffmpegArgs(code, fn) {
  const out = [];
  const re = new RegExp(`\\b${fn}\\(\\{([^}]*)\\}`, "g");
  for (const m of code.matchAll(re)) {
    const arg = /(?:^|,)\s*ffmpeg\s*(?::\s*([^,]+))?/.exec(m[1]);
    out.push(arg ? (arg[1] ?? "ffmpeg(줄임)").trim() : null);
  }
  return out;
}

// 실행 파일 이름(문자열)을 넘기는 식만 허용 — "ffmpeg" 또는 조건 ? "ffmpeg" : null
const okExpr = (e) => /^"ffmpeg"$/.test(e) || /\?\s*"ffmpeg"\s*:\s*null$/.test(e);

for (const [file, fn] of [
  ["gateway.mjs", "prepareExtendSource"],
  ["main.mjs", "smoothEnding"],
  ["gateway.mjs", "audioWaveform"],
]) {
  test(`${file} ${fn} — ffmpeg 자리에 실행 파일 이름을 넘긴다`, () => {
    const code = src(file);
    const args = fn === "audioWaveform" ? [...code.matchAll(/audioWaveform\([^,]+,\s*\{\s*ffmpeg:\s*([^,]+),/g)].map((m) => m[1].trim()) : ffmpegArgs(code, fn);
    assert.ok(args.length > 0, `${fn} 호출을 찾지 못했습니다`);
    for (const a of args) assert.ok(a && okExpr(a), `${fn}에 넘기는 ffmpeg 값이 실행 파일 이름이 아닙니다: ${a}`);
  });
}
