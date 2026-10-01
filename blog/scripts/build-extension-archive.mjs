// BLOG 크롬 확장(extension/)을 설정 화면 다운로드용 ZIP(public/downloads/ai-auto-blog-extension-<버전>.zip)으로 묶는다.
// 확장 코드를 고치면 manifest.json의 version/version_name을 올리고 `npm run build:extension`을 실행한 뒤 ZIP도 함께 커밋한다.
// (naver-blog-seo-studio/scripts/build-extension-archive.mjs와 같은 방식)
import archiver from 'archiver'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const extensionRoot = path.join(projectRoot, 'extension')
const downloadsRoot = path.join(projectRoot, 'public', 'downloads')
const manifest = JSON.parse(fs.readFileSync(path.join(extensionRoot, 'manifest.json'), 'utf8'))
const version = String(manifest.version_name ?? `v${manifest.version}`)
const archivePath = path.join(downloadsRoot, `ai-auto-blog-extension-${version}.zip`)

fs.mkdirSync(downloadsRoot, { recursive: true })
for (const fileName of fs.readdirSync(downloadsRoot)) {
  if (/^ai-auto-blog-extension-v\d+\.\d+\.zip$/.test(fileName)) fs.rmSync(path.join(downloadsRoot, fileName), { force: true })
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
