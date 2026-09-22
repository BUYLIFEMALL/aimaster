import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium } from "playwright-core";

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
