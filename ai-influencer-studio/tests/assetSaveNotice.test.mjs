// W01v 화면의 원본 저장 결과 안내 시험 (2026-11-18, CC-SNS-01, Master msg_d7622f67a970). 실제 DB·저장소·키·AI 호출 없음.
//  A) 판정 함수 assetSaveNotice — 응답 본문의 assetSaved 세 값만 안내로 바꾸고, 그 밖에는 null(화면 변화 없음).
//  B) 화면 소스 정적 확인 — 안내는 문구뿐이고 다시 생성·자동 조회·폴링을 시작하는 코드가 없다.
//  ★ 한계: 화면 컴포넌트(tsx)를 실제로 그려 보지는 않는다(이 저장소에 화면 렌더 시험 도구가 없다). B는 소스 문자열 확인이고 브라우저 화면 검수가 아니다.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { assetSaveNotice, ASSET_SAVE_MESSAGES } = await import("../src/lib/assets/saveNotice.ts");
const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const STUDIO = read("../src/components/InfluencerStudio.tsx");
const DISPLAY = read("../src/components/ImageDisplay.tsx");
const GENERATION = read("../src/lib/assets/generation.ts");

const IMAGE = "data:image/png;base64,AAAA";
const ASSET_ID = "0a0b0c0d-1111-4222-8333-444455556666";

// ───────────── A) 판정 ─────────────
test("세 값만 안내로 바뀐다: true → 보관함, false → 보관 안 됨, \"unknown\" → 확인 못 함", () => {
  assert.deepEqual(assetSaveNotice({ imageUrl: IMAGE, assetSaved: true, assetId: ASSET_ID }), { kind: "saved", message: ASSET_SAVE_MESSAGES.saved });
  assert.deepEqual(assetSaveNotice({ imageUrl: IMAGE, assetSaved: false, assetCode: "STORAGE_LIMIT" }), { kind: "not_saved", message: ASSET_SAVE_MESSAGES.not_saved });
  assert.deepEqual(assetSaveNotice({ imageUrl: IMAGE, assetSaved: "unknown", assetId: ASSET_ID, assetCode: "UPLOAD_UNKNOWN" }), { kind: "unknown", message: ASSET_SAVE_MESSAGES.unknown });
});

test("저장 결과가 실리지 않은 응답은 null — 저장 기능 off·옛 응답에서 화면이 달라지지 않는다", () => {
  for (const body of [{ imageUrl: IMAGE }, { imageUrl: IMAGE, success: true }, {}, null, undefined, "ok", 1, true, [], [{ assetSaved: true }]]) {
    assert.equal(assetSaveNotice(body), null, JSON.stringify(body));
  }
  // 상속된 값은 응답 본문의 값이 아니다
  assert.equal(assetSaveNotice(Object.create({ assetSaved: true })), null);
});

test("세 값 밖의 값은 성공으로 추정하지 않는다(null)", () => {
  for (const v of ["true", "false", "saved", "ready", "UNKNOWN", "Unknown", "", 1, 0, null, undefined, {}, [], [true], { value: true }]) {
    assert.equal(assetSaveNotice({ imageUrl: IMAGE, assetSaved: v }), null, `assetSaved=${JSON.stringify(v)}`);
  }
});

test("성공 안내는 정확히 true일 때만 나온다 — 시간 초과·불명은 실패로도 성공으로도 단정하지 않는다", () => {
  const cases = [true, false, "unknown", "true", 1, undefined];
  assert.deepEqual(cases.map((v) => assetSaveNotice({ assetSaved: v })?.kind ?? null), ["saved", "not_saved", "unknown", null, null, null]);
  const unknown = ASSET_SAVE_MESSAGES.unknown;
  assert.match(unknown, /확인하지 못했습니다/);
  assert.match(unknown, /실패했다는 뜻은 아닙니다/);
  assert.match(unknown, /다시 생성하지 않으셔도/);
  assert.doesNotMatch(unknown, /보관했습니다|보관되지 않았습니다/, "불명 문구에 성공·실패 단정 표현 없음");
  assert.doesNotMatch(ASSET_SAVE_MESSAGES.not_saved, /다시 생성|재생성|다시 시도/, "보관 안 됨 문구가 재생성을 권하지 않는다");
  assert.match(ASSET_SAVE_MESSAGES.not_saved, /내려받을 수 있습니다/);
});

test("안내에는 고정 문구만 나간다 — 자산 id·코드·오류 원문이 섞이지 않는다", () => {
  const secret = "duplicate key value violates unique constraint aif_assets_pkey";
  for (const v of [true, false, "unknown"]) {
    const n = assetSaveNotice({ imageUrl: IMAGE, assetSaved: v, assetId: ASSET_ID, assetCode: "FINALIZE_UNKNOWN", error: secret, message: secret, path: `u/generated/${ASSET_ID}.png` });
    assert.deepEqual(Object.keys(n).sort(), ["kind", "message"]);
    const text = JSON.stringify(n);
    for (const leak of [ASSET_ID, "FINALIZE_UNKNOWN", secret, "generated/", "aif_assets"]) assert.equal(text.includes(leak), false, leak);
    assert.equal(Object.values(ASSET_SAVE_MESSAGES).includes(n.message), true);
  }
  for (const m of Object.values(ASSET_SAVE_MESSAGES)) {
    assert.doesNotMatch(m, /[0-9a-f]{8}-[0-9a-f]{4}-/i);
    assert.doesNotMatch(m, /[A-Z]{3,}_[A-Z]{3,}/, "코드 모양 없음");
    assert.match(m, /니다\.$/, "존댓말 문장");
  }
});

test("입력을 바꾸지 않고, 같은 입력에는 같은 결과를 낸다", () => {
  const body = Object.freeze({ imageUrl: IMAGE, assetSaved: "unknown", assetId: ASSET_ID });
  assert.deepEqual(assetSaveNotice(body), assetSaveNotice(body));
  assert.deepEqual(Object.keys(body), ["imageUrl", "assetSaved", "assetId"]);
});

test("서버가 실제로 싣는 값의 집합과 맞는다: generation.ts는 저장 결과를 true·false·\"unknown\"으로만 싣는다", () => {
  // 화면 판정이 기대는 계약을 소스에서 다시 확인한다(응답 모양이 바뀌면 이 시험이 먼저 깨진다)
  assert.match(GENERATION, /assetSaved: timedOut \? "unknown" : s\.assetSaved,/);
  assert.match(GENERATION, /if \(result\.status !== 200 \|\| !save\) return result;/, "저장을 시도하지 않은 응답에는 필드를 싣지 않는다");
});

// ───────────── B) 화면 소스 ─────────────
const noticeBlock = () => {
  const start = DISPLAY.indexOf("{/* 원본 저장 안내(W01v)");
  const end = DISPLAY.indexOf("{/* 인스타그램 캡션 스튜디오 */}");
  assert.ok(start > 0 && end > start, "안내 블록 위치");
  return DISPLAY.slice(start, end);
};

test("결과 화면: 안내는 저장 결과가 있고 로딩이 아닐 때만 그려지고, 문구 말고는 아무 동작도 없다", () => {
  const block = noticeBlock();
  assert.match(block, /\{result\.assetNotice && !result\.loading && \(/);
  assert.match(block, /role="status"/);
  assert.match(block, /\{result\.assetNotice\.message\}/);
  for (const banned of ["<button", "onClick", "fetch(", "href=", "<a ", "setInterval", "setTimeout", "useEffect", "onRefineImage", "assetId", "assetCode"]) {
    assert.equal(block.includes(banned), false, `안내 블록에 ${banned} 없음`);
  }
  // 안내는 이미지가 있을 때의 결과 카드 안에만 있다(이미지 없는 빈 화면에는 그려지지 않는다)
  assert.ok(DISPLAY.indexOf("{result.imageUrl ? (") < DISPLAY.indexOf("{/* 원본 저장 안내(W01v)"));
  assert.equal(DISPLAY.split("assetNotice").length - 1, 7, "결과 화면에서 저장 안내를 쓰는 곳은 이 블록뿐");
});

test("결과 화면: 내려받기·캡션 복사 동작은 저장 안내와 무관하게 그대로다", () => {
  assert.match(DISPLAY, /const handleDownload = /);
  assert.match(DISPLAY, /onClick=\{handleDownload\}/);
  assert.match(DISPLAY, /navigator\.clipboard\.writeText\(text\)/);
  const download = DISPLAY.slice(DISPLAY.indexOf("const handleDownload = "), DISPLAY.indexOf("return (", DISPLAY.indexOf("const handleDownload = ")));
  assert.equal(download.includes("assetNotice"), false, "내려받기는 저장 결과를 보지 않는다");
});

test("생성 화면: 저장 결과는 생성 응답에서 한 번 읽을 뿐이고, 자산 조회·폴링·재생성을 시작하지 않는다", () => {
  assert.equal(STUDIO.split('fetch("/api/generate-image"').length - 1, 1, "생성 호출은 한 곳");
  for (const src of [STUDIO, DISPLAY]) assert.equal(src.includes("/api/aif/assets"), false, "화면이 자산 조회 경로를 부르지 않는다");
  assert.match(STUDIO, /const assetNotice = assetSaveNotice\(imgData\);/);
  assert.match(STUDIO, /\.\.\.\(assetNotice \? \{ assetNotice \} : \{\}\),/, "저장 결과가 없으면 결과 상태에 필드를 더하지 않는다");
  assert.match(STUDIO, /assetNotice: null,/, "새 생성을 시작하면 앞 결과의 안내를 지운다");
  // 저장 결과를 읽은 뒤의 흐름에 저장 결과에 따른 분기가 없다(안내를 상태에 싣는 한 곳뿐)
  assert.equal(STUDIO.split("assetNotice").length - 1, 4);
  assert.equal(/if \(\s*!?assetNotice|assetNotice\s*(\?\.|\.)kind|assetNotice\s*===/.test(STUDIO), false, "저장 결과로 다른 동작을 고르지 않는다");
  // 히스토리에서 불러온 결과에는 저장 안내를 싣지 않는다
  const select = STUDIO.slice(STUDIO.indexOf("const handleSelectHistoryItem"), STUDIO.indexOf("setIsHistoryOpen(false);"));
  assert.ok(select.length > 0 && !select.includes("assetNotice"));
});

test("생성 화면: 저장 결과와 상관없이 생성 결과·캡션·히스토리 기록 흐름은 그대로 이어진다", () => {
  const at = (needle) => { const i = STUDIO.indexOf(needle); assert.ok(i > 0, needle); return i; };
  const order = [at("const generatedImageUrl = imgData.imageUrl;"), at("const assetNotice = assetSaveNotice(imgData);"), at('fetch("/api/generate-caption"'),
    at("imageUrl: generatedImageUrl,"), at("saveToHistory(generatedImageUrl, generatedCaptions, configToSubmit);")];
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.match(STUDIO, /saveToHistory\(generatedImageUrl, generatedCaptions, configToSubmit\);/);
});
