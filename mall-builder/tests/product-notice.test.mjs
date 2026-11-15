// 실행: node --test tests/   — M2-4 상품정보제공고시·KC 인증(2026-11-15)
import { test } from "node:test";
import assert from "node:assert/strict";
import { KC_NONE, NOTICE_TYPES, parseKc, parseNotice, readKc, readNotice, templateItems } from "../src/lib/productNotice.ts";

test("서식: 품목군마다 항목이 있고 기타 재화가 첫째", () => {
  assert.equal(NOTICE_TYPES[0], "기타 재화");
  for (const t of NOTICE_TYPES) assert.ok(templateItems(t).length >= 5, t);
  assert.deepEqual(templateItems("없는 품목"), []);
});

test("고시 검사: 비우면 없음, 품목군 확인, 빈 줄 건너뜀, 값 하나는 필수", () => {
  assert.deepEqual(parseNotice(""), { ok: true, value: {} });
  assert.deepEqual(parseNotice(JSON.stringify({ type: "" })), { ok: true, value: {} });
  assert.equal(parseNotice(JSON.stringify({ type: "자동차", items: [] })).ok, false);
  assert.equal(parseNotice("{깨진").ok, false);
  assert.match(parseNotice(JSON.stringify({ type: "의류", items: [{ label: "색상", value: "" }] })).error, /1개 이상/);
  const r = parseNotice(JSON.stringify({ type: "의류", items: [{ label: " 색상 ", value: " 검정 " }, { label: "", value: "" }, { label: "치수", value: "" }] }));
  assert.deepEqual(r, { ok: true, value: { type: "의류", items: [{ label: "색상", value: "검정" }, { label: "치수", value: "" }] } });
  assert.match(parseNotice(JSON.stringify({ type: "의류", items: [{ label: "", value: "값만" }] })).error, /이름이 빈/);
  const many = Array.from({ length: 31 }, (_, i) => ({ label: `칸${i}`, value: "x" }));
  assert.match(parseNotice(JSON.stringify({ type: "의류", items: many })).error, /30개/);
  assert.equal(parseNotice(JSON.stringify({ type: "의류", items: [{ label: "소재", value: "a".repeat(600) }] })).value.items[0].value.length, 500);
});

test("KC 검사: 해당 없음은 한 줄, 구분·번호 형식", () => {
  assert.deepEqual(parseKc(""), { ok: true, value: [] });
  assert.deepEqual(parseKc(JSON.stringify([{ kind: KC_NONE }, { kind: "안전인증", no: "AB-1234" }])), { ok: true, value: [{ kind: KC_NONE, no: "" }] });
  assert.deepEqual(parseKc(JSON.stringify([{ kind: "안전확인", no: " XU10 0123-45 " }, { kind: "", no: "" }])), { ok: true, value: [{ kind: "안전확인", no: "XU100123-45" }] });
  assert.equal(parseKc(JSON.stringify([{ kind: "가짜인증", no: "1234" }])).ok, false);
  assert.equal(parseKc(JSON.stringify([{ kind: "안전확인", no: "<b>" }])).ok, false);
  assert.match(parseKc(JSON.stringify(Array.from({ length: 11 }, (_, i) => ({ kind: "안전확인", no: `ABCD${i}` })))).error, /10개/);
});

test("읽기: 모양이 틀리면 없는 것으로", () => {
  assert.equal(readNotice({}), null);
  assert.equal(readNotice({ type: "의류", items: [{ label: 1 }] }), null);
  assert.deepEqual(readNotice({ type: "의류", items: [{ label: "색상", value: "검정" }] }).items.length, 1);
  assert.deepEqual(readKc("x"), []);
  assert.deepEqual(readKc([{ kind: "안전확인", no: "A1" }, null]), [{ kind: "안전확인", no: "A1" }]);
});
