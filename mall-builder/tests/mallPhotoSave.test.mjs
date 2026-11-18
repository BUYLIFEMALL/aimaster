import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PROPOSAL_BUCKET, PROPOSAL_MAX_BYTES, SAVE_TEXT, isAlreadyExists, isDefiniteReject, jpegPlan, saveResultAsProposal,
} from "../src/lib/mallPhotoSave.ts";
import { notReadyReply, savedReply, MALL_RESULT_NOT_READY } from "../src/lib/mallPhotoJob.ts";
import { PRODUCT_MALL_ORIGIN, readProductSaved } from "../src/lib/productPhotoHandoff.ts";

// 메이커 M2 화면 연결(2026-11-19, Master msg_c506ba34f9a0) — 저장 순서·정확 ACK 모의 시험. 실제 Storage·DB·네트워크 0.
const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const HINT = "a".repeat(64);
const jpg = (n = 1000) => new Blob([new Uint8Array(n)], { type: "image/jpeg" });
const png = (n = 1000) => new Blob([new Uint8Array(n)], { type: "image/png" });
const input = (o = {}) => ({ storeId: U(1), productId: U(2), jobId: U(3), resultId: U(4), settingsVersion: "c2", baseRevision: "2026-11-19T00:00:00Z", file: png(), ...o });

/** 모의 deps — 호출 기록과 응답 대본 */
function mock(script = {}) {
  const log = [];
  const d = {
    begin: async (a) => { log.push(["begin", a.hint]); if (script.beginThrow) throw new Error("net"); return script.begin ?? { data: { ok: true, state: "upload", id: U(9), path: `${U(1)}/${U(9)}.jpg` } }; },
    commit: async (id) => { log.push(["commit", id]); if (script.commitThrow) throw new Error("net"); return "commit" in script ? script.commit : { data: { ok: true, state: "done" } }; },
    abandon: async (id) => { log.push(["abandon", id]); return script.abandon ?? { data: { ok: true, state: "abandoned" } }; },
    upload: async (path, f) => { log.push(["upload", path, f.type, f.size]); if (script.uploadThrow) throw new Error("net"); return script.upload ?? { error: null }; },
    remove: async (path) => { log.push(["remove", path]); },
    toJpeg: async (f) => { log.push(["toJpeg"]); return "toJpeg" in script ? script.toJpeg : (f.type === "image/jpeg" ? f : jpg(2000)); },
    sha256: async () => HINT,
  };
  return { d, log, names: () => log.map((x) => x[0]) };
}

test("정상: begin upload → 변환 → 업로드(제안 경로) → commit done = done", async () => {
  const m = mock();
  assert.equal(await saveResultAsProposal(input(), m.d), "done");
  assert.deepEqual(m.names(), ["begin", "toJpeg", "upload", "commit"]);
  assert.equal(m.log[0][1], HINT, "원본 힌트 전달");
  assert.equal(m.log[2][2], "image/jpeg");
});

test("결과 번호 없음(옛 바나나) → invalid, 아무 호출 0", async () => {
  const m = mock();
  assert.equal(await saveResultAsProposal(input({ resultId: null }), m.d), "invalid");
  assert.deepEqual(m.log, []);
});

test("begin 결과별: done → done(업로드 0) / busy·conflict·forbidden·invalid 그대로 / 모름 → unknown", async () => {
  assert.equal(await saveResultAsProposal(input(), mock({ begin: { data: { ok: true, state: "done" } } }).d), "done");
  for (const r of ["busy", "conflict", "forbidden", "invalid"]) {
    const m = mock({ begin: { data: { ok: false, reason: r } } });
    assert.equal(await saveResultAsProposal(input(), m.d), r);
    assert.deepEqual(m.names(), ["begin"], `${r}: 업로드·포기·삭제 0`);
  }
  const t = mock({ beginThrow: true });
  assert.equal(await saveResultAsProposal(input(), t.d), "unknown");
  assert.deepEqual(t.names(), ["begin"]);
  assert.equal(await saveResultAsProposal(input(), mock({ begin: { error: { message: "x" } } }).d), "unknown");
});

test("변환 실패·5MB 초과 → abandon 1회 후 too_large(업로드·삭제 0)", async () => {
  for (const out of [null, jpg(PROPOSAL_MAX_BYTES + 1), png(10)]) {
    const m = mock({ toJpeg: out });
    assert.equal(await saveResultAsProposal(input(), m.d), "too_large");
    assert.deepEqual(m.names(), ["begin", "toJpeg", "abandon"]);
  }
});

test("업로드 「이미 있음」(내 앞선 업로드) → commit 진행 → done", async () => {
  // 실제 storage-js 2.118 모양: status = HTTP 409, statusCode·code = 본문 code
  const m = mock({ upload: { error: { status: 409, statusCode: "ResourceAlreadyExists", code: "ResourceAlreadyExists", message: "The resource already exists" } } });
  assert.equal(await saveResultAsProposal(input(), m.d), "done");
  assert.deepEqual(m.names(), ["begin", "toJpeg", "upload", "commit"]);
});

test("업로드 확정 거절(4xx) → abandon → failed / 알 수 없음(예외·5xx·상태 없음) → unknown, 포기·삭제 0", async () => {
  const r4 = mock({ upload: { error: { status: 403, statusCode: "AccessDenied", code: "AccessDenied", message: "denied" } } });
  assert.equal(await saveResultAsProposal(input(), r4.d), "failed");
  assert.deepEqual(r4.names(), ["begin", "toJpeg", "upload", "abandon"]);
  for (const s of [{ uploadThrow: true }, { upload: { error: { statusCode: "500" } } }, { upload: { error: { message: "fetch failed" } } }]) {
    const m = mock(s);
    assert.equal(await saveResultAsProposal(input(), m.d), "unknown");
    assert.deepEqual(m.names(), ["begin", "toJpeg", "upload"], "알 수 없으면 commit·abandon·remove 0");
  }
});

test("commit 응답 유실·오류 → unknown(재시도·포기·삭제 0)", async () => {
  for (const s of [{ commitThrow: true }, { commit: { error: { message: "timeout" } } }, { commit: null }]) {
    const m = mock(s);
    assert.equal(await saveResultAsProposal(input(), m.d), "unknown");
    assert.deepEqual(m.names(), ["begin", "toJpeg", "upload", "commit"]);
  }
});

test("commit no_file → abandon 성공했을 때만 그 경로 파일 삭제 1회 → failed", async () => {
  const m = mock({ commit: { data: { ok: false, reason: "no_file" } } });
  assert.equal(await saveResultAsProposal(input(), m.d), "failed");
  assert.deepEqual(m.names(), ["begin", "toJpeg", "upload", "commit", "abandon", "remove"]);
  assert.equal(m.log[5][1], `${U(1)}/${U(9)}.jpg`);
  // abandon이 committed(이미 확정)로 거절되면 삭제 0 — 확정 파일 보호
  const k = mock({ commit: { data: { ok: false, reason: "no_file" } }, abandon: { data: { ok: false, reason: "committed" } } });
  assert.equal(await saveResultAsProposal(input(), k.d), "failed");
  assert.ok(!k.names().includes("remove"));
});

test("commit gone·forbidden → failed, 파일 손대지 않음 / 모르는 응답 → unknown", async () => {
  for (const r of ["gone", "forbidden"]) {
    const m = mock({ commit: { data: { ok: false, reason: r } } });
    assert.equal(await saveResultAsProposal(input(), m.d), "failed");
    assert.ok(!m.names().includes("abandon") && !m.names().includes("remove"));
  }
  assert.equal(await saveResultAsProposal(input(), mock({ commit: { data: { ok: true, state: "weird" } } }).d), "unknown");
});

test("JPEG 계획·오류 판정", () => {
  assert.equal(jpegPlan("image/jpeg", 1000), "reuse");
  assert.equal(jpegPlan("image/jpeg", PROPOSAL_MAX_BYTES + 1), "convert");
  assert.equal(jpegPlan("image/png", 1000), "convert");
  assert.ok(isAlreadyExists({ status: 409, statusCode: "KeyAlreadyExists", code: "KeyAlreadyExists" }) && !isAlreadyExists({ status: 403, statusCode: "403" }));
  assert.ok(!isAlreadyExists({ message: "Duplicate" }), "문구만으로는 이미 있음 아님(불명)");
  assert.ok(isDefiniteReject({ status: 413, statusCode: "EntityTooLarge", code: "EntityTooLarge" }) && !isDefiniteReject({ status: 409 }) && !isDefiniteReject({ status: 502 }) && !isDefiniteReject({ message: "x" }));
});

test("정확 ACK: done만 ok:true(빈 문구), 그 밖은 고정 문구 — 바나나 readProductSaved가 결과 번호 그대로 읽음", () => {
  const got = { productId: U(2), resultId: U(4), settingsVersion: "c2" };
  for (const code of Object.keys(SAVE_TEXT)) {
    const r = savedReply(U(3), got, code, SAVE_TEXT[code]);
    const seen = readProductSaved(PRODUCT_MALL_ORIGIN, r, U(3), PRODUCT_MALL_ORIGIN);
    assert.equal(seen.ok, code === "done", code);
    assert.equal(seen.resultId, U(4));
    assert.equal(seen.error, code === "done" ? "" : SAVE_TEXT[code]);
    assert.ok(!/https?:|[0-9a-f]{8}-[0-9a-f]{4}|\.jpg/.test(SAVE_TEXT[code]), "문구에 주소·번호·경로 없음");
  }
  // M1 무저장 응답은 그대로 남아 있음(회귀)
  assert.equal(notReadyReply(U(3), got).ok, false);
  assert.equal(notReadyReply(U(3), got).error, MALL_RESULT_NOT_READY);
});

test("화면 소스 계약: 제안 버킷만, 저장은 체인으로 한 건씩, 응답은 그 창·바나나 주소로만·결과당 1회, 공급사 화면 연결, 미리보기 주소 글자 노출 0", () => {
  const send = readFileSync(new URL("../src/app/s/[store]/admin/products/banana-send.tsx", import.meta.url), "utf8");
  assert.match(send, /chain\.current = chain\.current\.then\(/);
  assert.match(send, /storage\.from\(PROPOSAL_BUCKET\)/);
  assert.doesNotMatch(send, /storage\.from\("(?!mall-builder-proposals)/, "다른 버킷 0");
  assert.match(send, /if \(job\.answered\.has\(key\)\) return/);
  assert.match(send, /savedReply\(job\.jobId, got, code, SAVE_TEXT\[code\]\), PRODUCT_RECEIVER_ORIGIN/);
  assert.doesNotMatch(send, /notReadyReply/);
  for (const m of send.matchAll(/postMessage\([^)]*?\),?\s*([A-Z_]+)\)/g)) assert.equal(m[1], "PRODUCT_RECEIVER_ORIGIN");
  const sup = readFileSync(new URL("../src/app/s/[store]/supplier/products/page.tsx", import.meta.url), "utf8");
  assert.match(sup, /<BananaSend rows=\{photoRows\} storeId=\{store\.id\} pickSelector=/);
  assert.match(sup, /\.eq\("supplier_id", me\.id\)/);
  const pv = readFileSync(new URL("../src/app/s/[store]/admin/products/proposals/preview.tsx", import.meta.url), "utf8");
  assert.match(pv, /createSignedUrl\(path, 60\)/);
  assert.doesNotMatch(pv, /console\.|\{src\}<|>\{src\}|href=\{src\}/, "서명 주소 글자 표시·기록 0");
  assert.equal(PROPOSAL_BUCKET, "mall-builder-proposals");
});

// ── P2 보완(Master msg_d7d48cd11e2e, Mac msg_3c336c319413)
import { browserToJpeg, classifyUploadError, runQueuedSave } from "../src/lib/mallPhotoSave.ts";

test("업로드 오류 분류: 불명이 먼저 — 5xx·상태 없음은 duplicate 문구여도 unknown, 409 코드만 exists", () => {
  // P3(Master msg_4ba128209829): HTTP 409 + 공식 객체 중복 코드일 때만 exists
  assert.equal(classifyUploadError({ status: 409, statusCode: "ResourceAlreadyExists", code: "ResourceAlreadyExists" }), "exists");
  assert.equal(classifyUploadError({ status: 409, statusCode: "KeyAlreadyExists" }), "exists", "본문 code가 statusCode로만 와도");
  assert.equal(classifyUploadError({ status: 409, statusCode: "409" }), "unknown", "코드 없는 일반 409");
  assert.equal(classifyUploadError({ status: 409, statusCode: "BucketAlreadyExists", code: "BucketAlreadyExists" }), "unknown", "버킷 중복은 객체 중복 아님");
  assert.equal(classifyUploadError({ status: 409, statusCode: "InvalidRequest", code: "InvalidRequest" }), "unknown", "다른 충돌 코드");
  assert.equal(classifyUploadError({ statusCode: "409", status: 400, message: "The resource already exists" }), "unknown", "옛 형식(HTTP 400 + 숫자 409만) — 불일치");
  assert.equal(classifyUploadError({ status: 400, statusCode: "ResourceAlreadyExists", code: "ResourceAlreadyExists" }), "unknown", "중복 코드인데 HTTP 409 아님");
  assert.equal(classifyUploadError({ statusCode: "409", status: 500 }), "unknown");
  assert.equal(classifyUploadError({ status: 500, statusCode: "ResourceAlreadyExists", code: "ResourceAlreadyExists" }), "unknown", "5xx + 중복 코드");
  assert.equal(classifyUploadError({ statusCode: "502", message: "Duplicate" }), "unknown");
  assert.equal(classifyUploadError({ statusCode: "ResourceAlreadyExists", code: "ResourceAlreadyExists" }), "unknown", "HTTP 숫자 없는 본문 코드만");
  assert.equal(classifyUploadError({ message: "The resource already exists" }), "unknown");
  assert.equal(classifyUploadError({ status: 409 }), "unknown", "코드 없는 409는 불명");
  assert.equal(classifyUploadError({ statusCode: "403", status: 403 }), "reject");
  assert.equal(classifyUploadError({ status: 400, statusCode: "InvalidKey", code: "InvalidKey" }), "reject", "명확한 4xx는 거절");
  assert.equal(classifyUploadError(null), "unknown");
});

test("업로드 5xx + duplicate 문구 → unknown, commit·abandon·remove 0", async () => {
  const m = mock({ upload: { error: { statusCode: "500", message: "duplicate key value" } } });
  assert.equal(await saveResultAsProposal(input(), m.d), "unknown");
  assert.deepEqual(m.names(), ["begin", "toJpeg", "upload"]);
});

test("no_file 뒤 abandon 응답에 error가 있으면(data가 함께 와도) 삭제 0", async () => {
  const m = mock({ commit: { data: { ok: false, reason: "no_file" } }, abandon: { error: { message: "x" }, data: { ok: true, state: "abandoned" } } });
  assert.equal(await saveResultAsProposal(input(), m.d), "failed");
  assert.ok(!m.names().includes("remove"));
});

test("대기열: 시작 전 작업이 바뀌면 저장 0(skipped), 저장 중 바뀌면 표시·응답 0(stale), 그대로면 onDone 1회", async () => {
  let saved = 0, done = 0;
  assert.equal(await runQueuedSave({ isActive: () => false, save: async () => { saved++; return "done"; }, onDone: () => done++ }), "skipped");
  assert.equal(saved, 0); assert.equal(done, 0);
  let active = true;
  assert.equal(await runQueuedSave({ isActive: () => active, save: async () => { saved++; active = false; return "done"; }, onDone: () => done++ }), "stale");
  assert.equal(saved, 1); assert.equal(done, 0, "늦게 끝난 옛 저장은 새 화면·창에 표시·응답 0");
  assert.equal(await runQueuedSave({ isActive: () => true, save: async () => { throw new Error("x"); }, onDone: (c) => { done++; assert.equal(c, "unknown"); } }), "unknown");
  assert.equal(done, 1);
});

test("5MB 이하 JPEG 그대로 쓸 때도 디코딩·6000px 확인(원본 바이트 그대로 반환), 초과·디코딩 실패면 null", async () => {
  const keep = globalThis.createImageBitmap;
  try {
    const small = jpg(1000);
    globalThis.createImageBitmap = async () => ({ width: 1000, height: 800, close() {} });
    assert.equal(await browserToJpeg(small), small, "통과하면 원본 그대로(바이트 변화 0)");
    globalThis.createImageBitmap = async () => ({ width: 7000, height: 10, close() {} });
    assert.equal(await browserToJpeg(small), null, "그대로 쓸 파일도 6000px 초과면 거절");
    globalThis.createImageBitmap = async () => { throw new Error("decode"); };
    assert.equal(await browserToJpeg(small), null, "디코딩 실패면 거절");
  } finally { globalThis.createImageBitmap = keep; }
});

test("화면 소스 계약(P2): 대기열은 runQueuedSave로 — 시작·끝 모두 지금 작업+원래 창 확인", () => {
  const send = readFileSync(new URL("../src/app/s/[store]/admin/products/banana-send.tsx", import.meta.url), "utf8");
  assert.match(send, /runQueuedSave\(\{\s*isActive: \(\) => isActive\(job\) && job\.win === win/);
  assert.doesNotMatch(send, /if \(!win\.closed\) win\.postMessage/, "확인 없는 응답 0");
});
