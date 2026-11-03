import test from "node:test";
import assert from "node:assert/strict";
import { cleanGpuName, judgeBrowserPc } from "../src/lib/pcCheck.ts";

const pc = (o) => ({ os: "windows", arch: "x86", mobile: false, gpu: "", cores: 16, memoryGb: 8, ...o });

test("설치 전 검사: NVIDIA 윈도우는 설치 가능·고품질 예상", () => {
  const r = judgeBrowserPc(pc({ gpu: "NVIDIA GeForce RTX 5080" }));
  assert.equal(r.verdict, "ok");
  assert.match(r.expected, /고품질/);
});

test("설치 전 검사: 내장 그래픽 윈도우는 주의·CPU 모드 예상", () => {
  const r = judgeBrowserPc(pc({ gpu: "Intel(R) Arc(TM) Graphics" }));
  assert.equal(r.verdict, "warn");
  assert.match(r.expected, /CPU 모드/);
});

test("설치 전 검사: 휴대폰·Intel 맥·ARM 윈도우는 설치 불가", () => {
  assert.equal(judgeBrowserPc(pc({ os: "android", mobile: true })).verdict, "fail");
  assert.equal(judgeBrowserPc(pc({ os: "mac", arch: "x86", gpu: "Intel Iris Plus" })).verdict, "fail");
  assert.equal(judgeBrowserPc(pc({ arch: "arm" })).verdict, "fail");
  assert.equal(judgeBrowserPc(pc({ memoryGb: 4 })).verdict, "fail");
});

test("설치 전 검사: Apple Silicon 맥은 표준 구성", () => {
  const r = judgeBrowserPc(pc({ os: "mac", arch: "arm", gpu: "Apple M2" }));
  assert.equal(r.verdict, "ok");
  assert.match(r.expected, /표준/);
});

test("그래픽카드 이름 다듬기", () => {
  assert.equal(cleanGpuName("ANGLE (NVIDIA, NVIDIA GeForce RTX 5080 (0x00002C02) Direct3D11 vs_5_0 ps_5_0, D3D11)"), "NVIDIA GeForce RTX 5080");
  assert.equal(cleanGpuName("ANGLE (Intel, Intel(R) Arc(TM) Graphics (0x00007D55) Direct3D11 vs_5_0 ps_5_0, D3D11)"), "Intel(R) Arc(TM) Graphics");
  assert.equal(cleanGpuName("Apple M2"), "Apple M2");
});
