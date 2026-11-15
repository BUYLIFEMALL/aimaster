// 실행: node --test tests/   — 하위 도메인(2026-11-10): 주소 이름 → 몰, 경로 바꿔 읽기
import { test } from "node:test";
import assert from "node:assert/strict";
import { mallSlugFromHost, subdomainRewritePath, mallSubdomainUrl, customDomainCandidate } from "../src/lib/host.ts";

test("하위 도메인에서 몰 이름을 뽑는다", () => {
  assert.equal(mallSlugFromHost("aimaster-b2b.localhost:3210", "localhost"), "aimaster-b2b");
  assert.equal(mallSlugFromHost("AIMaster-B2B.mall.example.com", "mall.example.com"), "aimaster-b2b");
  assert.equal(mallSlugFromHost("shop1.example.com", ".Example.com"), "shop1");
});

test("M5-1a 운영 루트 buylife.xyz: 몰은 읽고 관리 사이트 주소(mall-builder)는 몰로 읽지 않는다", () => {
  assert.equal(mallSlugFromHost("aimaster-b2b.buylife.xyz", "buylife.xyz"), "aimaster-b2b");
  assert.equal(mallSlugFromHost("mall-builder.buylife.xyz", "buylife.xyz"), null);
  assert.equal(mallSlugFromHost("dev-mall-builder.buylife.xyz", "buylife.xyz"), null);
  assert.equal(mallSlugFromHost("www.buylife.xyz", "buylife.xyz"), null);
  assert.equal(mallSlugFromHost("buylife.xyz", "buylife.xyz"), null);
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

test("운영사 화면에 보여 줄 하위 도메인 주소", () => {
  assert.equal(mallSubdomainUrl("shop1", "mall.example.com"), "https://shop1.mall.example.com");
  assert.equal(mallSubdomainUrl("shop1", "localhost"), null);
  assert.equal(mallSubdomainUrl("shop1", ""), null);
});

test("단일 몰 모드 — 환경 설정 값이 맞는 몰 주소일 때만 켜짐", async () => {
  const { singleMallSlug, subdomainRewritePath } = await import("../src/lib/host.ts");
  assert.equal(singleMallSlug("my-shop"), "my-shop");
  assert.equal(singleMallSlug("  My-Shop "), "my-shop");
  assert.equal(singleMallSlug(""), null);
  assert.equal(singleMallSlug(undefined), null);
  assert.equal(singleMallSlug("a"), null);
  assert.equal(singleMallSlug("bad_slug"), null);
  // 켜지면 첫 화면·상품·관리 주소가 그 몰로 읽힌다(기존 /s/<몰> 링크는 그대로 통과)
  assert.equal(subdomainRewritePath("/", "my-shop"), "/s/my-shop");
  assert.equal(subdomainRewritePath("/p/123", "my-shop"), "/s/my-shop/p/123");
  assert.equal(subdomainRewritePath("/admin", "my-shop"), "/s/my-shop/admin");
  assert.equal(subdomainRewritePath("/s/my-shop/cart", "my-shop"), null);
  assert.equal(subdomainRewritePath("/login", "my-shop"), null);
});

test("M5-1b 자기 도메인 후보: 직접 산 도메인만 찾고 플랫폼 주소·IP·localhost는 찾지 않는다", () => {
  assert.equal(customDomainCandidate("myshop.co.kr", "buylife.xyz"), "myshop.co.kr");
  assert.equal(customDomainCandidate("WWW.MyShop.com:443", "buylife.xyz"), "www.myshop.com");
  assert.equal(customDomainCandidate("aimaster-b2b.buylife.xyz", "buylife.xyz"), null);
  assert.equal(customDomainCandidate("mall-builder.buylife.xyz", undefined), null);
  assert.equal(customDomainCandidate("buylife.xyz", "buylife.xyz"), null);
  assert.equal(customDomainCandidate("mall-builder-abc.vercel.app", "buylife.xyz"), null);
  assert.equal(customDomainCandidate("localhost:3210", "localhost"), null);
  assert.equal(customDomainCandidate("shop.localhost", "localhost"), null);
  assert.equal(customDomainCandidate("127.0.0.1:3210", "localhost"), null);
  assert.equal(customDomainCandidate("intranet", "buylife.xyz"), null);
  assert.equal(customDomainCandidate(null, "buylife.xyz"), null);
});
