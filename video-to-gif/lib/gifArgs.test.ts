// 실행: node --test lib/gifArgs.test.ts
// 2026-11-20 MOV-GIF-V4-EMPTY-OUTPUT — 화면 녹화본(중간에 크기가 바뀜)이 0바이트 「완료」로 나가던 문제 회귀
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EMPTY_OUTPUT_MESSAGE, INPUT_SAFETY_ARGS, gifOutputError, videoInputArgs } from "./gifArgs.ts";

test("영상 입력 앞에 -reinit_filter 0, 구간 인자는 그 앞 그대로", () => {
  assert.deepEqual([...INPUT_SAFETY_ARGS], ["-reinit_filter", "0"]);
  assert.deepEqual(videoInputArgs([], "input.webm"), ["-reinit_filter", "0", "-i", "input.webm"]);
  assert.deepEqual(videoInputArgs(["-ss", "1.5", "-t", "3"], "input.mp4"), ["-ss", "1.5", "-t", "3", "-reinit_filter", "0", "-i", "input.mp4"]);
});

test("결과 검사: 0바이트·짧음·GIF 아님은 오류, GIF87a/GIF89a는 정상", () => {
  assert.equal(gifOutputError(new Uint8Array(0)), EMPTY_OUTPUT_MESSAGE);
  assert.equal(gifOutputError(null), EMPTY_OUTPUT_MESSAGE);
  assert.equal(gifOutputError(new Uint8Array([0x47, 0x49, 0x46])), EMPTY_OUTPUT_MESSAGE);
  assert.equal(gifOutputError(new TextEncoder().encode("\x89PNG\r\n")), EMPTY_OUTPUT_MESSAGE);
  assert.equal(gifOutputError(new TextEncoder().encode("GIF89a....")), null);
  assert.equal(gifOutputError(new TextEncoder().encode("GIF87a....")), null);
  assert.match(EMPTY_OUTPUT_MESSAGE, /비어 있음/);
});

// 화면 연결 구조(브라우저 없이 소스로 고정): 세 ffmpeg 실행 모두 안전 인자를 쓰고, 빈 결과는 완료로 가지 않는다
test("변환 화면: 브라우저 변환 세 실행 모두 videoInputArgs, 색상표 png 입력은 그대로", () => {
  const src = readFileSync(new URL("../components/ConverterWorkspace.tsx", import.meta.url), "utf8");
  assert.equal((src.match(/\.\.\.videoInputArgs\(trim\.args, inputName\)/g) || []).length, 3, "palettegen·paletteuse·single pass");
  assert.doesNotMatch(src, /\.\.\.trim\.args, "-i", inputName/, "예전 입력 인자가 남으면 안 됨");
  assert.match(src, /"-i", "palette\.png"/);
});

test("변환 화면: finishJob 앞에서 결과를 검사해 빈 결과는 오류(완료·다운로드·보내기 없음) — 브라우저·내 PC 렌더러 공통", () => {
  const src = readFileSync(new URL("../components/ConverterWorkspace.tsx", import.meta.url), "utf8");
  const fn = src.slice(src.indexOf("function finishJob("), src.indexOf("function finishJob(") + 600);
  assert.match(fn, /const bad = gifOutputError\(outputBytes\);/);
  assert.match(fn, /status: "error", error: bad/);
  assert.ok(fn.indexOf("gifOutputError") < fn.indexOf("createObjectURL"), "다운로드 주소를 만들기 전에 검사");
});
