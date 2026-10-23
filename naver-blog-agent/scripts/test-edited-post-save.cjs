// 편집 저장 요청 검사: 서버 글(UUID)은 상태를 건드리지 않는 수정 요청, 임시 ID는 null. 네트워크 없음.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const module_ = { exports: {} };
const js = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/lib/editedPostSave.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
new Function('module', 'exports', js)(module_, module_.exports);
const { buildEditedPostPatch } = module_.exports;

const id = '9310d74a-7aee-43e1-9e15-32ba70ad8176';
const patch = buildEditedPostPatch(id, { title: '수정 제목', content: '수정 본문', category: 'AI자동화', tags: ['a', 'b'] });
assert.deepEqual(patch, { id, title: '수정 제목', content: '수정 본문', category_name: 'AI자동화', tags: ['a', 'b'] });
assert.equal('status' in patch, false, '편집 저장이 발행/대기 상태를 되돌리면 안 됨');
assert.equal('publish_visibility' in patch, false);

// 분류가 없으면 분류 키를 보내지 않는다(기존 분류 유지), 태그가 없으면 빈 배열
const noCat = buildEditedPostPatch(id, { title: 't', content: 'c' });
assert.equal('category_name' in noCat, false);
assert.deepEqual(noCat.tags, []);

// 서버에 저장되기 전의 임시 ID·빈 값은 PUT 대상이 아니다
assert.equal(buildEditedPostPatch('post-1791513869817', { title: 't', content: 'c' }), null);
assert.equal(buildEditedPostPatch(null, { title: 't', content: 'c' }), null);
assert.equal(buildEditedPostPatch('', { title: 't', content: 'c' }), null);

console.log('edited post save ok');
