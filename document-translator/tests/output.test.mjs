import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOutputBreaks } from '../src/lib/translation/outputText.ts';
test('double-escaped generated newlines cannot join a URL to the next sentence; source literals survive',()=>{
  const source='문의: https://example.com/help\n2020년 날짜 보존';
  assert.equal(normalizeOutputBreaks(source,'URL: https://example.com/help\\nKeep 2020.'),'URL: https://example.com/help\nKeep 2020.');
  const code='JSON string "\\n"\nnext line';assert.equal(normalizeOutputBreaks(code,'JSON string "\\n"\nnext line'),code);
  assert.equal(normalizeOutputBreaks('C:\\notes','C:\\notes'),'C:\\notes');
  assert.equal(normalizeOutputBreaks('a\nb','a\nb'),'a\nb');
});
