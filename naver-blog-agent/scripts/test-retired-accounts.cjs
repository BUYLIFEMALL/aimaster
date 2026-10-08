// Read-only fixtures: never touch real browser storage or member data.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.join(__dirname, "../src");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const compile = (code) => ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
const component = read("components/NaverAccountManager.tsx");
const ast = ts.createSourceFile("accounts.tsx", component, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = new Map();
let loadEffect;
function visit(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) declarations.set(node.name.text, node.initializer.getText(ast));
  if (ts.isCallExpression(node) && node.expression.getText(ast) === "useEffect") loadEffect = node.arguments[0].getText(ast);
  ts.forEachChild(node, visit);
}
visit(ast);
assert.equal(ast.parseDiagnostics.length, 0);
const original = [{ id: "a", blog_id: "original", label: "기존 계정", categories: [{ id: "legacy", category_name: "기존 메뉴", search_keywords: "보존", publish_purpose: "기존 목적", preferred_tone: "해요체" }], custom_field: "keep" }];
const storage = new Map([["nba_accounts_local", JSON.stringify(original)], ["nba_collector_categories", '[{"id":"content","name":"공유 분류"}]']]);
let writes = 0;
const state = { accounts: [], newBlogId: "new-blog", newLabel: "새 계정", selectedAccountId: null, editingAccountId: null, editAccountLabel: "수정 이름", editAccountBlogId: "edited-blog" };
const context = { ...state, confirm: () => false, alert: () => { throw Error("Unexpected validation failure"); }, localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => { writes++; storage.set(key, value); } } };
for (const key of Object.keys(state)) context["set" + key[0].toUpperCase() + key.slice(1)] = (value) => { state[key] = value; context[key] = value; };
const fn = (name) => { assert.ok(declarations.has(name), name); return vm.runInNewContext(compile(`(${declarations.get(name)})`), context); };
context.saveToStorage = fn("saveToStorage");
vm.runInNewContext(compile(`(${loadEffect})()`), context);
assert.equal(writes, 0, "Mounting settings must not rewrite existing accounts");
assert.deepEqual(JSON.parse(JSON.stringify(state.accounts)), original);
fn("handleSaveEditAccount")("a");
const saved = JSON.parse(storage.get("nba_accounts_local"));
assert.equal(saved[0].blog_id, "edited-blog");
assert.equal(saved[0].label, "수정 이름");
assert.deepEqual(saved[0].categories, original[0].categories, "Keep legacy category data even though its page is retired");
assert.equal(saved[0].custom_field, "keep");
const beforeCancel = writes;
fn("handleDeleteAccount")("a");
assert.equal(writes, beforeCancel, "Cancelled account removal does not write");
fn("handleAddAccount")({ preventDefault() {} });
assert.equal(JSON.parse(storage.get("nba_accounts_local")).length, 2);
assert.equal(storage.get("nba_collector_categories"), '[{"id":"content","name":"공유 분류"}]');

const redirectSource = read("app/(dashboard)/accounts/page.tsx");
let redirectTarget;
const exportsObject = {};
vm.runInNewContext(compile(redirectSource), { exports: exportsObject, require: (name) => { assert.equal(name, "next/navigation"); return { redirect: (target) => { redirectTarget = target; } }; } });
exportsObject.default();
assert.equal(redirectTarget, "/settings");
assert.equal(exportsObject.dynamic, "force-dynamic");
assert.equal(exportsObject.fetchCache, "force-no-store");
assert.ok(!redirectSource.includes("localStorage"));

for (const file of ["components/layout/Sidebar.tsx", "components/layout/Header.tsx", "app/(dashboard)/page.tsx", "app/(dashboard)/dashboard/page.tsx", "app/(dashboard)/guide/page.tsx", "app/(dashboard)/settings/page.tsx"]) {
  assert.ok(!read(file).includes('"/accounts"'), `No obsolete navigation in ${file}`);
  assert.ok(!read(file).includes("../accounts/page"), "Settings must not import a route");
}
const sidebar = read("components/layout/Sidebar.tsx");
const flow = sidebar.slice(sidebar.indexOf("const flow = ["), sidebar.indexOf("];", sidebar.indexOf("const flow = [")));
assert.equal((flow.match(/href:/g) || []).length, 3);
assert.ok(flow.indexOf('"/collector"') < flow.indexOf('"/queue"'));
assert.ok(read("app/(dashboard)/settings/page.tsx").includes("<NaverAccountManager />"));
console.log("PASS: retired page redirect, 3-step navigation, settings component wiring, account load/edit/add/cancel and legacy/content category preservation");
