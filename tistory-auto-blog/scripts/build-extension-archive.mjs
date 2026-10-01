// BLOG 크롬 확장(extension/)을 설정 화면 다운로드용 ZIP(public/downloads/tistory-auto-blog-extension-<버전>.zip)으로 묶는다.
// 2026-10-01 주인님 지시("SEO 블로그 방식대로 — 프로그램 업데이트 때 확장도 같이 업데이트하고 최신 ZIP으로 항상 동기화"):
// 프로그램 버전(utils/version.ts의 APP_VERSION) = 확장 공개 버전(manifest.version_name) = ZIP 파일 버전을 항상 같은 값으로 맞춘다.
// SEO 스튜디오는 사람이 매번 맞추지만, 여기서는 빠뜨리지 않게 package.json "prebuild"로 `npm run build`(로컬·Vercel) 때마다 자동 실행한다.
import archiver from 'archiver'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const extensionRoot = path.join(projectRoot, 'extension')
const manifestPath = path.join(extensionRoot, 'manifest.json')
const downloadsRoot = path.join(projectRoot, 'public', 'downloads')

// 1) 프로그램 버전 읽기 → manifest 동기화
const versionSource = fs.readFileSync(path.join(projectRoot, 'utils', 'version.ts'), 'utf8')
const appVersion = versionSource.match(/APP_VERSION\s*=\s*["'](v(\d+)\.(\d{2}))["']/)
if (!appVersion) throw new Error('utils/version.ts에서 APP_VERSION(vX.YY)을 찾지 못했습니다.')
const [, versionName, major, minor] = appVersion
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
// Chrome의 version은 숫자만(앞자리 0 불가) — v1.19 → "1.19.0". 회원에게 보이는 값은 version_name.
const chromeVersion = `${Number(major)}.${Number(minor)}.0`
if (manifest.version !== chromeVersion || manifest.version_name !== versionName) {
  manifest.version = chromeVersion
  manifest.version_name = versionName
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`manifest.json → version ${chromeVersion}, version_name ${versionName}`)
}

// 2) ZIP 만들기(이전 버전 ZIP은 지운다 — 항상 최신 하나만 내려받게)
const archivePath = path.join(downloadsRoot, `tistory-auto-blog-extension-${versionName}.zip`)
fs.mkdirSync(downloadsRoot, { recursive: true })
for (const fileName of fs.readdirSync(downloadsRoot)) {
  if (/^tistory-auto-blog-extension-v\d+\.\d+\.zip$/.test(fileName)) fs.rmSync(path.join(downloadsRoot, fileName), { force: true })
}

await new Promise((resolve, reject) => {
  const output = fs.createWriteStream(archivePath)
  const archive = archiver('zip', { zlib: { level: 9 } })
  output.on('close', resolve)
  output.on('error', reject)
  archive.on('error', reject)
  archive.pipe(output)
  archive.directory(extensionRoot, false)
  archive.finalize()
})

console.log(`Created ${path.relative(projectRoot, archivePath)} (${fs.statSync(archivePath).size} bytes)`)
