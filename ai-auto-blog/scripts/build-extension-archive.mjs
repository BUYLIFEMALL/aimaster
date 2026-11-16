// BLOG 크롬 확장(extension/)을 설정 화면 다운로드용 ZIP(public/downloads/ai-auto-blog-extension-<버전>.zip)으로 묶는다.
// 2026-10-01 주인님 지시("SEO 블로그 방식대로 — 프로그램 업데이트 때 확장도 같이 업데이트하고 최신 ZIP으로 항상 동기화"):
// 프로그램 버전(utils/version.ts의 APP_VERSION) = 확장 공개 버전(manifest.version_name) = ZIP 파일 버전을 항상 같은 값으로 맞춘다.
// SEO 스튜디오는 사람이 매번 맞추지만, 여기서는 빠뜨리지 않게 package.json "prebuild"로 `npm run build`(로컬·Vercel) 때마다 자동 실행한다.
import archiver from 'archiver'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const extensionRoot = path.join(projectRoot, 'extension')
const manifestPath = path.join(extensionRoot, 'manifest.json')
const downloadsRoot = path.join(projectRoot, 'public', 'downloads')

// prebuild는 Next.js보다 먼저 node로 따로 실행돼 .env.local을 읽지 못한다(내 PC 빌드·패키지 설치마법사 7단계).
// 이미 있는 환경변수(Vercel 빌드 등)는 그대로 두고, 없는 값만 .env.local → .env 순서로 채운다(2026-11-16 키트 새 폴더 빌드에서 발견).
for (const name of ['.env.local', '.env']) {
  const file = path.join(projectRoot, name)
  if (!fs.existsSync(file)) continue
  for (const line of fs.readFileSync(file, 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m || process.env[m[1]] !== undefined) continue
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2')
  }
}

if (!fs.existsSync(manifestPath)) {
  console.log('확장 압축 건너뜀: extension 폴더 없음')
  process.exit(0)
}

// 독립 운영 배포판(수강생 배포 키트, 2026-11-16 확장 포함판): 원본 extension/은 그대로 두고 임시 사본의
// 서버 주소·허용 주소·이름을 수강생 사이트 주소(NEXT_PUBLIC_SITE_URL)·브랜드로 바꿔 ZIP을 만든다.
// 그래서 수강생 사이트에서 받은 확장은 처음부터 그 사이트에만 연결된다(AIMaster 주소·이름 없음).
const IS_STANDALONE = (process.env.NEXT_PUBLIC_STANDALONE_MODE ?? '').replace(/^﻿/, '').trim() === 'true'
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/^﻿/, '').trim().replace(/\/$/, '')
const BRAND = (process.env.NEXT_PUBLIC_BRAND_NAME ?? '').replace(/^﻿/, '').trim()
const OPS_ORIGINS = ['https://ai-auto-blog.buylife.xyz', 'https://ai-auto-blog-one.vercel.app', '__SITE_URL__']
// 글 이미지 내려받기 허용 주소 — 배포판 manifest(KIT/extension.manifest.json)는 __SUPABASE_URL__ 자리표시, 운영 manifest는 운영 DB 주소
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/^﻿/, '').trim().replace(/\/$/, '')
const SUPABASE_MARKERS = ['__SUPABASE_URL__']
if (IS_STANDALONE && (!/^https:\/\/[^/\s]+$/.test(SITE_URL) || !/^https:\/\/[^/\s]+$/.test(SUPABASE_URL))) {
  console.log('확장 압축 건너뜀: 독립 운영인데 NEXT_PUBLIC_SITE_URL·NEXT_PUBLIC_SUPABASE_URL(https://…)이 없음 — 설정 후 다시 빌드하면 만들어집니다')
  process.exit(0)
}

/** 독립 운영용 임시 사본을 만들고 그 폴더 경로를 돌려준다(운영은 원본 폴더 그대로). */
function standaloneExtensionCopy(versionName, chromeVersion) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-ext-'))
  fs.cpSync(extensionRoot, dir, { recursive: true })
  for (const name of ['background.js', 'sidepanel.js', 'web-bridge.js', 'sidepanel.html']) {
    const file = path.join(dir, name)
    if (!fs.existsSync(file)) continue
    let text = fs.readFileSync(file, 'utf8')
    for (const origin of OPS_ORIGINS) text = text.split(origin).join(SITE_URL)
    if (name === 'sidepanel.html') text = text.replace('AIMaster · ', BRAND ? `${BRAND} · ` : '')
    fs.writeFileSync(file, text)
  }
  const m = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'))
  m.name = String(m.name).replace(' · AIMaster', BRAND ? ` · ${BRAND}` : '')
  m.version = chromeVersion
  m.version_name = versionName
  const swap = (list) => [...new Set((list ?? []).map((u) =>
    OPS_ORIGINS.some((o) => u.startsWith(o)) ? `${SITE_URL}/*` : SUPABASE_MARKERS.some((o) => u.startsWith(o)) ? `${SUPABASE_URL}/*` : u))]
  m.host_permissions = swap(m.host_permissions)
  for (const cs of m.content_scripts ?? []) cs.matches = swap(cs.matches)
  fs.writeFileSync(path.join(dir, 'manifest.json'), `${JSON.stringify(m, null, 2)}\n`)
  const left = fs.readdirSync(dir).filter((f) => /\.(js|json|html)$/.test(f))
    .filter((f) => {
      const text = fs.readFileSync(path.join(dir, f), 'utf8')
      // 자리표시·운영 주소, 또는 수강생 것이 아닌 다른 Supabase 주소가 남으면 멈춘다
      const otherSupabase = (text.match(/https:\/\/[a-z0-9]+\.supabase\.co/g) ?? []).some((u) => u !== SUPABASE_URL)
      return otherSupabase || [...OPS_ORIGINS, ...SUPABASE_MARKERS].some((o) => text.includes(o))
    })
  if (left.length) throw new Error(`독립 운영 확장 사본에 운영 주소·자리표시가 남았습니다: ${left.join(', ')}`)
  return dir
}

// 1) 프로그램 버전 읽기 → manifest 동기화
const versionSource = fs.readFileSync(path.join(projectRoot, 'utils', 'version.ts'), 'utf8')
const appVersion = versionSource.match(/APP_VERSION\s*=\s*["'](v(\d+)\.(\d{2}))["']/)
if (!appVersion) throw new Error('utils/version.ts에서 APP_VERSION(vX.YY)을 찾지 못했습니다.')
const [, versionName, major, minor] = appVersion
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
// Chrome의 version은 숫자만(앞자리 0 불가) — v1.19 → "1.19.0". 회원에게 보이는 값은 version_name.
const chromeVersion = `${Number(major)}.${Number(minor)}.0`
const sourceRoot = IS_STANDALONE ? standaloneExtensionCopy(versionName, chromeVersion) : extensionRoot
if (!IS_STANDALONE && (manifest.version !== chromeVersion || manifest.version_name !== versionName)) {
  manifest.version = chromeVersion
  manifest.version_name = versionName
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`manifest.json → version ${chromeVersion}, version_name ${versionName}`)
}

// 2) ZIP 만들기(이전 버전 ZIP은 지운다 — 항상 최신 하나만 내려받게)
const archivePath = path.join(downloadsRoot, `ai-auto-blog-extension-${versionName}.zip`)
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
  archive.directory(sourceRoot, false)
  archive.finalize()
})

const latestPath = path.join(downloadsRoot, `ai-auto-blog-extension-latest.zip`)
fs.copyFileSync(archivePath, latestPath)
console.log(`Created ${path.relative(projectRoot, archivePath)} (${fs.statSync(archivePath).size} bytes)`)
console.log(`Created ${path.relative(projectRoot, latestPath)} (고정 주소용 최신 사본)`)
