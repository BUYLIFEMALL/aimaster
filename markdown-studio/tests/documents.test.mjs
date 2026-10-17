import "fake-indexeddb/auto";
import { test } from "node:test";
import assert from "node:assert/strict";
import { DocumentRepository } from "../src/lib/documents/repository.ts";
import { normalizeName, searchNodes, verifyOwner, MAX_MARKDOWN_LENGTH } from "../src/lib/documents/model.ts";
const user = () => `test-${crypto.randomUUID()}`;

test("members have isolated databases and persisted empty libraries", async () => {
  const a = new DocumentRepository(user()), b = new DocumentRepository(user());
  assert.deepEqual(await a.list(), []);
  const doc = await a.create("document", "배열[1].md", null, "회원 A 문서");
  assert.equal((await a.list()).length, 1); assert.equal((await b.list()).length, 0);
  await a.trash(doc.id, doc.revision); const id = a.userId; await a.close();
  const again = new DocumentRepository(id);
  assert.equal((await again.list()).filter(n => !n.deletedAt).length, 0);
  assert.equal((await b.list()).length, 0); await again.close(); await b.close();
});
test("names, duplicate names, literal special-character search", async () => {
  for (const name of ["", "..", "a/b", "a\\b", "\u0000", "x".repeat(121)]) assert.throws(() => normalizeName(name));
  const repo = new DocumentRepository(user());
  await repo.create("document", "배열[1].md", null, "본문 .* 키워드");
  await assert.rejects(repo.create("folder", "배열[1].md"), /같은 이름/);
  for (const query of ["[", "[1]", "]", "배열"]) assert.equal(searchNodes(await repo.list(), query).length, 1);
  assert.equal(searchNodes(await repo.list(), ".*").length, 0);
  assert.equal(searchNodes(await repo.list(), ".*", true).length, 1); await repo.close();
});
test("folder moves reject cycles, missing parents and document parents", async () => {
  const repo = new DocumentRepository(user());
  const a = await repo.create("folder", "A"), b = await repo.create("folder", "B", a.id);
  const doc = await repo.create("document", "문서", b.id);
  await assert.rejects(repo.update(a.id, a.revision, { parentId: b.id }), /하위 폴더/);
  await assert.rejects(repo.update(b.id, b.revision, { parentId: a.id === "x" ? null : b.id }), /하위 폴더/);
  await assert.rejects(repo.create("document", "새 문서", doc.id), /대상 폴더/);
  await assert.rejects(repo.create("document", "새 문서", "missing"), /대상 폴더/);
  assert.equal((await repo.list()).length, 3); await repo.close();
});
test("concurrent stale edits fail atomically without losing winner", async () => {
  const id = user(), a = new DocumentRepository(id), b = new DocumentRepository(id);
  const doc = await a.create("document", "동시 수정.md", null, "초기");
  const outcomes = await Promise.allSettled([a.update(doc.id, 1, { markdown: "A" }), b.update(doc.id, 1, { markdown: "B" })]);
  assert.equal(outcomes.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(outcomes.filter(r => r.status === "rejected" && r.reason.code === "CONFLICT").length, 1);
  const final = (await a.list())[0]; assert.equal(final.revision, 2); assert.ok(["A", "B"].includes(final.markdown));
  assert.equal((await a.history(doc.id)).length, 2); await a.close(); await b.close();
});
test("trash and restore a subtree without restoring previously deleted children", async () => {
  const repo = new DocumentRepository(user());
  const folder = await repo.create("folder", "폴더");
  const visible = await repo.create("document", "유지", folder.id, "유지 본문");
  const previous = await repo.create("document", "이미 휴지통", folder.id);
  await repo.trash(previous.id, previous.revision);
  await repo.trash(folder.id, folder.revision);
  let rows = await repo.list(); assert.ok(rows.every(n => n.deletedAt));
  await repo.restore(folder.id, rows.find(n => n.id === folder.id).revision);
  rows = await repo.list(); assert.equal(rows.find(n => n.id === folder.id).deletedAt, null);
  assert.equal(rows.find(n => n.id === visible.id).deletedAt, null);
  assert.ok(rows.find(n => n.id === previous.id).deletedAt); await repo.close();
});
test("restore rejects live duplicate and allows recovery to root with missing parent", async () => {
  const repo = new DocumentRepository(user());
  const doc = await repo.create("document", "동일.md"); await repo.trash(doc.id, 1);
  await repo.create("document", "동일.md"); await assert.rejects(repo.restore(doc.id, 2), /같은 이름/);
  const folder = await repo.create("folder", "삭제 폴더"); const child = await repo.create("document", "자식", folder.id);
  await repo.trash(folder.id, 1); await repo.restore(child.id, 2);
  assert.equal((await repo.list()).find(n => n.id === child.id).parentId, null); await repo.close();
});
test("revisions are capped, recoverable and a stale restore is blocked", async () => {
  const repo = new DocumentRepository(user()); let doc = await repo.create("document", "이력.md", null, "첫 본문");
  for (let i = 0; i < 35; i++) doc = await repo.update(doc.id, doc.revision, { markdown: `본문 ${i}` });
  const history = await repo.history(doc.id); assert.equal(history.length, 30);
  await assert.rejects(repo.restoreRevision(doc.id, 1, history[2].revision), /다른 탭/);
  const recovered = await repo.restoreRevision(doc.id, doc.revision, history[2].revision);
  assert.equal(recovered.markdown, history[2].markdown); assert.equal(recovered.revision, doc.revision + 1); await repo.close();
});
test("owner checks and size failures do not create records", async () => {
  const repo = new DocumentRepository(user()); const node = await repo.create("document", "정상.md");
  assert.throws(() => verifyOwner(node, "other-user"), /본인 문서/);
  await assert.rejects(repo.create("document", "너무 큰.md", null, "x".repeat(MAX_MARKDOWN_LENGTH+1)), /100만/);
  await assert.rejects(repo.update(node.id, 1, { markdown: "x".repeat(MAX_MARKDOWN_LENGTH+1) }), /100만/);
  assert.equal((await repo.list())[0].revision, 1); await repo.close();
});
test("preferences are scoped and clamped", async () => {
  const repo = new DocumentRepository(user()); await repo.savePreferences({ activeId: "doc", explorerOpen: false, editorPercent: 100 });
  assert.equal((await repo.preferences()).editorPercent, 75); await repo.close();
});
test("v1.12 pinned documents are saved and sanitized", async () => {
  const repo = new DocumentRepository(user());
  await repo.savePreferences({ activeId: null, explorerOpen: true, editorPercent: 50, pinnedIds: ["a", 3, "b", ...Array.from({ length: 60 }, (_, i) => `x${i}`)] });
  const saved = (await repo.preferences()).pinnedIds;
  assert.equal(saved.length, 50); assert.deepEqual(saved.slice(0, 2), ["a", "b"]);
  await repo.savePreferences({ activeId: null, explorerOpen: true, editorPercent: 50 });
  assert.deepEqual((await repo.preferences()).pinnedIds, []); await repo.close();
});
test("v1.14 pin color tags are saved only for pinned documents", async () => {
  const repo = new DocumentRepository(user());
  await repo.savePreferences({ activeId: null, explorerOpen: true, editorPercent: 50, pinnedIds: ["a", "b"], pinColors: { a: "green", b: "nope", z: "red" } });
  assert.deepEqual((await repo.preferences()).pinColors, { a: "green" });
  await repo.savePreferences({ activeId: null, explorerOpen: true, editorPercent: 50, pinnedIds: ["b"], pinColors: { a: "green" } });
  assert.deepEqual((await repo.preferences()).pinColors, {}); await repo.close();
});
test("v1.16 pin tag names are saved and sanitized", async () => {
  const repo = new DocumentRepository(user());
  await repo.savePreferences({ activeId: null, explorerOpen: true, editorPercent: 50, pinNames: { red: " 급함 ", pink: "x" } });
  assert.deepEqual((await repo.preferences()).pinNames, { red: "급함" }); await repo.close();
});
test("IndexedDB quota failure rolls back changes and preserves original content", async () => {
  const repo = new DocumentRepository(user()); const node = await repo.create("document", "할당량.md", null, "저장된 원고");
  const original = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function() { throw new DOMException("기기 저장 공간이 부족합니다.","QuotaExceededError"); };
  try { await assert.rejects(repo.update(node.id, 1, { markdown:"잃으면 안 되는 원고" }), /저장 공간/); }
  finally { IDBObjectStore.prototype.put = original; }
  assert.equal((await repo.list())[0].markdown,"저장된 원고");
  assert.equal((await repo.history(node.id)).length,1); await repo.close();
});
test("v1.17 purgeTrash deletes only trashed items with their history and keeps live ones", async () => {
  const repo = new DocumentRepository(user());
  const folder = await repo.create("folder", "지울 폴더");
  const inside = await repo.create("document", "안쪽.md", folder.id, "x");
  const keep = await repo.create("document", "남길 문서.md", null, "keep");
  await repo.update(inside.id, 1, { markdown: "y" });
  await repo.trash(folder.id, folder.revision);
  await repo.saveDriveMapping({ nodeId: inside.id, accountId: "acct", kind: "document", fileId: "f1", parentFileId: null, lastSyncedRevision: 1, remoteModifiedTime: "", syncedAt: "" });
  await repo.saveDriveMapping({ nodeId: keep.id, accountId: "acct", kind: "document", fileId: "f2", parentFileId: null, lastSyncedRevision: 1, remoteModifiedTime: "", syncedAt: "" });
  const result = await repo.purgeTrash();
  assert.equal(result.purged, 2); assert.deepEqual(new Set(result.ids), new Set([folder.id, inside.id]));
  const rows = await repo.list();
  assert.deepEqual(rows.map(n => n.id), [keep.id]);
  await assert.rejects(repo.history(inside.id), /찾을 수 없습니다/);
  assert.equal((await repo.history(keep.id)).length, 1);
  assert.deepEqual((await repo.driveMappings("acct")).map(m => m.nodeId), [keep.id]);
  assert.equal((await repo.purgeTrash()).purged, 0); await repo.close();
});
test("v1.18 purgeTrashItem removes one trash item with its same-batch children only", async () => {
  const repo = new DocumentRepository(user());
  const folder = await repo.create("folder", "폴더");
  const early = await repo.create("document", "먼저 지움.md", folder.id, "a");
  const child = await repo.create("document", "함께 지움.md", folder.id, "b");
  const other = await repo.create("document", "다른 휴지통.md", null, "c");
  await repo.trash(early.id, 1);
  let rows = await repo.list();
  await repo.trash(folder.id, rows.find(n => n.id === folder.id).revision);
  await repo.trash(other.id, 1);
  rows = await repo.list();
  await assert.rejects(repo.purgeTrashItem(folder.id, 1), /다른 탭/);
  const live = await repo.create("document", "살아있음.md");
  await assert.rejects(repo.purgeTrashItem(live.id, 1), /휴지통에 있는 항목만/);
  const result = await repo.purgeTrashItem(folder.id, rows.find(n => n.id === folder.id).revision);
  assert.deepEqual(new Set(result.ids), new Set([folder.id, child.id]));
  rows = await repo.list();
  assert.deepEqual(new Set(rows.map(n => n.id)), new Set([early.id, other.id, live.id]));
  // 먼저 지운 항목은 복원하면 최상위로
  const restored = await repo.restore(early.id, rows.find(n => n.id === early.id).revision);
  assert.equal((await repo.list()).find(n => n.id === early.id).parentId, null); await repo.close();
});
