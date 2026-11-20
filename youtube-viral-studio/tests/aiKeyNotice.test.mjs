// AI 키 안내 문구·설정 화면 제목 시험 — 2026-11-20 영상 담당(MOV-YVS-SETTINGS-WORDING). 네트워크 없음.
// 실행: node --test tests/aiKeyNotice.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { AI_KEY_SETTINGS_URL, AI_KEY_REQUIRED_MESSAGE, AI_KEY_LINK_LABEL, SETTINGS_PAGE_TITLE } = await import("../src/lib/aiKeyNotice.ts");
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("AI 키 안내는 실제 등록 위치(메인 사이트 API 설정)를 가리킨다", () => {
  assert.equal(AI_KEY_SETTINGS_URL, "https://www.buylife.xyz/api-settings");
  assert.match(AI_KEY_REQUIRED_MESSAGE, /메인 사이트 「API 설정」/);
  assert.match(AI_KEY_REQUIRED_MESSAGE, /Gemini 또는 OpenAI/);
  assert.doesNotMatch(AI_KEY_REQUIRED_MESSAGE, /YouTube API 키\]/, "예전의 틀린 메뉴 이름이 남으면 안 됨");
  assert.match(AI_KEY_LINK_LABEL, /API 설정/);
});

test("대본 분석 API가 공용 문구를 쓰고 예전 문구가 남지 않았다(응답 모양 needAiKey 그대로)", () => {
  const route = read("src/app/api/youtube/analyze-script/route.ts");
  assert.match(route, /error: AI_KEY_REQUIRED_MESSAGE,/);
  assert.match(route, /needAiKey: true,/);
  assert.doesNotMatch(route, /\[설정 > YouTube API 키\]/);
});

test("영상 카드의 키 안내 링크는 메인 API 설정을 새 탭으로 연다", () => {
  const card = read("src/components/common/VideoCard.tsx");
  assert.match(card, /href=\{AI_KEY_SETTINGS_URL\} target="_blank" rel="noopener noreferrer"/);
  assert.match(card, /analyzeError\.needKey &&/);
  assert.doesNotMatch(card, /API 키 등록하러 가기/);
});

test("설정 화면 제목은 좌측 메뉴 이름과 같다", () => {
  assert.equal(SETTINGS_PAGE_TITLE, "API키등록·플랫폼연동");
  const settings = read("src/app/(dashboard)/settings/page.tsx");
  assert.match(settings, /\{SETTINGS_PAGE_TITLE\}/);
  assert.doesNotMatch(settings, /Security Key Vault/);
  const menus = ["src/components/layout/Sidebar.tsx"].map(read).join("\n");
  assert.ok(menus.includes(`label: "🔑 ${SETTINGS_PAGE_TITLE}"`), "좌측 메뉴 이름과 일치");
});
