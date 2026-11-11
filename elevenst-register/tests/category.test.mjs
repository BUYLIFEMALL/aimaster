import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCategories, buildTree, categoryPath, childrenOf, searchLeaves, pathLabel } from "../src/lib/elevenst/category.ts";
import { parseSendCloseTemplates } from "../src/lib/elevenst/sendClose.ts";

// 실제 응답 모양(2026-11-11 전체 카테고리 조회 실측)을 줄여 만든 표본
const cat = (depth, name, no, parent, leaf) =>
  `<ns2:category><depth>${depth}</depth><dispNm>${name}</dispNm><dispNo>${no}</dispNo><engDispYn>N</engDispYn><gblDlvYn>N</gblDlvYn><leafYn>${leaf ? "Y" : "N"}</leafYn><parentDispNo>${parent}</parentDispNo></ns2:category>`;
const XML =
  '<?xml version="1.0" encoding="euc-kr" standalone="yes"?><ns2:categorys xmlns:ns2="http://skt.tmall.business.openapi.spring.service.client.domain/">' +
  cat(1, "주방용품", "1", "0", false) +
  cat(2, "보온/보냉용품", "11", "1", false) +
  cat(3, "보온컵/텀블러", "111", "11", true) +
  cat(2, "잔/컵", "12", "1", false) +
  cat(3, "스테인리스컵", "121", "12", true) +
  cat(1, "인테리어소품", "2", "0", false) +
  cat(2, "크리스마스 트리", "21", "2", false) +
  cat(3, "리스", "211", "21", true) +
  cat(1, "음향가전", "3", "0", false) +
  cat(2, "이어폰", "31", "3", false) +
  cat(3, "무선 이어폰", "311", "31", true) +
  cat(1, "자동차기기", "4", "0", false) +
  cat(2, "카팩", "41", "4", false) +
  cat(3, "무선", "411", "41", true) +
  cat(2, "A&amp;B", "42", "4", true) +
  "</ns2:categorys>";

const tree = buildTree(parseCategories(XML));

test("parseCategories: 칸·맨 아래 여부·엔티티 풀기", () => {
  const rows = parseCategories(XML);
  assert.equal(rows.length, 15);
  assert.deepEqual(rows[2], { no: "111", name: "보온컵/텀블러", parent: "11", depth: 3, leaf: true });
  assert.equal(rows.at(-1).name, "A&B");
  assert.equal(tree.leaves.length, 6);
});

test("categoryPath·childrenOf: 맨 위부터 경로, 맨 위 목록", () => {
  assert.deepEqual(categoryPath(tree, "111").map((c) => c.name), ["주방용품", "보온/보냉용품", "보온컵/텀블러"]);
  assert.equal(pathLabel(tree, "311"), "음향가전 › 이어폰 › 무선 이어폰");
  assert.deepEqual(childrenOf(tree, "0").map((c) => c.no), ["1", "2", "3", "4"]);
  assert.deepEqual(childrenOf(tree, "999"), []);
});

test("searchLeaves: 낱말을 많이 맞힌 카테고리가 먼저, 「스테인리스」 안의 「리스」는 걸리지 않음", () => {
  const a = searchLeaves(tree, "스테인리스 텀블러 500ml 블랙");
  assert.ok(!a.some((h) => h.no === "211"), "리스가 걸리면 안 됨");
  assert.ok(a.some((h) => h.no === "111") && a.some((h) => h.no === "121"));
  assert.equal(searchLeaves(tree, "무선 블루투스 이어폰")[0].no, "311");
  assert.deepEqual(searchLeaves(tree, "500ml"), []);
  assert.deepEqual(searchLeaves(tree, ""), []);
});

test("searchLeaves: 일반 검색에 없으면 합성어 끝(「캠핑스테인리스컵」 → 스테인리스컵)으로 다시 찾음", () => {
  assert.equal(searchLeaves(tree, "브랜드 캠핑스테인리스컵 (AB12)")[0].no, "121");
  assert.deepEqual(searchLeaves(tree, "스위스톤 ST4D18"), []);
});

test("parseSendCloseTemplates: 명세 예시 응답", () => {
  const xml =
    '<?xml version="1.0" encoding="euc-kr" standalone="yes"?><productInformationTemplateList><templateBOList><memNo>10000276</memNo><prdInfoTmpltNm>오전 9시까지 주문 당일 발송</prdInfoTmpltNm><prdInfoTmpltClfCd>07</prdInfoTmpltClfCd><prdInfoTmpltNo>344836</prdInfoTmpltNo><sendClfCd>02</sendClfCd><result_message>성공</result_message></templateBOList></productInformationTemplateList>';
  assert.deepEqual(parseSendCloseTemplates(xml), [{ no: "344836", name: "오전 9시까지 주문 당일 발송", kind: "02" }]);
  assert.deepEqual(parseSendCloseTemplates("<productInformationTemplateList/>"), []);
});
