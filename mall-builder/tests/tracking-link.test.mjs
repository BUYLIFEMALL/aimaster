// 실행: node --test tests/   — M2-11 택배 배송 조회 링크(2026-11-15)
import { test } from "node:test";
import assert from "node:assert/strict";
import { trackingUrl } from "../src/lib/tracking-link.ts";

test("택배사별 바로 열리는 주소", () => {
  assert.equal(trackingUrl("CJ대한통운", "1234-5678-9012"), "https://trace.cjlogistics.com/next/tracking.html?wblNo=123456789012");
  assert.equal(trackingUrl("CJ 대한통운", "111"), "https://trace.cjlogistics.com/next/tracking.html?wblNo=111");
  assert.equal(trackingUrl("롯데택배", "222"), "https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=222");
  assert.equal(trackingUrl("로젠", "333"), "https://www.ilogen.com/web/personal/trace/333");
  assert.equal(trackingUrl("경동택배", "444"), "https://kdexp.com/service/delivery/etc/delivery.do?barcode=444");
  assert.equal(trackingUrl("대신택배", "555"), "https://www.ds3211.co.kr/freight/internalFreightSearch.ht?billno=555");
});

test("한진·우체국·목록 밖 택배사는 네이버 검색", () => {
  assert.equal(trackingUrl("한진택배", "666"), `https://search.naver.com/search.naver?query=${encodeURIComponent("한진택배 666")}`);
  assert.equal(trackingUrl("우체국", "777"), `https://search.naver.com/search.naver?query=${encodeURIComponent("우체국택배 777")}`);
  assert.equal(trackingUrl("일양로지스", "888"), `https://search.naver.com/search.naver?query=${encodeURIComponent("일양로지스 888")}`);
  assert.equal(trackingUrl("", "999"), `https://search.naver.com/search.naver?query=${encodeURIComponent("택배 999")}`);
});

test("송장 번호가 없거나 이상하면 링크 없음", () => {
  assert.equal(trackingUrl("CJ대한통운", ""), null);
  assert.equal(trackingUrl("CJ대한통운", null), null);
  assert.equal(trackingUrl("CJ대한통운", "--"), null);
  assert.equal(trackingUrl("CJ대한통운", "1".repeat(41)), null);
  assert.ok(!trackingUrl("CJ대한통운", "12<script>34").includes("<"));
});
