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

test("shows the manifest version in the extension panel instead of a hard-coded label", () => {
  const manifest = JSON.parse(readFileSync(new URL("../../extension/manifest.json", import.meta.url), "utf8"));
  const panel = readFileSync(new URL("../../extension/sidepanel.html", import.meta.url), "utf8");
  const script = readFileSync(new URL("../../extension/sidepanel.js", import.meta.url), "utf8");
  assert.match(panel, /id="extensionVersion"/);
  assert.match(script, /chrome\.runtime\?\.getManifest\?\.\(\)/);
  assert.match(script, /manifest\?\.version_name/);
  assert.doesNotMatch(panel, new RegExp(manifest.version_name));
});

test("automates only the publish-settings opening step and leaves final publishing to the user", () => {
  const panel = readFileSync(new URL("../../extension/sidepanel.html", import.meta.url), "utf8");
  const script = readFileSync(new URL("../../extension/sidepanel.js", import.meta.url), "utf8");
  assert.match(panel, /카테고리·태그 다시 입력/);
  assert.match(script, /async function openNaverPublishSettings/);
  assert.match(script, /async function preparePublishSettingsAfterContentInput/);
  assert.match(script, /document\.querySelector\("#tag-input"\)/);
  assert.match(script, /normalizedText\(element\) === "발행"/);
  assert.match(script, /마지막 발행 버튼은 자동으로 누르지 않았습니다/);
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

test("extension keeps content creation in the web studio and exposes only the handoff controls", () => {
  const panel = readFileSync(new URL("../../extension/sidepanel.html", import.meta.url), "utf8");
  assert.match(panel, /웹에서 새 콘텐츠 만들기/);
  assert.match(panel, /id="webDraftList"/);
  assert.match(panel, /id="fill"/);
  assert.doesNotMatch(panel, /id="topic"/);
  assert.doesNotMatch(panel, /id="generate"/);
  assert.doesNotMatch(panel, /id="generateAndFill"/);
  assert.doesNotMatch(panel, /id="runSeoCheck"/);
  assert.doesNotMatch(panel, /id="regenerateImage"/);
});

test("supports a fourth image with a third sentence-matched content slot", () => {
  const studio = readFileSync(new URL("../../components/StudioPage.tsx", import.meta.url), "utf8");
  const visuals = readFileSync(new URL("../../lib/ai/contentVisuals.ts", import.meta.url), "utf8");
  const extension = readFileSync(new URL("../../extension/sidepanel.js", import.meta.url), "utf8");
  assert.match(studio, /4장 생성 · 대표 1장 \+ 본문 3장/);
  assert.match(studio, /이 이미지만 다시 생성/);
  assert.match(visuals, /"content-3"/);
  assert.match(extension, /"content-3"/);
});

test("places sentence-matched images before the containing paragraph without splitting it", () => {
  const studio = readFileSync(new URL("../../components/StudioPage.tsx", import.meta.url), "utf8");
  assert.match(studio, /function getParagraphStart\(body: string, sentencePosition: number\)/);
  assert.match(studio, /getParagraphStart\(draft\.body, sentencePosition\)/);
  assert.match(studio, /\.filter\(\(image, index, list\) => index === 0 \|\| image\.position !== list\[index - 1\]\.position\)/);
});

test("selects the image model beside representative image creation and sends it to every image action", () => {
  const studio = readFileSync(new URL("../../components/StudioPage.tsx", import.meta.url), "utf8");
  const representativeRoute = readFileSync(new URL("../../app/api/images/generate/route.ts", import.meta.url), "utf8");
  const contentRoute = readFileSync(new URL("../../app/api/images/generate-content/route.ts", import.meta.url), "utf8");
  const regenerateRoute = readFileSync(new URL("../../app/api/images/regenerate-content/route.ts", import.meta.url), "utf8");
  const settings = readFileSync(new URL("../../app/settings/ApiKeySettings.tsx", import.meta.url), "utf8");
  assert.match(studio, /대표 이미지 생성 \(나노바나나\).*image-model/);
  assert.match(studio, /id="image-model"/);
  assert.match(studio, /model: imageModel/);
  assert.match(representativeRoute, /resolveGeminiImageModel\(input\?\.model\)/);
  assert.match(contentRoute, /resolveGeminiImageModel\(input\?\.model\)/);
  assert.match(regenerateRoute, /resolveGeminiImageModel\(input\?\.model\)/);
  assert.doesNotMatch(settings, /gemini-image-model/);
  assert.doesNotMatch(settings, /openai-content-model/);
});

test("keeps one image model selector for initial creation and later regeneration", () => {
  const studio = readFileSync(new URL("../../components/StudioPage.tsx", import.meta.url), "utf8");
  assert.match(studio, /id="image-model"/);
  assert.doesNotMatch(studio, /id="new-draft-image-model"/);
  assert.match(studio, /model: imageModel/);
});

test("lays out content-image auto generation with its model and keeps the image description on the right", () => {
  const studio = readFileSync(new URL("../../components/StudioPage.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  assert.match(studio, /content-image-auto-option/);
  assert.match(studio, /id="content-image-model"/);
  assert.match(studio, /content-image-heading-description/);
  assert.match(studio, /content-image-count-field/);
  assert.match(studio, /content-image-control-row/);
  assert.match(styles, /\.content-image-auto-option \{ grid-column: 1 \/ -1; \}/);
  assert.match(styles, /\.content-image-control-row \{ display: grid; grid-column: 1 \/ -1; grid-template-columns: minmax\(0, 1fr\) minmax\(280px, \.9fr\); column-gap: 16px; align-items: end; \}/);
  assert.match(styles, /\.content-image-generate-button \{ justify-self: start; align-self: end; \}/);
  assert.match(styles, /\.content-image-stage \{ grid-template-columns: minmax\(0, 1fr\) minmax\(280px, \.9fr\); \}/);
});

test("keeps content-block position controls on a single toolbar line", () => {
  const styles = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  assert.match(styles, /\.content-block-toolbar \{[^}]*grid-template-columns: minmax\(0, 1fr\) max-content/);
  assert.match(styles, /\.content-block-toolbar div \{[^}]*grid-column: 2; justify-self: end; flex-wrap: nowrap/);
});

test("selects the OpenAI content model above representative image generation", () => {
  const studio = readFileSync(new URL("../../components/StudioPage.tsx", import.meta.url), "utf8");
  const draftRoute = readFileSync(new URL("../../app/api/drafts/generate/route.ts", import.meta.url), "utf8");
  const models = readFileSync(new URL("../../lib/ai/openaiModels.ts", import.meta.url), "utf8");
  assert.match(studio, /id="content-provider"/);
  assert.match(studio, /id="content-model"/);
  assert.match(studio, /대표 이미지 생성 \(나노바나나\)/);
  assert.match(studio, /model: contentModel/);
  assert.match(draftRoute, /resolveOpenAIContentModel\(input\?\.model\)/);
  assert.match(models, /DEFAULT_OPENAI_CONTENT_MODEL: OpenAIContentModel = "gpt-4\.1"/);
});

test.skip("legacy extension SEO checklist was removed in favor of web-studio review", () => {
  const source = readFileSync(new URL("../../extension/sidepanel.js", import.meta.url), "utf8");
  const start = source.indexOf("function normalizeSeoText");
  const end = source.indexOf("async function fillPublishInfoIntoNaver");
  const sandbox = vm.createContext({
    plainText: (value) => String(value || "")
      .replace(/\\n/g, "\n")
      .replace(/\r\n/g, "\n")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^\s*[-*]\s+/gm, "")
      .trim(),
  });
  vm.runInContext(source.slice(start, end), sandbox);
  const checks = sandbox.buildSeoChecklist({
    title: "AI 자동화로 업무 시간을 줄이는 실전 방법",
    body: "AI 자동화는 반복 업무와 업무 시간을 줄이는 데 도움이 됩니다.\n\n첫째, 반복 업무를 정리하고 자동화할 범위를 작게 정합니다.\n\n둘째, 작은 업무부터 적용하며 담당자와 검토 기준을 명확히 공유합니다.\n\n셋째, 결과를 매주 확인하고 오류가 난 작업은 원인을 기록해 다음 실행 전에 보완합니다.\n\n넷째, 사실과 설정을 직접 검토하고 사람이 최종 결과를 확인합니다. 이 과정을 반복하면 AI 자동화가 실제 업무 시간 절약으로 이어지는지 안정적으로 판단할 수 있습니다.\n\n다섯째, 도입 전후의 시간을 비교하면서 불필요한 작업을 줄이고 중요한 고객 업무에 집중합니다.".repeat(2),
    keywords: "AI 자동화, 업무 시간",
    hasImage: true,
    category: "AI 활용",
    tags: "AI 자동화, 업무 효율, 생산성",
    factsConfirmed: true,
  });
  assert.equal(checks.length, 7);
  assert.equal(checks.filter((check) => check.required && !check.ok).length, 0);
  assert.equal(checks.filter((check) => !check.required && !check.ok).length, 0);
  const missingKeyword = sandbox.buildSeoChecklist({ title: "짧은 제목", body: "한 문단", keywords: "없는키워드", hasImage: false, category: "", tags: "", factsConfirmed: false });
  assert.equal(missingKeyword.find((check) => check.title === "핵심 키워드 반영")?.ok, false);
  assert.equal(missingKeyword.find((check) => check.title === "사실·최신 정보 확인")?.ok, false);
});

test("publish settings keep tag focus and select exact category without publishing", async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  let client;
  try {
    await page.setContent('<iframe></iframe>');
    const frame = page.frames()[1];
    await frame.setContent(`
      <input id="tag-input"><div id="tags"></div>
      <button class="selectbox_button__IxraO">기본</button>
      <div class="option_list_layer__o54Wx" style="display:none">
        <button class="item__dTdzo">여행기</button><button class="item__dTdzo">여행</button>
      </div>
      <button id="publish">발행</button>
      <script>
        const input = document.querySelector("input");
        input.onkeydown = event => { if(event.key === "Enter") {
          document.querySelector("#tags").append(input.value + "|"); input.value = "";
        }};
        const trigger = document.querySelector(".selectbox_button__IxraO");
        const list = document.querySelector(".option_list_layer__o54Wx");
        trigger.onclick = () => { list.style.display = "block"; trigger.focus(); };
        list.onclick = event => { trigger.textContent = event.target.textContent; list.style.display = "none"; };
        document.querySelector("#publish").onclick = () => document.body.dataset.published = "yes";
      </script>
    `);
    const sandbox = vm.createContext({
      setTimeout,
      document: { getElementById: id => ({ value: id === "publishCategory" ? "여행" : "#자동화, AI, 자동화" }) },
      chrome: {
        tabs: { query: async () => [{ id: 1, windowId: 1, active: true }], update: async () => {} },
        windows: { update: async () => {} },
        debugger: {
          attach: async () => { client = await context.newCDPSession(page); },
          sendCommand: async (_, method, params) => client.send(method, params),
          detach: async () => client.detach(),
        },
        scripting: { executeScript: async ({ target, func, args = [] }) => Promise.all(
          page.frames().map((frame, frameId) => ({ frame, frameId }))
            .filter(({ frameId }) => !target.frameIds || target.frameIds.includes(frameId))
            .map(async ({ frame, frameId }) => ({ frameId, result: await frame.evaluate(
              ({ source, args }) => (0, eval)("(" + source + ")")(...args),
              { source: func.toString(), args },
            ) }))
        ) },
      },
    });
    const source = readFileSync(new URL("../../extension/sidepanel.js", import.meta.url), "utf8");
    vm.runInContext(source.slice(0, source.indexOf("async function renderStatus")), sandbox);
    await sandbox.fillPublishInfoIntoNaver();
    assert.equal(await frame.locator("#tags").textContent(), "자동화|AI|");
    assert.equal(await frame.locator(".selectbox_button__IxraO").textContent(), "여행");
    assert.equal(await frame.locator("body").getAttribute("data-published"), null);
  } finally { await context.close(); }
});
