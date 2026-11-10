// 협업 크리에이터 찾기(A4) — 설명 글 연락처 추출 시험(네트워크 없음). 2026-11-10
import test from "node:test";
import assert from "node:assert/strict";
import { extractEmails, extractPhones, extractLinks, extractAddresses, extractContacts, mergeContacts, hasAnyContact, formatKoreanPhone } from "../src/lib/youtube/contactExtract.ts";

test("이메일: 기본·대소문자·끝 마침표", () => {
  assert.deepEqual(extractEmails("비즈니스 문의 Biz.Camp@Gmail.com."), ["biz.camp@gmail.com"]);
  assert.deepEqual(extractEmails("광고문의: ad_team+yt@naver.com / 제휴 partner@company.co.kr"), ["ad_team+yt@naver.com", "partner@company.co.kr"]);
});

test("이메일: 가린 표기 [at] (at) 골뱅이 [dot]", () => {
  assert.deepEqual(extractEmails("contact [at] mychannel [dot] com"), ["contact@mychannel.com"]);
  assert.deepEqual(extractEmails("문의 hello(at)gmail.com"), ["hello@gmail.com"]);
  assert.deepEqual(extractEmails("문의 camping 골뱅이 daum.net"), ["camping@daum.net"]);
});

test("이메일: 가짜·이미지 파일 이름·중복 거르기", () => {
  assert.deepEqual(extractEmails("you@example.com logo@2x.png banner@3x.jpg a@b.com A@B.COM"), ["a@b.com"]);
});

test("전화: 휴대폰 여러 모양 → 010-1234-5678", () => {
  assert.deepEqual(extractPhones("📞 010-1234-5678"), ["010-1234-5678"]);
  assert.deepEqual(extractPhones("연락처 01012345678"), ["010-1234-5678"]);
  assert.deepEqual(extractPhones("010 1234 5678 / 010.9876.5432"), ["010-1234-5678", "010-9876-5432"]);
});

test("전화: 지역번호·대표번호·인터넷 전화", () => {
  assert.deepEqual(extractPhones("서울 매장 02-123-4567, 부산 051-1234-5678"), ["02-123-4567", "051-1234-5678"]);
  assert.deepEqual(extractPhones("고객센터 1588-1234"), ["1588-1234"]);
  assert.deepEqual(extractPhones("070-1234-5678"), ["070-1234-5678"]);
});

test("전화: 국제 형식 한국 번호는 국내 모양으로, 해외 번호는 그대로", () => {
  assert.deepEqual(extractPhones("+82 10-1234-5678"), ["010-1234-5678"]);
  assert.deepEqual(extractPhones("Call +1 415 555 0123"), ["+1 415 555 0123"]);
});

test("전화: 조회수·연도·날짜·구독자 수는 번호가 아니다", () => {
  assert.deepEqual(extractPhones("조회수 1,234,567회 · 2026년 11월 10일 · 구독자 15000명 · 2026-11-10 · 1600만"), []);
  assert.deepEqual(extractPhones("영상번호 20261110123456"), []);
});

test("formatKoreanPhone: 모양이 아니면 null", () => {
  assert.equal(formatKoreanPhone("12345"), null);
  assert.equal(formatKoreanPhone("0101234567"), "010-123-4567");
});

test("SNS: 주소 링크에서 계정 아이디", () => {
  const { socials } = extractLinks("인스타 https://www.instagram.com/camp_life/ 틱톡 https://tiktok.com/@camp.life 쓰레드 https://www.threads.net/@camp_life X https://x.com/camplife");
  assert.deepEqual(socials.map((s) => [s.platform, s.value]), [["instagram", "@camp_life"], ["tiktok", "@camp.life"], ["threads", "@camp_life"], ["x", "@camplife"]]);
  assert.equal(socials[0].url, "https://www.instagram.com/camp_life");
});

test("SNS: 게시물·공유 주소는 계정이 아니다", () => {
  const { socials } = extractLinks("https://www.instagram.com/p/AbC123/ https://twitter.com/intent/tweet?text=x https://www.facebook.com/sharer/sharer.php?u=a");
  assert.deepEqual(socials, []);
});

test("SNS: 네이버 블로그·카카오 채널·페이스북", () => {
  const { socials } = extractLinks("블로그 https://blog.naver.com/campking 카톡 https://pf.kakao.com/_xAbCd 페북 https://facebook.com/campking.page");
  assert.deepEqual(socials.map((s) => [s.platform, s.value]), [["naverblog", "campking"], ["kakao", "pf.kakao.com/_xAbCd"], ["facebook", "campking.page"]]);
});

test("SNS: 주소 없이 적은 아이디(인스타: @abc, IG @abc)", () => {
  const { socials } = extractLinks("인스타: @camp_daily\nIG @camp.daily2\nTikTok @campdaily");
  assert.deepEqual(socials.map((s) => [s.platform, s.value]), [["instagram", "@camp_daily"], ["instagram", "@camp.daily2"], ["tiktok", "@campdaily"]]);
});

test("SNS: 표시 없는 문장·다음 줄 단어는 아이디가 아니다", () => {
  assert.deepEqual(extractLinks("Instagram fans love this\n인스타 감성 캠핑").socials, []);
  assert.deepEqual(extractLinks("Instagram:\nWebsite").socials, []);
});

test("SNS: 링크와 글로 같은 계정을 두 번 적으면 하나", () => {
  const { socials } = extractLinks("Instagram: @camp_life https://instagram.com/camp_life");
  assert.equal(socials.length, 1);
});

test("웹사이트: 유튜브 자체 링크는 빼고, 끝 문장부호 정리", () => {
  const { websites } = extractLinks("구독 https://www.youtube.com/@camp?sub_confirmation=1 영상 https://youtu.be/abc 쇼핑몰 https://smartstore.naver.com/campshop. 홈 www.campking.co.kr, 단축 https://bit.ly/3xyz");
  assert.deepEqual(websites, ["https://smartstore.naver.com/campshop", "www.campking.co.kr", "https://bit.ly/3xyz"]);
});

test("주소: 이름표가 붙은 줄", () => {
  assert.deepEqual(extractAddresses("사업장 주소: 서울특별시 강남구 테헤란로 123, 4층"), ["서울특별시 강남구 테헤란로 123, 4층"]);
  assert.deepEqual(extractAddresses("Address: 123 Main St, Seattle WA 98101"), ["123 Main St, Seattle WA 98101"]);
});

test("주소: 이름표 없어도 시·도 + 도로명/번지 모양", () => {
  assert.deepEqual(extractAddresses("📍 매장: 경기 성남시 분당구 판교역로 235 (에이치스퀘어)"), ["경기 성남시 분당구 판교역로 235 (에이치스퀘어)"]);
  assert.deepEqual(extractAddresses("제주 서귀포시 안덕면 사계리 123-4"), ["제주 서귀포시 안덕면 사계리 123-4"]);
});

test("주소: 주소처럼 보이지만 아닌 줄", () => {
  assert.deepEqual(extractAddresses("서울 여행 브이로그 2탄\n주소: 아래 링크 참고\n이메일 주소: a@b.com"), []);
});

test("영어 설명 전체", () => {
  const c = extractContacts("For business inquiries: hello@travelvibes.tv\nInstagram: https://instagram.com/travelvibes\nWebsite: https://travelvibes.tv\nPhone: +1 (212) 555-0199");
  assert.deepEqual(c.emails, ["hello@travelvibes.tv"]);
  assert.deepEqual(c.socials.map((s) => s.value), ["@travelvibes"]);
  assert.deepEqual(c.websites, ["https://travelvibes.tv"]);
  assert.equal(c.phones.length, 1);
});

test("한국어 설명 전체", () => {
  const c = extractContacts(`🔥 캠핑왕 채널입니다\n📩 광고·협찬 문의: campking@naver.com\n📞 010-2222-3333 (평일 10~6시)\n📸 인스타 @campking_official\n🛒 스토어 https://smartstore.naver.com/campking\n🏠 주소: 강원 춘천시 남산면 강촌로 100\n#캠핑 #차박`);
  assert.deepEqual(c.emails, ["campking@naver.com"]);
  assert.deepEqual(c.phones, ["010-2222-3333"]);
  assert.deepEqual(c.socials.map((s) => s.value), ["@campking_official"]);
  assert.deepEqual(c.websites, ["https://smartstore.naver.com/campking"]);
  assert.deepEqual(c.addresses, ["강원 춘천시 남산면 강촌로 100"]);
});

test("연락처 없는 설명", () => {
  const c = extractContacts("매일 올라오는 캠핑 브이로그! 구독과 좋아요 부탁드려요 😊 #캠핑");
  assert.equal(hasAnyContact(mergeContacts([{ text: "매일 올라오는 캠핑 브이로그! 구독과 좋아요 부탁드려요 😊 #캠핑", source: "channel" }])), false);
  assert.deepEqual(c.emails, []);
});

test("합치기: 채널 설명이 먼저, 같은 값은 한 번, 영상 출처는 제목 표시", () => {
  const merged = mergeContacts([
    { text: "문의 a@b.com", source: "channel" },
    { text: "문의 A@B.com, 010-1111-2222", source: "video", videoTitle: "캠핑 장비 리뷰" },
  ]);
  assert.deepEqual(merged.emails, [{ value: "a@b.com", source: "channel" }]);
  assert.deepEqual(merged.phones, [{ value: "010-1111-2222", source: "video", videoTitle: "캠핑 장비 리뷰" }]);
  assert.equal(hasAnyContact(merged), true);
});

test("합치기: 종류마다 최대 5개", () => {
  const many = Array.from({ length: 9 }, (_, i) => `user${i}@mail.com`).join(" ");
  assert.equal(mergeContacts([{ text: many, source: "channel" }]).emails.length, 5);
});

test("비정상 입력: 빈 글·아주 긴 글도 멈추지 않음", () => {
  assert.deepEqual(extractContacts("").emails, []);
  const long = "가".repeat(50_000) + " late@mail.com";
  assert.deepEqual(extractContacts(long).emails, []); // 앞 1만 자만 읽음
});
