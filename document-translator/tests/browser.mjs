import { build } from "esbuild";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { markdownDocx } from "../src/lib/translation/export.ts";
import { textPdf } from "./pdf.fixture.mjs";
const out = path.resolve("test-artifacts");
await mkdir(out, { recursive: true });
await build({
  entryPoints: ["tests/fixture.tsx"],
  bundle: true,
  outfile: path.join(out, "fixture.js"),
  platform: "browser",
  format: "esm",
  jsx: "automatic",
  alias: { "next/navigation": "./tests/navigation.stub.ts" },
  define: { "process.env.NODE_ENV": '"development"' },
});
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/") {
      res.setHeader("Content-Type", "text/html");
      return res.end(
        '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/globals.css"></head><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>',
      );
    }
    const target =
      url.pathname === "/fixture.js"
        ? path.join(out, "fixture.js")
        : url.pathname === "/globals.css"
          ? path.resolve("src/app/globals.css")
          : path.resolve("public", "." + url.pathname);
    if (
      !target.startsWith(path.resolve("public") + path.sep) &&
      !["fixture.js", "globals.css"].includes(path.basename(target))
    )
      throw new Error("path");
    res.setHeader(
      "Content-Type",
      target.endsWith(".js") || target.endsWith(".mjs")
        ? "text/javascript"
        : target.endsWith(".css")
          ? "text/css"
          : "application/octet-stream",
    );
    res.end(await readFile(target));
  } catch {
    res.statusCode = 404;
    res.end("not found");
  }
});
await new Promise((r) => server.listen(4388, "127.0.0.1", r));
const browser = await chromium.launch({
  headless: false,
  channel: "chrome",
  args: ["--disable-features=Translate"],
});
const context = await browser.newContext({
  viewport: { width: 1512, height: 980 },
  acceptDownloads: true,
});
const page = await context.newPage();
page.setDefaultTimeout(15000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
let calls = [],
  failureKind = "",
  delay = false;
const analysis = {
  context: [],
  terminology: [
    {
      sourceTerm: "API",
      targetTerm: "API",
      explanation: "프로그램 연결 인터페이스입니다.",
      alternatives: [],
    },
  ],
  style: {
    score: 8,
    formality: "격식체",
    tone: "명확함",
    feedback: "문체가 일관됩니다.",
  },
};
await page.route("**/api/**", async (route) => {
  const url = new URL(route.request().url());
  if (url.pathname === "/api/ai") {
    const input = route.request().postDataJSON();
    calls.push(input);
    if (delay) await new Promise((r) => setTimeout(r, 600));
    if (failureKind === input.kind)
      return route.fulfill({
        status: 429,
        json: { error: "시험: 본인 계정 한도 초과" },
      });
    const body =
      input.kind === "review"
        ? { analysis }
        : input.kind === "translate"
          ? {
              blocks: input.blocks.map((b) => ({
                id: b.id,
                text: b.text.replace("원문", "Translated"),
              })),
              sourceLanguage: "ko",
              detectedDomain: "IT",
              analysis,
            }
          : { blocks: input.blocks };
    return route.fulfill({
      json: {
        ...body,
        model: input.options.model,
        generatedAt: new Date().toISOString(),
      },
    });
  }
  return route.fulfill({
    json:
      url.pathname === "/api/keys"
        ? { hasKey: false }
        : url.pathname === "/api/projects"
          ? { projects: [] }
          : { glossaries: [] },
  });
});
const evidence = [];
const check = (label) => {
  evidence.push({ check: label, status: "passed" });
  console.log("PASS " + label);
};
try {
  await page.goto("http://127.0.0.1:4388");
  const source = page.getByRole("textbox", { name: "원문", exact: true });
  await source.fill(
    "# 원문 안내\n\nAPI는 2026년부터 사용합니다. https://example.com",
  );
  assert.equal(calls.length, 0);
  check("manual input has no automatic AI calls");
  await page
    .getByRole("button", { name: "✦ 번역 및 검수", exact: true })
    .click();
  await page
    .getByText("번역과 검수가 완료됐습니다.", { exact: false })
    .waitFor();
  assert.equal(calls.length, 1);
  assert.equal(await page.locator(".aligned-paragraph").count(), 2);
  check("translation combines aligned paragraphs and validated analysis");
  await page.screenshot({ path: path.join(out, "desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "문단별 수정" }).click();
  await page
    .getByRole("textbox", { name: "번역문 b2" })
    .fill("API edited 2026 https://example.com");
  await page.getByText("재검수 필요", { exact: true }).waitFor();
  await page.getByRole("button", { name: "현재 수정본 재검수" }).click();
  await page
    .getByText("현재 수정본을 기준으로 검수했습니다.", { exact: true })
    .waitFor();
  assert.equal(
    calls.at(-1).blocks[1].text,
    "API edited 2026 https://example.com",
  );
  check("review uses current manually edited translation");
  await page.getByRole("button", { name: "역번역 실행", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  assert.ok(calls.at(-1).blocks.some((b) => b.text.includes("API edited")));
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "닫기", exact: true })
    .click();
  check("reverse translation uses current text");
  await page.getByLabel("번역할 언어").selectOption("ja");
  await page.getByText("재번역 필요", { exact: false }).waitFor();
  assert.ok(
    await page
      .locator(".translation-content")
      .innerText()
      .then((s) => s.includes("API edited")),
  );
  check("language change preserves prior result and marks stale");
  failureKind = "translate";
  await page
    .getByRole("button", { name: "✦ 번역 및 검수", exact: true })
    .click();
  await page.getByRole("alert").waitFor();
  assert.ok(
    (await page.locator(".translation-content").innerText()).includes(
      "API edited",
    ),
  );
  const afterFail = calls.length;
  await page.waitForTimeout(500);
  assert.equal(calls.length, afterFail);
  check("provider failure preserves result and does not automatically retry");
  failureKind = "";
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: path.join(out, "failure-preserved.png"),
    fullPage: true,
  });
  await page
    .locator('input[type=file][accept=".txt,.pdf,.docx"]')
    .setInputFiles({
      name: "local.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("로컬 TXT 원문"),
    });
  await source.filter({ visible: true }).waitFor();
  await page.waitForFunction(
    () =>
      document.querySelector('textarea[aria-label="원문"]').value ===
      "로컬 TXT 원문",
  );
  assert.equal(calls.length, afterFail);
  check("actual TXT worker imports without AI call");
  const docx = new Uint8Array(
    await (
      await markdownDocx("# 파일 제목\n\n**내용**\n\n- 항목")
    ).arrayBuffer(),
  );
  await page
    .locator('input[type=file][accept=".txt,.pdf,.docx"]')
    .setInputFiles({
      name: "sample.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: Buffer.from(docx),
    });
  await page.waitForFunction(() =>
    document
      .querySelector('textarea[aria-label="원문"]')
      .value.includes("파일 제목"),
  );
  assert.match(await source.inputValue(), /# 파일 제목/);
  check("actual DOCX worker imports headings and content");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON 백업 다운로드" }).click();
  const file = await downloadPromise;
  const backup = JSON.parse(await readFile(await file.path(), "utf8"));
  assert.equal(backup.program, "document-translator");
  assert.ok(!JSON.stringify(backup).includes("apiKey"));
  check("JSON download is complete and contains no key");
  await page
    .locator('input[type=file][accept=".txt,.pdf,.docx"]')
    .setInputFiles({
      name: "sample.pdf",
      mimeType: "application/pdf",
      buffer: textPdf(),
    });
  await page.waitForFunction(() =>
    document
      .querySelector('textarea[aria-label="원문"]')
      .value.includes("Document translation sample 2026"),
  );
  assert.equal(calls.length, afterFail);
  check("actual PDF.js worker extracts text without AI call");
  await page
    .locator('input[type=file][accept=".txt,.pdf,.docx"]')
    .setInputFiles({
      name: "broken.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("not pdf"),
    });
  await page.getByRole("alert").filter({ hasText: "PDF" }).waitFor();
  assert.match(await source.inputValue(), /Document translation sample 2026/);
  check("invalid file preserves previous source");
  await page.setViewportSize({ width: 375, height: 850 });
  await page.getByRole("tab", { name: "원문", exact: true }).click();
  assert.ok(await source.isVisible());
  assert.ok(!(await page.locator(".translation-panel").isVisible()));
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(out, "mobile.png"), fullPage: true });
  check("375px mobile panels are tabbed with no horizontal page overflow");
  await page.getByRole("tab", { name: "검수", exact: true }).click();
  assert.ok(await page.locator(".analysis").isVisible());
  check("mobile analysis accessible");
  assert.deepEqual(errors, []);
  check("no uncaught browser exceptions");
  await writeFile(
    path.join(out, "browser-report.json"),
    JSON.stringify(
      {
        fixture: true,
        realProvider: false,
        evidence,
        aiCalls: calls.length,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      passed: evidence.length,
      fixture: true,
      realProvider: false,
    }),
  );
} catch (e) {
  await page.screenshot({
    path: path.join(out, "failure.png"),
    fullPage: true,
  });
  console.log(JSON.stringify({ errors, calls: calls.length, evidence }));
  throw e;
} finally {
  await browser.close();
  server.close();
}
