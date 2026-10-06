import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const archiver = require("archiver");
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionRoot = path.join(projectRoot, "extension");
const manifestPath = path.join(extensionRoot, "manifest.json");
const downloadsRoot = path.join(projectRoot, "public", "downloads");

// 1) 프로그램 버전 읽기 -> manifest 동기화
const versionSource = fs.readFileSync(path.join(projectRoot, "src", "lib", "version.ts"), "utf8");
const appVersion = versionSource.match(/APP_VERSION\s*=\s*["'](v(\d+)\.(\d{2}))["']/);
if (!appVersion) throw new Error("src/lib/version.ts에서 APP_VERSION(vX.YY)을 찾지 못했습니다.");
const [, versionName, major, minor] = appVersion;

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const chromeVersion = `${Number(major)}.${Number(minor)}.0`;
if (manifest.version !== chromeVersion || manifest.version_name !== versionName) {
  manifest.version = chromeVersion;
  manifest.version_name = versionName;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`manifest.json 동기화 완료 -> version ${chromeVersion}, version_name ${versionName}`);
}

// 2) ZIP 만들기 (이전 버전 ZIP 정리 후 최신 버전 파일 생성)
fs.mkdirSync(downloadsRoot, { recursive: true });
for (const fileName of fs.readdirSync(downloadsRoot)) {
  if (/^naver-blog-agent-extension-v\d+\.\d+\.zip$/.test(fileName)) {
    fs.rmSync(path.join(downloadsRoot, fileName), { force: true });
  }
}

const archivePath = path.join(downloadsRoot, `naver-blog-agent-extension-${versionName}.zip`);
const latestPath = path.join(downloadsRoot, `naver-blog-agent-extension-latest.zip`);

async function createZip(targetFile) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(targetFile);
    const archive = archiver("zip", { zlib: { level: 9 } });
    output.on("close", resolve);
    output.on("error", reject);
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(extensionRoot, false);
    archive.finalize();
  });
}

await createZip(archivePath);
await createZip(latestPath);

console.log(`Created ${path.relative(projectRoot, archivePath)} (${fs.statSync(archivePath).size} bytes)`);
console.log(`Created ${path.relative(projectRoot, latestPath)} (${fs.statSync(latestPath).size} bytes)`);
