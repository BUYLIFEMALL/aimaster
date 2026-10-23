// 공공데이터 키: 회원 본인 키가 있으면 그 키, 없으면 공용 키(환경변수). VWorld는 키+도메인 짝일 때만 본인 것. 네트워크 없음.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(rel) {
  const filename = path.resolve(__dirname, '..', rel);
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const m = { exports: {} };
  vm.runInThisContext('(function(require,module,exports){' + js + '\n})', { filename })((id) => { if (id === 'server-only') return {}; throw new Error('Unexpected import ' + id); }, m, m.exports);
  return m.exports;
}
const { resolveMemberPublicDataKeys } = load('src/lib/publicdata/memberKeys.ts');
const mk = (rows) => ({ from: () => ({ select: () => ({ eq: () => ({ in: async () => ({ data: rows }) }) }) }) });

(async () => {
  assert.deepEqual(await resolveMemberPublicDataKeys(mk([]), 'u'), { seoul: undefined, dataGoKr: undefined }, '키가 없으면 비어 있어 공용 키를 쓴다');
  const own = await resolveMemberPublicDataKeys(mk([{ provider: 'seoul_opendata_api_key', api_key: 'S' }, { provider: 'data_go_kr_service_key', api_key: 'D' }]), 'u');
  assert.equal(own.seoul, 'S'); assert.equal(own.dataGoKr, 'D'); assert.equal(own.vworld, undefined);
  const onlyKey = await resolveMemberPublicDataKeys(mk([{ provider: 'vworld_api_key', api_key: 'V' }]), 'u');
  assert.equal(onlyKey.vworld, undefined, '도메인 없이 키만 있으면 본인 VWorld 키를 쓰지 않는다');
  const pair = await resolveMemberPublicDataKeys(mk([{ provider: 'vworld_api_key', api_key: 'V' }, { provider: 'vworld_domain', api_key: 'my.example.com' }]), 'u');
  assert.equal(pair.vworld, 'V'); assert.equal(pair.vworldDomain, 'my.example.com');
  const src = fs.readFileSync(path.resolve(__dirname, '../src/lib/publicdata/client.ts'), 'utf8');
  for (const name of ['SEOUL_OPENDATA_API_KEY', 'DATA_GO_KR_SERVICE_KEY', 'VWORLD_API_KEY']) {
    const bad = src.split('\n').filter((l) => l.includes('requireEnv("' + name + '")') && !l.includes('params.keys?.'));
    assert.equal(bad.length, 0, name + ': 본인 키를 먼저 보지 않는 호출이 있음');
  }
  console.log('public keys ok');
})().catch((e) => { console.error(e); process.exit(1); });
