import fs from 'fs';
import path from 'path';

const designMd = fs.readFileSync('DESIGN.md', 'utf8');
const lines = designMd.split('\n');
const programs = [];

for (const line of lines) {
  const match = line.match(/^\|\s*(\d+)\s*\|\s*([^|]+)\|\s*`([^`]+)`/);
  if (match) {
    programs.push({
      no: parseInt(match[1]),
      name: match[2].trim(),
      slug: match[3].trim()
    });
  }
}

console.log('Found programs in DESIGN.md:', programs.length);

const results = [];

for (const p of programs) {
  const candidateDirs = [
    p.slug,
    p.slug.replace(/-/g, '_'),
    p.slug === 'tarot-reading' ? 'tarot' : null,
    p.slug === 'personality-code' ? 'mbti' : null,
    p.slug === 'react-ui-showcase' ? 'react-ui-showcase' : null,
    p.slug === 'auto-threads-posting' ? 'threads' : null,
    p.slug === 'auto-shorts-posting' ? 'shots' : null,
    p.slug === 'auto-instagram-posting' ? 'insta_auto_poster' : null,
    p.slug === 'kakao-auto-posting' ? 'kakao_auto_poster' : null,
    p.slug === 'web-crawler-saas' ? 'web-crawler' : null,
    p.slug === 'music-automation' ? 'music' : null,
    p.slug === 'website-scraper' ? 'ghost-scraper' : null,
    p.slug === 'naver-blog-auto-poster' ? 'naver-blog-auto-poster_app' : null,
    p.slug === 'naver-blog-auto-poster-web' ? 'naver-blog-auto-poster_web' : null
  ].filter(Boolean);

  let targetDir = null;
  for (const d of candidateDirs) {
    if (fs.existsSync(d) && fs.statSync(d).isDirectory()) {
      targetDir = d;
      break;
    }
  }

  if (!targetDir) {
    results.push({ ...p, status: 'DIR_NOT_FOUND', dir: null });
    continue;
  }

  const candidateFiles = [
    path.join(targetDir, 'app/(auth)/login/page.tsx'),
    path.join(targetDir, 'src/app/(auth)/login/page.tsx'),
    path.join(targetDir, 'app/login/page.tsx'),
    path.join(targetDir, 'src/app/login/page.tsx'),
    path.join(targetDir, 'app/auth/auth-form.tsx'),
    path.join(targetDir, 'webapp/src/app/(auth)/login/page.tsx'),
    path.join(targetDir, 'components/LoginModal.tsx'),
    path.join(targetDir, 'src/components/LoginModal.tsx')
  ];

  let loginFile = null;
  for (const f of candidateFiles) {
    if (fs.existsSync(f)) {
      loginFile = f;
      break;
    }
  }

  if (!loginFile) {
    results.push({ ...p, status: 'NO_LOGIN_FILE', dir: targetDir });
    continue;
  }

  const content = fs.readFileSync(loginFile, 'utf8');
  const hasTabs = content.includes('setMode') || (content.includes('로그인') && content.includes('회원가입') && (content.includes('mode ===') || content.includes('tab ===')));
  const hasSubscriptionNotice = content.includes('AIMaster 계정과 구독 권한') || content.includes('구독 권한을 그대로');
  const hasTermsFooter = content.includes('이용약관') && content.includes('개인정보');

  let status = 'UNKNOWN';
  if (hasTabs && hasSubscriptionNotice && hasTermsFooter) {
    status = 'STANDARD_COMPLETE';
  } else if (hasTabs || hasSubscriptionNotice) {
    status = 'PARTIAL_STANDARD';
  } else {
    status = 'NON_STANDARD_CUSTOM';
  }

  results.push({
    ...p,
    dir: targetDir,
    loginFile,
    hasTabs,
    hasSubscriptionNotice,
    hasTermsFooter,
    status
  });
}

const complete = results.filter(r => r.status === 'STANDARD_COMPLETE');
const partial = results.filter(r => r.status === 'PARTIAL_STANDARD');
const nonStandard = results.filter(r => r.status === 'NON_STANDARD_CUSTOM');
const missing = results.filter(r => r.status === 'NO_LOGIN_FILE' || r.status === 'DIR_NOT_FOUND');

console.log('\n========================================');
console.log('📊 AIMaster 83개 프로그램 로그인 레이아웃 감사 결과');
console.log('========================================');
console.log(`✅ 표준 레이아웃 완비 (STANDARD_COMPLETE): ${complete.length}개`);
console.log(`⚠️ 부분 표준 / 일부 누락 (PARTIAL_STANDARD): ${partial.length}개`);
console.log(`❌ 비표준 커스텀 / 구형 폼 (NON_STANDARD_CUSTOM): ${nonStandard.length}개`);
console.log(`🚫 로그인 파일 미발견 / 모달 등 (NO_LOGIN_FILE): ${missing.length}개`);

console.log('\n----------------------------------------');
console.log('✅ 1. 표준 레이아웃 완비 프로그램 (' + complete.length + '개)');
console.log('----------------------------------------');
complete.forEach(r => console.log(`${r.no}. [${r.name}] (${r.dir})`));

console.log('\n----------------------------------------');
console.log('❌ 2. 비표준 커스텀 / 구형 폼 (' + nonStandard.length + '개)');
console.log('----------------------------------------');
nonStandard.forEach(r => console.log(`${r.no}. [${r.name}] (${r.dir}) -> 파일: ${r.loginFile}`));

console.log('\n----------------------------------------');
console.log('⚠️ 3. 부분 표준 / 탭 또는 푸터 누락 (' + partial.length + '개)');
console.log('----------------------------------------');
partial.forEach(r => console.log(`${r.no}. [${r.name}] (${r.dir}) -> 탭:${r.hasTabs}, 안내문:${r.hasSubscriptionNotice}, 약관푸터:${r.hasTermsFooter}`));

console.log('\n----------------------------------------');
console.log('🚫 4. 로그인 파일 미발견 / 검토 필요 (' + missing.length + '개)');
console.log('----------------------------------------');
missing.forEach(r => console.log(`${r.no}. [${r.name}] (${r.dir || r.slug}) [${r.status}]`));
