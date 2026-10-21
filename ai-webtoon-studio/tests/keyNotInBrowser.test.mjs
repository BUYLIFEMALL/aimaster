// v1.27 회원 키를 브라우저에 두지 않기 — 정적 검사(무료). 화면 코드가 Google을 직접 부르거나 키 원문을 저장·수신하면 실패한다.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../src/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(n) ? [p] : [];
});
const files = walk(root).map((p) => ({ p, s: readFileSync(p, "utf8") }));
const browserSide = files.filter(({ p, s }) => s.startsWith('"use client"') || /lib[\\/](gemini|imageGen|storage)\.ts$/.test(p));

test("화면 쪽 코드가 Google Gemini를 직접 부르지 않는다", () => {
  const bad = browserSide.filter(({ s }) => s.includes("generativelanguage.googleapis.com")).map(({ p }) => p);
  assert.deepEqual(bad, []);
});

test("키 원문 설정값(geminiApiKey)을 저장·전달하지 않는다(옛 값 삭제 코드만 허용)", () => {
  const bad = files.filter(({ p, s }) => s.includes("geminiApiKey") && !/lib[\\/]storage\.ts$/.test(p)).map(({ p }) => p);
  assert.deepEqual(bad, []);
  const storage = files.find(({ p }) => /lib[\\/]storage\.ts$/.test(p)).s;
  assert.match(storage, /delete parsed\.geminiApiKey/);
});

test("키 경로는 등록 여부만 돌려준다", () => {
  const route = files.find(({ p }) => /api[\\/]user[\\/]key[\\/]route\.ts$/.test(p)).s;
  assert.doesNotMatch(route, /key:\s*data\?\.api_key/);
  assert.match(route, /hasKey/);
});

test("AI 대행 경로는 모두 권한 확인 + 서버에서 본인 키를 읽는다", () => {
  for (const name of ["text", "image"]) {
    const route = files.find(({ p }) => new RegExp(`api[\\\\/]ai[\\\\/]${name}[\\\\/]route\\.ts$`).test(p)).s;
    assert.match(route, /checkProgramAccessApi\(\)/);
    assert.match(route, /getMemberGeminiKey\(access\.user\.id\)/);
    assert.match(route, /force-dynamic/);
  }
});
