import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { uploadPathMessage, applyFinalMessage, appliedPath, applyFinalSignature, SIG_VERSION } from "../src/lib/applySignature.ts";

// 메이커 M3 1차(2026-11-19, Master msg_617ae29305b4) — 서명 형식 단위 시험. 열쇠는 합성 값만(실제 열쇠·파일·설정 0).
// SQL 쪽과 같은 값인지는 scripts/check-0107-local.mjs X1이 격리 DB에서 대조한다.
const KEY = createHash("sha256").update("qa-0107-synthetic-key").digest("base64");
const F = { kid: "k1", storeId: "00000000-0000-0000-0000-00000000005a", productId: "00000000-0000-0000-0000-0000000000f1",
  proposalId: "00000000-0000-4000-8000-0000000000c1", applyId: "00000000-0000-4000-8000-0000000000d1",
  uid: "00000000-0000-0000-0000-0000000000b3", role: "operator", sha256: "ab".repeat(32) };
const FF = { ...F, size: 4000, exp: 1900000000 };

test("두 목적 원문은 버전·목적 글자로 시작하고 서로 다르다", () => {
  const up = uploadPathMessage(F), fin = applyFinalMessage(FF);
  assert.ok(up.startsWith(`${SIG_VERSION}|upload-path|k1|`));
  assert.ok(fin.startsWith(`${SIG_VERSION}|apply-final|k1|`));
  assert.equal(up.split("|").length, 10);
  assert.equal(fin.split("|").length, 12);
  assert.notEqual(up, fin.split("|").slice(0, 10).join("|"));
});

test("필드 형식이 엄격해 「|」·대문자·다른 역할이 끼어들 수 없다", () => {
  for (const bad of [{ kid: "k|1" }, { kid: "K1" }, { kid: "" }, { storeId: F.storeId.toUpperCase() }, { uid: "x|y" },
    { role: "admin" }, { role: "operator|supplier" }, { sha256: "AB".repeat(32) }, { sha256: "ab".repeat(31) }]) {
    assert.throws(() => uploadPathMessage({ ...F, ...bad }), undefined, JSON.stringify(bad));
    assert.throws(() => applyFinalMessage({ ...FF, ...bad }), undefined, JSON.stringify(bad));
  }
  for (const bad of [{ size: 0 }, { size: 5 * 1024 * 1024 + 1 }, { size: 1.5 }, { exp: 0 }, { exp: 1e10 }, { exp: 1.2 }]) {
    assert.throws(() => applyFinalMessage({ ...FF, ...bad }), undefined, JSON.stringify(bad));
  }
});

test("열쇠는 32바이트만", () => {
  assert.throws(() => appliedPath(Buffer.alloc(31).toString("base64"), F));
  assert.throws(() => applyFinalSignature(Buffer.alloc(33).toString("base64"), FF));
  assert.doesNotThrow(() => appliedPath(KEY, F));
});

test("최종 서명은 크기·만료·역할·호출자마다 바뀌고, 같은 입력이면 같다", () => {
  const base = applyFinalSignature(KEY, FF);
  assert.match(base, /^[0-9a-f]{64}$/);
  assert.equal(applyFinalSignature(KEY, { ...FF }), base);
  for (const d of [{ size: 4001 }, { exp: 1900000001 }, { role: "supplier" }, { uid: "00000000-0000-0000-0000-0000000000a1" }, { applyId: "00000000-0000-4000-8000-0000000000d2" }]) {
    assert.notEqual(applyFinalSignature(KEY, { ...FF, ...d }), base, JSON.stringify(d));
  }
});

test("게시 경로 형식이 0107 올리기 정책의 정규식과 맞고, 다른 sha면 서명 칸이 바뀐다", () => {
  const sql = readFileSync(new URL("../supabase/migrations/0107_photo_apply.sql", import.meta.url), "utf8");
  const m = sql.match(/regexp_match\(coalesce\(p_name, ''\), '([^']+)'\)/);
  assert.ok(m, "0107 정책 정규식");
  const re = new RegExp(m[1]);
  const p = appliedPath(KEY, F);
  assert.match(p, re);
  assert.ok(p.startsWith(`${F.storeId}/${F.applyId}.k1.${F.sha256}.`));
  const q = appliedPath(KEY, { ...F, sha256: "cd".repeat(32) });
  assert.notEqual(q.split(".")[3], p.split(".")[3]);
});

test("서명 모듈은 브라우저 화면 파일에서 불러오지 않는다", () => {
  const src = new URL("../src/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  const walk = (d) => readdirSync(d).flatMap((n) => { const f = join(d, n); return statSync(f).isDirectory() ? walk(f) : [f]; });
  const users = walk(src).filter((f) => /\.(t|j)sx?$/.test(f) && /applySignature/.test(readFileSync(f, "utf8")) && !f.endsWith("applySignature.ts"));
  for (const f of users) assert.ok(!/^\s*["']use client["']/m.test(readFileSync(f, "utf8")), `${f}는 client 파일`);
});
