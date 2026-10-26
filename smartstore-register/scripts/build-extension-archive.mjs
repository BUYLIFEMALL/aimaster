// 스마트스토어 상품등록 확장(extension/)을 설정 화면 다운로드용 ZIP(public/downloads/smartstore-register-extension-<버전>.zip)으로 묶는다.
// ai-auto-blog 스크립트와 같은 방식(핵심 원칙 10: 프로그램·확장·ZIP 버전 일치).
// 프로그램 버전(src/lib/version.ts의 APP_VERSION) = 확장 공개 버전(manifest.version_name) = ZIP 파일 버전을 항상 같은 값으로 맞춘다.
import archiver from 'archiver'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const extensionRoot = path.join(projectRoot, 'extension')
const manifestPath = path.join(extensionRoot, 'manifest.json')
const downloadsRoot = path.join(projectRoot, 'public', 'downloads')

// 1) 프로그램 버전 읽기 → manifest 동기화
const versionSource = fs.readFileSync(path.join(projectRoot, 'src', 'lib', 'version.ts'), 'utf8')
const appVersion = versionSource.match(/APP_VERSION\s*=\s*["'](v(\d+)\.(\d{2}))["']/)
if (!appVersion) throw new Error('src/lib/version.ts에서 APP_VERSION(vX.YY)을 찾지 못했습니다.')
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
const archivePath = path.join(downloadsRoot, `smartstore-register-extension-${versionName}.zip`)
fs.mkdirSync(downloadsRoot, { recursive: true })
for (const fileName of fs.readdirSync(downloadsRoot)) {
  if (/^smartstore-register-extension-v\d+\.\d+\.zip$/.test(fileName)) fs.rmSync(path.join(downloadsRoot, fileName), { force: true })
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

const latestPath = path.join(downloadsRoot, `smartstore-register-extension-latest.zip`)
fs.copyFileSync(archivePath, latestPath)
console.log(`Created ${path.relative(projectRoot, archivePath)} (${fs.statSync(archivePath).size} bytes)`)
console.log(`Created ${path.relative(projectRoot, latestPath)} (고정 주소용 최신 사본)`)
