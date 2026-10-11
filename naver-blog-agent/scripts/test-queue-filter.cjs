// Execute the queue page's real useMemo callback, including category filtering.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const test = require('node:test');
const file = 'naver-blog-agent/src/app/(dashboard)/queue/page.tsx';
const source = process.argv[2]
  ? require('node:child_process').execFileSync('git', ['show', `${process.argv[2]}:${file}`], {encoding: 'utf8'})
  : fs.readFileSync(path.join(__dirname, '../src/app/(dashboard)/queue/page.tsx'), 'utf8');
const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let callback;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'filteredPosts') {
    callback = node.initializer.arguments[0].getText(ast);
  }
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(callback, 'queue filter callback exists');
const js = ts.transpileModule(`module.exports = ${callback};`, {compilerOptions: {target: ts.ScriptTarget.ES2022}}).outputText;
const posts = [
  {id: 'queued-a', status: 'queued', category_name: 'A'},
  {id: 'live-a', status: 'publishing', category_name: 'A', execution: {expired: false}},
  {id: 'expired-b', status: 'publishing', category_name: 'B', execution: {expired: true}},
  {id: 'ready', status: 'prepared', category_name: 'A'},
  {id: 'draft', status: 'draft'},
  {id: 'failed', status: 'failed', category_name: 'old'},
  {id: 'published', status: 'published', category_name: 'B'},
];
function filter(filterStatus, filterCategory = 'all') {
  const module = {exports: {}};
  vm.runInNewContext(js, {module, posts, filterStatus, filterCategory, categoryNames: ['A', 'B']});
  return Array.from(module.exports(), post => post.id);
}
test('pending card shows queued, live and expired running rows so recovery stays visible', () => {
  assert.deepEqual(filter('queued'), ['queued-a', 'live-a', 'expired-b']);
});
test('pending status and category filters still apply together', () => {
  assert.deepEqual(filter('queued', 'A'), ['queued-a', 'live-a']);
  assert.deepEqual(filter('queued', 'B'), ['expired-b']);
  assert.deepEqual(filter('queued', '__uncategorized__'), []);
});
test('other status and uncategorized filters keep their original results', () => {
  assert.deepEqual(filter('prepared'), ['ready']);
  assert.deepEqual(filter('draft'), ['draft']);
  assert.deepEqual(filter('all', '__uncategorized__'), ['draft', 'failed']);
  assert.deepEqual(filter('all'), posts.map(post => post.id));
});
