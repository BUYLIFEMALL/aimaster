import { test } from "node:test";
import assert from "node:assert/strict";
import {
  planImport, exportRows, mapHeaders, tableToRows, headersFor, helpRow, assignCodes, imageFromUrl, planOptions, GRADE_PREFIX, O_COLS, T_COLS,
} from "../src/lib/productExcel.ts";

const STORE = "11111111-1111-1111-1111-111111111111";
const BASE = "https://x.supabase.co/storage/v1/object/public/mall-builder-public";
const C1 = "aaaaaaaa-0000-0000-0000-000000000001";
const C2 = "aaaaaaaa-0000-0000-0000-000000000002";
const G_BIZ = "bbbbbbbb-0000-0000-0000-000000000002";
const SP = "cccccccc-0000-0000-0000-000000000001";
const P1 = "dddddddd-0000-0000-0000-000000000001";

const ctx = (existing = []) => ({
  storeId: STORE,
  publicBase: BASE,
  categories: [
    { id: C1, parent_id: null, name: "컴퓨터", depth: 1, sort: 10, is_visible: true },
    { id: C2, parent_id: C1, name: "주변기기", depth: 2, sort: 10, is_visible: true },
  ],
  policies: [{ id: SP, name: "기본 배송" }],
  grades: [{ id: G_BIZ, name: "사업자" }],
  existing,
});

const row = (n, o) => ({ __row: String(n), ...o });
const base = { code: "P00001", name: "무선 마우스", base_price: "12,000", status: "판매 중", stock_mode: "수량 관리", stock: "30", categories: "컴퓨터 > 주변기기" };

const existingMouse = {
  id: P1, product_code: "P00001", name: "무선 마우스", summary: "", description: "", base_price: 12000, list_price: null, cost: null,
  tax_type: "taxable", status: "on_sale", stock_mode: "product", stock: 30, images: [], category_ids: [C2], shipping_policy_id: null,
  visibility: "public", price_visibility: "all", moq: 1, order_unit: 1, max_qty: null, option_groups: [], variants: [], grades: {}, tiers: [],
};

test("새 상품 — 카테고리 경로(띄어쓰기 무시)·선택값·등급가", () => {
  const plan = planImport({ products: [row(3, { ...base, [GRADE_PREFIX + "사업자"]: "10%" })], options: [], tiers: [] }, ctx());
  assert.deepEqual(plan.sheetErrors, []);
  const p = plan.products[0];
  assert.equal(p.action, "create", p.errors.join());
  assert.equal(p.value.product.base_price, 12000);
  assert.equal(p.value.product.status, "on_sale");
  assert.equal(p.value.product.stock_mode, "product");
  assert.deepEqual(p.value.category_ids, [C2]);
  assert.deepEqual(p.value.grades[G_BIZ], { price: null, discount_rate: 10 });
  assert.equal(p.value.tiers, null);
  assert.equal(p.value.options, null);
});

test("오류 — 없는 카테고리·모르는 상태·형식 틀린 품번·판매가 없음·배송비 정책 없음", () => {
  const plan = planImport(
    {
      products: [
        row(3, { ...base, categories: "식품>과일" }),
        row(4, { ...base, code: "P00002", status: "팔아요" }),
        row(5, { ...base, code: "P 3" }),
        row(6, { ...base, code: "P00004", base_price: "" }),
        row(7, { ...base, code: "P00005", shipping: "택배" }),
      ],
      options: [], tiers: [],
    },
    ctx(),
  );
  const errs = plan.products.map((p) => p.errors.join(" | "));
  assert.match(errs[0], /카테고리 「식품>과일」/);
  assert.match(errs[1], /상태:/);
  assert.match(errs[2], /품번은 영문/);
  assert.match(errs[3], /판매가/);
  assert.match(errs[4], /배송비 정책 「택배」/);
  assert.equal(plan.counts.error, 5);
});

test("같은 품번이 두 번(대소문자 무시) → 둘 다 오류", () => {
  const plan = planImport({ products: [row(3, base), row(4, { ...base, code: "p00001" })], options: [], tiers: [] }, ctx());
  assert.equal(plan.counts.error, 2);
});

test("기존 품번 → 수정, 같은 값이면 「바뀐 것 없음」, 바뀐 칸 목록", () => {
  const same = planImport({ products: [row(3, base)], options: [], tiers: [] }, ctx([existingMouse]));
  assert.equal(same.products[0].action, "same", same.products[0].changes.join());
  const changed = planImport({ products: [row(3, { ...base, base_price: "11000", stock: "50", [GRADE_PREFIX + "사업자"]: "9000" })], options: [], tiers: [] }, ctx([existingMouse]));
  assert.equal(changed.products[0].action, "update");
  assert.deepEqual(changed.products[0].changes, ["판매가", "재고", GRADE_PREFIX + "사업자"]);
  assert.equal(changed.products[0].id, P1);
});

test("사진 — 이 몰 공개 폴더 주소만", () => {
  assert.deepEqual(imageFromUrl(`${BASE}/${STORE}/products/a.png`, BASE, STORE), { url: `${BASE}/${STORE}/products/a.png`, path: `${STORE}/products/a.png` });
  assert.equal(imageFromUrl(`${BASE}/22222222-2222-2222-2222-222222222222/products/a.png`, BASE, STORE), null);
  assert.equal(imageFromUrl("https://evil.example/a.png", BASE, STORE), null);
  assert.equal(imageFromUrl(`${BASE}/${STORE}/../x.png`, BASE, STORE), null);
  const plan = planImport({ products: [row(3, { ...base, images: "https://evil.example/a.png" })], options: [], tiers: [] }, ctx());
  assert.match(plan.products[0].errors.join(), /이 몰에 올린 사진만/);
});

test("옵션 — 행에서 묶음·조합 만들기, 빠진 조합은 사용 안 함, 기존 조합 값 유지", () => {
  const r = (n, color, size, extra, stock) => row(n, { code: "P00001", n1: "색상", v1: color, n2: "크기", v2: size, extra, stock, sku: "", active: "" });
  const out = planOptions([r(2, "화이트", "S", "0", "5"), r(3, "블랙", "S", "1000", "2"), r(4, "화이트", "M", "", "1")], 12000, [
    { key: "블랙 / M", values: ["블랙", "M"], extra_price: 500, stock: 9, sku: "BM", is_active: true },
  ]);
  assert.ok(!("error" in out), out.error);
  assert.deepEqual(out.groups, [{ name: "색상", values: ["화이트", "블랙"] }, { name: "크기", values: ["S", "M"] }]);
  const byKey = Object.fromEntries(out.variants.map((v) => [v.key, v]));
  assert.equal(byKey["블랙 / S"].extra_price, 1000);
  assert.equal(byKey["블랙 / M"].is_active, false); // 엑셀에 없음 → 사용 안 함
  assert.equal(byKey["블랙 / M"].stock, 9); // 기존 재고 유지
  assert.equal(byKey["블랙 / M"].sku, "BM");
});

test("옵션 오류 — 이름 불일치·같은 조합 두 번·합계 0원 미만", () => {
  const a = row(2, { code: "P00001", n1: "색상", v1: "화이트" });
  assert.match(planOptions([a, row(3, { code: "P00001", n1: "컬러", v1: "블랙" })], 1000, []).error, /옵션 이름/);
  assert.match(planOptions([a, row(3, { code: "P00001", n1: "색상", v1: "화이트" })], 1000, []).error, /두 번/);
  assert.match(planOptions([row(2, { code: "P00001", n1: "색상", v1: "화이트", extra: "-2000" })], 1000, []).error, /0원보다/);
});

test("옵션·구간 시트에 상품 시트에 없는 품번 → 시트 오류", () => {
  const plan = planImport(
    { products: [row(3, base)], options: [row(2, { code: "Z9", n1: "색상", v1: "화이트" })], tiers: [row(2, { code: "Z9", min_qty: "10", value: "5%" })] },
    ctx(),
  );
  assert.equal(plan.sheetErrors.length, 2);
});

test("구간 할인 — 형식·개수", () => {
  const ok = planImport({ products: [row(3, base)], options: [], tiers: [row(2, { code: "P00001", min_qty: "10", value: "5%" }), row(3, { code: "P00001", min_qty: "50", value: "-1000" })] }, ctx());
  assert.deepEqual(ok.products[0].value.tiers, [{ min_qty: 10, discount_type: "rate", value: 5 }, { min_qty: 50, discount_type: "amount", value: 1000 }]);
  const many = planImport({ products: [row(3, base)], options: [], tiers: ["2", "3", "4", "5"].map((q, i) => row(i + 2, { code: "P00001", min_qty: q, value: "1%" })) }, ctx());
  assert.match(many.products[0].errors.join(), /3개까지/);
});

test("1,000개 넘으면 시트 오류", () => {
  const rows = Array.from({ length: 1001 }, (_, i) => row(i + 3, { ...base, code: `P${i}` }));
  assert.match(planImport({ products: rows, options: [], tiers: [] }, ctx()).sheetErrors.join(), /1000개까지/);
});

test("내려받기 → 다시 읽기 = 바뀐 것 없음(왕복)", () => {
  const p = {
    ...existingMouse, list_price: 15000, cost: 7000, max_qty: 100, images: [{ url: `${BASE}/${STORE}/products/a.png`, path: `${STORE}/products/a.png` }],
    grades: { [G_BIZ]: { price: 9000, discount_rate: null } },
    tiers: [{ min_qty: 10, discount_type: "rate", value: 5 }],
    option_groups: [{ name: "색상", values: ["화이트", "블랙"] }],
    variants: [
      { key: "화이트", values: ["화이트"], extra_price: 0, stock: 3, sku: "W", is_active: true },
      { key: "블랙", values: ["블랙"], extra_price: 1000, stock: 0, sku: "B", is_active: false },
    ],
  };
  const c = ctx([p]);
  const ex = exportRows(c);
  const header = headersFor(c.grades);
  const pm = mapHeaders("products", header, c.grades);
  const om = mapHeaders("options", O_COLS.map((x) => x[1]), c.grades);
  const tm = mapHeaders("tiers", T_COLS.map((x) => x[1]), c.grades);
  const sheets = {
    products: tableToRows([header, helpRow(c.grades), ...ex.products], pm.keys),
    options: tableToRows([O_COLS.map((x) => x[1]), ...ex.options], om.keys),
    tiers: tableToRows([T_COLS.map((x) => x[1]), ...ex.tiers], tm.keys),
  };
  assert.equal(sheets.products.length, 1); // 설명 줄(※) 건너뜀
  const plan = planImport(sheets, c);
  assert.equal(plan.products[0].action, "same", [...plan.products[0].errors, ...plan.products[0].changes].join(" | "));
});

test("머리글 — 필수 칸 없으면 오류, 순서 바뀌어도 읽음", () => {
  assert.match(mapHeaders("products", ["상품명", "판매가"], []).error, /품번/);
  const m = mapHeaders("products", ["판매가", "품 번", "상품명", "모르는 칸"], []);
  assert.deepEqual(m.keys, ["base_price", "code", "name", null]);
});

test("품번 자동 부여 — 비어 있는 상품만, 쓰는 번호 건너뜀", () => {
  assert.deepEqual(
    assignCodes([{ id: "a", product_code: "P00001" }, { id: "b", product_code: null }, { id: "c", product_code: null }]),
    [{ id: "b", code: "P00002" }, { id: "c", code: "P00003" }],
  );
});

test("실제 .xlsx 파일 — 만들기 → 다시 읽기 = 바뀐 것 없음, 빈 양식은 상품 0개", async () => {
  const { buildWorkbook, readWorkbook } = await import("../src/lib/product-excel-server.ts");
  const p = {
    ...existingMouse, product_code: "007", summary: "조용한 클릭, 1,000개 한정", list_price: 15000, cost: 7000,
    grades: { [G_BIZ]: { price: null, discount_rate: 10 } },
    tiers: [{ min_qty: 10, discount_type: "unit_price", value: 11000 }],
    option_groups: [{ name: "색상", values: ["화이트"] }],
    variants: [{ key: "화이트", values: ["화이트"], extra_price: 0, stock: 3, sku: "", is_active: true }],
  };
  const c = ctx([p]);
  const buf = await buildWorkbook(c, false);
  const read = await readWorkbook(buf, c.grades);
  assert.ok(!("error" in read), read.error);
  assert.equal(read.sheets.products[0].code, "007"); // 앞의 0이 숫자로 바뀌지 않음
  const plan = planImport(read.sheets, c);
  assert.equal(plan.products[0].action, "same", [...plan.products[0].errors, ...plan.products[0].changes].join(" | "));

  const empty = await readWorkbook(await buildWorkbook(c, true), c.grades);
  assert.equal(empty.sheets.products.length, 0);
  assert.match(planImport(empty.sheets, c).sheetErrors.join(), /상품 행이 없습니다/);
});

test("엑셀이 아닌 파일 → 읽기 오류", async () => {
  const { readWorkbook } = await import("../src/lib/product-excel-server.ts");
  const r = await readWorkbook(new TextEncoder().encode("hello").buffer, []);
  assert.match(r.error, /읽지 못했습니다/);
});

test("줄바꿈 모양만 다른 상세 설명(\r\n ↔ \n)은 바뀐 것 없음", () => {
  const plan = planImport({ products: [row(3, { ...base, description: "1줄\n2줄" })], options: [], tiers: [] }, ctx([{ ...existingMouse, description: "1줄\r\n2줄" }]));
  assert.equal(plan.products[0].action, "same", plan.products[0].changes.join());
});

test("옵션 줄이 있는 상품은 상품 재고 칸을 비워도 됨(옵션별 재고)", () => {
  const plan = planImport(
    { products: [row(3, { ...base, stock: "" })], options: [row(2, { code: "P00001", n1: "색상", v1: "검정", stock: "5" })], tiers: [] },
    ctx(),
  );
  assert.equal(plan.products[0].action, "create", plan.products[0].errors.join());
  const noOpt = planImport({ products: [row(3, { ...base, stock: "" })], options: [], tiers: [] }, ctx());
  assert.equal(noOpt.products[0].action, "error"); // 옵션 없으면 여전히 필수
});

test("상세 그림(H2 0064) — 이 몰 주소만 읽고, 바뀌면 「상세 그림」, 내보내기에 포함", () => {
  const u = (n) => `${BASE}/${STORE}/products/d${n}.jpg`;
  const plan = planImport({ products: [row(3, { ...base, detail_images: `${u(1)}; ${u(2)}` })], options: [], tiers: [] }, ctx());
  const p = plan.products[0];
  assert.equal(p.action, "create", p.errors.join());
  assert.deepEqual(p.value.product.detail_images.map((i) => i.path), [`${STORE}/products/d1.jpg`, `${STORE}/products/d2.jpg`]);

  const bad = planImport({ products: [row(3, { ...base, detail_images: "https://buylife.cdnpro.kr/a.jpg" })], options: [], tiers: [] }, ctx());
  assert.equal(bad.products[0].action, "error");
  assert.match(bad.products[0].errors.join(), /상세 그림 주소/);

  const upd = planImport({ products: [row(3, { ...base, detail_images: u(1) })], options: [], tiers: [] }, ctx([existingMouse]));
  assert.equal(upd.products[0].action, "update");
  assert.ok(upd.products[0].changes.includes("상세 그림"), upd.products[0].changes.join());

  const withDetail = { ...existingMouse, detail_images: [{ url: u(1), path: `${STORE}/products/d1.jpg` }] };
  const out = exportRows(ctx([withDetail]));
  const head = headersFor(ctx().grades);
  assert.equal(out.products[0][head.indexOf("상세 그림")], u(1));
});
