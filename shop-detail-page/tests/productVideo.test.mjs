// MOV-20261119-01 상품에 쇼츠 참조 저장 — 받는 쪽 검사·저장 순서 시험(A2). 실행: node --test tests/
// 이번 범위는 표 SQL·서버 내부 저장 경계뿐이다. 영상이 들어오는 길(화면·공개 서버 동작)과 상품 화면 표시는 없다.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import * as productVideo from "../lib/productVideo.ts";
const { NOT_OWN_PRODUCT, attachVideo, checkVideoInput } = productVideo;

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

test("공개 범위와 예약 시각의 조합 — 예약 시각은 비공개일 때만. 공개·일부 공개에 붙으면 과거·미래 모두 거절한다", () => {
  const FUTURE = "2099-01-01T00:00:00Z", PAST = "2020-01-01T00:00:00Z";
  const judge = (privacy, publishAt) => { const c = checkVideoInput(raw({}, { privacy, publishAt })); return "error" in c ? c.error : "ok"; };
  // [공개 범위, 예약 시각, 기대]
  const table = [
    ["public", null, "ok"], ["public", "", "ok"], ["public", undefined, "ok"],
    ["unlisted", null, "ok"],
    ["public", FUTURE, /맞지 않습니다/], ["unlisted", FUTURE, /맞지 않습니다/],
    ["public", PAST, /맞지 않습니다/], ["unlisted", PAST, /맞지 않습니다/],
    ["public", new Date(Date.now() + 1000).toISOString(), /맞지 않습니다/], // 1초 뒤
    ["public", new Date(Date.now() - 1000).toISOString(), /맞지 않습니다/], // 1초 전
    ["private", FUTURE, "ok"], ["private", PAST, "ok"],
    ["private", null, /비공개 영상은/], ["private", "", /비공개 영상은/],
    ["public", "내일", /시각 형식/], ["private", "내일", /시각 형식/], // 형식 오류가 먼저
  ];
  for (const [privacy, at, want] of table) {
    const got = judge(privacy, at);
    if (want === "ok") assert.equal(got, "ok", `${privacy} + ${at}`); else assert.match(got, want, `${privacy} + ${at}`);
  }
  assert.equal(checkVideoInput(raw({}, { privacy: "private", publishAt: FUTURE })).input.publishAt, "2099-01-01T00:00:00.000Z");
  assert.equal(checkVideoInput(raw({}, { privacy: "public", publishAt: null })).input.publishAt, null);
});

test("검사 — 예약 공개는 받고, 제목은 다듬고, 받은 주소(url)는 읽지 않는다", () => {
  const r = checkVideoInput(raw({}, { privacy: "private", publishAt: "2026-12-01T09:00:00+09:00", title: `  줄\n바꿈\u0000  ${"가".repeat(200)}`, url: "https://evil.example/x", uploadedAt: null }));
  assert.ok("input" in r);
  assert.equal(r.input.publishAt, "2026-12-01T00:00:00.000Z");
  assert.equal(r.input.uploadedAt, null);
  assert.equal(r.input.title.length, 100);
  assert.ok(r.input.title.startsWith("줄 바꿈 가"));
  assert.ok(!JSON.stringify(r.input).includes("evil"), "주소는 어디에도 남지 않는다");
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

test("소스 경계 — 표 SQL과 서버 내부 저장 함수만 있다. 화면·공개 서버 동작·표시는 없고, 기존 화면과 내보내기는 그대로다", async () => {
  const read = (rel) => readFile(new URL(`../${rel}`, import.meta.url), "utf8");
  const missing = (rel) => assert.rejects(access(new URL(`../${rel}`, import.meta.url)), rel);
  // 표를 읽거나 쓰는 화면·경로가 없다
  for (const rel of ["app/(dashboard)/products/[id]/page.tsx", "app/(dashboard)/products/page.tsx", "app/api/products/[id]/export/route.ts", "app/api/products/[id]/export-html/route.ts", "app/api/products/[id]/export-zip/route.ts", "app/api/products/[id]/copy/route.ts", "app/api/cron/cleanup-generated/route.ts", "lib/ai/copyTonePrompt.ts", "lib/markets.ts"]) {
    assert.ok(!/shop_product_videos|productVideo/i.test(await read(rel)), `${rel} 에 영상 참조가 섞이지 않는다`);
  }
  await missing("app/(dashboard)/products/video-inbox/page.tsx");
  await missing("components/products/VideoInbox.tsx");
  await missing("components/products/ProductVideos.tsx");
  await missing("lib/actions/productVideos.ts");
  assert.match(await read("components/products/ShortsHandoffCard.tsx"), /rel="noopener noreferrer"/, "보내는 링크는 그대로 둔다");
  // 순수 모듈은 검사·저장 순서만 내보낸다(주소 만들기·공개 상태 표시 없음)
  assert.deepEqual(Object.keys(productVideo).sort(), ["NOT_OWN_PRODUCT", "VIDEO_TITLE_MAX", "attachVideo", "checkVideoInput", "isUuid", "isVideoId"]);
  // 저장 함수는 서버 내부 전용이다 — 공개 서버 동작이 아니고, 스스로 관리자 연결을 만들지 않는다
  const store = await read("lib/productVideoStore.ts");
  assert.match(store, /^import "server-only";/, "브라우저 묶음에 들어가면 빌드가 실패한다");
  assert.ok(!/["']use server["']/.test(store.replace(/\/\/[^\n]*/g, "")), "공개 서버 동작이 아니다");
  assert.match(store, /export async function saveProductVideo\(supabase: SupabaseClient<Database>, userId: string, raw: unknown\)/);
  assert.match(store, /from\("shop_products"\)[^\n]*\.eq\("id", productId\)\.eq\("user_id", uid\)/);
  assert.match(store, /ignoreDuplicates: true/);
  assert.ok(!/createAdminClient|createServiceClient|createClient\(|SERVICE_ROLE|SECRET_KEY|process\.env/.test(store), "DB 연결을 스스로 만들지 않는다(부르는 쪽이 회원 세션 연결을 넘긴다)");
  // 프로그램 안 어디에서도 아직 부르지 않는다
  const { readdir } = await import("node:fs/promises");
  const callers = [];
  for (const dir of ["app", "components", "lib"]) {
    for (const e of await readdir(new URL(`../${dir}`, import.meta.url), { recursive: true, withFileTypes: true })) {
      if (!e.isFile() || !/.(ts|tsx|mjs|js)$/.test(e.name)) continue;
      const rel = `${e.parentPath ?? e.path}/${e.name}`.split("\\").join("/");
      const text = await readFile(rel, "utf8");
      if (text.includes("saveProductVideo(") || text.includes("@/lib/productVideoStore")) callers.push(rel.slice(rel.lastIndexOf("/lib/") + 1));
    }
  }
  assert.deepEqual(callers, ["lib/productVideoStore.ts"], "저장 함수는 정의만 있고 부르는 곳이 없다");
  const sql = await read("supabase/migrations/20261120_product_videos.sql");
  assert.equal((sql.match(/^create policy/gm) ?? []).length, 2, "정책은 읽기·넣기 두 개");
  assert.ok(!/for (update|delete|all)\b/i.test(sql) && !/update public\.programs/i.test(sql), "고치기·지우기 정책과 버전 갱신은 넣지 않는다");
  assert.match(sql, /외부 소유·공개 보증 없음/);
  assert.match(sql, /회원이 자기 상품에 적어 둔 영상 참조/);
});
