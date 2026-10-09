const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const draftId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const accountId = "33333333-3333-4333-8333-333333333333";
const source = fs.readFileSync(path.join(root, "app/(dashboard)/threads-content-ops/web-actions.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

function fixture(options = {}) {
  const state = {
    post: { id: draftId, user_id: userId, account_id: accountId, body: "발행 전 본문", status: "draft", media: [], ...options.post },
    account: { id: accountId, user_id: userId, threads_user_id: "test-threads-user", access_token: "fake-test-token", token_expires_at: "2099-01-01", ...options.account },
    calls: [], generations: [], refreshes: 0,
  };
  class Query {
    constructor(table) { this.table = table; this.filters = []; this.values = null; }
    select() { return this; }
    eq(key, value) { this.filters.push([key, value]); return this; }
    update(values) { this.values = values; return this; }
    async maybeSingle() { return this.execute(); }
    then(resolve, reject) { return Promise.resolve(this.execute()).then(resolve, reject); }
    execute() {
      const row = this.table === "tco_posts" ? state.post : state.account;
      if (!row || !this.filters.every(([key, value]) => row[key] === value)) return { data: null, error: null };
      if (this.values?.status === "publishing" && options.claimError) return { data: null, error: { message: "claim failed" } };
      if (this.values?.status === "published" && options.recordError) return { data: null, error: { message: "record failed" } };
      if (this.values) Object.assign(row, this.values);
      return { data: structuredClone(row), error: null };
    }
  }
  const db = { auth: { getUser: async () => ({ data: { user: options.loggedOut ? null : { id: userId } } }) }, from: (table) => new Query(table) };
  const module = { exports: {} };
  const requireMock = (id) => {
    if (id === "next/cache") return { revalidatePath: () => state.refreshes++ };
    if (id === "@/lib/supabase/server") return { createClient: async () => db };
    if (id === "@/lib/access/checkProgramAccess") return { checkProgramAccess: async () => ({ allowed: !options.noAccess }) };
    if (id === "@/lib/apiKeys") return { resolveApiKey: async () => options.noKey ? null : "fake-member-ai-key" };
    if (id === "@/threads-content-ops/lib/personas") {
      const personasModule = { exports: {} };
      const personasSource = fs.readFileSync(path.join(root, "threads-content-ops/lib/personas.ts"), "utf8");
      vm.runInNewContext(ts.transpileModule(personasSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module: personasModule, exports: personasModule.exports });
      return personasModule.exports;
    }
    if (id === "@/threads-content-ops/lib/productPost") return { contentRange: () => ({ min: 450, max: 480 }) };
    if (id === "@/threads-content-ops/lib/attention") return { generateAttentionPlan: async (input) => {
      state.generations.push(structuredClone(input));
      return { content: "모의 생성 결과" };
    } };
    if (id === "@/threads-content-ops/lib/media") return {
      MAX_IMAGE_BYTES: 8 * 1024 * 1024, MAX_VIDEO_BYTES: 1024 ** 3,
      sanitizeMedia: (owner, media) => {
        assert.equal(owner, userId);
        if (options.badMedia) throw new Error("내 계정에서 올린 이미지·영상만 붙일 수 있습니다.");
        return media ?? [];
      },
    };
    if (id === "@/threads-content-ops/lib/threadsPublish") return { publishToThreads: async (input) => {
      state.calls.push(structuredClone(input));
      if (options.providerError) throw new Error("Threads API에서 거부했습니다.");
      return { id: "test-post-id", permalink: "https://www.threads.net/@test/post/123" };
    } };
    return {};
  };
  vm.runInNewContext(compiled, { module, exports: module.exports, require: requireMock, console, Error, Date, Set, Map, URL, URLSearchParams, Buffer, process, setTimeout }, { filename: "web-actions.ts" });
  return { state, actions: module.exports };
}

test("수정 저장은 초안 본문만 저장하고 발행하지 않는다", async () => {
  const { state, actions } = fixture({ post: { media: [{ url: "test-image.png", type: "IMAGE" }] } });
  const result = await actions.runDraftAction({ draftId, intent: "save", body: " 수정한 본문 " });
  assert.equal(result.ok, true);
  assert.equal(state.post.body, "수정한 본문");
  assert.equal(state.post.status, "draft");
  assert.equal(state.post.media.length, 1);
  assert.equal(state.calls.length, 0);
});

test("저장 후 실제 발행 성공은 수정 본문·미디어·완료 기록·링크를 유지한다", async () => {
  const media = [{ url: "test-image.png", type: "IMAGE" }];
  const { state, actions } = fixture({ post: { media } });
  const result = await actions.runDraftAction({ draftId, intent: "publish", body: "최종 수정 본문" });
  assert.equal(result.ok, true);
  assert.equal(state.calls.length, 1);
  assert.equal(state.calls[0].text, "최종 수정 본문");
  assert.deepEqual(state.calls[0].media, media);
  assert.equal(state.post.status, "published");
  assert.equal(state.post.threads_post_id, "test-post-id");
  assert.equal(state.post.permalink, result.permalink);
  assert.ok(state.post.published_at);
  assert.equal(state.post.error_message, null);
});

test("동시에 발행을 요청해도 외부 포스팅은 한 번만 실행된다", async () => {
  const { state, actions } = fixture();
  const results = await Promise.allSettled(Array.from({ length: 5 }, () => actions.publishDraft(draftId)));
  assert.equal(results.filter((item) => item.status === "fulfilled").length, 1);
  assert.equal(state.calls.length, 1);
  assert.equal(state.post.status, "published");
});

for (const status of ["scheduled", "publishing", "published"]) {
  test(`${status} 상태는 수정 저장·재발행으로 되돌리지 않는다`, async () => {
    const { state, actions } = fixture({ post: { status } });
    assert.equal((await actions.runDraftAction({ draftId, intent: "publish", body: "덮어쓰면 안 됨" })).ok, false);
    assert.equal(state.post.status, status);
    assert.equal(state.post.body, "발행 전 본문");
    assert.equal(state.calls.length, 0);
  });
}

test("타인 글은 수정·발행할 수 없다", async () => {
  const { state, actions } = fixture({ post: { user_id: "other-user" } });
  assert.equal((await actions.runDraftAction({ draftId, intent: "publish", body: "타인 본문" })).ok, false);
  assert.equal(state.post.body, "발행 전 본문");
  assert.equal(state.calls.length, 0);
});

for (const options of [{ loggedOut: true }, { noAccess: true }, { claimError: true }, { account: { token_expires_at: "2000-01-01" } }]) {
  test(`인증·권한·토큰·상태 점유 실패는 외부 게시를 막는다: ${JSON.stringify(options)}`, async () => {
    const { state, actions } = fixture(options);
    const result = await actions.runDraftAction({ draftId, intent: "publish", body: "본문" });
    assert.equal(result.ok, false);
    assert.equal(state.calls.length, 0);
    assert.equal(state.post.status, "draft");
  });
}

test("외부 API 오류는 재검토 상태와 읽을 수 있는 사유를 돌려준다", async () => {
  const { state, actions } = fixture({ providerError: true });
  const result = await actions.runDraftAction({ draftId, intent: "publish", body: "본문" });
  assert.equal(result.ok, false);
  assert.match(result.error, /Threads API/);
  assert.equal(state.post.status, "failed");
  assert.equal(state.post.error_message, result.error);
});

test("외부 게시 성공 후 DB 기록 실패는 중복 게시 가능한 실패 상태로 되돌리지 않는다", async () => {
  const { state, actions } = fixture({ recordError: true });
  const result = await actions.runDraftAction({ draftId, intent: "publish", body: "본문" });
  assert.equal(result.ok, false);
  assert.match(result.error, /중복 발행하지 말고/);
  assert.equal(state.post.status, "publishing");
  assert.equal((await actions.runDraftAction({ draftId, intent: "publish", body: "본문" })).ok, false);
  assert.equal(state.calls.length, 1);
});

test("500자 초과는 초안을 잃지 않고 발행·예약을 막는다", async () => {
  const { state, actions } = fixture();
  assert.equal((await actions.runDraftAction({ draftId, intent: "publish", body: "가".repeat(501) })).ok, false);
  assert.equal(state.post.status, "draft");
  assert.equal(state.calls.length, 0);
});

test("예약은 수정 본문을 저장하고 취소 후 다시 수정 가능한 초안이 된다", async () => {
  const { state, actions } = fixture();
  const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  assert.equal((await actions.runDraftAction({ draftId, intent: "schedule", body: "예약 전 수정 본문", scheduledAt })).ok, true);
  assert.equal(state.post.status, "scheduled");
  assert.equal(state.post.body, "예약 전 수정 본문");
  assert.equal((await actions.runDraftAction({ draftId, intent: "cancel" })).ok, true);
  assert.equal(state.post.status, "draft");
  assert.equal(state.calls.length, 0);
});

test("발행 실패 콘텐츠는 명시적으로 재검토 상태로 돌린 뒤 수정할 수 있다", async () => {
  const { state, actions } = fixture({ post: { status: "failed" } });
  assert.equal((await actions.runDraftAction({ draftId, intent: "retry" })).ok, true);
  assert.equal((await actions.runDraftAction({ draftId, intent: "save", body: "재검토 수정 본문" })).ok, true);
  assert.equal(state.post.status, "draft");
  assert.equal(state.post.body, "재검토 수정 본문");
});

test("페르소나 템플릿에서 수정한 주제·말투·독자·경험·상품·참고글을 생성기로 전달한다", async () => {
  const { state, actions } = fixture();
  const custom = { product: "입력한 소재", experience: "내 실제 경험", targetAudience: "수정한 타깃", benchmarkPost: "내 참고글" };
  const result = await actions.generateAttentionPost({ topic: "수정한 주제", personaId: "single", personaTone: "차분한 존댓말", custom });
  assert.equal(result.ok, true);
  assert.equal(state.generations.length, 1);
  assert.equal(state.generations[0].topic, "수정한 주제");
  assert.equal(state.generations[0].personaTone, "차분한 존댓말");
  assert.deepEqual(state.generations[0].custom, custom);
  assert.equal(state.generations[0].engine.apiKey, "fake-member-ai-key");
  assert.equal(state.calls.length, 0);
});

test("말투를 전달하지 않은 기존 요청은 기본 페르소나를 유지하고 명시적 빈 값은 강제로 되살리지 않는다", async () => {
  const { state, actions } = fixture();
  await actions.generateAttentionPost({ topic: "기본 주제", personaId: "single" });
  assert.match(state.generations[0].personaTone, /원룸 자취/);
  await actions.generateAttentionPost({ topic: "기본 주제", personaId: "single", personaTone: "" });
  assert.equal(state.generations[1].personaTone, "");
});

test("페르소나 생성도 회원 권한·본인 AI 키가 없으면 호출하지 않는다", async () => {
  for (const options of [{ loggedOut: true }, { noAccess: true }, { noKey: true }]) {
    const { state, actions } = fixture(options);
    assert.equal((await actions.generateAttentionPost({ topic: "주제", personaId: "single" })).ok, false);
    assert.equal(state.generations.length, 0);
  }
});
