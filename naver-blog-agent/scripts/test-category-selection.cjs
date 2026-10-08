// Test real handlers, shared storage, subscriptions and saving without paid APIs.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.join(__dirname, "../src");
const source = fs.readFileSync(path.join(root, "app/(dashboard)/page.tsx"), "utf8");
const ast = ts.createSourceFile("page.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = new Map();
function visit(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) declarations.set(node.name.text, node.initializer.getText(ast));
  ts.forEachChild(node, visit);
}
visit(ast);
function transpile(code) {
  return ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
}
function evaluate(name, context) {
  assert.ok(declarations.has(name), `Missing implementation: ${name}`);
  return vm.runInNewContext(transpile(`(${declarations.get(name)})`), context);
}
function loadModule(file, imports = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(transpile(fs.readFileSync(path.join(root, file), "utf8")), {
    exports, require: (id) => { assert.ok(id in imports, `Unexpected import: ${id}`); return imports[id]; }, console, ...globals,
  });
  return exports;
}
const types = loadModule("types/collector.ts");
const store = loadModule("lib/contentCategories.ts", { "@/types/collector": types });
const entries = new Map();
const storage = { getItem: (key) => entries.has(key) ? entries.get(key) : null, setItem: (key, value) => entries.set(key, value) };
const names = (items) => Array.from(items, (item) => item.name);
const categories = [
  { id: "custom-ai", name: "사용자 AI 분류", slug: "ai", sort_order: 2 },
  { id: "custom-trip", name: "사용자 여행 분류", slug: "trip", sort_order: 1 },
];

(async () => {
  assert.deepEqual(names(store.readContentCategories(storage)), names(types.DEFAULT_COLLECTOR_CATEGORIES));
  store.writeContentCategories(storage, categories);
  assert.deepEqual(names(store.readContentCategories(storage)), names(categories), "Keep user names and list order");
  store.writeContentCategories(storage, []);
  assert.equal(store.readContentCategories(storage).length, 0, "Do not resurrect deleted categories");
  storage.setItem(store.CONTENT_CATEGORIES_KEY, "broken JSON");
  assert.equal(store.readContentCategories(storage).length, types.DEFAULT_COLLECTOR_CATEGORIES.length);
  assert.equal(storage.getItem(store.CONTENT_CATEGORIES_KEY), "broken JSON", "Do not overwrite on read");
  storage.setItem(store.CONTENT_CATEGORIES_KEY, JSON.stringify([null, {}, ...categories]));
  assert.deepEqual(names(store.readContentCategories(storage)), names(categories));

  const listeners = new Map();
  const browser = {
    localStorage: storage,
    addEventListener: (event, fn) => { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(fn); },
    removeEventListener: (event, fn) => listeners.get(event)?.delete(fn),
    dispatchEvent: (event) => { for (const fn of listeners.get(event.type) || []) fn(event); },
  };
  function mountHook() {
    const states = [], effects = [];
    const react = {
      useState: (value) => { const index = states.length; states.push(value); return [value, (next) => { states[index] = next; }]; },
      useEffect: (effect) => effects.push(effect), useCallback: (fn) => fn,
    };
    const hook = loadModule("hooks/useContentCategories.ts", { react, "@/lib/contentCategories": store }, { window: browser, Event });
    const value = hook.useContentCategories();
    const cleanup = effects.map((effect) => effect());
    return { states, value, unmount: () => cleanup.forEach((fn) => fn()) };
  }
  const screens = [mountHook(), mountHook(), mountHook()];
  screens[0].value.saveCategories(categories);
  for (const screen of screens) {
    assert.deepEqual(names(screen.states[0]), names(categories), "Same-window updates");
    assert.equal(screen.states[1], true);
  }
  store.writeContentCategories(storage, categories.slice(1));
  browser.dispatchEvent({ type: "storage", key: store.CONTENT_CATEGORIES_KEY });
  for (const screen of screens) assert.deepEqual(names(screen.states[0]), names(categories.slice(1)), "Cross-tab updates");
  store.writeContentCategories(storage, categories);
  browser.dispatchEvent({ type: "focus" });
  for (const screen of screens) assert.deepEqual(names(screen.states[0]), names(categories));
  screens.forEach((screen) => screen.unmount());
  for (const callbacks of listeners.values()) assert.equal(callbacks.size, 0, "Listener cleanup");

  const state = { selectedBlogId: "a", category: "old", searchKeywords: "original keywords", publishPurpose: "original purpose", topic: "original topic", preferredTone: "합니다체", writingStyle: "concise" };
  const context = { ...state, registeredCategories: categories, setActivePersonaId() {}, setGeneratingPersonaName() {},
    ...Object.fromEntries(Object.keys(state).map((key) => ["set" + key[0].toUpperCase() + key.slice(1), (value) => { state[key] = value; context[key] = value; }])),
  };
  const selectCategory = evaluate("handleSelectRegisteredCategory", context);
  const selectAccount = evaluate("handleSelectBlogAccount", context);
  selectCategory("custom-trip");
  assert.equal(state.category, categories[1].name);
  assert.equal(state.searchKeywords, "original keywords");
  assert.equal(state.publishPurpose, "original purpose");
  const before = { ...state };
  selectCategory("unknown");
  assert.deepEqual(state, before);
  for (const account of ["b", "empty", "missing"]) {
    selectAccount(account);
    assert.deepEqual(state, { ...before, selectedBlogId: account }, "Blog account must not overwrite classification");
  }
  let requested;
  Object.assign(context, { BLOG_PERSONAS: [], activePersonaId: "none", executeGeneration: async (params) => { requested = params; } });
  await evaluate("handleGenerateForm", context)({ preventDefault() {} });
  assert.equal(requested.overrideCategory, categories[1].name);
  assert.equal(requested.overrideKeywords, "original keywords");
  assert.equal(requested.overridePurpose, "original purpose");
  const persona = { id: "test", name: "test", defaultCategory: "persona default", defaultTopic: "new topic", defaultKeywords: "new keywords", defaultPurpose: "new purpose" };
  context.handleSelectPersona = evaluate("handleSelectPersona", context);
  context.handleSelectPersona(persona);
  assert.equal(state.category, categories[1].name, "Persona preserves content classification");
  await evaluate("handleGenerateWithPersona", context)(persona);
  assert.equal(requested.overrideCategory, categories[1].name);
  assert.equal(state.preferredTone, "합니다체");
  assert.equal(state.writingStyle, "concise");

  let savedRequest;
  Object.assign(context, { window: browser, localStorage: storage, setSavedPostCount() {}, setCurrentPostId() {},
    fetch: async (url, options) => { savedRequest = { url, body: JSON.parse(options.body) }; return { ok: true, json: async () => ({}) }; },
  });
  await evaluate("savePostToStorage", context)("test-draft", { category: requested.overrideCategory, title: "test", content: "test content", tags: [] }, []);
  assert.equal(savedRequest.url, "/api/posts");
  assert.equal(savedRequest.body.category_name, categories[1].name);
  assert.equal(JSON.parse(storage.getItem("nba_saved_posts"))[0].category_name, categories[1].name);
  for (const file of ["app/(dashboard)/page.tsx", "app/(dashboard)/queue/page.tsx", "app/(dashboard)/collector/page.tsx"]) {
    assert.ok(fs.readFileSync(path.join(root, file), "utf8").includes("useContentCategories()"), `${file}: shared list`);
  }
  assert.ok(source.includes("카테고리 선택"));
  assert.ok(source.includes("categories={registeredCategories}"));
  console.log("PASS: shared user categories, order/empty/corrupt storage, same-screen/cross-tab/focus sync, cleanup, account/persona preservation, form/instant generation, draft payload, editor list, 3-screen integration");
})().catch((error) => { console.error(error); process.exitCode = 1; });
