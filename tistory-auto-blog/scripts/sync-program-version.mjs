import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const environment = {}
for (const file of [path.join(projectRoot, '.env.local'), path.join(projectRoot, '..', '.env.local')]) {
  if (!fs.existsSync(file)) continue
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) environment[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '')
  }
}

const versionSource = fs.readFileSync(path.join(projectRoot, 'utils', 'version.ts'), 'utf8')
const version = versionSource.match(/APP_VERSION\s*=\s*["'](v\d+\.\d{2})["']/)?.[1]
if (!version) throw new Error('utils/version.ts에서 APP_VERSION(vX.YY)을 찾지 못했습니다.')

const client = createClient(environment.NEXT_PUBLIC_SUPABASE_URL, environment.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})
const { data, error } = await client
  .from('programs')
  .update({ version })
  .eq('slug', 'tistory-auto-blog')
  .select('slug, version')

if (error) throw error
if (data?.length !== 1 || data[0].version !== version) throw new Error('programs.version 동기화를 확인하지 못했습니다.')
console.log(`programs.version updated: ${version}`)
