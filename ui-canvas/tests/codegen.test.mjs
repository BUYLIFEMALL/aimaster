import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { makeComponent, groupComponents } from "../src/lib/canvas/model.ts";
import { COMPONENT_TYPES } from "../src/lib/canvas/types.ts";
import { generateTsx, componentName } from "../src/lib/canvas/codegen.ts";
import { sanitizeDoc, sanitizeSnippets, MAX_SNIPPETS } from "../src/lib/projects.ts";

function syntaxErrors(code) {
  const out = ts.transpileModule(code, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true, fileName: "Screen.tsx" });
  return (out.diagnostics ?? []).map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"));
}

test("코드 내보내기: 모든 컴포넌트 종류가 문법 오류 없는 TSX가 된다", () => {
  const list = [];
  COMPONENT_TYPES.filter((t) => t !== "Group").forEach((type, i) => {
    list.push(makeComponent(type, { x: 20 + (i % 5) * 220, y: 20 + Math.floor(i / 5) * 120 }, { width: 200, height: 100 }, list));
  });
  const ids = list.slice(0, 2).map((c) => c.id);
  const grouped = groupComponents(list, ids).components;
  const code = generateTsx(grouped, { width: 1440, height: 900 }, { name: "My Landing 화면", dark: false });
  assert.deepEqual(syntaxErrors(code), []);
  assert.match(code, /export default function MyLanding\(\)/);
  assert.match(code, /absolute left-\[\d+px\] top-\[\d+px\] w-\[200px\] h-\[100px\]/);
  assert.match(code, /from "lucide-react"/);
});

test("코드 내보내기: 따옴표·중괄호가 든 글자도 안전하게 들어간다", () => {
  const t = makeComponent("Text", { x: 0, y: 0 }, { width: 100, height: 40 }, []);
  t.props.text = '따옴표 " 와 {중괄호} </div> 포함';
  const code = generateTsx([t], { width: 390, height: 844 }, { name: "", dark: true });
  assert.deepEqual(syntaxErrors(code), []);
  assert.match(code, /CanvasScreen/);
  assert.match(code, /bg-slate-900/);
});

test("컴포넌트 이름: 영문이 없으면 기본 이름", () => {
  assert.equal(componentName("내 화면"), "CanvasScreen");
  assert.equal(componentName("login page v2"), "LoginPageV2");
});

test("저장한 AI 컴포넌트: 빈 코드는 버리고 개수를 제한한다", () => {
  const many = Array.from({ length: MAX_SNIPPETS + 5 }, (_, i) => ({ title: `c${i}`, code: "export default () => null;" }));
  assert.equal(sanitizeSnippets(many).length, MAX_SNIPPETS);
  assert.equal(sanitizeSnippets([{ title: "x", code: "  " }]).length, 0);
  assert.equal(sanitizeSnippets("x").length, 0);
});

test("프로젝트 문서: snippets를 보내지 않으면 문서에 칸이 생기지 않는다(서버가 기존 값을 보존)", () => {
  const base = { components: [], spec: {}, canvas: { width: 800, height: 600 }, dark: false };
  assert.equal(sanitizeDoc(base).snippets, undefined);
  assert.equal(sanitizeDoc({ ...base, snippets: [{ title: "a", code: "x" }] }).snippets.length, 1);
});
