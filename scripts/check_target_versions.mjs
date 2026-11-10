import fs from 'fs';

const dirs = [
  { id: 'insta_auto_poster', slug: 'auto-instagram-posting', name: 'INSTA 포스팅 자동화', domain: '인스타/SNS' },
  { id: 'kakao_auto_poster', slug: 'kakao-auto-posting', name: '카카오톡 뉴스레터 자동화', domain: 'CRM/메시지' },
  { id: 'stepmail', slug: 'stepmail', name: '대량 메일발송 자동화', domain: '마케팅/이메일' },
  { id: 'tistory-auto-blog', slug: 'tistory-auto-blog', name: '티스토리 포스팅 자동화', domain: '블로그' },
  { id: 'ai-auto-blog', slug: 'ai-auto-blog', name: '블로그 포스팅 자동화', domain: '블로그' },
  { id: 'markdown-studio', slug: 'markdown-studio', name: '마크다운 문서 자동화', domain: '문서/에디터' },
  { id: 'personality-suite', slug: 'personality-suite', name: 'AI 종합 성격 진단 자동화', domain: '심리/바이럴' },
  { id: 'ai-image-studio', slug: 'ai-image-studio', name: 'AI 이미지 스튜디오', domain: '이미지/미디어' },
  { id: 'tarot', slug: 'tarot-reading', name: 'AIMaster 타로점', domain: '운세/엔터' },
  { id: 'youtube-auto-reply', slug: 'youtube-auto-reply', name: '유튜브 댓글자동화', domain: '유튜브/운영' }
];

for (const item of dirs) {
  let v = 'N/A';
  const vFile = `${item.id}/src/lib/version.ts`;
  const pFile = `${item.id}/package.json`;
  if (fs.existsSync(vFile)) {
    const txt = fs.readFileSync(vFile, 'utf8');
    const m = txt.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
    if (m) v = m[1];
  } else if (fs.existsSync(pFile)) {
    const pkg = JSON.parse(fs.readFileSync(pFile, 'utf8'));
    v = pkg.version;
  }
  console.log(`${item.id} (${item.name}): version=${v}`);
}
