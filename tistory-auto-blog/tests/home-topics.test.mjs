import { test } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../utils/tistoryPublish.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
const mod = { exports: {} }
new Function('exports', 'module', 'require', js)(mod.exports, mod, () => ({}))
const { mergeHomeTopics, TISTORY_HOME_TOPICS } = mod.exports

test('real list goes first and defaults that differ only by spacing/punctuation are not duplicated', () => {
  const merged = mergeHomeTopics(['IT·인터넷', '새 주제'])
  assert.equal(merged[0], 'IT·인터넷')
  assert.equal(merged[1], '새 주제')
  assert.equal(merged.filter((name) => name.replace(/[^\p{L}\p{N}]+/gu, '') === 'IT인터넷').length, 1)
  assert.ok(merged.length >= TISTORY_HOME_TOPICS.length)
})

test('without a real list the defaults are returned; junk entries are ignored', () => {
  assert.deepEqual(mergeHomeTopics(null), [...TISTORY_HOME_TOPICS])
  assert.deepEqual(mergeHomeTopics(['', '  ', 5]).length, TISTORY_HOME_TOPICS.length)
})
