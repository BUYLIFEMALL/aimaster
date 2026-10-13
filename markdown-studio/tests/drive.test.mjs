import "fake-indexeddb/auto";
import { test } from "node:test";
import assert from "node:assert/strict";
import { DocumentRepository } from "../src/lib/documents/repository.ts";
import { createDriveApi, DriveError, ROOT_FOLDER_NAME } from "../src/lib/drive/api.ts";
import { ensureRootFolder, uploadDocuments, listRemote, pullEntries } from "../src/lib/drive/sync.ts";
import { createDriveMock } from "./drive-mock.mjs";

const user = () => `test-${crypto.randomUUID()}`;
function setup(mockOptions) {
  const mock = createDriveMock(mockOptions);
  const sleeps = [];
  const api = createDriveApi({ getToken: () => mock.token, fetchImpl: mock.fetchImpl, sleep: async ms => { sleeps.push(ms); }, maxRetries: 3 });
  const repo = new DocumentRepository(user());
  return { mock, api, repo, sleeps, session: { api, accountId: mock.account.permissionId } };
}
async function seed(repo) {
  const folder = await repo.create("folder", "프로젝트");
  const sub = await repo.create("folder", "하위 '폴더'", folder.id);
  const a = await repo.create("document", "개요.md", folder.id, "# 개요\n본문");
  const b = await repo.create("document", "상세.md", sub.id, "상세 **내용** — 한글, 😀");
  const c = await repo.create("document", "루트 문서.md", null, "루트");
  return { folder, sub, a, b, c };
}
const statuses = r => Object.fromEntries(r.map(x => [x.path, x.status]));

test("첫 업로드: 전용 폴더 아래에 구조를 만들고(루트 폴백 없음) 연결 기록을 저장", async () => {
  const { mock, repo, session } = setup(); const s = await seed(repo);
  const rootId = await ensureRootFolder(repo, session);
  assert.equal(mock.files.get(rootId).name, ROOT_FOLDER_NAME);
  const res = await uploadDocuments(repo, session, rootId, [s.a.id, s.b.id, s.c.id]);
  assert.deepEqual(statuses(res), { "프로젝트/개요.md": "created", "프로젝트/하위 '폴더'/상세.md": "created", "루트 문서.md": "created" });
  const drive = id => mock.files.get(id);
  const doc = mock.byName("상세.md")[0];
  assert.equal(doc.content, "상세 **내용** — 한글, 😀");
  assert.equal(drive(doc.parents[0]).name, "하위 '폴더'");
  assert.equal(drive(drive(doc.parents[0]).parents[0]).name, "프로젝트");
  assert.equal(drive(drive(drive(doc.parents[0]).parents[0]).parents[0]).id, rootId);
  assert.equal(mock.byName("루트 문서.md")[0].parents[0], rootId, "최상위 문서도 전용 폴더 아래");
  assert.ok([...mock.files.values()].every(f => f.id === "root" || !f.parents.includes("root") || f.name === ROOT_FOLDER_NAME), "My Drive 최상위에는 전용 폴더만 생김");
  const maps = await repo.driveMappings("acct-1");
  assert.equal(maps.filter(m => m.kind === "document").length, 3);
  assert.equal(maps.filter(m => m.kind === "folder").length, 2);
  await repo.close();
});

test("다시 올리기: 변경 없으면 요청 없이 건너뛰고, 수정하면 같은 파일을 갱신", async () => {
  const { mock, repo, session } = setup(); const s = await seed(repo);
  const rootId = await ensureRootFolder(repo, session);
  await uploadDocuments(repo, session, rootId, [s.a.id]);
  mock.resetLog();
  assert.deepEqual(statuses(await uploadDocuments(repo, session, rootId, [s.a.id])), { "프로젝트/개요.md": "unchanged" });
  assert.equal(mock.log.filter(r => r.path.includes("upload")).length, 0, "변경 없으면 업로드 없음");
  const fileId = mock.byName("개요.md")[0].id;
  await repo.update(s.a.id, 1, { markdown: "# 개요\n수정됨" });
  assert.equal((await uploadDocuments(repo, session, rootId, [s.a.id]))[0].status, "updated");
  assert.equal(mock.byName("개요.md").length, 1, "같은 파일을 갱신(복제 없음)");
  assert.equal(mock.files.get(fileId).content, "# 개요\n수정됨");
  assert.equal((await repo.driveMappings("acct-1")).find(m => m.nodeId === s.a.id).lastSyncedRevision, 2);
  await repo.close();
});

test("이름이 같은 다른 파일이 Drive에 있어도 덮어쓰지 않고(ID로 연결) 새로 만든다", async () => {
  const { mock, repo, session } = setup(); const s = await seed(repo);
  const rootId = await ensureRootFolder(repo, session);
  const other = mock.add({ name: "루트 문서.md", parents: [rootId], content: "다른 사람 내용" });
  await uploadDocuments(repo, session, rootId, [s.c.id]);
  assert.equal(mock.files.get(other.id).content, "다른 사람 내용");
  assert.equal(mock.byName("루트 문서.md").length, 2);
  await repo.close();
});

test("Drive에서 파일이 바뀌면 충돌로 알리고 덮어쓰지 않으며, 강제 선택 시에만 덮어쓴다", async () => {
  const { mock, repo, session } = setup(); const s = await seed(repo);
  const rootId = await ensureRootFolder(repo, session);
  await uploadDocuments(repo, session, rootId, [s.c.id]);
  const f = mock.byName("루트 문서.md")[0];
  mock.edit(f.id, "Drive에서 수정");
  await repo.update(s.c.id, 1, { markdown: "내 수정" });
  const r = await uploadDocuments(repo, session, rootId, [s.c.id]);
  assert.equal(r[0].status, "conflict"); assert.match(r[0].message, /덮어쓰지 않았습니다/);
  assert.equal(f.content, "Drive에서 수정");
  assert.equal((await uploadDocuments(repo, session, rootId, [s.c.id], { force: true }))[0].status, "updated");
  assert.equal(f.content, "내 수정");
  await repo.close();
});

test("로컬 이름 변경·폴더 이동이 Drive에 반영되고, 사라진/휴지통 파일을 처리", async () => {
  const { mock, repo, session } = setup(); const s = await seed(repo);
  const rootId = await ensureRootFolder(repo, session);
  await uploadDocuments(repo, session, rootId, [s.a.id, s.c.id]);
  const a = mock.byName("개요.md")[0];
  await repo.update(s.a.id, 1, { name: "개요(수정).md", parentId: s.sub.id });
  assert.equal((await uploadDocuments(repo, session, rootId, [s.a.id]))[0].status, "updated");
  assert.equal(a.name, "개요(수정).md");
  assert.equal(mock.files.get(a.parents[0]).name, "하위 '폴더'");
  assert.equal(a.parents.length, 1, "이전 폴더에서 제거");
  // 사라진 파일 → 새로 만들고 알림
  const c = mock.byName("루트 문서.md")[0]; mock.remove(c.id);
  await repo.update(s.c.id, 1, { markdown: "다시" });
  const gone = await uploadDocuments(repo, session, rootId, [s.c.id]);
  assert.equal(gone[0].status, "created"); assert.match(gone[0].message, /파일이 없어/);
  // 휴지통 → 충돌
  mock.trash(mock.byName("루트 문서.md")[0].id);
  await repo.update(s.c.id, 2, { markdown: "또 수정" });
  const trashed = await uploadDocuments(repo, session, rootId, [s.c.id]);
  assert.equal(trashed[0].status, "conflict"); assert.match(trashed[0].message, /휴지통/);
  await repo.close();
});

test("오류 처리: 401은 중단·재연결 안내, 429/5xx는 재시도 후 성공 또는 정확한 실패, 네트워크·API 비활성·깨진 응답", async () => {
  // 401: 첫 문서에서 실패 → 나머지는 중단으로 기록, 성공으로 세지 않음
  let t = setup(); let s = await seed(t.repo);
  const root = await ensureRootFolder(t.repo, t.session);
  t.mock.failNext(1, 401, "authError", { match: (m, u) => u.pathname.includes("upload") });
  const r401 = await uploadDocuments(t.repo, t.session, root, [s.a.id, s.c.id]);
  assert.deepEqual(r401.map(x => x.status), ["failed", "failed"]);
  assert.match(r401[0].message, /다시 연결/); assert.match(r401[1].message, /중단됨/);
  assert.equal(t.mock.byName("루트 문서.md").length, 0);
  await t.repo.close();

  // 429 두 번 후 성공: 재시도 간격 기록, 최종 created
  t = setup(); s = await seed(t.repo);
  const root2 = await ensureRootFolder(t.repo, t.session);
  t.mock.failNext(2, 429, "rateLimitExceeded", { match: (m, u) => u.pathname.includes("upload"), headers: { "Retry-After": "2" } });
  assert.equal((await uploadDocuments(t.repo, t.session, root2, [s.c.id]))[0].status, "created");
  assert.deepEqual(t.sleeps.slice(-2), [2000, 2000]);
  await t.repo.close();

  // 5xx가 계속되면 정해진 횟수만 재시도하고 실패로 기록
  t = setup(); s = await seed(t.repo);
  const root3 = await ensureRootFolder(t.repo, t.session);
  t.mock.failNext(99, 503, "backendError", { match: (m, u) => u.pathname.includes("upload") });
  t.mock.resetLog();
  const r5 = await uploadDocuments(t.repo, t.session, root3, [s.c.id]);
  assert.equal(r5[0].status, "failed"); assert.match(r5[0].message, /Google 서버/);
  assert.equal(t.mock.log.filter(x => x.path.includes("upload")).length, 4, "최초 1회 + 재시도 3회");
  assert.equal((await t.repo.driveMappings("acct-1")).filter(m => m.kind === "document").length, 0, "실패한 항목은 연결 기록을 만들지 않음");
  await t.repo.close();

  // 네트워크 오류, API 비활성(403), 200인데 깨진 JSON
  t = setup(); s = await seed(t.repo);
  const root4 = await ensureRootFolder(t.repo, t.session);
  t.mock.failNext(99, "throw", "", { match: (m, u) => u.pathname.includes("upload") });
  assert.match((await uploadDocuments(t.repo, t.session, root4, [s.c.id]))[0].message, /인터넷 연결/);
  t.mock.clearFailures();
  t.mock.failNext(1, 403, "accessNotConfigured", { match: (m, u) => u.pathname.includes("upload") });
  assert.match((await uploadDocuments(t.repo, t.session, root4, [s.c.id]))[0].message, /Drive API가 사용 설정/);
  const badApi = createDriveApi({ getToken: () => "x", sleep: async () => {}, fetchImpl: async () => new Response("<html>not json</html>", { status: 200 }) });
  await assert.rejects(badApi.about(), e => e instanceof DriveError && e.code === "SERVER");
  await t.repo.close();
});

test("루트 폴더를 준비하지 못하면 중단하고 Drive 최상위로 폴백하지 않는다", async () => {
  const { mock, repo, session } = setup(); await seed(repo);
  mock.failNext(99, 500, "backendError", { match: (m, u) => m === "POST" && u.pathname === "/drive/v3/files" });
  await assert.rejects(ensureRootFolder(repo, session), e => e instanceof DriveError && e.code === "SERVER");
  assert.equal([...mock.files.values()].filter(f => f.id !== "root").length, 0);
  assert.equal(await repo.driveRootFolder("acct-1"), null);
  await repo.close();
});

test("계정별 분리: 다른 Google 계정은 이전 계정의 연결 기록을 재사용하지 않는다", async () => {
  const { mock, repo, session } = setup(); const s = await seed(repo);
  const rootA = await ensureRootFolder(repo, session);
  await uploadDocuments(repo, session, rootA, [s.c.id]);
  const sessionB = { api: session.api, accountId: "acct-2" };
  const rootB = await ensureRootFolder(repo, sessionB);
  const res = await uploadDocuments(repo, sessionB, rootB, [s.c.id]);
  assert.equal(res[0].status, "created", "계정 B에서는 새 파일");
  assert.equal((await repo.driveMappings("acct-1")).length, 1);
  assert.equal((await repo.driveMappings("acct-2")).length, 1);
  await repo.forgetDriveAccount("acct-1");
  assert.equal((await repo.driveMappings("acct-1")).length, 0);
  assert.equal((await repo.driveMappings("acct-2")).length, 1, "다른 계정 기록은 유지");
  await repo.close();
});

test("목록 읽기는 여러 쪽을 모두 가져오고, 이름의 따옴표를 안전하게 처리", async () => {
  const { mock, api } = setup({ pageSize: 2 });
  const folder = mock.add({ name: "o'brien \\ 폴더", mimeType: "application/vnd.google-apps.folder" });
  for (let i = 0; i < 5; i++) mock.add({ name: `n${i}.md`, parents: [folder.id] });
  assert.equal((await api.listChildren(folder.id)).length, 5);
  assert.equal((await api.findFolder("root", "o'brien \\ 폴더"))?.id, folder.id);
});

test("Drive에서 가져오기: 새 파일은 새 폴더에 구조 그대로, 이후 같음, 원격 수정은 사본/교체", async () => {
  const { mock, repo, session } = setup();
  const root = await ensureRootFolder(repo, session);
  const docs = mock.add({ name: "자료", mimeType: "application/vnd.google-apps.folder", parents: [root] });
  mock.add({ name: "a.md", parents: [docs.id], content: "A 본문\r\n둘째 줄" });
  mock.add({ name: "b.markdown", parents: [root], content: "B 본문" });
  mock.add({ name: "그림.png", mimeType: "image/png", parents: [root], content: "x" });
  mock.add({ name: "큼.md", parents: [root], content: "x".repeat(1_000_001) });
  const { entries, ignored } = await listRemote(repo, session, root);
  assert.deepEqual(entries.map(e => [e.path, e.status]), [["b.markdown", "new"], ["큼.md", "new"], ["자료/a.md", "new"]].sort((x, y) => x[0].localeCompare(y[0], "ko")));
  assert.equal(ignored, 1);
  const res = await pullEntries(repo, session, entries, "copy");
  assert.deepEqual(Object.fromEntries(res.map(r => [r.path, r.status])), { "b.markdown": "imported", "자료/a.md": "imported", "큼.md": "failed" });
  assert.match(res.find(r => r.path === "큼.md").message, /너무 깁니다/);
  const nodes = (await repo.list()).filter(n => !n.deletedAt);
  const wrapper = nodes.find(n => n.name.startsWith("Drive에서 가져옴"));
  const a = nodes.find(n => n.name === "a.md");
  assert.equal(a.markdown, "A 본문\n둘째 줄", "줄바꿈 정리");
  assert.equal(nodes.find(n => n.id === a.parentId).name, "자료");
  assert.equal(nodes.find(n => n.id === nodes.find(x => x.id === a.parentId).parentId).id, wrapper.id);
  assert.ok(nodes.some(n => n.name === "b.md"), ".markdown은 .md로");
  // 두 번째 목록: 큼.md만 new, 나머지 same
  const again = (await listRemote(repo, session, root)).entries;
  assert.deepEqual(again.map(e => e.status).sort(), ["new", "same", "same"]);
  // 원격 수정 → remote-changed. copy는 내 문서를 바꾸지 않는다
  const fa = mock.byName("a.md")[0]; mock.edit(fa.id, "A 원격 수정");
  let list = (await listRemote(repo, session, root)).entries.filter(e => e.path.endsWith("a.md"));
  assert.equal(list[0].status, "remote-changed");
  const copied = await pullEntries(repo, session, list, "copy");
  assert.equal(copied[0].status, "copied");
  const after = (await repo.list()).filter(n => !n.deletedAt);
  assert.equal(after.find(n => n.id === a.id).markdown, "A 본문\n둘째 줄");
  assert.ok(after.some(n => n.name === "a (Drive 사본).md" && n.markdown === "A 원격 수정"));
  // 로컬도 수정하면 both-changed, replace는 본문 교체 + 이력 보존
  await repo.update(a.id, a.revision, { markdown: "내 수정" });
  list = (await listRemote(repo, session, root)).entries.filter(e => e.path.endsWith("/a.md") || e.path === "자료/a.md");
  assert.equal(list[0].status, "both-changed");
  const replaced = await pullEntries(repo, session, list, "replace");
  assert.equal(replaced[0].status, "replaced");
  const final = (await repo.list()).find(n => n.id === a.id);
  assert.equal(final.markdown, "A 원격 수정");
  assert.ok((await repo.history(a.id)).some(r => r.markdown === "내 수정"), "교체 전 본문은 수정 이력에 남음");
  assert.equal((await listRemote(repo, session, root)).entries.find(e => e.path === "자료/a.md").status, "same");
  await repo.close();
});

test("가져오기 중 401이면 남은 항목을 중단으로 기록하고 아무것도 가짜 성공으로 세지 않는다", async () => {
  const { mock, repo, session } = setup();
  const root = await ensureRootFolder(repo, session);
  mock.add({ name: "1.md", parents: [root], content: "1" }); mock.add({ name: "2.md", parents: [root], content: "2" });
  const { entries } = await listRemote(repo, session, root);
  mock.failNext(1, 401, "authError", { match: (m, u) => u.searchParams.get("alt") === "media" });
  const res = await pullEntries(repo, session, entries, "copy");
  assert.deepEqual(res.map(r => r.status), ["failed", "failed"]);
  assert.match(res[1].message, /중단됨/);
  assert.equal((await repo.list()).length, 0);
  await repo.close();
});
