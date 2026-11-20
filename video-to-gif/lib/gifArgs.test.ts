// 실행: node --test lib/gifArgs.test.ts
// 2026-11-20 MOV-GIF-V4-EMPTY-OUTPUT — 화면 녹화본(중간에 크기가 바뀜)이 0바이트 「완료」로 나가던 문제 회귀
// A2(맥미니 P2): 단계별 종료코드, 실패 산출물 정리, GIF 최소 구조(이미지 1장 이상 + 끝 표시) 검사
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EMPTY_OUTPUT_MESSAGE, INPUT_SAFETY_ARGS, SCRATCH_FILES, gifOutputError, inspectGif, stepExitError, videoInputArgs } from "./gifArgs.ts";

// ── 규격대로 직접 만든 GIF 바이트(외부 도구 없이) ─────────────────────────────
const HEADER = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]; // GIF89a
const LSD_GCT2 = [0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00]; // 1x1, 전역 색표 있음(2색)
const GCT2 = [0x00, 0x00, 0x00, 0xff, 0xff, 0xff];
const IMAGE = [0x2c, 0, 0, 0, 0, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00]; // 서술자 + LZW 2 + 데이터 2바이트 + 0
const GCE = [0x21, 0xf9, 0x04, 0x00, 0x0a, 0x00, 0x00, 0x00]; // 장면 지연 0.1초
const LOOP = [0x21, 0xff, 0x0b, ..."NETSCAPE2.0".split("").map((c) => c.charCodeAt(0)), 0x03, 0x01, 0x00, 0x00, 0x00];
const TRAILER = [0x3b];
const gif = (...parts: number[][]) => new Uint8Array(parts.flat());
const SINGLE = gif(HEADER, LSD_GCT2, GCT2, IMAGE, TRAILER);
const ANIMATED = gif(HEADER, LSD_GCT2, GCT2, LOOP, GCE, IMAGE, GCE, IMAGE, GCE, IMAGE, TRAILER);

test("영상 입력 앞에 -reinit_filter 0, 구간 인자는 그 앞 그대로", () => {
  assert.deepEqual([...INPUT_SAFETY_ARGS], ["-reinit_filter", "0"]);
  assert.deepEqual(videoInputArgs([], "input.webm"), ["-reinit_filter", "0", "-i", "input.webm"]);
  assert.deepEqual(videoInputArgs(["-ss", "1.5", "-t", "3"], "input.mp4"), ["-ss", "1.5", "-t", "3", "-reinit_filter", "0", "-i", "input.mp4"]);
});

test("정상 GIF: 단일 장면·애니메이션(반복 확장·장면 지연 포함)은 통과, 이미지 수를 센다", () => {
  assert.deepEqual(inspectGif(SINGLE), { ok: true, images: 1 });
  assert.deepEqual(inspectGif(ANIMATED), { ok: true, images: 3 });
  assert.equal(gifOutputError(SINGLE), null);
  assert.equal(gifOutputError(ANIMATED), null);
  const gif87 = SINGLE.slice(); gif87[4] = 0x37; // GIF87a
  assert.equal(gifOutputError(gif87), null);
});

test("불완전한 GIF는 모두 오류: 빈 파일·머리글만·GIF 아님·이미지 없음·끝 표시 없음·중간 잘림·이미지 데이터 0", () => {
  const cases: [string, Uint8Array | null][] = [
    ["empty", new Uint8Array(0)],
    ["empty", null],
    ["truncated-header", gif(HEADER)],
    ["not-gif", new TextEncoder().encode("\x89PNG\r\n\x1a\n.......")],
    ["no-image", gif(HEADER, LSD_GCT2, GCT2, LOOP, TRAILER)],
    ["no-trailer", gif(HEADER, LSD_GCT2, GCT2, IMAGE)],
    ["truncated-image", gif(HEADER, LSD_GCT2, GCT2, IMAGE.slice(0, 6))],
    ["truncated-image", gif(HEADER, LSD_GCT2, GCT2, IMAGE.slice(0, 13))],
    ["truncated-extension", gif(HEADER, LSD_GCT2, GCT2, LOOP.slice(0, 8))],
    ["empty-image-data", gif(HEADER, LSD_GCT2, GCT2, [0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0x02, 0x00], TRAILER)],
    ["bad-block", gif(HEADER, LSD_GCT2, GCT2, [0x99], TRAILER)],
  ];
  for (const [reason, bytes] of cases) {
    assert.deepEqual(inspectGif(bytes), { ok: false, reason }, reason);
    assert.equal(gifOutputError(bytes), EMPTY_OUTPUT_MESSAGE, reason);
  }
  // 애니메이션 중간에서 잘린 경우(앞 장면은 멀쩡해도 끝 표시가 없으면 오류)
  assert.equal(inspectGif(ANIMATED.slice(0, ANIMATED.length - 10)).ok, false);
});

test("단계 종료코드: 0만 통과, 1·음수·없음은 단계 이름을 담은 오류", () => {
  assert.equal(stepExitError(0, "palettegen"), null);
  assert.equal(stepExitError(0, "paletteuse"), null);
  assert.match(stepExitError(1, "paletteuse")!, /「GIF 만들기」 단계가 실패.*종료코드 1/);
  assert.match(stepExitError(-558323010, "palettegen")!, /「색상표 만들기」.*종료코드 -558323010/);
  assert.match(stepExitError(null, "paletteuse")!, /종료코드 없음/);
  assert.deepEqual([...SCRATCH_FILES], ["output.gif", "palette.png"]);
});

// 화면 연결 구조(브라우저 없이 소스로 고정)
const src = readFileSync(new URL("../components/ConverterWorkspace.tsx", import.meta.url), "utf8");

test("변환 화면: 브라우저 변환 세 실행 모두 videoInputArgs, 색상표 png 입력은 그대로", () => {
  assert.equal((src.match(/\.\.\.videoInputArgs\(trim\.args, inputName\)/g) || []).length, 3, "palettegen·paletteuse·single pass");
  assert.doesNotMatch(src, /\.\.\.trim\.args, "-i", inputName/, "예전 입력 인자가 남으면 안 됨");
  assert.match(src, /"-i", "palette\.png"/);
});

test("변환 화면 A2: 두 단계 종료코드를 각각 확인하고 실패하면 던진다", () => {
  const two = src.slice(src.indexOf("const twoPass ="), src.indexOf("const singlePass ="));
  assert.match(two, /const genCode = await ffmpeg\.exec\(/);
  assert.match(two, /stepExitError\(genCode, "palettegen"\)/);
  assert.match(two, /const useCode = await ffmpeg\.exec\(/);
  assert.match(two, /stepExitError\(useCode, "paletteuse"\)/);
  assert.ok(two.indexOf('stepExitError(genCode') < two.indexOf("const useCode"), "색상표가 실패하면 GIF 단계로 가지 않음");
  assert.match(src, /if \(code !== 0\) await twoPass\(/, "한 번에 방식이 0이 아니면 두 단계로 대체(기존)");
});

test("변환 화면 A2: 시도 전과 실패 뒤 임시 파일 정리", () => {
  const loop = src.slice(src.indexOf("for (let index = 0, attempt = 0;"), src.indexOf('ffmpeg.on("progress", handler);'));
  assert.match(loop, /for \(const name of SCRATCH_FILES\) await ffmpeg\.deleteFile\(name\)/, "시도마다 지우고 시작");
  const fail = src.slice(src.indexOf("finishJob(job.id, outputBytes, stepFps);"), src.indexOf("async function start()"));
  assert.match(fail, /for \(const name of SCRATCH_FILES\) await engine\.deleteFile\(name\)/, "실패 뒤 정리");
});

test("변환 화면: 결과 검사로 빈·불완전 GIF는 완료로 가지 않음 — finishJob 앞, 내 PC 렌더러 실패는 브라우저로 대체", () => {
  const fn = src.slice(src.indexOf("function finishJob("), src.indexOf("function finishJob(") + 600);
  assert.match(fn, /const bad = gifOutputError\(outputBytes\);/);
  assert.match(fn, /status: "error", error: bad/);
  assert.ok(fn.indexOf("gifOutputError") < fn.indexOf("createObjectURL"), "다운로드 주소를 만들기 전에 검사");
  const local = src.slice(src.indexOf("async function convertLocal("), src.indexOf("async function convertOne("));
  assert.match(local, /const localBad = gifOutputError\(results\.get\(index\)\);\s*if \(localBad\) throw new Error\(localBad\);/);
  const one = src.slice(src.indexOf("async function convertOne("), src.indexOf("async function convertOne(") + 1800);
  assert.match(one, /await convertLocal\(job\);\s*return;\s*\} catch \(error\) \{/, "내 PC 실패는 catch로 받아");
  assert.match(one, /브라우저 변환으로 바꿨습니다/, "브라우저 변환으로 넘어감(TooBigError만 바로 오류)");
});
