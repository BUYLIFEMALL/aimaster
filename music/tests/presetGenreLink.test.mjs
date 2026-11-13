import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { LIBRARY } from "../lib/studio/catalog.ts";
import { linkPresetGenre, linkedGenreText } from "../lib/studio/presetGenreLink.ts";

const metadata = JSON.parse(fs.readFileSync(new URL("../lib/studio/catalog-metadata.json", import.meta.url), "utf8"));
const old = LIBRARY.filter((p) => p.type === "template" || p.type === "reference");

test("v1.57: 기존 461개 프리셋의 id·이름·그룹·시대는 그대로", () => {
  assert.equal(old.length, 461);
  assert.deepEqual(
    old.map((p) => [p.id, p.name, p.group, p.eras.join()]),
    metadata.map((p) => [p.id, p.name, p.group, p.eras.join()]),
  );
});

test("v1.57: 공식 장르 연결로 Style이 구체화된다(조합 150+, 기본값 pop 10개 이하, 배지 440+)", () => {
  const combos = new Set(old.map((p) => `${p.genre}|${p.mood}|${p.instruments}`));
  assert.ok(combos.size >= 150, `조합 ${combos.size}`);
  const fallback = old.filter((p) => p.genre === "pop" && p.mood === "expressive, balanced");
  assert.ok(fallback.length <= 10, `기본값 ${fallback.length}`);
  assert.ok(fallback.every((p) => /템플릿/.test(p.name)), "기본값은 연대별 템플릿만");
  assert.ok(old.filter((p) => p.sunoGenre).length >= 440);
});

test("v1.57: 링크된 공식 장르 프리셋이 실제로 있고, 약한 연결은 Style을 바꾸지 않는다", () => {
  const ids = new Set(LIBRARY.map((p) => p.id));
  for (const p of old) {
    if (!p.sunoGenre) continue;
    assert.ok(ids.has(`suno-${p.sunoGenre.slug}`), p.name);
    if (p.sunoGenre.weak) assert.doesNotMatch(p.genre, /soundtrack|cinematic/, p.name);
  }
});

test("v1.57: 검토로 고친 연결이 유지된다", () => {
  const cases = [
    ["Daft Punk", "Disco/Electronic/Funk", "electronic"],
    ["딘 / DEAN (얼터너티브 R&B)", "2010년대 한국 힙합 / R&B (지코/박재범/자이언티/딘)", "r-and-b"],
    ["댄스 트로트 (홍진영)", "트로트 (Trot)", "enka"],
    ["노브레인 / 크라잉넛 (펑크/조선펑크)", "2000년대 한국 인디 / 홍대 음악 (장기하/브로콜리너마저/검정치마)", "punk-rock"],
    ["BTS", "K-Pop/Disco-Pop", "k-pop"],
    ["2019 잔나비 풍 인디 록", "시대별 통합 골든 템플릿 (1990s ~ 2010s)", "indie-rock"],
    ["Olivia Rodrigo", "Pop Ballad/Bedroom Pop", "ballad"],
  ];
  for (const [name, group, slug] of cases) assert.equal(linkPresetGenre(name, group)?.genre.slug, slug, name);
  const trot = old.find((p) => p.name === "정통 트로트 (송가인/장윤정)");
  assert.equal(trot.genre, "trot, enka");
  assert.match(trot.instruments, /accordion/);
  assert.doesNotMatch(trot.instruments, /shamisen/);
});

test("v1.57: 장르 칸은 ASCII이고 태그와 공식 이름이 겹치지 않는다", () => {
  for (const p of old) assert.match(p.genre, /^[\x20-\x7E]+$/, p.name);
  const l = linkPresetGenre("Hip-Hop", "Hip-Hop");
  assert.equal(linkedGenreText(l), "hip-hop");
});
