// v2.17 후보(병합 A-3): 사진 후기 방문 정보·근거 있는 FAQ. 가짜 AI 호출로 실제 지시문·근거 검사를 실행(비용 없음).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { test } = require('node:test');
const load = (file, deps = {}) => {
  const m = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('require', 'module', 'exports', js)(n => n in deps ? deps[n] : require(n), m, m.exports);
  return m.exports;
};
const rules = load('privatePhotoRules.ts');
const pr = load('photoReview.ts', { './privatePhotoRules': rules });
const pipe = load('ai/photoReviewPipeline.ts', { 'server-only': {}, '../photoReview': pr, './photoReviewModel': { callPhotoReviewModel: async () => { throw Error('real call'); } } });
const P = '11111111-1111-4111-8111-111111111111';
const base = { engine: { provider: 'openai', model: 'gpt-4o-mini' }, place: '성수 카페', visitNotes: '', preferredTone: '해요체', targetLength: 800, coverId: P, photos: [{ id: P, storagePath: 'u/p.png', caption: '' }] };

test('visit info: empty fields dropped, limits and date format enforced', () => {
  assert.equal(pr.cleanVisitInfo({ kind: '', region: ' ', visitDate: '', companion: '', oneLine: '' }), undefined);
  assert.deepEqual(pr.cleanVisitInfo({ kind: '카페', region: ' 서울 성수동 ', visitDate: '2026-10-20', companion: '', oneLine: '' }), { kind: '카페', region: '서울 성수동', visitDate: '2026-10-20' });
  assert.equal(pr.cleanVisitInfo({ kind: '술집' }), undefined);
  assert.equal(pr.photoReviewInputSchema.safeParse({ ...base, visit: { visitDate: '2026/10/20' } }).success, false);
  assert.equal(pr.photoReviewInputSchema.safeParse({ ...base, visit: { region: '가'.repeat(61) } }).success, false);
  assert.equal(pr.photoReviewInputSchema.safeParse({ ...base, visit: { kind: '여행', oneLine: '좋았어요' }, includeFaq: true }).success, true);
  assert.equal(pr.photoReviewInputSchema.safeParse(base).success, true);
});

async function run(input, draft) {
  const prompts = [];
  const call = async (req) => { prompts.push(req); return prompts.length === 1 ? JSON.stringify({ observations: [{ id: P, visible: '창가 테이블과 커피잔', uncertain: ['맛'] }] }) : JSON.stringify(draft); };
  const result = await pipe.runPhotoReview(input, [], 'k', new AbortController().signal, call);
  return { result, prompts };
}
const draftWith = (evidence) => ({ title: '성수 카페 후기', paragraphs: [{ text: '창가 자리가 넓어요.', evidence }], confirm: ['직접 확인: 주차'] });

test('visit info is sent as member data and allows member-notes evidence even without memo', async () => {
  const input = { ...base, visit: { kind: '카페', region: '서울 성수동', oneLine: '창가가 넓어요' } };
  const { result, prompts } = await run(input, draftWith(['member-notes']));
  assert.match(prompts[1].user, /"visit":\{"kind":"카페","region":"서울 성수동","oneLine":"창가가 넓어요"\}/);
  assert.match(prompts[1].system, /회원이 직접 준 사실/);
  assert.deepEqual(result.visit, input.visit);
  assert.equal(pr.photoReviewResultSchema.safeParse(result).success, true);
});
test('without visit or memo, member-notes evidence is still rejected', async () => {
  await assert.rejects(() => run(base, draftWith(['member-notes'])), /연결되지 않은 근거/);
});
test('FAQ rule appears only when requested and sends unknown questions to confirm', async () => {
  const on = await run({ ...base, includeFaq: true }, draftWith([P]));
  assert.match(on.prompts[1].system, /자주 묻는 질문/); assert.match(on.prompts[1].system, /confirm에 "직접 확인/); assert.match(on.prompts[1].user, /\[필수\] paragraphs의 마지막 항목은 반드시/);
  assert.equal(on.result.includeFaq, true);
  const off = await run(base, draftWith([P]));
  assert.doesNotMatch(off.prompts[1].system, /자주 묻는 질문/); assert.doesNotMatch(off.prompts[1].user, /\[필수\]/); assert.equal(off.result.includeFaq, undefined); assert.equal(off.result.visit, undefined);
});
test('older saved results without visit fields still validate', async () => {
  const { result } = await run(base, draftWith([P]));
  const old = { ...result }; delete old.visit; delete old.includeFaq;
  assert.equal(pr.photoReviewResultSchema.safeParse(old).success, true);
});
test('FAQ omitted by the model is rebuilt only from member visit info; too little info goes to confirm', async () => {
  const visit = { kind: '맛집', region: '서울 성수동', visitDate: '2026-10-20', companion: '친구 1명' };
  const { result } = await run({ ...base, visit, includeFaq: true }, draftWith([P]));
  const last = result.paragraphs.at(-1);
  assert.deepEqual(last.evidence, ['member-notes']);
  assert.match(last.text, /자주 묻는 질문/); assert.match(last.text, /서울 성수동에 있어요/); assert.match(last.text, /2026년 10월 20일/); assert.match(last.text, /친구 1명과 함께/);
  assert.equal(pr.photoReviewResultSchema.safeParse(result).success, true);
  const few = await run({ ...base, visit: { region: '서울' }, includeFaq: true }, draftWith([P]));
  assert.equal(few.result.paragraphs.length, 1); assert.ok(few.result.confirm.some(c => /FAQ/.test(c)));
  const modelFaq = await run({ ...base, visit, includeFaq: true }, { title: 't', paragraphs: [{ text: '본문', evidence: [P] }, { text: '자주 묻는 질문\nQ. 위치? A. 성수', evidence: ['member-notes'] }], confirm: [] });
  assert.equal(modelFaq.result.paragraphs.length, 2);
  assert.equal(pipe.buildVisitFaq(undefined), null);
  assert.match(pipe.buildVisitFaq({ region: '부산', companion: '엄마' }), /엄마와 함께/);
});
