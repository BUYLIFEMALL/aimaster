// 실행: node --test tests/   — 하위 도메인(2026-11-10): 주소 이름 → 몰, 경로 바꿔 읽기
import { test } from "node:test";
import assert from "node:assert/strict";
import { mallSlugFromHost, subdomainRewritePath, mallSubdomainUrl } from "../src/lib/host.ts";

test("하위 도메인에서 몰 이름을 뽑는다", () => {
  assert.equal(mallSlugFromHost("aimaster-b2b.localhost:3210", "localhost"), "aimaster-b2b");
  assert.equal(mallSlugFromHost("AIMaster-B2B.mall.example.com", "mall.example.com"), "aimaster-b2b");
  assert.equal(mallSlugFromHost("shop1.example.com", ".Example.com"), "shop1");
});

test("루트 주소·다른 주소·두 단계 하위 주소는 몰이 아니다", () => {
  assert.equal(mallSlugFromHost("localhost:3210", "localhost"), null);
  assert.equal(mallSlugFromHost("dev-mall-builder.vercel.app", "localhost"), null);
  assert.equal(mallSlugFromHost("a.b.localhost", "localhost"), null);
  assert.equal(mallSlugFromHost("evil-localhost", "localhost"), null);
  assert.equal(mallSlugFromHost("", "localhost"), null);
  assert.equal(mallSlugFromHost(null, "localhost"), null);
  assert.equal(mallSlugFromHost("shop1.localhost", ""), null);
});

test("예약어·형식이 틀린 이름은 몰이 아니다", () => {
  for (const h of ["www.localhost", "api.localhost", "admin.localhost", "ab.localhost", "a--b.localhost", "shop-.localhost", "x_y.localhost"]) {
    assert.equal(mallSlugFromHost(h, "localhost"), null, h);
  }
});

test("하위 도메인 경로를 /s/<몰> 아래로 바꿔 읽는다", () => {
  assert.equal(subdomainRewritePath("/", "shop1"), "/s/shop1");
  assert.equal(subdomainRewritePath("/products/abc", "shop1"), "/s/shop1/products/abc");
  assert.equal(subdomainRewritePath("/admin", "shop1"), "/s/shop1/admin");
});

test("이미 /s/ 경로·내부 경로·정적 파일은 그대로 둔다", () => {
  for (const p of ["/s/shop1", "/s/shop1/admin", "/s", "/_next/static/a.js", "/api/x", "/login", "/logout", "/invite/abc", "/auth/callback", "/favicon.ico", "/robots.txt"]) {
    assert.equal(subdomainRewritePath(p, "shop1"), null, p);
  }
});

test("운영자 화면에 보여 줄 하위 도메인 주소", () => {
  assert.equal(mallSubdomainUrl("shop1", "mall.example.com"), "https://shop1.mall.example.com");
  assert.equal(mallSubdomainUrl("shop1", "localhost"), null);
  assert.equal(mallSubdomainUrl("shop1", ""), null);
});
