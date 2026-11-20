// 글 생성 모델 고정값 시험 (2026-11-20, CC-SNS-01, 주인님 지시 「교체해」).
// 소스 글자만 읽는다 — 실제 호출·네트워크 0. 「그 모델이 실제로 응답한다」는 이 시험으로 알 수 없다.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/lib/gemini.ts", import.meta.url), "utf8");
const catalog = readFileSync(new URL("../../docs/AI_MODEL_CATALOG.md", import.meta.url), "utf8");
const model = /export const TEXT_MODEL = "([^"]+)";/.exec(src)?.[1];

test("글 모델 상수는 하나이고 미리보기 모델이 아니다", () => {
  assert.equal(src.split("export const TEXT_MODEL").length - 1, 1);
  assert.ok(model, "TEXT_MODEL을 찾지 못했습니다");
  assert.doesNotMatch(model, /preview/i);
});

test("글 생성 호출 세 곳이 모두 그 상수를 쓴다(모델 이름을 따로 적은 호출 없음)", () => {
  // generateContent 호출의 model 값만 본다. 이미지 생성은 modelName을 쓰므로 여기 걸리지 않는다.
  const values = [...src.matchAll(/^\s*model:\s*([^,\n]+),/gm)].map((m) => m[1].trim());
  assert.deepEqual(values, ["TEXT_MODEL", "TEXT_MODEL", "TEXT_MODEL"]);
  assert.equal(src.includes('"gemini-3-flash-preview"'), false, "옛 미리보기 모델 이름이 호출에 남아 있습니다");
});

test("그 모델은 모델 선택표의 Gemini 중가 균형(기본값) 추천이다", () => {
  const row = catalog.split("\n").find((l) => l.startsWith("| **중가 균형**"));
  assert.ok(row, "모델 선택표에서 중가 균형 줄을 찾지 못했습니다");
  assert.ok(row.split("|")[2].includes("`" + model + "`"), `선택표의 Gemini 중가 균형 칸에 ${model}이 없습니다`);
});
