import test from "node:test";
import assert from "node:assert/strict";
import { formatTime, formatBytes, parseFileName, isAudioFile } from "../src/lib/player/format.ts";
import { nextOf, prevOf, filterSort, nextSort } from "../src/lib/player/queue.ts";
import { clampGain, normalizeGains, EQ_PRESETS, hzLabel } from "../src/lib/player/eq.ts";
import { parseId3 } from "../src/lib/player/id3.ts";

const mk = (id, name, artist = "", duration = 100, addedAt = 0, album = "") => ({ id, name, artist, album, duration, size: 1, mime: "audio/mpeg", addedAt, hasCover: false });

test("시간·용량 표시", () => {
  assert.equal(formatTime(0), "0:00");
  assert.equal(formatTime(65.7), "1:05");
  assert.equal(formatTime(3725), "1:02:05");
  assert.equal(formatTime(NaN), "0:00");
  assert.equal(formatTime(-3), "0:00");
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(1536), "1.5 KB");
  assert.equal(formatBytes(5 * 1024 * 1024), "5.0 MB");
});

test("파일명 해석", () => {
  assert.deepEqual(parseFileName("IU - Love Poem.mp3"), { artist: "IU", name: "Love Poem" });
  assert.deepEqual(parseFileName("01. 봄날.flac"), { artist: "", name: "봄날" });
  assert.deepEqual(parseFileName("BTS - Spring - Day (Live).m4a"), { artist: "BTS", name: "Spring - Day (Live)" });
  assert.deepEqual(parseFileName("my_song_name.wav"), { artist: "", name: "my song name" });
  assert.equal(isAudioFile({ name: "a.MP3", type: "" }), true);
  assert.equal(isAudioFile({ name: "a.txt", type: "text/plain" }), false);
  assert.equal(isAudioFile({ name: "x", type: "audio/ogg" }), true);
});

test("다음 곡: 순서 재생과 끝 처리", () => {
  const order = ["a", "b", "c"];
  const st = { currentId: "a", shuffle: false, repeat: "none", played: [] };
  assert.equal(nextOf(order, st, false).id, "b");
  assert.equal(nextOf(order, { ...st, currentId: "c" }, false).id, null); // 자동 이동: 끝에서 멈춤
  assert.equal(nextOf(order, { ...st, currentId: "c" }, true).id, "a"); // 수동: 처음으로
  assert.equal(nextOf(order, { ...st, currentId: "c", repeat: "all" }, false).id, "a");
  assert.equal(nextOf([], st, false).id, null);
  assert.equal(nextOf(order, { ...st, currentId: null }, false).id, "a");
});

test("셔플: 한 바퀴 동안 중복 없음, 끝나면 멈춤/새 바퀴", () => {
  const order = ["a", "b", "c", "d"];
  let st = { currentId: "a", shuffle: true, repeat: "none", played: [] };
  const seen = new Set(["a"]);
  for (let i = 0; i < 3; i += 1) {
    const r = nextOf(order, st, false, () => 0);
    assert.ok(r.id && !seen.has(r.id));
    seen.add(r.id);
    st = { ...st, currentId: r.id, played: r.played };
  }
  assert.equal(seen.size, 4);
  assert.equal(nextOf(order, st, false).id, null);
  const again = nextOf(order, { ...st, repeat: "all" }, false, () => 0);
  assert.ok(again.id && again.id !== st.currentId);
  assert.deepEqual(again.played, [st.currentId]);
});

test("셔플 한 곡만 있을 때", () => {
  const r = nextOf(["a"], { currentId: "a", shuffle: true, repeat: "all", played: [] }, false);
  assert.equal(r.id, "a");
});

test("이전 곡: 3초 규칙·순환·셔플 기록", () => {
  const order = ["a", "b", "c"];
  const st = { currentId: "b", shuffle: false, repeat: "none", played: [] };
  assert.deepEqual(prevOf(order, st, 10), { id: "b", restart: true, played: [] });
  assert.equal(prevOf(order, st, 1).id, "a");
  assert.equal(prevOf(order, { ...st, currentId: "a" }, 1).id, "c");
  const sh = { currentId: "c", shuffle: true, repeat: "none", played: ["a", "b", "c"] };
  const r = prevOf(order, sh, 0);
  assert.equal(r.id, "b");
  assert.equal(r.restart, false);
});

test("검색·정렬", () => {
  const t = [mk("1", "Zebra", "Alpha", 200, 3), mk("2", "apple", "Beta", 100, 1), mk("3", "Mango", "alpha", 300, 2, "Fruit Album")];
  assert.deepEqual(filterSort(t, "", "name", "asc").map((x) => x.id), ["2", "3", "1"]);
  assert.deepEqual(filterSort(t, "", "name", "desc").map((x) => x.id), ["1", "3", "2"]);
  assert.deepEqual(filterSort(t, "ALPHA", "added", "asc").map((x) => x.id), ["3", "1"]);
  assert.deepEqual(filterSort(t, "fruit", "added", "asc").map((x) => x.id), ["3"]);
  assert.deepEqual(filterSort(t, "", "duration", "desc").map((x) => x.id), ["3", "1", "2"]);
  assert.deepEqual(nextSort("added", "asc"), { key: "name", dir: "asc" });
  assert.deepEqual(nextSort("duration", "desc"), { key: "added", dir: "asc" });
});

test("EQ 값 보정·프리셋", () => {
  assert.equal(clampGain(99), 15);
  assert.equal(clampGain(-99), -15);
  assert.equal(clampGain(1.26), 1.3);
  assert.equal(clampGain(NaN), 0);
  assert.deepEqual(normalizeGains([1, 2]), [1, 2, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(normalizeGains("x"), [0, 0, 0, 0, 0, 0, 0, 0]);
  assert.ok(EQ_PRESETS.every((p) => p.gains.length === 8));
  assert.equal(hzLabel(1000), "1k");
  assert.equal(hzLabel(60), "60");
});

function id3v23(frames) {
  const parts = [];
  for (const [id, body] of frames) {
    const h = new Uint8Array(10);
    h.set(new TextEncoder().encode(id), 0);
    const n = body.length;
    h[4] = (n >>> 24) & 255; h[5] = (n >>> 16) & 255; h[6] = (n >>> 8) & 255; h[7] = n & 255;
    parts.push(h, body);
  }
  const bodyLen = parts.reduce((a, p) => a + p.length, 0);
  const head = new Uint8Array(10);
  head.set([0x49, 0x44, 0x33, 3, 0, 0], 0);
  head[6] = (bodyLen >> 21) & 0x7f; head[7] = (bodyLen >> 14) & 0x7f; head[8] = (bodyLen >> 7) & 0x7f; head[9] = bodyLen & 0x7f;
  const out = new Uint8Array(10 + bodyLen);
  out.set(head, 0);
  let o = 10;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out.buffer;
}
const utf8Text = (s) => new Uint8Array([3, ...new TextEncoder().encode(s)]);

test("ID3v2.3 제목·아티스트·앨범·커버", () => {
  const img = new Uint8Array(32).fill(7);
  const apicBody = new Uint8Array([0, ...new TextEncoder().encode("image/jpeg"), 0, 3, 0, ...img]);
  const buf = id3v23([
    ["TIT2", utf8Text("봄날")],
    ["TPE1", utf8Text("방탄소년단")],
    ["TALB", utf8Text("You Never Walk Alone")],
    ["APIC", apicBody],
  ]);
  const r = parseId3(buf);
  assert.equal(r.title, "봄날");
  assert.equal(r.artist, "방탄소년단");
  assert.equal(r.album, "You Never Walk Alone");
  assert.equal(r.cover.mime, "image/jpeg");
  assert.equal(r.cover.data.length, 32);
});

test("ID3 없음·깨진 데이터는 빈 값", () => {
  assert.deepEqual(parseId3(new ArrayBuffer(4)), { title: "", artist: "", album: "", cover: null });
  const junk = new Uint8Array(100).fill(1).buffer;
  assert.equal(parseId3(junk).title, "");
  const trunc = id3v23([["TIT2", utf8Text("abc")]]).slice(0, 15);
  assert.equal(parseId3(trunc).title, "");
});
