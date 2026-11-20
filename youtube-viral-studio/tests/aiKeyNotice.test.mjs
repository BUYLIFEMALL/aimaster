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

// A2(맥미니 후속): 부제·대시보드·급상승도 같은 말로 — 여기서 등록하는 것(YouTube 키·구글 앱)과 메인 사이트에서 등록하는 것(AI 키)을 구분
const notice = await import("../src/lib/aiKeyNotice.ts");

test("A2 설정 부제: 이 화면은 YouTube 키·내 채널 연결용 구글 앱, AI 키는 메인 사이트 API 설정", () => {
  const sub = notice.SETTINGS_PAGE_SUBTITLE;
  assert.match(sub, /YouTube Data API 키/);
  assert.match(sub, /채널 연결용 구글 앱/);
  assert.match(sub, /AI 키\(Gemini·OpenAI·Claude\)는 메인 사이트 「API 설정」/);
  const settings = read("src/app/(dashboard)/settings/page.tsx");
  assert.match(settings, /\{SETTINGS_PAGE_SUBTITLE\}/);
  assert.doesNotMatch(settings, /AI 엔진 키를 등록하고 관리/, "AI 키를 여기서 관리하는 것처럼 읽히는 예전 부제 금지");
});

test("A2 대시보드: 연결 카드 제목·버튼은 표준 이름, AI 엔진 미등록 안내는 메인 사이트로", () => {
  assert.match(notice.AI_ENGINE_NOTE_MISSING, /메인 사이트 API 설정/);
  assert.match(notice.AI_ENGINE_NOTE_READY, /메인 사이트 API 설정/);
  assert.match(notice.AI_ENGINE_LABEL, /Gemini · OpenAI · Claude/);
  const dash = read("src/app/(dashboard)/dashboard/page.tsx");
  assert.match(dash, /\{CONNECTION_STATUS_TITLE\}/);
  assert.match(dash, /<span>\{SETTINGS_PAGE_TITLE\}<\/span>/);
  assert.match(dash, /label: AI_ENGINE_LABEL, ok: hasAiKey, note: hasAiKey \? AI_ENGINE_NOTE_READY : AI_ENGINE_NOTE_MISSING/, "판정(hasAiKey)은 그대로, 글자만 바뀜");
});

test("A2 급상승: 키 등록 버튼은 이 앱 설정 화면(표준 이름)으로", () => {
  assert.equal(notice.SETTINGS_LINK_LABEL, "API키등록·플랫폼연동에서 등록 →");
  const tr = read("src/app/(dashboard)/trending-videos/page.tsx");
  assert.match(tr, /\{SETTINGS_LINK_LABEL\}/);
  assert.match(tr, /href="\/settings"/, "YouTube 키는 이 앱 설정 화면에서 등록 — 링크 대상 그대로");
});

test("A2 앱 화면 어디에도 예전 이름 「보안 키 금고」가 남지 않는다", () => {
  for (const p of [
    "src/app/(dashboard)/settings/page.tsx",
    "src/app/(dashboard)/dashboard/page.tsx",
    "src/app/(dashboard)/trending-videos/page.tsx",
    "src/components/common/VideoCard.tsx",
  ]) {
    assert.doesNotMatch(read(p), /보안 키 금고|Security Key Vault/, p);
  }
});
