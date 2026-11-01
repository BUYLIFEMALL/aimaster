// 콘텐츠 제작 병합(블로그 ④, v2.22): 무압축 ZIP 작성기 — CRC32, 실제 unzip으로 풀어 내용 대조(unzip이 없는 PC에서는 그 시험만 건너뜀).
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crc32, zipStore } from "../lib/zipStore.ts";

const hasUnzip = (() => { try { execFileSync("unzip", ["-v"], { stdio: "ignore" }); return true; } catch { return false; } })();

test("crc32 matches the standard check value", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
  assert.equal(crc32(new Uint8Array()), 0);
});

test("zipStore: signatures, entry count and sizes", () => {
  const zip = zipStore([{ name: "a.txt", data: new TextEncoder().encode("hi") }]);
  const v = new DataView(zip.buffer);
  assert.equal(v.getUint32(0, true), 0x04034b50);
  assert.equal(v.getUint16(6, true), 0x0800); // UTF-8 이름
  const end = zip.length - 22;
  assert.equal(v.getUint32(end, true), 0x06054b50);
  assert.equal(v.getUint16(end + 10, true), 1);
});

const hasPython = (() => { try { execFileSync("python3", ["-c", "import zipfile"], { stdio: "ignore" }); return true; } catch { return false; } })();

// 실제 프로그램 구성과 같은 영문 이름(index.html·article.md·images/NN.png) — 운영체제 기본 unzip으로 풀어 대조
test("zipStore: real unzip reads the package files back unchanged", { skip: !hasUnzip && "unzip 없음" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "zipstore-"));
  try {
    const image = Uint8Array.from({ length: 5000 }, (_, i) => (i * 37) % 256);
    const zipPath = join(dir, "out.zip");
    writeFileSync(zipPath, zipStore([{ name: "index.html", data: new TextEncoder().encode("<h2>가을 캠핑 준비물</h2>") }, { name: "article.md", data: new TextEncoder().encode("# 제목") }, { name: "images/01.png", data: image }]));
    execFileSync("unzip", ["-tq", zipPath]);
    execFileSync("unzip", ["-q", zipPath, "-d", join(dir, "x")]);
    assert.deepEqual(new Uint8Array(readFileSync(join(dir, "x", "images", "01.png"))), image);
    assert.equal(readFileSync(join(dir, "x", "index.html"), "utf8"), "<h2>가을 캠핑 준비물</h2>");
    assert.equal(readFileSync(join(dir, "x", "article.md"), "utf8"), "# 제목");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// 한글 이름은 UTF-8 표시(비트 11)를 따르는 표준 해석기로 확인(맥 기본 unzip 6.0은 이 표시를 무시해 한글을 깨뜨림 — 프로그램은 영문 이름만 씀)
test("zipStore: Korean file names are UTF-8 flagged and read back by a standard reader", { skip: !hasPython && "python3 없음" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "zipstore-"));
  try {
    const zipPath = join(dir, "ko.zip");
    writeFileSync(zipPath, zipStore([{ name: "메모.txt", data: new TextEncoder().encode("한글") }]));
    const out = execFileSync("python3", ["-c", "import sys,zipfile;z=zipfile.ZipFile(sys.argv[1]);i=z.infolist()[0];assert z.testzip() is None;print(i.filename, i.flag_bits & 0x800, z.read(i).decode())", zipPath], { encoding: "utf8" }).trim();
    assert.equal(out, "메모.txt 2048 한글");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
