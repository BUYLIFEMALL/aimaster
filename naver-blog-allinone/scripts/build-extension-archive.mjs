import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const extDir = path.join(projectRoot, 'extension');
const downloadsDir = path.join(projectRoot, 'public', 'downloads');
const manifestPath = path.join(extDir, 'manifest.json');

// 1) APP_VERSION 읽기 및 manifest.json 동기화
const versionSource = fs.readFileSync(path.join(projectRoot, 'src', 'lib', 'version.ts'), 'utf8');
const appVersion = versionSource.match(/APP_VERSION\s*=\s*["'](v(\d+)\.(\d{2}))["']/);
if (!appVersion) throw new Error('src/lib/version.ts에서 APP_VERSION(vX.YY)을 찾지 못했습니다.');
const [, versionName, major, minor] = appVersion;

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const chromeVersion = `${Number(major)}.${Number(minor)}.0`;
if (manifest.version !== chromeVersion || manifest.version_name !== versionName) {
  manifest.version = chromeVersion;
  manifest.version_name = versionName;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`manifest.json 동기화: ${chromeVersion} (${versionName})`);
}

// 2) ZIP 패키징
if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });
const latestZip = path.join(downloadsDir, 'naver-blog-allinone-latest.zip');
const versionZip = path.join(downloadsDir, `naver-blog-allinone-${versionName}.zip`);

try {
  if (process.platform === 'win32') {
    if (fs.existsSync(latestZip)) fs.unlinkSync(latestZip);
    if (fs.existsSync(versionZip)) fs.unlinkSync(versionZip);
    const psCommand = `Compress-Archive -Path "${extDir}\\*" -DestinationPath "${latestZip}" -CompressionLevel Optimal -Force`;
    execSync(`powershell -NoProfile -Command "${psCommand}"`, { stdio: 'inherit' });
    fs.copyFileSync(latestZip, versionZip);
    console.log(`최신 확장 ZIP 생성 완료: ${latestZip} (${fs.statSync(latestZip).size} bytes)`);
  } else {
    // Linux/Vercel 환경
    try {
      execSync(`cd "${extDir}" && zip -r -9 "${latestZip}" .`, { stdio: 'inherit' });
      fs.copyFileSync(latestZip, versionZip);
      console.log(`Linux zip 생성 완료: ${latestZip} (${fs.statSync(latestZip).size} bytes)`);
    } catch {
      if (fs.existsSync(latestZip)) {
        console.log(`사전 패키징된 최신 ZIP 유지: ${latestZip} (${fs.statSync(latestZip).size} bytes)`);
        if (!fs.existsSync(versionZip)) fs.copyFileSync(latestZip, versionZip);
      }
    }
  }
} catch (e) {
  console.warn('ZIP 생성 경고 (기존 파일 유지):', e.message);
}
