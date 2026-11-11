// 홈택스 전자세금계산서 일괄발급 엑셀 — 공식 양식에 채워 넣기(2026-11-12). 플랜 docs/PLAN_20261027_RECEIPT_TAX_INVOICE.md §6-3.
// · 양식: src/server/hometaxTemplate.ts(홈택스에서 받은 「세금계산서등록양식(일반)」, 보호만 풀고 xlsx로 저장).
// · 엑셀업로드양식 시트(sheet1)의 7~106행에 미리 만들어진 빈 칸(서식 = 텍스트)에 값만 넣는다 — 행·열·서식·다른 시트는 그대로.
// · 모든 값은 텍스트(inlineStr)로 넣는다(홈택스 안내: 수식·숫자 서식 금지, 앞자리 0 유지).
import { HOMETAX_TEMPLATE_B64 } from "./hometaxTemplate";
import { colName, HOMETAX_COLS, HOMETAX_MAX_ROWS } from "./receiptsCore";
import { readZip, writeZip } from "./zipLite";

const SHEET = "xl/worksheets/sheet1.xml";
const FIRST_ROW = 7;

const xmlEsc = (s: string) =>
  s
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** 양식 시트 XML의 빈 칸에 값을 넣는다(시험용으로 따로 내보냄) */
export function fillSheetXml(xml: string, rows: string[][]): string {
  if (rows.length > HOMETAX_MAX_ROWS) throw new Error(`홈택스 양식은 한 번에 ${HOMETAX_MAX_ROWS}건까지입니다.`);
  let out = xml;
  rows.forEach((row, i) => {
    if (row.length !== HOMETAX_COLS) throw new Error(`양식 한 줄은 ${HOMETAX_COLS}칸이어야 합니다.`);
    const r = FIRST_ROW + i;
    row.forEach((v, c) => {
      if (!v) return;
      const ref = `${colName(c)}${r}`;
      const re = new RegExp(`<c r="${ref}"( s="\\d+")?/>`);
      if (!re.test(out)) throw new Error(`양식에서 ${ref} 칸을 찾지 못했습니다(홈택스 양식이 바뀌었을 수 있음).`);
      out = out.replace(re, (_m, s = "") => `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`);
    });
  });
  return out;
}

/** 줄들 → 홈택스 일괄발급 엑셀(xlsx) 파일 */
export function buildHometaxXlsx(rows: string[][]): Buffer {
  const entries = readZip(Buffer.from(HOMETAX_TEMPLATE_B64, "base64"));
  const sheet = entries.find((e) => e.name === SHEET);
  if (!sheet) throw new Error("홈택스 양식에서 엑셀업로드양식 시트를 찾지 못했습니다.");
  sheet.data = Buffer.from(fillSheetXml(sheet.data.toString("utf8"), rows), "utf8");
  return writeZip(entries);
}
