import { NextRequest } from 'next/server'
import { privateJson } from '@/utils/privateResponse'
import { checkProgramAccessApi } from '@/utils/access'
import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const validId = (id: unknown): id is number => typeof id === 'number' && Number.isSafeInteger(id) && id > 0

// 카테고리는 회원 본인 소유다(blog_categories.user_id). 같은 회원은 모든 블로그 프로그램에서 공유하고,
// 다른 회원과는 공유하지 않는다. 관리자 공용 카테고리는 두지 않는다(2026-10-27 주인님 지시).
async function categoryAccess() {
  const access = await checkProgramAccessApi()
  if (!access.allowed) return { response: privateJson({ error: access.error }, { status: access.status }) }
  return { supabase: createAdminClient(), userId: access.user.id }
}

export async function GET() {
  try {
    const access = await categoryAccess()
    if (access.response) return access.response
    const { data, error } = await access.supabase.from('blog_categories')
      .select('id, name, slug, sort_order').eq('user_id', access.userId).order('sort_order').order('id')
    if (error) return privateJson({ error: '카테고리를 불러오지 못했습니다.' }, { status: 500 })
    // canManage는 「본인 카테고리를 관리할 수 있다」는 뜻 — 로그인·이용 권한이 있으면 항상 true.
    return privateJson({ data, canManage: true })
  } catch {
    return privateJson({ error: '카테고리를 불러오지 못했습니다.' }, { status: 500 })
  }
}

function makeSlug(name: string, userId: string) {
  const base = name.toLowerCase().replace(/[^\w\s가-힣-]/g, '').replace(/\s+/g, '-')
  // 회원별로 slug가 유일해야 하므로, 비면 회원·시각 기반으로 만든다.
  return base || `cat-${userId.slice(0, 8)}-${Date.now()}`
}

async function mutate(request: NextRequest) {
  try {
    const access = await categoryAccess()
    if (access.response) return access.response
    const { supabase, userId } = access
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') return privateJson({ error: '잘못된 요청입니다.' }, { status: 400 })

    if (request.method === 'POST') {
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      if (!name || name.length > 100) return privateJson({ error: '이름을 100자 이내로 입력해 주세요.' }, { status: 400 })
      // 같은 회원이 같은 이름을 또 만들지 않게 막는다(다른 회원의 같은 이름은 상관없음).
      const { data: dup, error: dupError } = await supabase.from('blog_categories')
        .select('id').eq('user_id', userId).eq('name', name).maybeSingle()
      if (dupError) throw new Error('Category dup lookup failed')
      if (dup) return privateJson({ error: '이미 같은 이름의 카테고리가 있습니다.' }, { status: 409 })
      const { data: last, error: orderError } = await supabase.from('blog_categories')
        .select('sort_order').eq('user_id', userId).order('sort_order', { ascending: false }).limit(1).maybeSingle()
      if (orderError) throw new Error('Category order lookup failed')
      const { error } = await supabase.from('blog_categories')
        .insert({ name, slug: makeSlug(name, userId), sort_order: (last?.sort_order ?? 0) + 1, user_id: userId })
      if (error) throw new Error('Category insert failed')
    } else {
      if (!validId(body.id)) return privateJson({ error: '유효하지 않은 카테고리입니다.' }, { status: 400 })
      // 본인 소유 카테고리만 손댈 수 있다.
      const { data: current, error: lookupError } = await supabase.from('blog_categories')
        .select('id, sort_order').eq('id', body.id).eq('user_id', userId).maybeSingle()
      if (lookupError) throw new Error('Category lookup failed')
      if (!current) return privateJson({ error: '카테고리를 찾을 수 없습니다.' }, { status: 404 })
      if (request.method === 'DELETE') {
        const { error: mappingError } = await supabase.from('blog_post_categories').delete().eq('category_id', body.id)
        if (mappingError) throw new Error('Category mappings delete failed')
        const { error } = await supabase.from('blog_categories').delete().eq('id', body.id).eq('user_id', userId)
        if (error) throw new Error('Category delete failed')
      } else if (body.swapId !== undefined) {
        if (!validId(body.swapId) || body.swapId === body.id) return privateJson({ error: '유효하지 않은 순서 변경입니다.' }, { status: 400 })
        const { data: other, error: otherError } = await supabase.from('blog_categories')
          .select('id, sort_order').eq('id', body.swapId).eq('user_id', userId).maybeSingle()
        if (otherError) throw new Error('Category swap lookup failed')
        if (!other) return privateJson({ error: '카테고리를 찾을 수 없습니다.' }, { status: 404 })
        const { error: firstError } = await supabase.from('blog_categories').update({ sort_order: other.sort_order }).eq('id', current.id).eq('user_id', userId)
        if (firstError) throw new Error('Category reorder failed')
        const { error: secondError } = await supabase.from('blog_categories').update({ sort_order: current.sort_order }).eq('id', other.id).eq('user_id', userId)
        if (secondError) {
          await supabase.from('blog_categories').update({ sort_order: current.sort_order }).eq('id', current.id).eq('user_id', userId)
          throw new Error('Category reorder failed')
        }
      } else {
        const name = typeof body.name === 'string' ? body.name.trim() : ''
        if (!name || name.length > 100) return privateJson({ error: '이름을 100자 이내로 입력해 주세요.' }, { status: 400 })
        const { data: dup, error: dupError } = await supabase.from('blog_categories')
          .select('id').eq('user_id', userId).eq('name', name).neq('id', body.id).maybeSingle()
        if (dupError) throw new Error('Category dup lookup failed')
        if (dup) return privateJson({ error: '이미 같은 이름의 카테고리가 있습니다.' }, { status: 409 })
        const { error } = await supabase.from('blog_categories').update({ name }).eq('id', body.id).eq('user_id', userId)
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
