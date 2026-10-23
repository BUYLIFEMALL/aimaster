// v1.29 W8 캐릭터 시트를 컷 그림에 첨부 — 무료 시험(AI 호출 없음)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pickCutRefUrls, parseCutRefs, withRefInstruction, isAttachableRef, MAX_CUT_REFS } from "../src/lib/cutRefs.ts";

const png = (n) => `data:image/png;base64,${"A".repeat(200 + n)}`;
const chars = [
  { id: "1", name: "민지", description: "", characterSheetUrl: png(1), referenceImageUrl: png(2) },
  { id: "2", name: "준호", description: "", referenceImageUrl: png(3) },
  { id: "3", name: "하늘", description: "", characterSheetUrl: "https://image.pollinations.ai/x.png" },
  { id: "4", name: "소라", description: "", characterSheetUrl: png(4) },
];

test("컷 인물의 시트(없으면 참고 사진)만, 이름 공백·대소문자 무시", () => {
  assert.deepEqual(pickCutRefUrls({ characterNames: ["민 지", "준호"] }, chars), [png(1), png(3)]);
  assert.deepEqual(pickCutRefUrls({ characterNames: [] }, chars), []);
  assert.deepEqual(pickCutRefUrls({ characterNames: ["없는 사람"] }, chars), []);
});

test("외부 주소(무료 대체 그림)는 보내지 않고, 최대 3장", () => {
  assert.deepEqual(pickCutRefUrls({ characterNames: ["하늘"] }, chars), []);
  assert.equal(pickCutRefUrls({ characterNames: ["민지", "준호", "소라", "하늘"] }, chars).length, MAX_CUT_REFS);
});

test("서버 검사: 형식·개수·크기", () => {
  const ok = { data: "A".repeat(200), mimeType: "image/jpeg" };
  assert.deepEqual(parseCutRefs(undefined), []);
  assert.deepEqual(parseCutRefs([ok]), [ok]);
  assert.equal(typeof parseCutRefs("x"), "string");
  assert.equal(typeof parseCutRefs([ok, ok, ok, ok]), "string");
  assert.equal(typeof parseCutRefs([{ ...ok, mimeType: "image/svg+xml" }]), "string");
  assert.equal(typeof parseCutRefs([{ ...ok, data: "short" }]), "string");
  assert.equal(typeof parseCutRefs([{ ...ok, data: "A".repeat(1_000_001) }]), "string");
  assert.equal(typeof parseCutRefs([{ ...ok, data: "<script>".repeat(30) }]), "string");
});

test("첨부가 있을 때만 일관성 지시를 붙인다", () => {
  assert.equal(withRefInstruction("p", 0), "p");
  assert.match(withRefInstruction("p", 2), /reference sheets[\s\S]*\n\np$/);
});

test("서버 경로가 첨부를 parts로 보내고 재시도 없음은 그대로", () => {
  const r = readFileSync(new URL("../src/app/api/ai/image/route.ts", import.meta.url), "utf8");
  assert.match(r, /parseCutRefs\(body\?\.refs\)/);
  assert.match(r, /inlineData: \{ mimeType: r\.mimeType, data: r\.data \}/);
  assert.match(r, /retries: 0/);
  assert.match(r, /checkProgramAccessApi\(\)/);
  const g = readFileSync(new URL("../src/lib/imageGen.ts", import.meta.url), "utf8");
  assert.match(g, /pickCutRefUrls\(cut, project\.characters/);
});

test("v1.30 화면 안내: 첨부 가능 여부", () => {
  assert.equal(isAttachableRef(png(1)), true);
  assert.equal(isAttachableRef("https://image.pollinations.ai/x.png"), false);
  assert.equal(isAttachableRef(undefined), false);
  const c = readFileSync(new URL("../src/components/CharacterSection.tsx", import.meta.url), "utf8");
  assert.match(c, /컷 일관성이 좋아집니다/);
});
