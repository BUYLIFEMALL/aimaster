// Render the real selection button and run its handlers without React or paid APIs.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.join(__dirname, "../src");
const source = fs.readFileSync(path.join(root, "app/(dashboard)/page.tsx"), "utf8");
const ast = ts.createSourceFile("page.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let button, handler;
function visit(node) {
  if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === "button" &&
      node.openingElement.attributes.properties.some((attr) => attr.name?.getText(ast) === "aria-pressed") &&
      node.getText(ast).includes("handleSelectPersona(p)")) button = node;
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "handleSelectPersona") handler = node.initializer;
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(button && handler, "Real persona selection button and handler exist");
const transpile = (code) => ts.transpileModule(code, { compilerOptions: {
  target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React,
} }).outputText;
const personaExports = {};
vm.runInNewContext(transpile(fs.readFileSync(path.join(root, "types/persona.ts"), "utf8")), { exports: personaExports });
const personas = personaExports.BLOG_PERSONAS;
const state = { activePersonaId: personas[0].id };
let selectCount = 0, stopCount = 0;
const select = vm.runInNewContext(transpile(`(${handler.getText(ast)})`), {
  setActivePersonaId: (value) => { state.activePersonaId = value; selectCount++; },
  setTopic: (value) => { state.topic = value; },
  setSearchKeywords: (value) => { state.keywords = value; },
  setPublishPurpose: (value) => { state.purpose = value; },
});
const render = (p, loading = false) => vm.runInNewContext(transpile(`(${button.getText(ast)})`), {
  React: { createElement: (type, props, ...children) => ({ type, props, children }) },
  p, loading, isSelected: state.activePersonaId === p.id, handleSelectPersona: select,
});
for (const persona of personas) {
  const before = render(persona);
  assert.equal(before.type, "button");
  assert.equal(before.props.type, "button", "Selecting conditions must not submit the generation form");
  assert.equal(before.props["aria-pressed"], state.activePersonaId === persona.id);
  assert.ok(before.props.className.includes(state.activePersonaId === persona.id ? "bg-emerald-600" : "bg-blue-600"));
  before.props.onClick({ stopPropagation: () => { stopCount++; } });
  assert.equal(state.activePersonaId, persona.id);
  assert.equal(state.topic, persona.defaultTopic);
  assert.equal(state.keywords, persona.defaultKeywords);
  assert.equal(state.purpose, persona.defaultPurpose);
  for (const candidate of personas) {
    const current = render(candidate);
    const selected = candidate.id === persona.id;
    assert.equal(current.props["aria-pressed"], selected);
    assert.ok(current.props.className.includes(selected ? "bg-emerald-600" : "bg-blue-600"));
    assert.equal(current.children.join(""), selected ? "✓ 선택됨" : "조건 불러오기");
  }
  assert.equal(render(persona, true).props.disabled, true);
}
assert.equal(selectCount, personas.length, "Each button selects exactly once");
assert.equal(stopCount, personas.length, "Prevent parent-card selection from firing twice");
console.log(`PASS: ${personas.length} persona buttons, blue/green transitions, conditions, keyboard-native semantics, loading lock; no paid calls`);
