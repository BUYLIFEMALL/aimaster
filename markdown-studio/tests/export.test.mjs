import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";
import { markdownToBlocks, mergeDocuments, htmlToText, safeHref } from "../src/lib/export/blocks.ts";
import { buildPdfDefinition } from "../src/lib/export/pdf.ts";
import { buildDocx, renderDocxBuffer } from "../src/lib/export/docx.ts";
import { normalizePageOptions } from "../src/lib/export/options.ts";

const require = createRequire(import.meta.url);
const fontDir = path.resolve("node_modules/@expo-google-fonts/noto-sans-kr");
const SAMPLE = [
  "# 한글 제목", "", "본문에 **굵게**와 *기울임*, ~~취소~~, `코드`, [링크](https://example.com)가 있습니다. 희귀 음절: 똠방각하 쀍 뷁", "",
  "- 글머리 하나", "- [x] 완료", "- [ ] 미완료", "", "1. 숫자 하나", "2. 숫자 둘", "", "a. 알파벳 하나", "b. 알파벳 둘", "",
  "> 인용문 한 줄", "", "| 왼쪽 | 가운데 | 오른쪽 |", "| :--- | :---: | ---: |", "| 가 | 나 | 다 |", "", "```js", "const a = 1; // 주석", "```", "", "---", "",
  "![대체 설명](https://example.com/a.png)", "", "<script>window.x=1</script><b>태그</b> 글자", "", "[위험](javascript:alert(1))",
].join("\n");

async function pdfText(buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: false, verbosity: 0 }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    const text = (await page.getTextContent()).items.map(x => x.str).join(" ");
    pages.push({ text, width: Math.round(vp.width), height: Math.round(vp.height) });
  }
  return pages;
}
async function renderPdf(def) {
  const pdfmake = require("pdfmake");
  const R = path.join(fontDir, "400Regular/NotoSansKR_400Regular.ttf"), B = path.join(fontDir, "700Bold/NotoSansKR_700Bold.ttf");
  pdfmake.setFonts({ Noto: { normal: R, bold: B, italics: R, bolditalics: B } });
  pdfmake.setUrlAccessPolicy(() => false);
  return await pdfmake.createPdf(def).getBuffer();
}

test("블록 변환: 서식·목록·표·코드·인용·이미지·위험 HTML", () => {
  const b = markdownToBlocks(SAMPLE);
  const kinds = b.map(x => x.k);
  assert.deepEqual(kinds.slice(0, 2), ["heading", "paragraph"]);
  const p = b[1];
  assert.ok(p.runs.some(r => r.bold && r.text === "굵게") && p.runs.some(r => r.italic) && p.runs.some(r => r.strike) && p.runs.some(r => r.code));
  assert.equal(p.runs.find(r => r.href)?.href, "https://example.com");
  const lists = b.filter(x => x.k === "list");
  assert.equal(lists.length, 3);
  assert.deepEqual(lists[0].items.map(i => i.checked), [null, true, false]);
  assert.equal(lists[1].style, "decimal");
  assert.equal(lists[2].style, "alpha");
  const table = b.find(x => x.k === "table");
  assert.deepEqual(table.aligns, ["left", "center", "right"]);
  assert.equal(table.rows[0].length, 3);
  assert.equal(b.find(x => x.k === "code").lang, "js");
  assert.ok(b.some(x => x.k === "quote") && b.some(x => x.k === "rule"));
  const all = JSON.stringify(b);
  assert.ok(all.includes("[이미지: 대체 설명]"));
  assert.ok(!all.includes("window.x=1"), "script 내용은 출력하지 않음");
  assert.ok(all.includes("태그"));
  assert.ok(!all.includes("javascript:"), "위험한 링크 주소는 제거");
  assert.equal(safeHref("javascript:alert(1)"), undefined);
  assert.equal(htmlToText("<style>x{}</style><p>a&amp;b</p>"), "a&b");
});

test("문서 합치기: 파일 이름 제목 + 쪽 나눔", () => {
  const b = mergeDocuments([{ name: "첫째.md", markdown: "본문1" }, { name: "둘째.txt", markdown: "본문2" }]);
  assert.deepEqual(b.map(x => x.k), ["heading", "paragraph", "pageBreak", "heading", "paragraph"]);
  assert.equal(b[3].runs[0].text, "둘째");
});

test("용지 옵션 정규화", () => {
  assert.deepEqual(normalizePageOptions({ size: "LETTER", orientation: "landscape", margin: "wide", fontSize: 12 }), { size: "LETTER", orientation: "landscape", margin: "wide", fontSize: 12 });
  assert.deepEqual(normalizePageOptions({ size: "x", fontSize: 99 }), { size: "A4", orientation: "portrait", margin: "normal", fontSize: 11 });
});

test("PDF: 실제 생성 → 한글 글자 추출, 여러 쪽, 용지 크기·방향", async () => {
  const blocks = markdownToBlocks(SAMPLE + "\n\n" + "긴 문장입니다. ".repeat(600));
  const buf = await renderPdf(buildPdfDefinition(blocks, "시험", { size: "A4" }));
  assert.equal(String.fromCharCode(...buf.slice(0, 5)), "%PDF-");
  const pages = await pdfText(buf);
  assert.ok(pages.length >= 2, `쪽 수 ${pages.length}`);
  const text = pages.map(p => p.text).join(" ");
  for (const word of ["한글 제목", "굵게", "똠방각하", "쀍", "글머리 하나", "[✓]", "알파벳 둘", "인용문", "오른쪽", "[이미지: 대체 설명]", "태그"]) assert.ok(text.includes(word), `PDF에 없음: ${word}`);
  assert.ok(!text.includes("window.x"), "script 내용 없음");
  assert.deepEqual([pages[0].width, pages[0].height], [595, 842]);
  const letter = await pdfText(await renderPdf(buildPdfDefinition(blocks.slice(0, 3), "시험", { size: "LETTER", orientation: "landscape" })));
  assert.deepEqual([letter[0].width, letter[0].height], [792, 612]);
});

test("PDF: 빈 문서·쪽 나눔 끝은 빈 쪽을 만들지 않는다", async () => {
  const empty = await pdfText(await renderPdf(buildPdfDefinition([], "빈")));
  assert.equal(empty.length, 1);
  const merged = mergeDocuments([{ name: "a", markdown: "하나" }, { name: "b", markdown: "둘" }]);
  assert.equal((await pdfText(await renderPdf(buildPdfDefinition([...merged, { k: "pageBreak" }], "합침")))).length, 2);
});

async function docxParts(blocks, options) {
  const buf = await renderDocxBuffer(buildDocx(blocks, "시험", options));
  const zip = await JSZip.loadAsync(buf);
  const xml = async name => zip.file(name) ? await zip.file(name).async("string") : "";
  return { zip, buf, doc: await xml("word/document.xml"), numbering: await xml("word/numbering.xml"), styles: await xml("word/styles.xml"), names: Object.keys(zip.files) };
}
const wellFormed = xml => { const errors = []; new DOMParser({ onError: (_l, m) => errors.push(m) }).parseFromString(xml, "text/xml"); return errors; };

test("DOCX: 표준 구조(문단·제목·표·목록), altChunk 아님, XML이 올바름", async () => {
  const { doc, numbering, names } = await docxParts(markdownToBlocks(SAMPLE));
  assert.ok(names.includes("[Content_Types].xml") && names.includes("word/document.xml"));
  assert.ok(!names.some(n => /altchunk|\.mht|\.html/i.test(n)) && !doc.includes("altChunk"), "altChunk 방식 금지");
  assert.deepEqual(wellFormed(doc), []);
  assert.deepEqual(wellFormed(numbering), []);
  for (const needle of ["<w:tbl>", 'w:val="Heading1"', 'w:val="right"', 'w:val="center"', "한글 제목", "똠방각하", "굵게", "☑", "☐", "인용문", "[이미지: 대체 설명]", "<w:hyperlink", 'w:color="818CF8"']) assert.ok(doc.includes(needle), `document.xml에 없음: ${needle}`);
  assert.ok(numbering.includes('w:val="lowerLetter"') && numbering.includes('w:val="decimal"') && numbering.includes('w:val="bullet"'), "목록 3종 번호 형식");
  assert.ok(!doc.includes("window.x=1") && !doc.includes("javascript:"));
});

test("DOCX: 용지 크기·방향·여백이 옵션과 일치", async () => {
  const a4 = (await docxParts(markdownToBlocks("본문"), { size: "A4", margin: "narrow" })).doc;
  assert.match(a4, /<w:pgSz[^>]*w:w="11906"[^>]*w:h="16838"/);
  assert.match(a4, /w:top="567"/);
  const letter = (await docxParts(markdownToBlocks("본문"), { size: "LETTER", orientation: "landscape" })).doc;
  assert.match(letter, /<w:pgSz[^>]*w:orient="landscape"/);
  assert.match(letter, /w:w="15840"[^>]*w:h="12240"|w:h="12240"[^>]*w:w="15840"/);
});

test("DOCX: 합친 문서의 쪽 나눔, 파일 이름·제목에 XML 특수문자", async () => {
  const blocks = mergeDocuments([{ name: "<a&b>.md", markdown: "# x" }, { name: "둘", markdown: "y" }]);
  const { doc } = await docxParts(blocks);
  assert.deepEqual(wellFormed(doc), []);
  assert.ok(doc.includes('w:type="page"'));
  assert.ok(doc.includes("&lt;a&amp;b&gt;"));
});
