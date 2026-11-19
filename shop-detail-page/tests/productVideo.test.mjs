// MOV-20261119-01 상품에 쇼츠 붙이기 — 받는 쪽 검사·저장 순서·표시 규칙 시험. 실행: node --test tests/
// (영상 정보가 들어오는 길 — 창 사이 메시지 — 은 송수신 계약 수정판을 기다리는 중이라 이번 범위에 없다)
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { NOT_OWN_PRODUCT, attachVideo, checkVideoInput, shortsUrl, videoStatus } from "../lib/productVideo.ts";

const PROD = "cccccccc-cccc-4ccc-8ccc-cccccccccccc", ITEM = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const ME = "11111111-1111-4111-8111-111111111111";
const VID = "dQw4w9WgXcQ";
const video = (over = {}) => ({ videoId: VID, title: "텀블러 홍보 쇼츠", privacy: "public", publishAt: null, uploadedAt: "2026-11-20T01:00:00Z", ...over });
const raw = (over = {}, v = {}) => ({ productId: PROD, sourceItemId: ITEM, video: video(v), ...over });

test("검사 — 맞는 값은 저장할 모양으로, 틀린 값은 이유와 함께 거절한다", () => {
  assert.deepEqual(checkVideoInput(raw()).input, { productId: PROD, videoId: VID, title: "텀블러 홍보 쇼츠", privacy: "public", publishAt: null, uploadedAt: "2026-11-20T01:00:00.000Z", sourceItemId: ITEM });
  assert.equal(checkVideoInput(raw({ productId: PROD.toUpperCase() })).input.productId, PROD, "대소문자는 맞춰 둔다");
  const bad = (r) => { const c = checkVideoInput(r); assert.ok("error" in c, JSON.stringify(r)); return c.error; };
  assert.match(bad(raw({ productId: "abc_DEF-123" })), /상품 번호/, "원스톱의 느슨한 형식(영숫자 64자)은 통과하지 못한다");
  assert.match(bad(raw({ productId: undefined })), /상품 번호/);
  assert.match(bad(raw({}, { videoId: "short" })), /영상 번호/);
  assert.match(bad(raw({}, { videoId: `${VID}x` })), /영상 번호/);
  assert.match(bad(raw({}, { videoId: "dQw4w9WgXc/" })), /영상 번호/);
  assert.match(bad(raw({ video: undefined })), /영상 번호/);
  assert.match(bad(raw({}, { privacy: "secret" })), /공개 범위/);
  assert.match(bad(raw({}, { privacy: undefined })), /공개 범위/);
  assert.match(bad(raw({}, { publishAt: "내일" })), /시각/);
  assert.match(bad(raw({}, { uploadedAt: 12345 })), /시각/);
  assert.match(bad(raw({}, { privacy: "private" })), /비공개 영상은/, "예약 없는 비공개는 거절");
  assert.match(bad(raw({}, { privacy: "private", publishAt: "" })), /비공개 영상은/);
  for (const junk of [null, [], "x", 3, {}]) assert.ok("error" in checkVideoInput(junk));
});

test("검사 — 예약 공개는 받고, 제목은 다듬고, 받은 주소(url)는 읽지 않는다", () => {
  const r = checkVideoInput(raw({}, { privacy: "private", publishAt: "2026-12-01T09:00:00+09:00", title: `  줄\n바꿈\u0000  ${"가".repeat(200)}`, url: "https://evil.example/x", uploadedAt: null }));
  assert.ok("input" in r);
  assert.equal(r.input.publishAt, "2026-12-01T00:00:00.000Z");
  assert.equal(r.input.uploadedAt, null);
  assert.equal(r.input.title.length, 100);
  assert.ok(r.input.title.startsWith("줄 바꿈 가"));
  assert.ok(!JSON.stringify(r.input).includes("evil"), "주소는 어디에도 남지 않는다");
  assert.equal(shortsUrl(r.input.videoId), `https://www.youtube.com/shorts/${VID}`);
  assert.deepEqual(Object.keys(r.input).sort(), ["privacy", "productId", "publishAt", "sourceItemId", "title", "uploadedAt", "videoId"]);
  assert.equal(checkVideoInput(raw({ sourceItemId: "not-uuid" })).input.sourceItemId, null, "기록용 번호는 틀려도 거절하지 않고 비운다");
});

test("서버 순서 — 본인 상품이 아니면 저장을 시도하지 않고, 문구는 「없음」과 구분하지 않는다. 중복은 성공(기존 값 유지)", async () => {
  const calls = [];
  const store = (label, saved) => ({
    async ownProductLabel(u, p) { calls.push(["own", u, p]); return label; },
    async insert(u, v) { calls.push(["insert", u, v.videoId]); return saved; },
  });
  assert.deepEqual(await attachVideo(store(null, "inserted"), ME, raw()), { ok: false, duplicate: false, error: NOT_OWN_PRODUCT });
  assert.deepEqual(calls, [["own", ME, PROD]], "남의 상품·없는 상품이면 저장 호출 0");
  calls.length = 0;
  assert.deepEqual(await attachVideo(store("텀블러", "inserted"), ME, raw()), { ok: true, duplicate: false, error: "", productLabel: "텀블러" });
  assert.deepEqual(calls, [["own", ME, PROD], ["insert", ME, VID]]);
  assert.deepEqual(await attachVideo(store("텀블러", "duplicate"), ME, raw()), { ok: true, duplicate: true, error: "", productLabel: "텀블러" });
  assert.equal((await attachVideo(store("텀블러", "denied"), ME, raw())).error, NOT_OWN_PRODUCT, "확인 뒤 소유가 바뀌어 DB가 막아도 같은 문구");
  const dbFail = await attachVideo(store("텀블러", { error: "relation does not exist: secret detail" }), ME, raw());
  assert.equal(dbFail.ok, false);
  assert.ok(!dbFail.error.includes("secret"), "DB 오류 원문은 밖으로 내보내지 않는다");
  // 서버는 앞에서 통과시켰다는 사실을 믿지 않고 다시 검사한다
  calls.length = 0;
  for (const bad of [raw({ productId: "x" }), raw({}, { videoId: "x" }), raw({}, { privacy: "private" }), raw({}, { privacy: "all" }), null]) {
    assert.equal((await attachVideo(store("텀블러", "inserted"), ME, bad)).ok, false);
  }
  assert.equal((await attachVideo(store("텀블러", "inserted"), "", raw())).ok, false, "로그인 회원 번호가 없으면 거절");
  assert.equal((await attachVideo(store("텀블러", "inserted"), "not-a-user", raw())).ok, false);
  assert.equal(calls.length, 0, "검사에서 떨어지면 DB를 건드리지 않는다");
});

test("표시 — 예약 공개 전에는 「공개 예정」 글만(주소 없음), 지난 뒤에도 「공개됨」이라 단정하지 않는다", () => {
  const now = Date.parse("2026-11-20T03:00:00Z");
  const row = (over) => ({ video_id: VID, title: "쇼츠", privacy: "public", publish_at: null, uploaded_at: null, ...over });
  assert.deepEqual(videoStatus(row({}), now), { kind: "public", label: "공개", url: shortsUrl(VID) });
  assert.equal(videoStatus(row({ privacy: "unlisted" }), now).kind, "unlisted");
  const soon = videoStatus(row({ privacy: "private", publish_at: "2026-12-01T00:30:00Z" }), now);
  assert.equal(soon.kind, "scheduled");
  assert.equal(soon.url, null, "공개 전에는 주소를 걸지 않는다");
  assert.match(soon.label, /12월 1일.*9:30.*공개 예정/, "한국 시각으로 보여 준다");
  const passed = videoStatus(row({ privacy: "private", publish_at: "2026-11-19T00:00:00Z" }), now);
  assert.equal(passed.kind, "check");
  assert.ok(!/공개됨|^공개$/.test(passed.label) && passed.label.includes("확인"));
  assert.equal(videoStatus(row({ privacy: "private", publish_at: null }), now).kind, "check", "있을 수 없는 값도 「공개」로 보이지 않는다");
  assert.equal(videoStatus(row({ video_id: "<script>" }), now).url, null, "형식이 틀린 영상 번호로는 주소를 만들지 않는다");
});

test("소스 경계 — 영상 정보는 본인 상품 화면에서만 읽고, 내보내기·문구·정리·보내는 링크는 건드리지 않는다", async () => {
  const read = (rel) => readFile(new URL(`../${rel}`, import.meta.url), "utf8");
  for (const rel of ["app/api/products/[id]/export/route.ts", "app/api/products/[id]/export-html/route.ts", "app/api/products/[id]/export-zip/route.ts", "app/api/products/[id]/copy/route.ts", "app/api/cron/cleanup-generated/route.ts", "lib/ai/copyTonePrompt.ts", "lib/markets.ts"]) {
    assert.ok(!/shop_product_videos|productVideo/i.test(await read(rel)), `${rel} 에 영상 정보가 섞이지 않는다`);
  }
  assert.match(await read("components/products/ShortsHandoffCard.tsx"), /rel="noopener noreferrer"/, "보내는 링크는 그대로 둔다");
  const page = await read("app/(dashboard)/products/[id]/page.tsx");
  assert.match(page, /from\("shop_product_videos"\)\s*\.select\("video_id, title, privacy, publish_at, uploaded_at"\)\s*\.eq\("product_id", product\.id\)\s*\.eq\("user_id", user\.id\)/);
  assert.equal(page.split("shop_product_videos").length - 1, 1, "상품 화면에서 읽는 곳은 한 군데");
  const action = await read("lib/actions/productVideos.ts");
  assert.match(action, /^"use server";/);
  assert.match(action, /const user = await requireProgramAccess\(\);/);
  assert.match(action, /from\("shop_products"\)[^\n]*\.eq\("id", productId\)\.eq\("user_id", userId\)/);
  assert.match(action, /ignoreDuplicates: true/);
  assert.match(action, /attachVideo\(store, user\.id, raw\)/, "회원 번호는 로그인 세션에서만 온다");
  assert.ok(!/createAdminClient|createServiceClient|SERVICE_ROLE|SECRET_KEY/.test(action), "관리자 키를 쓰지 않는다");
  // 팝업 연결은 보류 — 받는 창 화면을 아직 두지 않는다(계약 수정판 뒤에 추가)
  await assert.rejects(access(new URL("../app/(dashboard)/products/video-inbox/page.tsx", import.meta.url)));
  const sql = await read("supabase/migrations/20261120_product_videos.sql");
  assert.equal((sql.match(/^create policy/gm) ?? []).length, 2, "정책은 읽기·넣기 두 개");
  assert.ok(!/for (update|delete|all)\b/i.test(sql) && !/update public\.programs/i.test(sql), "고치기·지우기 정책과 버전 갱신은 넣지 않는다");
});
