// v1.57 효과음 합성·박자 맞춤·장면 버전 기록·단어 강조 시험. 실행: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { addCues, estimateBeats, sfxCues, snapToBeat, synth } from "../src/lib/sfx.ts";
import { MAX_VERSIONS, VERSION_GAP_MS, restoreVersion, withVersion, withoutHistory } from "../src/lib/versions.ts";
import { activeWord } from "../src/lib/voice.ts";
import type { ShortsScript } from "../src/lib/script.ts";

test("효과음 4종: 길이가 있고 -1~1 안", () => {
  for (const n of ["whoosh", "pop", "tick", "ding"] as const) {
    const s = synth(n, 48000); assert.ok(s.length > 1000);
    assert.ok(s.every((v) => v >= -1 && v <= 1));
  }
});

test("효과음 자리: 장면 넘기기 직전 휙, 템플릿 카드 태그 소리, 마무리 띵", () => {
  const segs = [{ kind: "intro", start: 0 }, { kind: "card", start: 2 }, { kind: "card", start: 4 }, { kind: "outro", start: 6 }];
  const cues = sfxCues(segs, "stamp");
  assert.deepEqual(cues.filter((c) => c.name === "whoosh").map((c) => c.at), [1.88, 3.88, 5.88]);
  assert.equal(cues.filter((c) => c.name === "pop").length, 2);
  assert.equal(cues.filter((c) => c.name === "ding").length, 1);
  assert.equal(sfxCues(segs).filter((c) => c.name === "pop").length, 0); // 템플릿이 없으면 태그 소리 없음
});

test("박자 추정: 120BPM 딸깍 소리에서 0.5초 간격을 찾고, 조용한 소리는 null", () => {
  const rate = 22050; const sec = 12; const x = new Float32Array(rate * sec);
  for (let b = 0.25; b < sec; b += 0.5) { const at = Math.round(b * rate); for (let i = 0; i < 400; i++) x[at + i] = Math.sin(i / 3) * Math.exp(-i / 80); }
  const beats = estimateBeats(x, rate);
  assert.ok(beats && Math.abs(beats.period - 0.5) < 0.03, JSON.stringify(beats));
  assert.equal(estimateBeats(new Float32Array(rate * 5), rate), null);
});

test("박 맞춤: 0.15초 안이면 박으로, 멀거나 박이 없으면 그대로", () => {
  const b = { period: 0.5, offset: 0.25 };
  assert.equal(snapToBeat(1.2, b), 1.25);
  assert.equal(snapToBeat(1.0, b), 1.0);
  assert.equal(snapToBeat(1.2, null), 1.2);
});

test("효과음 더하기: 넘치지 않게 자른다", () => {
  const ch = [new Float32Array(48000).fill(0.95)];
  addCues(ch, 48000, [{ at: 0.1, name: "pop" }], 1);
  assert.ok(ch[0].every((v) => v <= 1 && v >= -1));
  assert.ok(ch[0].slice(4800, 5000).some((v) => v !== 0.95));
});

const base = (title: string): ShortsScript => ({ topic: "t", category: "", tone: "friendly", format: "product", intro: { eyebrow: "", title, narration: "n" }, cards: [], outro: { title: "o", subtitle: "", cta: [], narration: "n" }, hashtags: [], source: "ai" });

test("버전 기록: 장면이 바뀌면 직전 저장본을 남기고, 디자인만 바뀌면 남기지 않는다", () => {
  const t0 = Date.parse("2026-11-15T00:00:00Z");
  const a = withVersion(null, base("첫 제목"), t0);
  assert.deepEqual(a.history, []);
  const b = withVersion(a, base("둘째 제목"), t0 + VERSION_GAP_MS + 1);
  assert.equal(b.history!.length, 1); assert.equal(b.history![0].snap.intro.title, "첫 제목");
  const c = withVersion(b, { ...base("둘째 제목"), design: { theme: "mint" } }, t0 + 3 * VERSION_GAP_MS);
  assert.equal(c.history!.length, 1);
  const d = withVersion(b, base("셋째 제목"), t0 + VERSION_GAP_MS + 1 + 10); // 마지막 기록에서 1분 안 연속 저장은 기록하지 않음
  assert.equal(d.history!.length, 1);
  // 회원이 보낸 history는 무시(서버 기록이 기준)
  assert.equal(withVersion(c, { ...base("넷째"), history: [] }, t0 + 9 * VERSION_GAP_MS).history!.length, 2);
});

test("버전은 최근 10개까지, 되돌리면 장면만 바뀌고 설정은 유지", () => {
  let s = withVersion(null, base("v0"), 0);
  for (let i = 1; i <= 14; i++) s = withVersion(s, base(`v${i}`), i * (VERSION_GAP_MS + 1));
  assert.equal(s.history!.length, MAX_VERSIONS);
  assert.equal(s.history![0].snap.intro.title, "v13");
  const cur = { ...s, design: { theme: "gold" } };
  const r = restoreVersion(cur, s.history![2]);
  assert.equal(r.intro.title, "v11"); assert.deepEqual(r.design, { theme: "gold" });
  assert.equal("history" in withoutHistory(s), false);
});

test("단어 강조: 낱말 시각이 있으면 그 시각, 없으면 글자 수 비율", () => {
  const words = ["오늘", "출근길", "시원하게"];
  assert.equal(activeWord(words, 1.05, { from: 1, to: 2 }, [1, 1.3, 1.6]), 0);
  assert.equal(activeWord(words, 1.65, { from: 1, to: 2 }, [1, 1.3, 1.6]), 2);
  assert.equal(activeWord(words, 0.5, { from: 1, to: 2 }, [1, 1.3, 1.6]), -1);
  assert.equal(activeWord(words, 1.1, { from: 1, to: 2 }), 0);
  assert.equal(activeWord(words, 1.5, { from: 1, to: 2 }), 1);
  assert.equal(activeWord(words, 1.95, { from: 1, to: 2 }), 2);
});
