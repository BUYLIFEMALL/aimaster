import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
let browser;

const editorMarkup = `
  <div class="se-documentTitle">
    <div class="se-title-text" contenteditable="true"></div>
  </div>
  <div class="editor-root" contenteditable="true">
    <p class="se-text-paragraph"><br></p>
  </div>
  <script>
    document.querySelector('.editor-root').addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      const root = event.currentTarget;
      const paragraph = document.getSelection()?.anchorNode?.parentElement?.closest('p') || root.lastElementChild;
      const next = document.createElement('p');
      next.className = 'se-text-paragraph';
      next.append(document.createElement('br'));
      paragraph.after(next);
      const range = document.createRange();
      range.selectNodeContents(next);
      range.collapse(false);
      const selection = document.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });
  </script>
`;

function normalizeDraftText(value) {
  return String(value || "")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .trim();
}

async function createEditorPage() {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setContent(`<!doctype html><html><body><iframe id="post-write" srcdoc='${editorMarkup.replaceAll("'", "&apos;")}'></iframe></body></html>`);
  await page.locator("#post-write").waitFor();
  return { context, page, frame: page.frameLocator("#post-write") };
}

async function focusTarget(frame, kind) {
  await frame.locator(kind === "title" ? ".se-title-text" : ".se-text-paragraph").first().click();
  await frame.locator(".editor-root").evaluate((root, targetKind) => {
    const target = targetKind === "title" ? root.ownerDocument.querySelector(".se-title-text") : root.querySelector(".se-text-paragraph");
    const editable = target?.isContentEditable ? target : target?.querySelector('[contenteditable="true"]') || target?.closest('[contenteditable="true"]') || root;
    editable.focus();
    const range = editable.ownerDocument.createRange();
    range.selectNodeContents(target || editable);
    range.collapse(false);
    const selection = editable.ownerDocument.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }, kind);
}

async function cdpType(page, text) {
  const client = await page.context().newCDPSession(page);
  try {
    for (const character of normalizeDraftText(text)) {
      if (character === "\n") {
        await client.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
        await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
      } else {
        await client.send("Input.insertText", { text: character });
      }
    }
  } finally {
    await client.detach().catch(() => {});
  }
}

before(async () => {
  browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ["--disable-gpu"] });
});

after(async () => {
  await browser?.close();
});

test("preserves spaces and Korean text in the title", async () => {
  const { context, page, frame } = await createEditorPage();
  try {
    await focusTarget(frame, "title");
    await cdpType(page, "네이버 블로그 제목");
    assert.equal(await frame.locator(".se-title-text").textContent(), "네이버 블로그 제목");
  } finally {
    await context.close();
  }
});

test("creates separate paragraphs for single and multiple newlines", async () => {
  const { context, page, frame } = await createEditorPage();
  try {
    await focusTarget(frame, "body");
    await cdpType(page, "첫 번째 문단\n두 번째 문단\n세 번째 문단");
    assert.deepEqual(await frame.locator(".editor-root p").allTextContents(), ["첫 번째 문단", "두 번째 문단", "세 번째 문단"]);
  } finally {
    await context.close();
  }
});

test("normalizes markdown without removing internal paragraph breaks", () => {
  assert.equal(normalizeDraftText("# 제목\\n첫 문단\\n\\n**둘째 문단**"), "제목\n첫 문단\n\n둘째 문단");
  assert.equal(normalizeDraftText("링크 [AIMaster](https://www.buylife.xyz)"), "링크 AIMaster");
});

test("production image upload intercepts native chooser and selects successful iframe result", async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  let client;
  let intercepted = 0;
  let enabled = false;
  let detached = false;
  try {
    await page.setContent('<iframe></iframe>');
    const frame = page.frames()[1];
    await frame.setContent(`
      <button class="se-image-toolbar-button">사진</button>
      <input type="file" accept="image/*">
      <script>
        const input = document.querySelector("input");
        document.querySelector("button").onclick = () => input.click();
        input.onchange = () => {
          const image = document.createElement("img");
          image.className = "se-image-resource";
          image.src = URL.createObjectURL(input.files[0]);
          document.body.append(image);
        };
      </script>
    `);
    const chrome = {
      debugger: {
        attach: async () => {
          client = await context.newCDPSession(page);
          await client.send("Page.enable");
          client.on("Page.fileChooserOpened", () => { intercepted++; });
        },
        sendCommand: async (_, method, params) => {
          if (method === "Page.setInterceptFileChooserDialog") enabled = params.enabled;
          return client.send(method, params);
        },
        detach: async () => { detached = true; await client.detach(); },
      },
      scripting: {
        executeScript: async ({ func, args = [] }) => {
          assert.equal(enabled, true, "native chooser must be intercepted before page interaction");
          return Promise.all(page.frames().map(async (target, frameId) => ({
            frameId,
            result: await target.evaluate(
              ({ source, args }) => (0, eval)("(" + source + ")")(...args),
              { source: func.toString(), args },
            ),
          })));
        },
      },
    };
    const source = readFileSync(new URL("../../extension/sidepanel.js", import.meta.url), "utf8");
    const sandbox = vm.createContext({ chrome, setTimeout });
    vm.runInContext(source.slice(0, source.indexOf("async function renderStatus")), sandbox);
    const result = await sandbox.insertImageIntoNaverEditor(1,
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6lQAAAAASUVORK5CYII=");
    assert.equal(result.inserted, true);
    assert.equal(intercepted, 0, "file click is canceled before reaching the native chooser");
    assert.equal(enabled, false);
    assert.equal(detached, true);
    assert.equal(await frame.locator(".se-image-resource").count(), 1);
    assert.equal(await frame.evaluate(() => Boolean(window[Symbol.for("aimaster.seo.fileChooserGuard")])), false);
    // Cleanup must restore normal user file selection after automation.
    const manualChooser = page.waitForEvent("filechooser");
    await frame.locator("button").click();
    assert.ok(await manualChooser);
    assert.match(sandbox.formatBrowserError(new Error("file input not found")), /file input not found/);
  } finally { await context.close(); }
});

test("failed image upload releases interception and reports failure", async () => {
  const calls = [];
  const sandbox = vm.createContext({
    setTimeout,
    chrome: { scripting: { executeScript: async () => [] }, debugger: {
      attach: async () => calls.push("attach"),
      sendCommand: async (_, method, params) => calls.push([method, params.enabled]),
      detach: async () => calls.push("detach"),
    } },
  });
  const source = readFileSync(new URL("../../extension/sidepanel.js", import.meta.url), "utf8");
  vm.runInContext(source.slice(0, source.indexOf("async function renderStatus")), sandbox);
  await assert.rejects(sandbox.insertImageIntoNaverEditor(1, ""), /유효한 이미지/);
  assert.deepEqual(calls, ["attach",
    ["Page.setInterceptFileChooserDialog", true],
    ["Page.setInterceptFileChooserDialog", false], "detach"]);
});
