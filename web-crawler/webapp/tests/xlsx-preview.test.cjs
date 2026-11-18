// T-07(2026-11-18): 완료 엑셀 미리보기 해석기(xlsxPreview) — 실제 jszip·cheerio, 엑셀 조각을 직접 만들어 확인.
// 네트워크·DB·저장소 없음. 실제 TS 파일을 그대로 변환해 실행한다.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const JSZip = require('jszip');

const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/jobs/xlsxPreview.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const m = { exports: {} };
new Function('module', 'exports', 'require', js)(m, m.exports, (id) => (id === 'server-only' ? {} : require(id)));
const { parseXlsxPreview, XlsxPreviewError, PREVIEW_LIMITS } = m.exports;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const col = (n) => { let s = ''; n++; while (n) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };

/** rows: 2차원 배열(문자열·숫자·null). 문자열은 공유 문자열로, opts.inline이면 인라인 문자열로 넣는다. */
async function makeXlsx(rows, opts = {}) {
  const zip = new JSZip();
  const shared = [];
  const sheetRows = rows.map((row, ri) => {
    const cells = row.map((v, ci) => {
      if (v === null || v === undefined) return '';
      const ref = `${col(ci)}${ri + 1}`;
      if (typeof v === 'number') return `<c r="${ref}"><v>${v}</v></c>`;
      if (typeof v === 'boolean') return `<c r="${ref}" t="b"><v>${v ? 1 : 0}</v></c>`;
      if (opts.inline) return `<c r="${ref}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
      shared.push(v);
      return `<c r="${ref}" t="s"><v>${shared.length - 1}</v></c>`;
    }).join('');
    return `<row r="${ri + 1}">${cells}</row>`;
  }).join('');
  zip.file('xl/workbook.xml', `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="수집 데이터" sheetId="1" r:id="rId1"/></sheets></workbook>`);
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="${opts.target ?? 'worksheets/sheet1.xml'}"/></Relationships>`);
  if (!opts.noShared) {
    const si = shared.map((s) => (opts.rich ? `<si><r><t>${esc(s.slice(0, 1))}</t></r><r><t>${esc(s.slice(1))}</t></r></si>` : `<si><t>${esc(s)}</t></si>`)).join('');
    zip.file('xl/sharedStrings.xml', `<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${si}</sst>`);
  }
  const sheetPath = opts.target ? `xl/${opts.target.replace(/^\/xl\//, '')}` : 'xl/worksheets/sheet1.xml';
  if (!opts.noSheet) zip.file(sheetPath, `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`);
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}

test('머리글 + 공유 문자열 + 숫자', async () => {
  const p = await parseXlsxPreview(await makeXlsx([['상품명', '가격'], ['사과', 3900], ['배', 5000]]));
  assert.deepEqual(p.headers, ['상품명', '가격']);
  assert.deepEqual(p.rows, [['사과', '3900'], ['배', '5000']]);
  assert.equal(p.totalRows, 2);
  assert.equal(p.truncatedRows, false);
});

test('인라인 문자열·여러 조각(rich text)·불린', async () => {
  const a = await parseXlsxPreview(await makeXlsx([['이름'], ['홍길동']], { inline: true }));
  assert.deepEqual(a.rows, [['홍길동']]);
  const b = await parseXlsxPreview(await makeXlsx([['제목'], ['안녕하세요']], { rich: true }));
  assert.deepEqual(b.headers, ['제목']);
  assert.deepEqual(b.rows, [['안녕하세요']]);
  const c = await parseXlsxPreview(await makeXlsx([['재고'], [true]]));
  assert.deepEqual(c.rows, [['TRUE']]);
});

test('빈 칸(None)이 빠진 셀은 제자리에 빈 문자열', async () => {
  const p = await parseXlsxPreview(await makeXlsx([['a', 'b', 'c'], ['1', null, '3'], [null, null, 'z']]));
  assert.deepEqual(p.rows, [['1', '', '3'], ['', '', 'z']]);
});

test('머리글만 있는 엑셀 → 빈 상태(행 0)', async () => {
  const p = await parseXlsxPreview(await makeXlsx([['상품명', '가격']]));
  assert.deepEqual(p.headers, ['상품명', '가격']);
  assert.deepEqual(p.rows, []);
  assert.equal(p.totalRows, 0);
});

test('행이 많으면 앞 20행만, 전체 행 수와 잘림 표시', async () => {
  const rows = [['n']];
  for (let i = 1; i <= 57; i++) rows.push([`v${i}`]);
  const p = await parseXlsxPreview(await makeXlsx(rows));
  assert.equal(PREVIEW_LIMITS.rows, 20);
  assert.equal(p.rows.length, 20);
  assert.equal(p.rows[19][0], 'v20');
  assert.equal(p.totalRows, 57);
  assert.equal(p.truncatedRows, true);
});

test('열이 많으면 앞 열만, 긴 칸은 잘라 "…"', async () => {
  const head = Array.from({ length: PREVIEW_LIMITS.cols + 5 }, (_, i) => `h${i}`);
  const long = 'x'.repeat(PREVIEW_LIMITS.cellChars + 50);
  const p = await parseXlsxPreview(await makeXlsx([head, [long]]));
  assert.equal(p.headers.length, PREVIEW_LIMITS.cols);
  assert.equal(p.truncatedCols, true);
  assert.equal(p.rows[0][0].length, PREVIEW_LIMITS.cellChars + 1);
  assert.ok(p.rows[0][0].endsWith('…'));
});

test('관계 파일의 절대 경로(/xl/...)도 따라감', async () => {
  const p = await parseXlsxPreview(await makeXlsx([['a'], ['b']], { target: '/xl/worksheets/data.xml' }));
  assert.deepEqual(p.rows, [['b']]);
});

test('공유 문자열 파일이 없어도 숫자 시트는 읽힘', async () => {
  const p = await parseXlsxPreview(await makeXlsx([[1], [2]], { noShared: true }));
  assert.deepEqual(p.headers, ['1']);
  assert.deepEqual(p.rows, [['2']]);
});

test('엑셀이 아닌 파일 → not_xlsx', async () => {
  await assert.rejects(parseXlsxPreview(new TextEncoder().encode('<html>hello</html>')), (e) => e instanceof XlsxPreviewError && e.code === 'not_xlsx');
});

test('시트가 없는 압축 파일 → not_xlsx', async () => {
  await assert.rejects(parseXlsxPreview(await makeXlsx([['a']], { noSheet: true })), (e) => e instanceof XlsxPreviewError && e.code === 'not_xlsx');
});

test('파일 자체가 상한보다 크면 압축을 풀기 전에 too_large', async () => {
  const big = new Uint8Array(PREVIEW_LIMITS.fileBytes + 1);
  await assert.rejects(parseXlsxPreview(big), (e) => e instanceof XlsxPreviewError && e.code === 'too_large');
});

test('풀면 지나치게 커지는 시트(압축 폭탄) → 풀기 전에 too_large', async () => {
  const zip = new JSZip();
  zip.file('xl/workbook.xml', '<workbook><sheets><sheet r:id="rId1" xmlns:r="x"/></sheets></workbook>');
  zip.file('xl/_rels/workbook.xml.rels', '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>');
  zip.file('xl/worksheets/sheet1.xml', ' '.repeat(PREVIEW_LIMITS.xmlBytes + 10));
  const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  assert.ok(bytes.length < PREVIEW_LIMITS.fileBytes, '압축 크기는 작다');
  await assert.rejects(parseXlsxPreview(bytes), (e) => e instanceof XlsxPreviewError && e.code === 'too_large');
});

test('칸 안의 HTML 같은 글자는 글자 그대로(해석하지 않음)', async () => {
  const p = await parseXlsxPreview(await makeXlsx([['t'], ['<script>alert(1)</script>']]));
  assert.equal(p.rows[0][0], '<script>alert(1)</script>');
});
