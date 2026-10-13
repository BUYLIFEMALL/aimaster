import "fake-indexeddb/auto";
import { test } from "node:test";
import assert from "node:assert/strict";
import { DocumentRepository } from "../src/lib/documents/repository.ts";
import { MAX_MARKDOWN_LENGTH } from "../src/lib/documents/model.ts";
import {
  BACKUP_FORMAT, buildBackup, parseBackup, wrapInFolder, decodeText, itemsFromFiles, uniqueName, MAX_FILE_BYTES,
} from "../src/lib/documents/backup.ts";
import { collectDocuments, zipPaths } from "../src/lib/export/collect.ts";

const user = () => `test-${crypto.randomUUID()}`;
const enc = s => new TextEncoder().encode(s);
const live = async repo => (await repo.list()).filter(n => !n.deletedAt);

async function seed(repo) {
  const folder = await repo.create("folder", "프로젝트");
  const sub = await repo.create("folder", "하위", folder.id);
  await repo.create("document", "개요.md", folder.id, "# 개요\n본문");
  await repo.create("document", "상세.md", sub.id, "상세 **내용** — 한글, 😀");
  await repo.create("document", "루트 문서.md", null, "루트");
  const gone = await repo.create("document", "삭제됨.md", null, "휴지통 문서");
  await repo.trash(gone.id, gone.revision);
}

test("백업 → 복원: 구조·본문이 같고, 새 식별자·새 폴더 안에 들어가며, 휴지통 항목은 제외", async () => {
  const a = new DocumentRepository(user());
  await seed(a);
  const json = buildBackup(await a.list());
  assert.ok(!json.includes("삭제됨"), "휴지통 항목은 백업에 없음");
  assert.ok(!json.includes("userId"), "회원 식별자는 백업에 없음");
  assert.equal(JSON.parse(json).format, BACKUP_FORMAT);

  const b = new DocumentRepository(user());
  const result = await b.importTree(wrapInFolder(parseBackup(json), "복원 시험"));
  assert.equal(result.created, 6); // 래퍼 폴더 + 5개
  const nodes = await live(b);
  const wrapper = nodes.find(n => n.name === "복원 시험");
  assert.equal(wrapper.parentId, null);
  const doc = nodes.find(n => n.name === "상세.md");
  assert.equal(doc.markdown, "상세 **내용** — 한글, 😀");
  const chain = [];
  for (let p = doc.parentId; p; p = nodes.find(n => n.id === p).parentId) chain.unshift(nodes.find(n => n.id === p).name);
  assert.deepEqual(chain, ["복원 시험", "프로젝트", "하위"]);
  const originalIds = new Set((await a.list()).map(n => n.id));
  assert.ok(nodes.every(n => !originalIds.has(n.id)), "새 식별자");
  assert.ok(nodes.every(n => n.userId === b.userId));
  assert.equal((await b.history(doc.id)).length, 1, "가져온 문서도 이력 1개");
  await a.close(); await b.close();
});

test("같은 회원에게 다시 복원해도 덮어쓰지 않고 이름만 겹치지 않게 한다", async () => {
  const repo = new DocumentRepository(user());
  await seed(repo);
  const before = (await live(repo)).length;
  const items = parseBackup(buildBackup(await repo.list()));
  const first = await repo.importTree(items); // 최상위에 그대로 → 이름 충돌
  assert.ok(first.renamed >= 2);
  const nodes = await live(repo);
  assert.equal(nodes.length, before * 2);
  assert.ok(nodes.some(n => n.name === "프로젝트 (2)"));
  assert.ok(nodes.some(n => n.name === "루트 문서 (2).md"), "확장자 유지");
  assert.equal(nodes.find(n => n.name === "루트 문서.md").markdown, "루트", "원본 보존");
  await repo.close();
});

test("복원은 원자적: 중간에 실패하면 아무것도 만들지 않는다", async () => {
  const repo = new DocumentRepository(user());
  const items = [
    { key: "f", parentKey: null, kind: "folder", name: "폴더", markdown: "" },
    { key: "d1", parentKey: "f", kind: "document", name: "정상.md", markdown: "ok" },
    { key: "d2", parentKey: "f", kind: "document", name: "너무 큼.md", markdown: "x".repeat(MAX_MARKDOWN_LENGTH + 1) },
  ];
  await assert.rejects(repo.importTree(items), /너무 깁니다/);
  assert.equal((await repo.list()).length, 0);
  await assert.rejects(repo.importTree([{ key: "d", parentKey: null, kind: "document", name: "a.md", markdown: "" }], "없는-폴더"), /대상 폴더/);
  assert.equal((await repo.list()).length, 0);
  await repo.close();
});

test("백업 검증: 형식·버전·순환·과대·잘못된 이름·부모를 모두 거절", () => {
  const ok = { format: BACKUP_FORMAT, version: 1, nodes: [{ id: "a", kind: "document", parentId: null, name: "a.md", markdown: "x" }] };
  assert.equal(parseBackup(JSON.stringify(ok)).length, 1);
  const rejects = (obj, re) => assert.throws(() => parseBackup(typeof obj === "string" ? obj : JSON.stringify(obj)), re);
  rejects("{깨진 json", /JSON 형식/);
  rejects("[]", /백업 파일 형식/);
  rejects({ ...ok, format: "other" }, /백업 파일이 아닙니다/);
  rejects({ ...ok, version: 99 }, /지원하지 않는 백업 버전/);
  rejects({ ...ok, nodes: "x" }, /문서 목록/);
  rejects({ ...ok, nodes: [ok.nodes[0], ok.nodes[0]] }, /중복/);
  rejects({ ...ok, nodes: [{ ...ok.nodes[0], id: "../x" }] }, /식별자/);
  rejects({ ...ok, nodes: [{ ...ok.nodes[0], name: "a/b.md" }] }, /이름이 올바르지/);
  rejects({ ...ok, nodes: [{ ...ok.nodes[0], kind: "file" }] }, /종류/);
  rejects({ ...ok, nodes: [{ ...ok.nodes[0], markdown: 5 }] }, /본문/);
  rejects({ ...ok, nodes: [{ ...ok.nodes[0], markdown: "x".repeat(MAX_MARKDOWN_LENGTH + 1) }] }, /너무 깁니다/);
  rejects({ ...ok, nodes: [{ ...ok.nodes[0], parentId: "missing" }] }, /상위 폴더가 백업에 없습니다/);
  rejects({ ...ok, nodes: [{ id: "f", kind: "folder", parentId: null, name: "f" }, { ...ok.nodes[0], parentId: "a" }] }, /폴더가 아닙니다/);
  rejects({ ...ok, nodes: [{ id: "x", kind: "folder", parentId: "y", name: "x" }, { id: "y", kind: "folder", parentId: "x", name: "y" }] }, /순환/);
  const deep = Array.from({ length: 40 }, (_, i) => ({ id: `n${i}`, kind: "folder", parentId: i ? `n${i - 1}` : null, name: `n${i}` }));
  rejects({ ...ok, nodes: deep }, /단계보다 깊어/);
  rejects("x".repeat(51 * 1024 * 1024), /너무 큽니다/);
  // __proto__ 같은 위험한 키가 있어도 객체 오염이 생기지 않는다
  parseBackup('{"format":"' + BACKUP_FORMAT + '","version":1,"nodes":[],"__proto__":{"polluted":true}}');
  assert.equal({}.polluted, undefined);
});

test("텍스트 가져오기: UTF-8·BOM·CRLF·EUC-KR, 형식·크기·바이너리 거절, 폴더 구조", () => {
  assert.deepEqual(decodeText(enc("﻿가나\r\n다")), { text: "가나\n다", encoding: "utf-8" });
  const euckr = new Uint8Array([0xb0, 0xa1, 0xb3, 0xaa, 0xb4, 0xd9]); // "가나다"
  assert.deepEqual(decodeText(euckr), { text: "가나다", encoding: "euc-kr" });
  const report = itemsFromFiles([
    { path: "메모/하위/a.md", bytes: enc("# a") },
    { path: "메모/b.txt", bytes: enc("b 본문") },
    { path: "메모/그림.png", bytes: enc("x") },
    { path: "메모/.git/config.md", bytes: enc("x") },
    { path: "큰파일.md", bytes: new Uint8Array(MAX_FILE_BYTES + 1) },
    { path: "바이너리.md", bytes: new Uint8Array([65, 0, 66]) },
    { path: "한글.md", bytes: euckr },
    { path: "위험:이름?.md", bytes: enc("x") },
    { path: "../탈출.md", bytes: enc("x") },
  ]);
  assert.equal(report.imported, 4);
  assert.equal(report.items.filter(i => i.kind === "folder").length, 2);
  assert.ok(report.items.find(i => i.name === "b.md"), ".txt는 .md 문서로");
  assert.ok(report.skipped.some(s => s.includes("그림.png")) && report.skipped.some(s => s.includes(".git")) && report.skipped.some(s => s.includes("탈출")));
  assert.deepEqual(report.errors.map(e => e.name).sort(), ["바이너리.md", "큰파일.md"]);
  assert.ok(report.notes.some(n => n.includes("EUC-KR")));
  const child = report.items.find(i => i.name === "a.md");
  assert.equal(report.items.find(i => i.key === child.parentKey).name, "하위");
  assert.ok(report.items.every(i => !/[<>:"/\\|?*]/.test(i.name)));
});

test("이름 충돌 해결·수집·ZIP 경로", async () => {
  assert.equal(uniqueName("a.md", new Set()), "a.md");
  assert.equal(uniqueName("a.md", new Set(["a.md", "a (2).md"])), "a (3).md");
  assert.equal(uniqueName("폴더", new Set(["폴더"])), "폴더 (2)");
  assert.equal(uniqueName("x".repeat(120), new Set(["x".repeat(120)])).length, 120);
  const repo = new DocumentRepository(user());
  await seed(repo);
  const nodes = await repo.list();
  const folder = nodes.find(n => n.name === "프로젝트");
  assert.deepEqual(collectDocuments(nodes, { type: "folder", id: folder.id }).map(d => d.path), ["프로젝트/개요.md", "프로젝트/하위/상세.md"]);
  assert.equal(collectDocuments(nodes, { type: "all" }).length, 3, "휴지통 문서 제외");
  const one = nodes.find(n => n.name === "루트 문서.md");
  assert.equal(collectDocuments(nodes, { type: "document", id: one.id })[0].markdown, "루트");
  assert.deepEqual(collectDocuments(nodes, { type: "document", id: "없음" }), []);
  assert.deepEqual(zipPaths(["a/b.md", "a/b.md", "A/B.md", "x:y.md"], "pdf"), ["a/b.pdf", "a/b (2).pdf", "A/B (3).pdf", "x_y.pdf"]);
  await repo.close();
});
