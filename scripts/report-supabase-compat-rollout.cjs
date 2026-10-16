const fs = require('node:fs');
const path = require('node:path');
process.chdir(path.resolve(__dirname, '..'));
const dir = 'docs/supabase-compat-rollout-20261016';
const read = file => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
const releases = read(`${dir}/releases.json`);
const builds = read('.vercel/supabase-compat-builds/results.json');
const local = read('.vercel/supabase-compat-browser/local-new/results.json');
const live = read('.vercel/supabase-compat-browser/live/results.json');
const deployed = read(`${dir}/deployments.json`);
const envs = read(`${dir}/vercel-environment-names.json`);
fs.writeFileSync(`${dir}/environment-summary.json`, JSON.stringify({ checked_projects: envs.length, public_new: envs.filter(x => x.production_public === 'new').map(x => x.project), server_new: envs.filter(x => x.production_server === 'new').map(x => x.project), public_missing: envs.filter(x => x.production_public === 'missing').map(x => x.project), server_missing: envs.filter(x => x.production_server === 'missing').map(x => x.project) }, null, 2) + '\n');
fs.writeFileSync(`${dir}/build-results.json`, JSON.stringify(builds, null, 2) + '\n');
for (const [mode, values] of [['local-new', local], ['live', live]]) fs.writeFileSync(`${dir}/browser-${mode}-results.json`, JSON.stringify(values, null, 2) + '\n');
const counts = { total: releases.length, builds: builds.filter(x => x.ok).length, localChrome: local.filter(x => x.ok).length, deployed: deployed.filter(x => x.ok).length, liveChrome: live.filter(x => x.ok).length };
let doc = '# 전체 DB 연결 호환 전환 — 프로그램별 검수 현황\n\n';
doc += '이 표는 코드·빌드·Vercel 변수 등록·배포·회원 Chrome 검수를 구분합니다. 기존 환경변수/실제 키 삭제는 수행하지 않습니다. 값이 없는 이름 조회 결과만 공개합니다.\n\n';
doc += `총 ${counts.total}곳 / 빌드 통과 ${counts.builds} / 새 이름만 사용한 로컬 Chrome ${counts.localChrome} / 배포 ${counts.deployed} / 운영 Chrome ${counts.liveChrome}.\n\n`;
doc += '| 프로그램 | 이번 코드 버전 | 빌드 | 새 공개/서버 변수 등록 | 로컬 Chrome | 배포 | 운영 Chrome |\n|---|---|---|---|---|---|---|\n';
const status = row => !row ? '대기' : row.ok ? '통과' : '재확인';
for (const r of releases) {
  const e = envs.find(x => x.slug === r.slug);
  const d = deployed.find(x => x.slug === r.slug);
  doc += `| ${r.slug === '.' ? 'AIMaster' : r.slug} | ${r.version || '메인'} | ${status(builds.find(x => x.slug === r.slug))} | ${e?.production_public === 'new' ? '등록' : '미등록'}/${e?.production_server === 'new' ? '등록' : r.slug === 'video-to-gif' ? '불필요' : '미등록'} | ${status(local.find(x => x.slug === r.slug))} | ${d?.ok ? `[READY](${d.url})` : status(d)} | ${status(live.find(x => x.slug === r.slug))} |\n`;
}
doc += '\n새 변수 미등록은 기존 변수로 호환 운영 중이라는 뜻입니다. 실제 새 변수 추가는 별도 승인 후 [구체 목록](environment-addition-plan.json)을 적용하고 다시 배포합니다. 이 표에서 배포 대기를 완료로 해석하지 않습니다.\n';
fs.writeFileSync(`${dir}/STATUS.md`, doc);
console.log(JSON.stringify(counts));
