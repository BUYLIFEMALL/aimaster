import { test } from "node:test";
import assert from "node:assert/strict";
import { validateDoc, newBlock, moveBlock, safeLink, safeImage, readDoc, BLOCK_TYPES } from "../src/lib/blocks.ts";

const IMG = "https://x.supabase.co/storage/v1/object/public/mall-builder-public/s/banners/a.jpg";

test("링크·그림 주소 검사", () => {
  assert.equal(safeLink(""), "");
  assert.equal(safeLink("/s/aimaster-b2b/c/1"), "/s/aimaster-b2b/c/1");
  assert.equal(safeLink("https://buylife.kr/a"), "https://buylife.kr/a");
  assert.equal(safeLink("javascript:alert(1)"), null);
  assert.equal(safeLink("//evil.com"), null);
  assert.equal(safeLink("http://x.com"), null);
  assert.equal(safeImage(IMG), IMG);
  assert.equal(safeImage("data:image/png;base64,xx"), null);
});

test("블록 종류마다 기본값으로 만들 수 있다(슬라이드·배너는 그림이 있어야 저장)", () => {
  for (const t of BLOCK_TYPES) assert.equal(newBlock(t, "x").type, t);
  assert.equal(validateDoc({ blocks: [newBlock("topbar", "a")] }).ok, true);
  assert.match(validateDoc({ blocks: [newBlock("banner", "a")] }).error, /1번째 블록\(단일 배너\): 배너 그림/);
  assert.match(validateDoc({ blocks: [newBlock("slider", "a")] }).error, /슬라이드 그림은 1~8장/);
});

test("저장 전 검사·정리", () => {
  const ok = validateDoc({
    blocks: [
      { id: "t", type: "topbar", visible: true, settings: { items: [{ text: " 신규 10% ", link: "/s/x/join", bg: "#ff0000" }], rotate_sec: 99 } },
      { id: "s", type: "slider", visible: false, settings: { slides: [{ image: IMG, link: "" }], height: 1, autoplay_sec: 3 } },
      { id: "b", type: "banner", settings: { image: IMG, link: "https://buylife.kr", max_width: 900 } },
    ],
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.value.blocks[0].settings.items[0].text, "신규 10%");
  assert.equal(ok.value.blocks[0].settings.rotate_sec, 4); // 범위 밖이면 기본값
  assert.equal(ok.value.blocks[1].visible, false);
  assert.equal(ok.value.blocks[1].settings.height, 400);
  assert.equal(ok.value.blocks[2].visible, true);
  assert.match(validateDoc({ blocks: [{ id: "x", type: "script", settings: {} }] }).error, /종류를 알 수 없/);
  assert.match(validateDoc({ blocks: [{ id: "a", type: "topbar", settings: { items: [{ text: "a", link: "javascript:x" }] } }] }).error, /링크/);
  assert.match(validateDoc({ blocks: [newBlock("topbar", "a"), newBlock("topbar", "a")] }).error, /겹칩니다/);
  assert.match(validateDoc({ blocks: Array.from({ length: 31 }, (_, i) => newBlock("topbar", `t${i}`)) }).error, /30개/);
});

test("순서 바꾸기·망가진 문서 읽기", () => {
  const bs = [newBlock("topbar", "1"), newBlock("topbar", "2"), newBlock("topbar", "3")];
  assert.deepEqual(moveBlock(bs, 0, 1).map((b) => b.id), ["2", "1", "3"]);
  assert.deepEqual(moveBlock(bs, 0, -1).map((b) => b.id), ["1", "2", "3"]);
  assert.deepEqual(readDoc({ blocks: "망가짐" }).blocks, []);
  assert.deepEqual(readDoc(null).blocks, []);
});
