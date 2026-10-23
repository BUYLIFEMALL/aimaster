import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("v1.33 넘김 기록: 정해진 곳·UUID만, 버튼마다 한 번만", async () => {
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
  const ui = readFileSync(new URL("../src/components/studio/ServerWorks.tsx", import.meta.url), "utf8");
  assert.match(ui, /onClick=\{\(\) => markHandoff\(w\.id, "image-convert-studio"\)\}/);
  assert.match(ui, /onClick=\{\(\) => markHandoff\(w\.id, "cinematic-storyboard-studio"\)\}/);
});
