import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash, randomUUID, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createReaderMemberHandler, createReaderExtensionHandler } from '../src/lib/reader/api.ts';
import { createNeighborHandler } from '../src/lib/neighbors/api.ts';
const container = execFileSync('docker', ['run', '--pull', 'never', '--rm', '-d', '--network', 'none',
  '--label', 'aimaster.bnc-reader-test=true', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17-alpine'], { encoding: 'utf8' }).trim();
if (!/^[a-f0-9]{64}$/.test(container)) throw new Error('Unexpected container identifier');
const args = ['exec', '-i', container, 'psql', '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres'];
const q = s => `'${String(s).replaceAll("'", "''")}'`, j = x => `${q(JSON.stringify(x))}::jsonb`;
const hash = s => createHash('sha256').update(s).digest('hex');
const secret = () => randomBytes(32).toString('hex');
const tests = [];
function sql(text, role = 'postgres', user) {
  return execFileSync('docker', args, { input: `${role === 'postgres' ? '' : `set role ${role};`}${user ? `select set_config('request.jwt.claim.sub',${q(user)},false);` : ''}${text}`,
    encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}
function asyncSql(text) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }); let out = '', err = '';
    child.stdout.on('data', x => { out += x; }); child.stderr.on('data', x => { err += x; }); child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(out.trim()) : reject(new Error(err))); child.stdin.end(text);
  });
}
const parse = text => JSON.parse(text.split('\n').filter(Boolean).at(-1));
const rpcSql = (user, op, p = {}) => `select public.bnc_reader_dispatch(${user ? `${q(user)}::uuid` : 'null'},${q(op)},${j(p)});`;
const rpc = (user, op, p = {}) => parse(sql(rpcSql(user, op, p), 'service_role'));
async function check(name, fn) { await fn(); tests.push(name); console.log(`ok ${tests.length} - ${name}`); }
function member() { const id = randomUUID(); sql(`insert into auth.users(id) values(${q(id)});`); return id; }
function pairing(user, blog = 'my-blog') { const code = secret(); rpc(user, 'pair_issue', { code_hash: hash(code), blog_id: blog }); return code; }
function connect(user, code = pairing(user)) { return rpc(user, 'pair_connect', { code_hash: hash(code), token_hash: hash(secret()), device_name: 'Fixture Edge' }); }
const prepare = (user, device, id = randomUUID(), post = '123') => rpc(user, 'prepare', { device_id: device.deviceId, request_id: id, blog_id: device.blogId, post_id: post });
const submit = (user, device, request, patch = {}) => rpc(user, 'submit', { device_id: device.deviceId, request_id: request.requestId,
  blog_id: device.blogId, post_id: request.postId, title: '가상 제목', body: '가상 본문', ...patch });
let version = '', migrationName = '';
try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    const logs = execFileSync('docker', ['logs', container], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    if (logs.includes('init process complete')) { try { sql('select 1;'); ready = true; break; } catch {} }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  if (!ready) throw new Error('Local PostgreSQL startup failed');
  version = sql('select version();');
  sql(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to anon,authenticated,service_role;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;`);
  sql(readFileSync(new URL('../../supabase/migrations/0039_member_integrations.sql', import.meta.url), 'utf8'));
  const files = readdirSync(new URL('../supabase/migrations/', import.meta.url)).filter(x => x.endsWith('_bnc_reader_connection.sql'));
  assert.equal(files.length, 1); migrationName = files[0];
  sql(readFileSync(new URL(`../supabase/migrations/${migrationName}`, import.meta.url), 'utf8'));
  sql(readFileSync(new URL('../supabase/migrations/20261026103202_bnc_server_queue.sql', import.meta.url), 'utf8'));
  const owner = member(), other = member(), code = pairing(owner);
  await check('RDB01 신규4표RLS·안전한RPC권한', () => {
    assert.equal(sql("select count(*) from pg_class where relnamespace='public'::regnamespace and relname like 'bnc_reader_%' and relkind='r' and relrowsecurity;"), '4');
    assert.equal(sql("select prosecdef from pg_proc where oid='public.bnc_reader_dispatch(uuid,text,jsonb)'::regprocedure;"), 'f');
    for (const role of ['anon', 'authenticated']) assert.throws(() => sql(rpcSql(owner, 'devices'), role, owner), /permission denied/);
  });
  let device;
  await check('RDB02 같은연결번호40개동시요청중성공1건', async () => {
    const outcomes = await Promise.allSettled(Array.from({ length: 40 }, () => asyncSql(`set role service_role;${rpcSql(owner, 'pair_connect', { code_hash: hash(code), token_hash: hash(secret()), device_name: 'Concurrent fixture' })}`)));
    assert.equal(outcomes.filter(x => x.status === 'fulfilled').length, 1);
    device = parse(outcomes.find(x => x.status === 'fulfilled').value);
    assert.equal(sql(`select count(*) from public.bnc_reader_devices where user_id=${q(owner)};`), '1');
  });
  await check('RDB03 공용계정은본인/읽기전용·OAuth토큰/소유검증을위조하지않음', () => {
    const row = parse(sql(`select jsonb_build_object('user',user_id,'token',access_token,'method',auth_method,'extra',extra) from public.member_platform_accounts where user_id=${q(owner)};`));
    assert.equal(row.user, owner); assert.equal(row.token, ''); assert.equal(row.method, 'browser_read'); assert.equal(row.extra.naver_session_verified, false);
  });
  await check('RDB17 관계조회 SQL은 회원·본인계정·대상으로 분리되고 RLS도 타회원 관계를 숨김', () => {
    const otherCode = pairing(other, 'other-blog'), otherDevice = connect(other, otherCode);
    const ownAccount = sql(`select account_id from public.bnc_reader_devices where id=${q(device.deviceId)};`);
    const otherAccount = sql(`select account_id from public.bnc_reader_devices where id=${q(otherDevice.deviceId)};`);
    sql(`insert into public.bnc_settings(user_id) values(${q(owner)}),(${q(other)});
      insert into public.bnc_neighbors values(${q(owner)},${q(ownAccount)},'same-target','pending',now()),
        (${q(other)},${q(otherAccount)},'same-target','mutual',now());`);
    const scoped = sql(`select n.state from public.bnc_neighbors n join public.member_platform_accounts a on a.id=n.account_id
      where n.user_id=${q(owner)} and a.user_id=${q(owner)} and a.platform='naver_blog' and a.external_id='my-blog'
        and not a.needs_reconnect and n.neighbor_id in ('same-target');`, 'service_role');
    assert.equal(scoped, 'pending');
    assert.equal(sql(`select count(*) from public.bnc_neighbors where user_id=${q(other)};`, 'authenticated', owner).split('\n').at(-1), '0');
    assert.equal(sql(`select count(*) from public.bnc_neighbors n join public.member_platform_accounts a on a.id=n.account_id
      where n.user_id=${q(owner)} and a.user_id=${q(owner)} and a.external_id='other-blog';`, 'service_role'), '0');
    sql(`delete from public.bnc_neighbors; delete from public.bnc_reader_devices where id=${q(otherDevice.deviceId)};`);
  });
  await check('RDB18 이웃조회HTTP→실제SQL 회원계정분리·50개커서·타계정거절', async () => {
    const accountId=sql(`select account_id from public.bnc_reader_devices where id=${q(device.deviceId)};`);
    sql(`insert into public.bnc_neighbors select ${q(owner)},${q(accountId)},'page-'||lpad(i::text,3,'0'),'mutual',now() from generate_series(1,55) i;`);
    const getAccount=(user,id)=>parse(sql(`select coalesce((select jsonb_build_object('id',id,'blogId',external_id) from public.member_platform_accounts
      where user_id=${q(user)} and id=${q(id)} and platform='naver_blog' and not needs_reconnect),'null'::jsonb);`,'service_role'));
    const handler=createNeighborHandler(async()=>({allowed:true,userId:owner}),{
      accounts:async()=>[],account:async(user,id)=>getAccount(user,id),
      rows:async(user,id,cursor)=>parse(sql(`select coalesce(jsonb_agg(t),'[]'::jsonb) from (select neighbor_id,state,verified_at from public.bnc_neighbors
        where user_id=${q(user)} and account_id=${q(id)} ${cursor?`and neighbor_id>${q(cursor)}`:''} order by neighbor_id limit 51) t;`,'service_role')),
    });
    const send=body=>handler(new Request('https://local.fixture/api/neighbors',{method:'POST',headers:{origin:'https://local.fixture','content-type':'application/json'},body:JSON.stringify(body)}));
    const first=await(await send({operation:'list',accountId})).json();assert.equal(first.data.records.length,50);assert.equal(first.data.nextCursor,'page-050');
    const second=await(await send({operation:'list',accountId,cursor:first.data.nextCursor})).json();assert.equal(second.data.records.length,5);assert.equal(second.data.nextCursor,null);
    assert.equal((await send({operation:'list',accountId:randomUUID()})).status,404);
    sql(`delete from public.bnc_neighbors where user_id=${q(owner)};`);
  });
  await check('RDB04 소비된번호/타회원번호교환/만료번호재사용차단', () => {
    assert.throws(() => connect(owner, code), /BNC_PAIR_INVALID/);
    const pending = pairing(other); assert.throws(() => connect(owner, pending), /BNC_PAIR_INVALID/);
    sql(`update public.bnc_reader_pairings set expires_at=now()-interval '1 second' where user_id=${q(other)};`);
    assert.throws(() => connect(other, pending), /BNC_PAIR_INVALID/);
  });
  let request;
  await check('RDB05 다른블로그/타회원기기읽기차단', () => {
    assert.throws(() => prepare(owner, { ...device, blogId: 'other-blog' }), /BNC_READER_WRONG_BLOG/);
    assert.throws(() => prepare(other, device), /BNC_READER_DISCONNECTED/);
    request = prepare(owner, device);
  });
  await check('RDB06 준비요청동일ID재조회·중복선점/다른글재사용차단', () => {
    assert.equal(prepare(owner, device, request.requestId).requestId, request.requestId);
    assert.throws(() => prepare(owner, device), /BNC_READER_PENDING/);
    assert.throws(() => prepare(owner, device, request.requestId, '999'), /BNC_READER_WRONG_POST/);
  });
  await check('RDB07 읽은내용다른글/타회원전송차단', () => {
    assert.throws(() => submit(owner, device, request, { post_id: '999' }), /BNC_READER_WRONG_POST/);
    assert.throws(() => submit(other, device, request), /BNC_READER_DISCONNECTED/);
  });
  await check('RDB08 정상전송·같은요청재전송은한건·수명보존/변경거절', () => {
    const first = submit(owner, device, request), again = submit(owner, device, request);
    assert.equal(first.state, 'completed'); assert.equal(first.expiresAt, again.expiresAt);
    assert.equal(sql(`select count(*) from public.bnc_reader_materials where user_id=${q(owner)};`), '1');
    assert.throws(() => submit(owner, device, request, { body: '수정 내용' }), /BNC_READER_CONTENT_CHANGED/);
    assert.equal(rpc(owner, 'status', { device_id: device.deviceId, request_id: request.requestId }).state, 'completed');
  });
  await check('RDB09 회원은본인유효자료만조회/직접쓰기·토큰조회불가', () => {
    assert.equal(sql('select count(*) from public.bnc_reader_materials;', 'authenticated', owner).split('\n').at(-1), '1');
    assert.equal(sql('select count(*) from public.bnc_reader_materials;', 'authenticated', other).split('\n').at(-1), '0');
    for (const text of ['select * from public.bnc_reader_devices;', 'select * from public.bnc_reader_pairings;', "update public.bnc_reader_materials set body='changed';"]) assert.throws(() => sql(text, 'authenticated', owner), /permission denied/);
  });
  await check('RDB10 기기해제즉시차단/받은본문보존', () => {
    assert.throws(() => rpc(other, 'revoke', { device_id: device.deviceId }), /BNC_NOT_FOUND/);
    rpc(owner, 'revoke', { device_id: device.deviceId });
    assert.throws(() => rpc(owner, 'whoami', { device_id: device.deviceId }), /BNC_READER_DISCONNECTED/);
    assert.equal(rpc(owner, 'material', { id: request.requestId }).body, '가상 본문');
  });
  const user2 = member(), d2 = connect(user2);
  await check('RDB11 요청만료후재전송차단/명시적새읽기만가능', () => {
    const expired = prepare(user2, d2);
    sql(`update public.bnc_reader_requests set valid_until=now()-interval '1 second' where id=${q(expired.requestId)};`);
    assert.throws(() => submit(user2, d2, expired), /BNC_READER_EXPIRED/);
    assert.equal(prepare(user2, d2).state, 'pending');
  });
  await check('RDB12 공용계정삭제로읽기차단/기존본문보존', () => {
    sql(`delete from public.member_platform_accounts where user_id=${q(owner)};`);
    assert.equal(rpc(owner, 'material', { id: request.requestId }).body, '가상 본문');
    sql(`delete from public.member_platform_accounts where user_id=${q(user2)};`);
    assert.throws(() => rpc(user2, 'whoami', { device_id: d2.deviceId }), /BNC_ACCOUNT_REQUIRED/);
  });
  await check('RDB13 30일만료조회/재사용차단·정리본문삭제', () => {
    sql(`update public.bnc_reader_materials set created_at=now()-interval '721 hours',expires_at=now()-interval '1 hour' where user_id=${q(owner)};
      update public.bnc_reader_requests set expires_at=now()-interval '1 hour' where user_id=${q(owner)};`);
    assert.equal(sql('select count(*) from public.bnc_reader_materials;', 'authenticated', owner).split('\n').at(-1), '0');
    assert.throws(() => rpc(owner, 'material', { id: request.requestId }), /BNC_NOT_FOUND/);
    assert.ok(rpc(null, 'cleanup').expiredRequestsRemoved >= 1);
    assert.equal(sql(`select count(*) from public.bnc_reader_materials where user_id=${q(owner)};`), '0');
  });
  await check('RDB14 HTTP핸들러→실제SQL 연결/읽기/전송/회원재조회', async () => {
    const user = member();
    const deps = { member: async () => ({ allowed: true, userId: user }), user: async id => ({ allowed: true, userId: id }),
      pairingOwner: async hash => sql(`select user_id from public.bnc_reader_pairings where code_hash=${q(hash)};`) || null,
      device: async hash => {
        const raw = sql(`select jsonb_build_object('userId',user_id,'deviceId',id) from public.bnc_reader_devices where token_hash=${q(hash)};`);
        return raw ? parse(raw) : null;
      }, rpc: async (u, op, p) => ({ data: rpc(u, op, p), error: null }) };
    const mh = createReaderMemberHandler(deps), eh = createReaderExtensionHandler(deps);
    const call = async (handler, operation, payload, token) => {
      const r = await handler(new Request('https://fixture.test/api/reader', { method: 'POST', headers: {
        origin: token === undefined ? 'https://fixture.test' : `chrome-extension://${'a'.repeat(32)}`, 'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      }, body: JSON.stringify({ operation, payload }) }));
      assert.equal(r.status, 200, await r.clone().text()); return r.json();
    };
    const issued = await call(mh, 'pair', { blog_id: 'fixture-blog', owner_confirmed: true });
    const paired = await call(eh, 'connect', { code: issued.code, device_name: 'Integration fixture', protocol: 1 }, '');
    const id = randomUUID();
    await call(eh, 'prepare', { request_id: id, url: 'https://blog.naver.com/fixture-blog/987' }, paired.token);
    const receipt = await call(eh, 'submit', { request_id: id, snapshot: { url: 'https://blog.naver.com/fixture-blog/987',
      title: '통합 가상 제목', body: '통합 가상 본문', format: 'naver-visible-text-v1' } }, paired.token);
    assert.equal(receipt.data.state, 'completed');
    const material = await call(mh, 'material', { id }); assert.equal(material.data.body, '통합 가상 본문');
    assert.equal(material.canAutoEngage, false);
  });
  await check('RDB15 다른기기/다른요청도같은자료는한건·수정본도원래수명', async () => {
    const user = member(), firstDevice = connect(user), secondDevice = connect(user);
    const firstRequest = prepare(user, firstDevice), secondRequest = prepare(user, secondDevice);
    const outcomes = await Promise.all([firstDevice, secondDevice].map((d, i) => asyncSql(`set role service_role;${rpcSql(user, 'submit', {
      device_id: d.deviceId, request_id: [firstRequest, secondRequest][i].requestId, blog_id: d.blogId, post_id: '123', title: '같은제목', body: '같은본문',
    })}`)));
    const [one, two] = outcomes.map(parse); assert.equal(one.materialId, two.materialId);
    assert.equal(sql(`select count(*) from public.bnc_reader_materials where user_id=${q(user)};`), '1');
    sql(`update public.bnc_reader_materials set created_at=created_at-interval '48 hours',expires_at=expires_at-interval '48 hours' where user_id=${q(user)};`);
    const originalExpiry = rpc(user, 'material', { id: one.materialId }).expires_at;
    const changed = prepare(user, firstDevice);
    const receipt = submit(user, firstDevice, changed, { title: '같은제목', body: '실제로수정된본문' });
    assert.equal(Date.parse(receipt.expiresAt), Date.parse(originalExpiry));
    assert.equal(sql(`select count(distinct expires_at) from public.bnc_reader_materials where user_id=${q(user)};`), '1');
  });
  await check('RDB16 번호발급간격·기기5개상한·기기만료/공용재연결요구', () => {
    const user = member(), pending = pairing(user);
    assert.throws(() => pairing(user), /BNC_READER_RATE_LIMIT/);
    const d = connect(user, pending);
    for (let i = 0; i < 4; i++) connect(user);
    assert.throws(() => connect(user), /BNC_READER_DEVICE_LIMIT/);
    sql(`update public.bnc_reader_devices set expires_at=now()-interval '1 second' where id=${q(d.deviceId)};`);
    assert.throws(() => rpc(user, 'whoami', { device_id: d.deviceId }), /BNC_READER_DISCONNECTED/);
    const active = rpc(user, 'devices').find(x => x.id !== d.deviceId);
    sql(`update public.member_platform_accounts set needs_reconnect=true where user_id=${q(user)};`);
    assert.throws(() => rpc(user, 'whoami', { device_id: active.id }), /BNC_ACCOUNT_REQUIRED/);
  });
} finally {
  const removed = execFileSync('docker', ['rm', '-f', container], { encoding: 'utf8' }).trim();
  mkdirSync(new URL('../docs/evidence/', import.meta.url), { recursive: true });
  writeFileSync(new URL('../docs/evidence/reader-database-20261027.json', import.meta.url), JSON.stringify({
    checkedAt: new Date().toISOString(), tests, passed: tests.length, expected: 18, version, migration: migrationName,
    additionalMigration: '20261026103202_bnc_server_queue.sql',
    operatingDatabaseChanged: false, realCredentialsUsed: false, containerStopped: removed === container,
    fixture: 'Local PostgreSQL, network none, no published ports, real independent connections',
  }, null, 2)+'\n');
}
assert.equal(tests.length, 18);
