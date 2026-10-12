import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { Workspace } from "../src/components/Workspace.tsx";

test("actual workspace: selection causes no paid calls, cancellation discards stale results, user draft restores", async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', {
    url: "https://emotion-writer.buylife.xyz/",
  });
  const { window } = dom;
  const old = {};
  for (const name of [
    "window",
    "document",
    "HTMLElement",
    "HTMLInputElement",
    "HTMLTextAreaElement",
    "localStorage",
    "Event",
    "MouseEvent",
  ]) {
    old[name] = globalThis[name];
    globalThis[name] = name === "window" ? window : window[name];
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const savedFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = (path, opts) =>
    new Promise((resolve) => calls.push({ path, opts, resolve }));
  const { createRoot } = await import("react-dom/client");
  const root = createRoot(document.querySelector("#root"));
  const keys = { gemini: true, pixabay: false, pexels: false };
  const button = (name) =>
    [...document.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === name,
    );
  const click = async (el) => {
    assert.ok(el);
    await act(async () => el.click());
  };
  try {
    await act(async () =>
      root.render(
        React.createElement(Workspace, {
          userId: "member-one",
          initialKeys: keys,
        }),
      ),
    );
    assert.equal(document.querySelectorAll(".connected").length, 1);
    assert.ok(document.body.textContent.includes("본인 API 키 필요"));
    assert.equal(document.querySelector("#step-3"), null);
    await click(document.querySelector(".source-choice"));
    assert.ok(document.querySelector("#step-3"));
    await click(button("에세이"));
    await click([...document.querySelectorAll("#step-4 button")][2]);
    assert.equal(calls.length, 0, "Changing settings must never call Gemini");
    await click(button("✨ 글귀 5개 생성"));
    assert.equal(calls.length, 1);
    await click(button("취소"));
    assert.equal(calls[0].opts.signal.aborted, true);
    await click(button("✨ 글귀 5개 생성"));
    assert.equal(calls.length, 2);
    const current = [
      "새 문구1",
      "새 문구2",
      "새 문구3",
      "새 문구4",
      "새 문구5",
    ];
    await act(async () => calls[1].resolve(Response.json({ quotes: current })));
    await act(async () =>
      calls[0].resolve(
        Response.json({
          quotes: [
            "오래된 문구1",
            "오래된 문구2",
            "오래된 문구3",
            "오래된 문구4",
            "오래된 문구5",
          ],
        }),
      ),
    );
    assert.equal(document.querySelectorAll(".quote-option").length, 5);
    assert.ok(!document.body.textContent.includes("오래된 문구"));
    await click(button("새 문구1"));
    assert.equal(document.querySelector("textarea").value, "새 문구1");
    const stored = JSON.parse(
      localStorage.getItem("emotion-writer:v1:member-one"),
    );
    assert.equal(stored.quote, "새 문구1");
    assert.equal(stored.lines, 7);
    assert.equal(stored.style, "에세이");
    assert.equal(stored.image, undefined);
    assert.equal(stored.key, undefined);
    assert.equal(localStorage.getItem("emotion-writer:v1:member-two"), null);
    await act(async () => root.unmount());
    const restored = createRoot(document.querySelector("#root"));
    await act(async () =>
      restored.render(
        React.createElement(Workspace, {
          userId: "member-one",
          initialKeys: keys,
        }),
      ),
    );
    assert.equal(document.querySelector("textarea").value, "새 문구1");
    assert.equal(
      calls.length,
      2,
      "Restoring a draft must not generate anything",
    );
    await act(async () => restored.unmount());
  } finally {
    globalThis.fetch = savedFetch;
    for (const name of Object.keys(old)) globalThis[name] = old[name];
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    dom.window.close();
  }
});
