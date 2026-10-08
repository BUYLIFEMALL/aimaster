// Execute the actual TSX handlers with mocked React setters; no DB or paid AI calls.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../src/app/(dashboard)/page.tsx"), "utf8");
const ast = ts.createSourceFile("page.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = new Map();
function visit(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
    declarations.set(node.name.text, node.initializer.getText(ast));
  }
  ts.forEachChild(node, visit);
}
visit(ast);
function evaluate(name, context) {
  assert.ok(declarations.has(name), `Missing real implementation: ${name}`);
  const js = ts.transpileModule(`(${declarations.get(name)})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  return vm.runInNewContext(js, context);
}

const accounts = [
  { blog_id: "a", categories: [
    { id: "a-1", category_name: "생활", search_keywords: "청소, 정리", publish_purpose: "실용 정보", preferred_tone: "반말" },
    { id: "a-2", category_name: "여행", search_keywords: "국내 여행", publish_purpose: "여행 준비" },
    { id: "a-3", category_name: "빈 설정" },
  ] },
  { blog_id: "b", categories: [{ id: "b-1", category_name: "뷰티", search_keywords: "네일", publish_purpose: "뷰티 정보" }] },
  { blog_id: "empty", categories: [] },
  { blog_id: "legacy" },
];
const state = { selectedBlogId: "a", category: "생활", searchKeywords: "old", publishPurpose: "old", topic: "수정한 주제", preferredTone: "합니다체", writingStyle: "concise" };
const context = { accounts, ...state,
  setSelectedBlogId: (v) => { state.selectedBlogId = v; context.selectedBlogId = v; },
  setCategory: (v) => { state.category = v; context.category = v; },
  setSearchKeywords: (v) => { state.searchKeywords = v; context.searchKeywords = v; },
  setPublishPurpose: (v) => { state.publishPurpose = v; context.publishPurpose = v; },
};
const selectCategory = evaluate("handleSelectRegisteredCategory", context);
const selectAccount = evaluate("handleSelectBlogAccount", context);

(async () => {
  selectCategory("a-2");
  assert.equal(state.category, "여행");
  assert.equal(state.searchKeywords, "국내 여행");
  assert.equal(state.publishPurpose, "여행 준비");
  assert.equal(state.topic, "수정한 주제");
  assert.equal(state.preferredTone, "합니다체");
  assert.equal(state.writingStyle, "concise");

  const before = { ...state };
  selectCategory("b-1");
  selectCategory("not-found");
  assert.deepEqual(state, before, "Foreign/unknown category must not change the current account");

  selectCategory("a-3");
  assert.equal(state.searchKeywords, "");
  assert.equal(state.publishPurpose, "");
  selectAccount("b");
  assert.equal(state.category, "뷰티");
  assert.equal(state.searchKeywords, "네일");
  assert.equal(state.publishPurpose, "뷰티 정보");

  let requested;
  Object.assign(context, { BLOG_PERSONAS: [], activePersonaId: "none", executeGeneration: async (p) => { requested = p; } });
  await evaluate("handleGenerateForm", context)({ preventDefault() {} });
  assert.equal(requested.overrideCategory, "뷰티");
  assert.equal(requested.overrideKeywords, "네일");
  assert.equal(requested.overridePurpose, "뷰티 정보");
  assert.equal(requested.overrideTopic, "수정한 주제");

  for (const blogId of ["empty", "legacy", "missing"]) {
    selectAccount(blogId);
    assert.equal(state.category, "");
    assert.equal(state.searchKeywords, "");
    assert.equal(state.publishPurpose, "");
    selectCategory("b-1");
    assert.equal(state.category, "");
  }

  selectAccount("a");
  assert.equal(state.category, "생활");
  assert.equal(state.preferredTone, "합니다체", "Registered legacy tone must not override user tone");
  context.currentAcc = accounts[0];
  const categories = evaluate("registeredCategories", context);
  assert.deepEqual(categories.map((c) => c.id), ["a-1", "a-2", "a-3"]);
  assert.ok(source.includes('id="generation-category"'));
  assert.ok(source.includes("registeredCategories.map"));
  assert.ok(source.includes("handleSelectRegisteredCategory(e.target.value)"));
  console.log("PASS: registered category selection, account isolation, linked fields, generation payload, empty accounts, tone/style/topic preservation");
})().catch((error) => { console.error(error); process.exitCode = 1; });
