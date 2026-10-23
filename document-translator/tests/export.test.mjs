import { test } from "node:test";
import assert from "node:assert/strict";
import { unzipSync, zipSync, strToU8, strFromU8 } from "fflate";
import { markdownDocx } from "../src/lib/translation/export.ts";
import { inspectDocxZip } from "../src/lib/translation/zip.ts";
import { makeBackup, parseBackup } from "../src/lib/translation/backup.ts";
import { emptyState } from "../src/lib/translation/model.ts";
test("DOCX exports semantic headings, bold, lists, table and safe links rather than literal Markdown", async () => {
  const blob = await markdownDocx(
    "# 안내\n\n**중요** *표현*\n\n- 항목\n\n1. 순서\n\n| 용어 | 번역 |\n| --- | --- |\n| API | 연결 |\n\n[웹](https://example.com) [금지](javascript:alert%281%29)",
  );
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.ok(inspectDocxZip(bytes).length > 0);
  const files = unzipSync(bytes),
    xml = strFromU8(files["word/document.xml"]),
    rels = strFromU8(files["word/_rels/document.xml.rels"]);
  assert.match(xml, /Heading1/);
  assert.match(xml, /<w:b/);
  assert.match(xml, /<w:i/);
  assert.match(xml, /<w:numPr/);
  assert.match(xml, /<w:tbl>/);
  assert.match(xml, /중요/);
  assert.doesNotMatch(xml, /# 안내|\*\*중요/);
  assert.match(rels, /https:\/\/example.com/);
  assert.doesNotMatch(rels, /javascript:/);
});
test("DOCX rejects traversal, encrypted archives and expansion claims before extraction", () => {
  const good = zipSync({ "word/document.xml": strToU8("<document/>") });
  assert.equal(inspectDocxZip(good)[0].name, "word/document.xml");
  assert.throws(() =>
    inspectDocxZip(zipSync({ "../word/document.xml": strToU8("x") })),
  );
  const invalid = good.slice(),
    view = new DataView(invalid.buffer);
  let p = 0;
  while (view.getUint32(p, true) !== 0x02014b50) p++;
  view.setUint32(p + 24, 21 * 1024 * 1024, true);
  assert.throws(() => inspectDocxZip(invalid), /20MB/);
  view.setUint32(p + 24, 11, true);
  view.setUint16(p + 8, 1, true);
  assert.throws(() => inspectDocxZip(invalid), /암호화/);
});
test("backup rejects credentials, cross-program formats, newer versions and inconsistent aligned paragraphs", () => {
  const backup = makeBackup("나의 문서", {
    ...emptyState(),
    sourceText: "원문",
  });
  assert.equal(parseBackup(JSON.stringify(backup)).document.sourceText, "원문");
  for (const bad of [
    { ...backup, apiKey: "secret" },
    { ...backup, program: "other" },
    { ...backup, appVersion: "v1.99" },
    {
      ...backup,
      document: {
        ...backup.document,
        translationText: "A",
        aligned: [{ id: "b1", text: "원문", translated: "B", separator: "" }],
      },
    },
  ])
    assert.throws(() => parseBackup(JSON.stringify(bad)));
});
