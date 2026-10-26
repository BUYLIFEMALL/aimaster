// Same packaging contract as naver-blog-agent/smartstore-register: app version -> manifest -> versioned/latest ZIP.
import archiver from 'archiver';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const source = fs.readFileSync(path.join(root, 'src/lib/version.ts'), 'utf8');
const match = /APP_VERSION\s*=\s*['"](v(\d+)\.(\d{2}))['"]/.exec(source);
if (!match) throw new Error('APP_VERSION vX.YY is required');
const manifestPath = path.join(root, 'extension/manifest.json'), manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.version = `${Number(match[2])}.${Number(match[3])}.0`; manifest.version_name = match[1];
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
const downloads = path.join(root, 'public/downloads'); fs.mkdirSync(downloads, { recursive: true });
const versioned = path.join(downloads, `blog-neighbor-care-extension-${match[1]}.zip`);
await new Promise((resolve, reject) => {
  const output = fs.createWriteStream(versioned), archive = archiver('zip', { zlib: { level: 9 } });
  output.on('close', resolve); output.on('error', reject); archive.on('error', reject);
  archive.pipe(output); archive.directory(path.join(root, 'extension'), false); archive.finalize();
});
const latest = path.join(downloads, 'blog-neighbor-care-extension-latest.zip'); fs.copyFileSync(versioned, latest);
console.log(JSON.stringify({ version: match[1], path: path.relative(root, latest), bytes: fs.statSync(latest).size,
  sha256: createHash('sha256').update(fs.readFileSync(latest)).digest('hex'), released: false }));
