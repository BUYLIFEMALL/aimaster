import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("v1.39 넘김 기록: 정해진 곳·UUID만, 버튼마다 한 번만", async () => {
  const { HANDOFF_TARGETS, isHandoffItemId } = await import("../src/lib/linkHandoff.ts");
  assert.deepEqual([...HANDOFF_TARGETS], ["image-convert-studio", "cinematic-storyboard-studio"]);
  assert.equal(isHandoffItemId("123e4567-e89b-12d3-a456-426614174000"), true);
  assert.equal(isHandoffItemId("../x"), false);
  assert.equal(isHandoffItemId(1), false);
  const api = readFileSync(new URL("../src/app/api/link-handoff/route.ts", import.meta.url), "utf8");
  assert.match(api, /checkProgramAccessApi\(\)/);
  assert.match(api, /action: "linked_handoff", metadata: \{ to, itemId \}/);
  assert.match(api, /export const dynamic = "force-dynamic";/);
  assert.match(api, /export const fetchCache = "force-no-store";/);
  const ui = readFileSync(new URL("../src/components/studio/HistoryList.tsx", import.meta.url), "utf8");
  assert.match(ui, /onClick=\{\(\) => markHandoff\(it\.id, "image-convert-studio"\)\}/);
  assert.match(ui, /onClick=\{\(\) => markHandoff\(it\.id, "cinematic-storyboard-studio"\)\}/);
});

test("v1.40 보관함 저장 API는 변환 스튜디오 주소만 CORS 허용(로그인 쿠키 포함)", async () => {
  // 2026-10-22: CORS·본문은 공용 기준 코드 resave-receiver 사본으로 옮김(동작 같음, 형식은 파일 첫 바이트로 판별)
  const api = readFileSync(new URL("../src/app/api/saved/route.ts", import.meta.url), "utf8");
  assert.match(api, /resaveCors\(request\.headers\.get\("origin"\)\)/);
  assert.match(api, /readResaveBody\(await request\.text\(\), MAX_SAVED_B64\)/);
  assert.match(api, /mimeType: r\.mime/);
  assert.match(api, /export async function OPTIONS/);
  const { resaveCors } = await import("../src/lib/resaveReceiver.ts");
  assert.equal(resaveCors("https://image-convert-studio.buylife.xyz")["Access-Control-Allow-Credentials"], "true");
  assert.deepEqual(resaveCors("https://evil.example.com"), {});
});

test("v1.41 다시 저장한 사진에 「변환됨 · 형식」 표시(서버 보관함 카드)", () => {
  const src = readFileSync(new URL("../src/lib/saved.ts", import.meta.url), "utf8");
  assert.match(src, /format: formatOf\(r\.path\)/);
  assert.match(src, /return ext === "jpg" \|\| ext === "jpeg" \? "JPEG" : ext\.toUpperCase\(\);/);
  const ui = readFileSync(new URL("../src/components/studio/HistoryList.tsx", import.meta.url), "utf8");
  assert.match(ui, /it\.model === "image-convert-studio" && <span[^>]*data-converted-badge/);
});
