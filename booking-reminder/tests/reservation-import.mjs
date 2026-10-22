// 2026-10-23 v1.28 — 한국 시간 처리 + 예약 엑셀 일괄 등록 시험. 실제 lib/reservationImport.ts·서버 액션을 묶어 실행하고
// DB·권한만 가짜로 바꾼다. 네트워크·운영 DB 쓰기·발송 없음. 실행: npm run test:import
import assert from "node:assert/strict";
import { build } from "esbuild";
import * as XLSX from "xlsx";

const mocks = {
  "next/cache": "export const revalidatePath = () => {};",
  "@/lib/access": 'export const requireProgramAccess = async () => ({ id: "member-a" });',
  "@/lib/supabase/server": "export const createClient = async () => globalThis.fx.client;",
};
const bundle = async (entry) => {
  const out = await build({
    entryPoints: [entry], bundle: true, write: false, format: "esm", platform: "node", alias: { "@": "." }, external: ["xlsx"],
    plugins: [{ name: "mocks", setup(b) {
      b.onResolve({ filter: /.*/ }, (a) => (mocks[a.path] ? { path: a.path, namespace: "mock" } : undefined));
      b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({ contents: mocks[a.path], loader: "js" }));
    } }],
  });
  const file = new URL(`./.bundle-${entry.replace(/\W/g, "_")}.mjs`, import.meta.url);
  (await import("node:fs")).writeFileSync(file, out.outputFiles[0].text);
  try { return await import(file.href); } finally { (await import("node:fs")).unlinkSync(file); }
};
const lib = await bundle("lib/reservationImport.ts");
const { reservationImportAction } = await bundle("lib/actions/reservationImport.ts");
const ok = (n) => console.log("PASS", n);

// ── 한국 시간 ──
assert.equal(lib.parseKstDateTime("2026-12-24T14:30"), "2026-12-24T05:30:00.000Z"); // 화면 datetime-local
assert.equal(lib.parseKstDateTime("2026.12.24 오후 2:30"), "2026-12-24T05:30:00.000Z");
assert.equal(lib.parseKstDateTime("2026/1/2 9:05"), "2026-01-02T00:05:00.000Z");
assert.equal(lib.parseKstDateTime("2026-12-24T14:30:00+09:00"), "2026-12-24T05:30:00.000Z");
assert.equal(lib.parseKstDateTime("2026-02-30 10:00"), null);
assert.equal(lib.parseKstDateTime("내일 3시"), null);
ok("손 입력·글자 날짜를 한국 시간으로(14:30 KST = 05:30Z), 없는 날짜·못 읽는 값은 null — 서버 UTC에서도 9시간 어긋나지 않음");
const serial = 46380 + (14.5 / 24); // 엑셀 날짜 셀: 2026-12-24 14:30
assert.equal(lib.excelCellToKstIso(serial), "2026-12-24T05:30:00.000Z");
ok("엑셀 날짜 셀(일련번호)도 보이는 시각 그대로 한국 시간");
assert.equal(lib.normalizeMobile("01012345678"), "010-1234-5678");
assert.equal(lib.normalizeMobile("02-123-4567"), null);
ok("핸드폰 번호 정리");

// ── 엑셀 → 등록 ──
const NOW = Date.parse("2026-10-23T00:00:00Z");
const sheetBuf = (aoa) => { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "예약"); return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }); };
const aoa = [
  ["고객명", "핸드폰", "이메일", "예약일시", "메모"],
  ["김민수", "01011112222", "", "2026-12-24 14:00", "첫 방문"], // 2행 OK
  ["", "01011112222", "", "2026-12-24 15:00", ""], //            3행 고객명 없음
  ["이영희", "", "", "2026-12-24 15:00", ""], //                 4행 연락처 없음
  ["박지훈", "01033334444", "", "2026-01-01 10:00", ""], //      5행 지난 예약
  ["최수아", "01055556666", "", "언젠가", ""], //                6행 날짜 못 읽음
  ["김민수", "010-1111-2222", "", "2026-12-24 14:00", ""], //    7행 파일 안 중복
  ["정우성", "", "jung@x.com", "2026-12-25 10:30", ""], //       8행 이메일만 OK
  ["한지민", "01077778888", "", "2026-12-26 09:00", ""], //      9행 OK지만 이미 등록됨(가짜 DB)
  [], //                                                         빈 줄 무시
];
{ const r = lib.parseReservationWorkbook(sheetBuf(aoa), NOW);
  assert.deepEqual(r.rows.map((x) => [x.row, x.customer_name, x.customer_phone, x.customer_email]), [[2, "김민수", "010-1111-2222", null], [8, "정우성", null, "jung@x.com"], [9, "한지민", "010-7777-8888", null]]);
  assert.deepEqual(r.skipped.map((s) => s.row), [3, 4, 5, 6, 7]);
  assert.match(r.skipped.find((s) => s.row === 5).reason, /지난/);
  ok("고객명 없음·연락처 없음·지난 예약·날짜 오류·파일 안 중복은 건너뛰고 사유를 남김"); }

function fixture() {
  const fx = { inserts: [], client: null };
  const existing = [{ user_id: "member-a", customer_name: "한지민", customer_phone: "010-7777-8888", customer_email: null, reservation_at: "2026-12-26T00:00:00+00:00" }];
  fx.client = { from: () => {
    const api = { select: () => api, eq: () => api, gte: () => api, lte: () => api, then: (r) => r({ data: existing, error: null }),
      insert: async (rows) => (fx.inserts.push(...rows), { error: null }) };
    return api;
  } };
  globalThis.fx = fx; return fx;
}
const fileOf = (aoa) => new File([sheetBuf(aoa)], "예약.xlsx");
const realNow = Date.now; Date.now = () => NOW;
try {
  { const fx = fixture(); const fd = new FormData(); fd.set("file", fileOf(aoa)); fd.set("mode", "preview");
    const r = await reservationImportAction(fd);
    assert.equal(r.rows.length, 2); assert.equal(fx.inserts.length, 0);
    assert.ok(r.skipped.some((s) => s.row === 9 && /이미 등록/.test(s.reason)));
    ok("미리보기는 DB에 쓰지 않고, 이미 등록된 같은 예약(고객명+연락처+시각)을 건너뜀으로 표시"); }
  { const fx = fixture(); const fd = new FormData(); fd.set("file", fileOf(aoa)); fd.set("mode", "import");
    const r = await reservationImportAction(fd);
    assert.equal(r.imported, 2);
    assert.deepEqual(fx.inserts.map((x) => [x.user_id, x.customer_name, x.reservation_at]), [["member-a", "김민수", "2026-12-24T05:00:00.000Z"], ["member-a", "정우성", "2026-12-25T01:30:00.000Z"]]);
    ok("등록은 서버가 파일을 다시 검사해 본인 예약으로만 넣음(한국 시간 그대로)"); }
} finally { Date.now = realNow; }
console.log("예약 엑셀 일괄 등록 시험 모두 통과");
