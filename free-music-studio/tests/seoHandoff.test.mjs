import test from "node:test";
import assert from "node:assert/strict";
import { SEO_TEXT_MAX, seoHandoffUrl, songSeoText } from "../src/lib/seoHandoff.ts";

test("곡 → SEO 대본 글(D-7): 노래는 가사 포함, 연주곡은 가사 없음, 길이 표기", () => {
  const v = songSeoText({ title: "달빛 산책", style_prompt: "city pop, 108 BPM", lyrics: "[Verse]\n밤길", duration_sec: 180 });
  assert.match(v, /곡 제목: 달빛 산책/);
  assert.match(v, /노래\(보컬곡\) · 길이 3분/);
  assert.match(v, /음악 스타일: city pop, 108 BPM/);
  assert.match(v, /가사:\n\[Verse\]\n밤길/);
  const i = songSeoText({ title: "비", style_prompt: "lo-fi", lyrics: "[Instrumental]", duration_sec: 95 });
  assert.match(i, /연주곡\(보컬 없음\) · 길이 1분 35초/);
  assert.doesNotMatch(i, /가사:/);
  assert.ok(songSeoText({ title: "x", style_prompt: "", lyrics: "가".repeat(20000), duration_sec: 60 }).length <= SEO_TEXT_MAX);
});

test("SEO 화면 주소: thumbnail-master 받는 형식(#ref-transcript=…&ref-from=…)과 같다", () => {
  const u = seoHandoffUrl({ title: "A&B", style_prompt: "pop", lyrics: "[Instrumental]", duration_sec: 60 });
  assert.ok(u.startsWith("https://thumbnail-master.buylife.xyz/seo#ref-transcript="));
  const hash = u.slice(u.indexOf("#") + 1);
  const parts = Object.fromEntries(hash.split("&").map((p) => { const i = p.indexOf("="); return [p.slice(0, i), decodeURIComponent(p.slice(i + 1))]; }));
  assert.match(parts["ref-transcript"], /곡 제목: A&B/);
  assert.equal(parts["ref-from"], "AI 무료음악 자동화");
});
