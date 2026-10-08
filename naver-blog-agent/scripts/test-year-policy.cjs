// 연도 정책 검사: 올해(생성 시점) 기준, 본문은 과거 사실 보존. 유료 호출 없음.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const module_ = { exports: {} };
const js = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/lib/yearPolicy.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
new Function('module', 'exports', js)(module_, module_.exports);
const { sanitizeYear, sanitizeBodyYear } = module_.exports;

// 짧은 문구: 과거 연도는 모두 올해로, 올해·미래·오래된 연도·긴 숫자는 그대로
assert.equal(sanitizeYear('2024년 지원금 총정리', 2026), '2026년 지원금 총정리');
assert.equal(sanitizeYear('2023 정리', 2026), '2026 정리');
assert.equal(sanitizeYear('2026년 2027년 2019년', 2026), '2026년 2027년 2019년');
assert.equal(sanitizeYear('코드 20245 번호', 2026), '코드 20245 번호');
assert.equal(sanitizeYear(null, 2026), '');
// 해가 바뀌어도 동작(하드코딩 2025 상한 없음)
assert.equal(sanitizeYear('2026년 정리', 2027), '2027년 정리');

// 본문: 최신 정보 표기는 올해로
assert.equal(sanitizeBodyYear('2024년 기준 신청 방법입니다.', 2026), '2026년 기준 신청 방법입니다.');
assert.equal(sanitizeBodyYear('2023년 지원 혜택을 안내합니다.', 2026), '2026년 지원 혜택을 안내합니다.');
// 본문: 실제 과거 사실은 보존
assert.equal(sanitizeBodyYear('이 제도는 2022년에 시행됐습니다.', 2026), '이 제도는 2022년에 시행됐습니다.');
assert.equal(sanitizeBodyYear('2020~2022년 사이에 크게 변했습니다.', 2026), '2020~2022년 사이에 크게 변했습니다.');
assert.equal(sanitizeBodyYear('2020년부터 2022년까지 이어졌습니다.', 2026), '2020년부터 2022년까지 이어졌습니다.');
assert.equal(sanitizeBodyYear('지난 2023년에는 가격이 올랐습니다.', 2026), '지난 2023년에는 가격이 올랐습니다.');
assert.equal(sanitizeBodyYear('2025년 5월 출시된 제품입니다.', 2026), '2025년 5월 출시된 제품입니다.');
// 문장 단위: 앞 문장의 과거 표현이 뒤 문장에 번지지 않는다
assert.equal(sanitizeBodyYear('2022년에 시행됐습니다. 2024년 기준 신청 방법입니다.', 2026), '2022년에 시행됐습니다. 2026년 기준 신청 방법입니다.');
console.log('year policy ok');
