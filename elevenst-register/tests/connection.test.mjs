import { test } from "node:test";
import assert from "node:assert/strict";
import { validateElevenstKey, validateProxyUrl, maskProxyUrl, maskKey } from "../src/lib/elevenst/keys.ts";
import { parseAreas } from "../src/lib/elevenst/areas.ts";

test("validateElevenstKey: 32자리 통과, 빈 값·공백·특수문자 거절", () => {
  assert.equal(validateElevenstKey(" a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4 ").key, "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4");
  assert.match(validateElevenstKey("").error, /넣어 주세요/);
  assert.match(validateElevenstKey("abc def").error, /모양/);
  assert.match(validateElevenstKey("short").error, /모양/);
});

test("validateProxyUrl: Fixie 주소 통과, 내부망·이상한 주소 거절", () => {
  assert.equal(validateProxyUrl("http://fixie:tok@ab.usefixie.com:80").url, "http://fixie:tok@ab.usefixie.com:80");
  assert.ok(validateProxyUrl("http://127.0.0.1:8080").error);
  assert.ok(validateProxyUrl("http://192.168.0.2").error);
  assert.ok(validateProxyUrl("ftp://x.example.com").error);
  assert.ok(validateProxyUrl("아무거나").error);
});

test("가림: 주소 비밀번호·키 앞부분", () => {
  assert.equal(maskProxyUrl("http://fixie:tok@ab.usefixie.com:80"), "http://••••@ab.usefixie.com"); // http 기본 포트 80은 URL이 생략함
  assert.equal(maskKey("a1b2c3d4e5f6"), "••••e5f6");
});

test("parseAreas: 명세 예시 응답에서 주소 순번을 읽음", () => {
  const xml = `<?xml version="1.0" encoding="euc-kr" standalone="yes"?>
<ns2:inOutAddresss>
  <ns2:inOutAddress>
    <addr>서울 중구 을지로1가 111</addr>
    <addrNm>본사</addrNm>
    <addrSeq>14</addrSeq>
    <gnrlTlphnNo>02-1111-2222</gnrlTlphnNo>
    <rcvrNm>본사</rcvrNm>
    <memNo>10000000</memNo>
  </ns2:inOutAddress>
  <ns2:inOutAddress><addr>경기 광명시</addr><addrSeq>15</addrSeq><rcvrNm>창고</rcvrNm></ns2:inOutAddress>
  <ns2:result_message>SUCCESS</ns2:result_message>
</ns2:inOutAddresss>`;
  const r = parseAreas(xml);
  assert.equal(r.resultMessage, "SUCCESS");
  assert.deepEqual(r.areas, [
    { seq: "14", name: "본사", addr: "서울 중구 을지로1가 111" },
    { seq: "15", name: "창고", addr: "경기 광명시" },
  ]);
  assert.deepEqual(parseAreas("<ns2:inOutAddresss><ns2:result_message>SUCCESS</ns2:result_message></ns2:inOutAddresss>").areas, []);
});
