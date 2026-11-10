import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeXml, cdata, findNonEucKr, buildXml, encodeEucKr, decodeResponse, pickTag } from "../src/lib/elevenst/xml.ts";

test("escapeXml: 다섯 글자 이스케이프", () => {
  assert.equal(escapeXml(`a&b<c>"'`), "a&amp;b&lt;c&gt;&quot;&apos;");
});

test("cdata: ]]> 가 들어 있어도 깨지지 않음", () => {
  assert.equal(cdata("x]]>y"), "<![CDATA[x]]]]><![CDATA[>y]]>");
});

test("findNonEucKr: 한글·영문은 통과, 이모지는 찾음", () => {
  assert.deepEqual(findNonEucKr("스테인리스 텀블러 500ml (블랙)"), []);
  assert.deepEqual(findNonEucKr("텀블러🔥 신상🔥"), ["🔥"]);
  assert.deepEqual(findNonEucKr("물음표? 그대로"), []);
});

test("buildXml: 선언부·빈 칸 생략·CDATA·배열", () => {
  const xml = buildXml("Product", {
    selMthdCd: "01",
    prdNm: "시험 텀블러",
    brand: undefined,
    htmlDetail: { cdata: "<p>상세</p>" },
    ProductOption: [{ colValue0: "블랙" }, { colValue0: "화이트" }],
    selPrc: 19900,
  });
  assert.equal(
    xml,
    '<?xml version="1.0" encoding="EUC-KR"?><Product><selMthdCd>01</selMthdCd><prdNm>시험 텀블러</prdNm><htmlDetail><![CDATA[<p>상세</p>]]></htmlDetail><ProductOption><colValue0>블랙</colValue0></ProductOption><ProductOption><colValue0>화이트</colValue0></ProductOption><selPrc>19900</selPrc></Product>',
  );
});

test("encodeEucKr ↔ decodeResponse: 한글이 깨지지 않음", () => {
  const xml = '<?xml version="1.0" encoding="EUC-KR"?><ClientMessage><message>상품등록이 정상적으로 진행 되었습니다. 상품번호 : 52844137</message></ClientMessage>';
  const bytes = encodeEucKr(xml);
  assert.equal(bytes.length < Buffer.byteLength(xml, "utf8"), true); // EUC-KR 한글은 2바이트
  assert.equal(decodeResponse(bytes), xml);
});

test("decodeResponse: UTF-8 선언이면 UTF-8로 읽음", () => {
  const xml = '<?xml version="1.0" encoding="UTF-8"?><a>한글</a>';
  assert.equal(decodeResponse(Buffer.from(xml, "utf8")), xml);
});

test("pickTag: 네임스페이스·CDATA·없는 태그", () => {
  const xml = "<ns2:result><productNo>52844137</productNo><message><![CDATA[성공]]></message><ns2:resultCode>200</ns2:resultCode></ns2:result>";
  assert.equal(pickTag(xml, "productNo"), "52844137");
  assert.equal(pickTag(xml, "message"), "성공");
  assert.equal(pickTag(xml, "resultCode"), "200");
  assert.equal(pickTag(xml, "nope"), "");
});
