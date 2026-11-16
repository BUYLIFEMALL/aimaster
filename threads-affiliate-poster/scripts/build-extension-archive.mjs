// 쇼핑제휴 확장(extension/)을 다운로드용 ZIP(public/downloads/threads-affiliate-poster-extension-<버전>.zip + -latest.zip)으로 묶는다.
// esm-register·ai-auto-blog 스크립트와 같은 규칙(핵심 원칙 10: 프로그램 버전 = manifest.version_name = ZIP 버전).
// 새 패키지를 설치하지 않으려고 압축은 Node 기본 zlib(deflate)로 직접 만든다.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const extensionRoot = path.join(projectRoot, 'extension')
const manifestPath = path.join(extensionRoot, 'manifest.json')
const downloadsRoot = path.join(projectRoot, 'public', 'downloads')
const PREFIX = 'threads-affiliate-poster-extension'

// 1) 프로그램 버전 → manifest 동기화
const versionSource = fs.readFileSync(path.join(projectRoot, 'src', 'lib', 'version.ts'), 'utf8')
const appVersion = versionSource.match(/APP_VERSION\s*=\s*["'](v(\d+)\.(\d{2}))["']/)
if (!appVersion) throw new Error('src/lib/version.ts에서 APP_VERSION(vX.YY)을 찾지 못했습니다.')
const [, versionName, major, minor] = appVersion
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const chromeVersion = `${Number(major)}.${Number(minor)}.0`
if (manifest.version !== chromeVersion || manifest.version_name !== versionName) {
  manifest.version = chromeVersion
  manifest.version_name = versionName
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`manifest.json → version ${chromeVersion}, version_name ${versionName}`)
}

// 2) ZIP 만들기(deflate, 폴더 내용만 — 폴더 자체는 넣지 않음)
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC_TABLE[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
function listFiles(dir, base = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((e) =>
    e.isDirectory() ? listFiles(path.join(dir, e.name), `${base}${e.name}/`) : [{ abs: path.join(dir, e.name), rel: `${base}${e.name}` }])
}
const locals = []; const centrals = []; let offset = 0
for (const f of listFiles(extensionRoot)) {
  const data = fs.readFileSync(f.abs); const comp = zlib.deflateRawSync(data, { level: 9 }); const name = Buffer.from(f.rel, 'utf8'); const crc = crc32(data)
  const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(8, 8)
  lh.writeUInt32LE(0, 10); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28)
  locals.push(lh, name, comp)
  const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(8, 10)
  ch.writeUInt32LE(0, 12); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(name.length, 28)
  ch.writeUInt32LE(offset, 42); centrals.push(ch, name)
  offset += lh.length + name.length + comp.length
}
const central = Buffer.concat(centrals)
const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(centrals.length / 2, 8); end.writeUInt16LE(centrals.length / 2, 10)
end.writeUInt32LE(central.length, 12); end.writeUInt32LE(offset, 16)
const zip = Buffer.concat([...locals, central, end])

fs.mkdirSync(downloadsRoot, { recursive: true })
// 옛 버전별 ZIP은 지우지 않는다(이미 받은 회원·옛 링크 보존, TAP-20261117-03). 지금 버전 ZIP과 latest만 새로 쓴다.
const archivePath = path.join(downloadsRoot, `${PREFIX}-${versionName}.zip`)
fs.writeFileSync(archivePath, zip)
fs.copyFileSync(archivePath, path.join(downloadsRoot, `${PREFIX}-latest.zip`))
console.log(`Created ${path.relative(projectRoot, archivePath)} (${zip.length} bytes) + ${PREFIX}-latest.zip`)
