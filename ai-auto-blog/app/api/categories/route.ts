import { NextRequest } from 'next/server'
import { privateJson } from '@/utils/privateResponse'
import { checkProgramAccessApi } from '@/utils/access'
import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const validId = (id: unknown): id is number => typeof id === 'number' && Number.isSafeInteger(id) && id > 0

async function categoryAccess() {
  const access = await checkProgramAccessApi()
  if (!access.allowed) return { response: privateJson({ error: access.error }, { status: access.status }) }
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('profiles').select('is_admin').eq('id', access.user.id).maybeSingle()
  if (error) return { response: privateJson({ error: '권한 확인에 실패했습니다.' }, { status: 500 }) }
  return { supabase, canManage: data?.is_admin === true }
}

export async function GET() {
  try {
    const access = await categoryAccess()
    if (access.response) return access.response
    const { data, error } = await access.supabase.from('blog_categories')
      .select('id, name, slug, sort_order').order('sort_order').order('id')
    if (error) return privateJson({ error: '카테고리를 불러오지 못했습니다.' }, { status: 500 })
    return privateJson({ data, canManage: access.canManage })
  } catch {
    return privateJson({ error: '카테고리를 불러오지 못했습니다.' }, { status: 500 })
  }
}

async function mutate(request: NextRequest) {
  try {
    const access = await categoryAccess()
    if (access.response) return access.response
    if (!access.canManage) return privateJson({ error: '공통 카테고리는 관리자만 변경할 수 있습니다.' }, { status: 403 })
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') return privateJson({ error: '잘못된 요청입니다.' }, { status: 400 })
    const supabase = access.supabase
    if (request.method === 'POST') {
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      if (!name || name.length > 100) return privateJson({ error: '이름을 100자 이내로 입력해 주세요.' }, { status: 400 })
      const slug = name.toLowerCase().replace(/[^\w\s가-힣-]/g, '').replace(/\s+/g, '-') || `cat-${Date.now()}`
      const { data: last, error: orderError } = await supabase.from('blog_categories').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle()
      if (orderError) throw new Error('Category order lookup failed')
      const { error } = await supabase.from('blog_categories').insert({ name, slug, sort_order: (last?.sort_order ?? 0) + 1 })
      if (error) throw new Error('Category insert failed')
    } else {
      if (!validId(body.id)) return privateJson({ error: '유효하지 않은 카테고리입니다.' }, { status: 400 })
      const { data: current, error: lookupError } = await supabase.from('blog_categories').select('id, sort_order').eq('id', body.id).maybeSingle()
      if (lookupError) throw new Error('Category lookup failed')
      if (!current) return privateJson({ error: '카테고리를 찾을 수 없습니다.' }, { status: 404 })
      if (request.method === 'DELETE') {
        const { error: mappingError } = await supabase.from('blog_post_categories').delete().eq('category_id', body.id)
        if (mappingError) throw new Error('Category mappings delete failed')
        const { error } = await supabase.from('blog_categories').delete().eq('id', body.id)
        if (error) throw new Error('Category delete failed')
      } else if (body.swapId !== undefined) {
        if (!validId(body.swapId) || body.swapId === body.id) return privateJson({ error: '유효하지 않은 순서 변경입니다.' }, { status: 400 })
        const { data: other, error: otherError } = await supabase.from('blog_categories').select('id, sort_order').eq('id', body.swapId).maybeSingle()
        if (otherError) throw new Error('Category swap lookup failed')
        if (!other) return privateJson({ error: '카테고리를 찾을 수 없습니다.' }, { status: 404 })
        const { error: firstError } = await supabase.from('blog_categories').update({ sort_order: other.sort_order }).eq('id', current.id)
        if (firstError) throw new Error('Category reorder failed')
        const { error: secondError } = await supabase.from('blog_categories').update({ sort_order: current.sort_order }).eq('id', other.id)
        if (secondError) {
          await supabase.from('blog_categories').update({ sort_order: current.sort_order }).eq('id', current.id)
          throw new Error('Category reorder failed')
        }
      } else {
        const name = typeof body.name === 'string' ? body.name.trim() : ''
        if (!name || name.length > 100) return privateJson({ error: '이름을 100자 이내로 입력해 주세요.' }, { status: 400 })
        const { error } = await supabase.from('blog_categories').update({ name }).eq('id', body.id)
        if (error) throw new Error('Category update failed')
      }
    }
    return privateJson({ success: true })
  } catch {
    return privateJson({ error: '카테고리 변경에 실패했습니다.' }, { status: 500 })
  }
}

export const POST = mutate
export const PATCH = mutate
export const DELETE = mutate
