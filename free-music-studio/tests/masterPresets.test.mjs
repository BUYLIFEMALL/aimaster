import test from "node:test";
import assert from "node:assert/strict";
import {
  AI_TONE_RANGES,
  LUFS_CHOICES,
  MASTER_PRESETS,
  MASTER_PRESET_GROUPS,
  PEAK_CHOICES,
  TONE_RANGES,
  aiMasterPrompt,
  cleanAiMaster,
  clampTone,
  isFlatTone,
  searchMasterPresets,
} from "../src/lib/masterPresets.ts";

const inRange = (v, r) => v >= r[0] && v <= r[1];

test("마스터링 프리셋: 90개 이상, 번호·이름 겹침 없음, 모든 값이 엔진 범위·선택지 안", () => {
  assert.ok(MASTER_PRESETS.length >= 90, `프리셋 ${MASTER_PRESETS.length}개`);
  assert.equal(new Set(MASTER_PRESETS.map((p) => p.id)).size, MASTER_PRESETS.length);
  assert.equal(new Set(MASTER_PRESETS.map((p) => p.name)).size, MASTER_PRESETS.length);
  for (const p of MASTER_PRESETS) {
    assert.ok(MASTER_PRESET_GROUPS.includes(p.group), p.id);
    assert.ok(LUFS_CHOICES.includes(p.targetLufs), `${p.id} LUFS ${p.targetLufs}`);
    assert.ok(PEAK_CHOICES.includes(p.truePeak), p.id);
    if (!p.tone) continue;
    for (const k of ["low", "mid", "high", "q"]) assert.ok(inRange(p.tone.eq[k], TONE_RANGES.eq[k]), `${p.id} eq.${k}`);
    for (const k of ["drive", "harmonics"]) assert.ok(inRange(p.tone.saturation[k], TONE_RANGES.saturation[k]), `${p.id} sat.${k}`);
    if (p.tone.compressor) for (const k of ["threshold", "ratio", "attack", "release"]) assert.ok(inRange(p.tone.compressor[k], TONE_RANGES.compressor[k]), `${p.id} comp.${k}`);
    assert.ok(inRange(p.tone.width, TONE_RANGES.width), `${p.id} width`);
  }
});

test("분류: 발라드 10개 이상, 상황별 10개 이상, AI 마스터링 11종(내추럴은 기본과 합침)", () => {
  const n = (g) => MASTER_PRESETS.filter((p) => p.group === g).length;
  assert.ok(n("발라드") >= 10);
  assert.ok(n("상황별") >= 10);
  assert.equal(n("용도·사운드(AI 마스터링)"), 11);
  assert.ok(MASTER_PRESETS.some((p) => p.id === "natural" && p.group === "기본" && p.tone === null && p.character === "gentle"));
  assert.ok(searchMasterPresets("차량").some((p) => p.id === "place-car"));
  assert.ok(searchMasterPresets("", "트로트").every((p) => p.group === "트로트"));
});

test("소리 색깔 정리: 범위 밖은 자르고, 평평하면 보내지 않음", () => {
  const t = clampTone({ eq: { low: 99, mid: -99, high: 1, q: 0 }, saturation: { drive: 5, harmonics: 500 }, compressor: { threshold: 9, ratio: 99, attack: 0, release: 9999 }, width: 999 });
  assert.deepEqual(t.eq, { low: 12, mid: -12, high: 1, q: 0.1 });
  assert.equal(t.saturation.harmonics, 100);
  assert.deepEqual(t.compressor, { threshold: 0, ratio: 10, attack: 1, release: 500 });
  assert.equal(t.width, 200);
  assert.equal(isFlatTone(null), true);
  assert.equal(isFlatTone(clampTone({})), true);
  assert.equal(isFlatTone(t), false);
});

test("AI 응답 정리: 좁은 범위로, 음량·피크는 가까운 선택지로, 형식이 틀리면 null", () => {
  const r = cleanAiMaster({ tone: { eq: { low: 10, mid: 0, high: -9, q: 1 }, saturation: { drive: 1, harmonics: 20 }, compressor: null, width: 200 }, targetLufs: -15, truePeak: -0.8, character: "gentle", explanation: "잔잔하게" });
  assert.equal(r.tone.eq.low, AI_TONE_RANGES.eq.low[1]);
  assert.equal(r.tone.eq.high, AI_TONE_RANGES.eq.high[0]);
  assert.equal(r.tone.width, 130);
  assert.equal(r.tone.compressor, null);
  assert.ok([-16, -14].includes(r.targetLufs));
  assert.equal(r.truePeak, -1);
  assert.equal(r.character, "gentle");
  assert.equal(cleanAiMaster({ tone: "x" }), null);
  assert.equal(cleanAiMaster(null), null);
});

test("AI 안내문: 올해 연도·한국어 설명·선택지가 들어 있다", () => {
  const p = aiMasterPrompt("잔잔한 발라드", 2026, { title: "밤", style: "ballad", instrumental: false });
  assert.match(p.system, /2026년/);
  assert.match(p.system, /KOREAN/);
  assert.match(p.user, /-18, -16, -14, -12, -10, -8/);
  assert.match(p.user, /Song: 밤/);
});
