import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { applyProposal, looksLikeJpeg, APPLY_TEXT, APPLY_MAX_BYTES } from "../src/lib/mallPhotoApply.ts";
import { appliedPath, appliedPublicUrl, applyFinalSignature } from "../src/lib/applySignature.ts";

// 메이커 M3 서버 적용 경로 로컬 후보(2026-11-19, Master msg_1984d921b251) — 합성 파일·가짜 Storage/RPC·모의 디코더만.
// 실제 DB·Storage·sharp·열쇠·네트워크 0. 열쇠는 합성 값.
const KEY = createHash("sha256").update("qa-m3-server-synthetic-key").digest("base64");
const ORIGIN = "https://qa.supabase.test";
const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const PROPOSAL = U(10), STORE = U(1), PRODUCT = U(2), UID = U(3), APPLY = U(20);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const jpeg = (n = 100, fill = 7) => { const b = new Uint8Array(n).fill(fill); b[0] = 0xff; b[1] = 0xd8; b[2] = 0xff; b[n - 2] = 0xff; b[n - 1] = 0xd9; return b; };
const ORIGINAL = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]); // 일부러 JPEG가 아닌 원본(PNG 등) — 그대로 게시되면 안 됨
const CLEAN = jpeg(120, 9);
const input = (o = {}) => ({ proposalId: PROPOSAL, force: false, uid: UID, kid: "k1", keyB64: KEY, origin: ORIGIN, ...o });

/** 가짜 deps — 호출 기록과 응답 대본. storage는 경로 → 바이트 맵(변경 불가: 있으면 409) */
function mock(script = {}) {
  const log = []; const storage = new Map(); let clock = 1_900_000_000;
  const d = {
    async loadProposal(id) { log.push(["load", id]); return script.load !== undefined ? script.load : { storeId: STORE, productId: PRODUCT, filePath: `${STORE}/${PROPOSAL}.jpg` }; },
    async begin(id, force) { log.push(["begin", id, force]); if (script.beginThrow) throw new Error("net"); return script.begin ?? { data: { ok: true, state: "applying", apply_id: APPLY, role: "operator" } }; },
    async downloadProposal(p, max) { log.push(["dlp", p, max]); return script.dlp !== undefined ? script.dlp : ORIGINAL; },
    async decode(b) { log.push(["decode", b.length]); if (script.decodeThrow) throw new Error("boom"); return script.decode !== undefined ? script.decode : { bytes: CLEAN, width: 800, height: 800 }; },
    async sha256(b) { log.push(["sha"]); return sha(b); },
    async upload(path, bytes) {
      log.push(["upload", path, bytes.length]);
      if (script.upload) return script.upload(path, bytes, storage);
      if (storage.has(path)) return { error: { status: 409, statusCode: "409", code: "ResourceAlreadyExists", message: "dup" } };
      storage.set(path, bytes); return {};
    },
    async downloadApplied(path) { log.push(["dla", path]); if (script.dla) return script.dla(path, storage); return storage.get(path) ?? null; },
    async commit(a) { log.push(["commit", a]); if (script.commitThrow) throw new Error("net"); return script.commit ?? { data: { ok: true, state: "done" } }; },
    nowSeconds() { return clock; },
  };
  return { d, log, storage, called: (n) => log.filter((e) => e[0] === n) };
}

test("정상: 정제 바이트가 서명 경로에 올라가고 되읽기 뒤 최종 서명으로 commit", async () => {
  const m = mock();
  assert.equal(await applyProposal(input(), m.d), "done");
  const up = m.called("upload")[0];
  const expected = appliedPath(KEY, { kid: "k1", storeId: STORE, productId: PRODUCT, proposalId: PROPOSAL, applyId: APPLY, uid: UID, role: "operator", sha256: sha(CLEAN) });
  assert.equal(up[1], expected);
  assert.equal(up[2], CLEAN.length);
  assert.deepEqual([...m.storage.get(expected)], [...CLEAN]); // 게시된 것 = 정제 바이트
  assert.notDeepEqual([...m.storage.get(expected)], [...ORIGINAL]); // 원본 아님
  const c = m.called("commit")[0][1];
  assert.equal(c.apply, APPLY); assert.equal(c.sha, sha(CLEAN)); assert.equal(c.size, CLEAN.length);
  assert.equal(c.publicUrl, appliedPublicUrl(ORIGIN, expected));
  assert.equal(c.exp, 1_900_000_000 + 300);
  const sig = applyFinalSignature(KEY, { kid: "k1", storeId: STORE, productId: PRODUCT, proposalId: PROPOSAL, applyId: APPLY, uid: UID, role: "operator", sha256: sha(CLEAN), size: CLEAN.length, exp: c.exp, publicUrl: c.publicUrl });
  assert.equal(c.sig, sig);
  // 순서: begin → 읽기 → 디코드 → 쓰기 → 되읽기 → commit
  assert.deepEqual(m.log.map((e) => e[0]).filter((n) => ["load", "begin", "dlp", "decode", "upload", "dla", "commit"].includes(n)),
    ["load", "begin", "dlp", "decode", "upload", "dla", "commit"]);
});

test("force·role은 DB 응답대로 전달 — 강제는 begin 인자로만, 공급사 role은 서명에 반영", async () => {
  const m = mock({ begin: { data: { ok: true, state: "applying", apply_id: APPLY, role: "supplier" } } });
  assert.equal(await applyProposal(input({ force: true }), m.d), "done");
  assert.equal(m.called("begin")[0][2], true);
  assert.ok(m.called("upload")[0][1].startsWith(STORE + "/"));
  const exp = appliedPath(KEY, { kid: "k1", storeId: STORE, productId: PRODUCT, proposalId: PROPOSAL, applyId: APPLY, uid: UID, role: "supplier", sha256: sha(CLEAN) });
  assert.equal(m.called("upload")[0][1], exp);
});

test("begin 거절 사유 매핑 — 읽기·쓰기·commit 0", async () => {
  for (const [reason, code] of [["forbidden", "forbidden"], ["not_proposed", "not_proposed"], ["stale", "stale"], ["busy", "busy"], ["xx", "failed"]]) {
    const m = mock({ begin: { data: { ok: false, reason } } });
    assert.equal(await applyProposal(input(), m.d), code);
    assert.equal(m.called("dlp").length + m.called("upload").length + m.called("commit").length, 0);
  }
});

test("제안 읽기 권한 없음·begin 오류·형식 이상 응답 — 상품 변경 0(commit 0)", async () => {
  let m = mock({ load: null }); assert.equal(await applyProposal(input(), m.d), "forbidden"); assert.equal(m.called("begin").length, 0);
  m = mock({ begin: { error: { message: "x" } } }); assert.equal(await applyProposal(input(), m.d), "failed"); assert.equal(m.called("commit").length, 0);
  m = mock({ begin: { data: { ok: true, state: "applying", apply_id: "bad", role: "operator" } } }); assert.equal(await applyProposal(input(), m.d), "failed");
  m = mock({ begin: { data: { ok: true, state: "applying", apply_id: APPLY, role: "admin" } } }); assert.equal(await applyProposal(input(), m.d), "failed");
  m = mock({ beginThrow: true }); assert.equal(await applyProposal(input(), m.d), "unknown"); assert.equal(m.called("commit").length, 0);
});

test("서버 설정: 열쇠 없음·길이 틀림·origin 이상·kid 이상 = config, DB 호출 0", async () => {
  for (const o of [{ keyB64: "" }, { keyB64: Buffer.from("short").toString("base64") }, { origin: "http://x.test" }, { origin: "" }, { kid: "" }, { kid: "K 1" }]) {
    const m = mock(); assert.equal(await applyProposal(input(o), m.d), "config"); assert.equal(m.log.length, 0);
  }
});

test("원본이 5MB 초과·읽기 실패·빈 파일 — 쓰기·commit 0", async () => {
  let m = mock({ dlp: "too_large" }); assert.equal(await applyProposal(input(), m.d), "too_large");
  m = mock({ dlp: null }); assert.equal(await applyProposal(input(), m.d), "failed");
  m = mock({ dlp: new Uint8Array(0) }); assert.equal(await applyProposal(input(), m.d), "failed");
  for (const mm of [m]) assert.equal(mm.called("upload").length + mm.called("commit").length, 0);
});

test("디코드 실패·예외·잘못된 치수·JPEG 모양 아님 — 원본을 대신 게시하지 않음(쓰기 0, commit 0)", async () => {
  const bad = [
    { decode: null }, { decodeThrow: true },
    { decode: { bytes: CLEAN, width: 0, height: 10 } }, { decode: { bytes: CLEAN, width: 6001, height: 10 } },
    { decode: { bytes: CLEAN, width: 1.5, height: 10 } },
    { decode: { bytes: new Uint8Array([1, 2, 3, 4, 5]), width: 10, height: 10 } },
    { decode: { bytes: "not-bytes", width: 10, height: 10 } },
  ];
  for (const s of bad) {
    const m = mock(s); assert.equal(await applyProposal(input(), m.d), "bad_image");
    assert.equal(m.called("upload").length, 0); assert.equal(m.called("commit").length, 0);
  }
});

test("정제 결과가 5MB 초과 — too_large, 쓰기 0", async () => {
  const big = jpeg(APPLY_MAX_BYTES + 1);
  const m = mock({ decode: { bytes: big, width: 1000, height: 1000 } });
  assert.equal(await applyProposal(input(), m.d), "too_large");
  assert.equal(m.called("upload").length + m.called("commit").length, 0);
});

test("업로드 실패 분류 — 확실한 거절=failed, 5xx·네트워크·409 코드 불명=unknown, 모두 commit 0", async () => {
  const cases = [
    [{ error: { status: 403, message: "rls" } }, "failed"],
    [{ error: { status: 503, message: "x" } }, "unknown"],
    [{ error: { message: "network" } }, "unknown"],
    [{ error: { status: 409, statusCode: "409", message: "weird" } }, "unknown"],
  ];
  for (const [res, code] of cases) {
    const m = mock({ upload: async () => res });
    assert.equal(await applyProposal(input(), m.d), code); assert.equal(m.called("commit").length, 0);
  }
  const t = mock({ upload: async () => { throw new Error("net"); } });
  assert.equal(await applyProposal(input(), t.d), "unknown"); assert.equal(t.called("commit").length, 0);
});

test("재시도: 같은 경로가 이미 있고 바이트가 같으면(409+객체 중복) 되읽기 뒤 계속 — 같은 슬롯", async () => {
  const m = mock();
  assert.equal(await applyProposal(input(), m.d), "done");
  const again = mock(); again.storage.set(m.called("upload")[0][1], CLEAN);
  assert.equal(await applyProposal(input(), again.d), "done");
  assert.equal(again.called("commit").length, 1);
});

test("누가 먼저 다른 바이트를 올려 둠(U7·compromised) — 409 뒤 되읽기 불일치 = commit 0", async () => {
  const m = mock();
  const path = appliedPath(KEY, { kid: "k1", storeId: STORE, productId: PRODUCT, proposalId: PROPOSAL, applyId: APPLY, uid: UID, role: "operator", sha256: sha(CLEAN) });
  m.storage.set(path, jpeg(120, 1)); // 같은 길이·다른 내용
  assert.equal(await applyProposal(input(), m.d), "compromised");
  assert.equal(m.called("commit").length, 0);
  const m2 = mock(); m2.storage.set(path, jpeg(121, 9)); // 길이도 다름
  assert.equal(await applyProposal(input(), m2.d), "compromised");
  assert.equal(m2.called("commit").length, 0);
});

test("되읽기 실패(null)·예외 — unknown, commit 0", async () => {
  let m = mock({ dla: async () => null }); assert.equal(await applyProposal(input(), m.d), "unknown"); assert.equal(m.called("commit").length, 0);
  m = mock({ dla: async () => { throw new Error("x"); } }); assert.equal(await applyProposal(input(), m.d), "unknown"); assert.equal(m.called("commit").length, 0);
});

test("commit 응답 매핑 — 서명·열쇠·크기 문제(bad_sig·no_file·invalid)=failed, stale=stale, gone=gone, conflict=compromised, forbidden", async () => {
  for (const [reason, code] of [["bad_sig", "failed"], ["no_file", "failed"], ["invalid", "failed"], ["stale", "stale"], ["gone", "gone"], ["conflict", "compromised"], ["forbidden", "forbidden"], ["zz", "failed"]]) {
    const m = mock({ commit: { data: { ok: false, reason } } });
    assert.equal(await applyProposal(input(), m.d), code, reason);
  }
});

test("commit 응답 유실(예외·error·형식 이상) — unknown, 자동 재시도 0(commit 1회)", async () => {
  for (const s of [{ commitThrow: true }, { commit: { error: { message: "x" } } }, { commit: { data: null } }, { commit: { data: { ok: true } } }]) {
    const m = mock(s); assert.equal(await applyProposal(input(), m.d), "unknown"); assert.equal(m.called("commit").length, 1);
  }
});

test("고정 문구에 경로·열쇠·원문 오류가 없다", () => {
  for (const [k, v] of Object.entries(APPLY_TEXT)) {
    assert.ok(!/(mall-builder-applied|storage\/v1|[0-9a-f]{32}|key|sha|\/)/i.test(v), `${k}: ${v}`);
  }
});

test("looksLikeJpeg: 시작·끝 표식만 보는 보조 검사", () => {
  assert.ok(looksLikeJpeg(jpeg(10)));
  assert.ok(!looksLikeJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0])));
  assert.ok(!looksLikeJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0, 0, 0]))); // 끝 표식 없음
  assert.ok(!looksLikeJpeg(new Uint8Array(0)));
});

test("소스 계약: 서버 전용·sharp import 0·원본 바이트를 업로드로 넘기는 호출 0·브라우저 import 0", () => {
  const src = readFileSync(new URL("../src/lib/mallPhotoApply.ts", import.meta.url), "utf8");
  assert.ok(!/from\s+["']sharp["']|require\(["']sharp["']\)/.test(src));
  assert.ok(!/d\.upload\(\s*path\s*,\s*original/.test(src));
  assert.ok(/d\.upload\(path, clean\.bytes\)/.test(src));
  assert.ok(!/["']use client["']/.test(src));
  assert.ok(!/console\./.test(src));
  const clients = ["src/app/s/[store]/admin/products/banana-send.tsx"].map((p) => { try { return readFileSync(new URL("../" + p, import.meta.url), "utf8"); } catch { return ""; } });
  for (const c of clients) assert.ok(!c.includes("mallPhotoApply"));
});
