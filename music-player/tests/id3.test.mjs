import test from "node:test";
import assert from "node:assert/strict";
import { parseId3 } from "../src/lib/player/id3.ts";

const syncsafe = (n) => [(n >> 21) & 127, (n >> 14) & 127, (n >> 7) & 127, n & 127];
function tag(major, frames) {
  const chunks = [];
  for (const [name, data] of frames) {
    const id = major === 2 ? { TIT2: "TT2", TPE1: "TP1", TALB: "TAL", APIC: "PIC" }[name] : name;
    const n = data.length;
    const length = major === 2 ? [n >> 16, (n >> 8) & 255, n & 255] : major === 4 ? syncsafe(n) : [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
    chunks.push(...Buffer.from(id), ...length, ...(major === 2 ? [] : [0, 0]), ...data);
  }
  return Uint8Array.from([73, 68, 51, major, 0, 0, ...syncsafe(chunks.length), ...chunks]).buffer;
}
const legacy = (bytes) => [0, ...bytes];
const title = [179, 187, 32, 180, 171, 191, 161, 32, 186, 184, 191, 169];
const artist = [199, 209, 177, 219, 32, 176, 161, 188, 246];
const album = [197, 215, 189, 186, 198, 174, 32, 190, 217, 185, 252];

for (const version of [2, 3, 4]) {
  test(`ID3v2.${version}: legacy Korean title, artist and album`, () => {
    const result = parseId3(tag(version, [["TIT2", legacy(title)], ["TPE1", legacy(artist)], ["TALB", legacy(album)]]));
    assert.equal(result.title, "내 눈에 보여");
    assert.equal(result.artist, "한글 가수");
    assert.equal(result.album, "테스트 앨범");
  });
}
test("Explicit Korean decoding recovers legacy bytes", () => {
  const file = tag(3, [["TIT2", legacy(title)]]);
  assert.equal(parseId3(file, "korean").title, "내 눈에 보여");
  // Node ICU's EUC-KR mapping differs for CP949 extension bytes.
  // The extension fixture is asserted in actual Edge by tests/browser.mjs.
});
test("Mislabeled UTF-8 and normal declared UTF-8 remain readable", () => {
  const bytes = new TextEncoder().encode("한글 제목 🎵");
  assert.equal(parseId3(tag(3, [["TIT2", legacy(bytes)]])).title, "한글 제목 🎵");
  for (const mode of ["auto", "korean", "latin1"]) assert.equal(parseId3(tag(4, [["TIT2", [3, ...bytes]]]), mode).title, "한글 제목 🎵");
});
test("ASCII and Western names retain their declared encoding", () => {
  for (const name of ["Plain Song", "Björk", "Café", "François", "Österreich", "Mötley Crüe", "© 2026"]) {
    const bytes = Buffer.from(name, "latin1");
    assert.equal(parseId3(tag(3, [["TIT2", legacy(bytes)]])).title, name);
    assert.equal(parseId3(tag(3, [["TIT2", legacy(bytes)]]), "latin1").title, name);
  }
});
test("An ambiguous Western byte pair can be explicitly kept as Latin-1", () => {
  const file = tag(3, [["TIT2", legacy(title)]]);
  assert.equal(parseId3(file, "latin1").title, new TextDecoder("iso-8859-1").decode(Uint8Array.from(title)));
});
test("UTF-16 BOM/endian tags are unaffected by legacy decoding choices", () => {
  const le = Buffer.from("한글 제목", "utf16le");
  const be = Buffer.from(le); be.swap16();
  for (const text of [[1, 255, 254, ...le], [1, 254, 255, ...be], [2, ...be]]) {
    for (const mode of ["auto", "korean", "latin1"]) assert.equal(parseId3(tag(3, [["TIT2", text]]), mode).title, "한글 제목");
  }
});
test("Malformed Korean bytes do not produce replacement characters during forced repair", () => {
  const file = tag(3, [["TIT2", [0, 255]], ["TPE1", [3, ...Buffer.from("Known Artist")]]]);
  assert.equal(parseId3(file, "korean").title, "");
  assert.equal(parseId3(file, "korean").artist, "Known Artist");
  assert.equal(parseId3(tag(3, [["TIT2", [5, 65, 66]]])).title, "");
});
test("Text terminators are trimmed and parsing does not mutate input", () => {
  const file = tag(3, [["TIT2", [0, ...title, 0, 0]]]);
  const original = new Uint8Array(file).slice();
  assert.equal(parseId3(file).title, "내 눈에 보여");
  assert.deepEqual(new Uint8Array(file), original);
});
