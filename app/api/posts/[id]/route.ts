import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://esgxyikcnnvmlhygjkth.supabase.co'
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_vPq7LSl7-VA90DzXSQFONA_jQhutbgY'

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
})

// 본문 텍스트 내의 Base64 이미지 추출 유틸
function extractBase64Images(text: string): string[] {
  if (!text || !text.includes('data:image/')) return []
  const images: string[] = []
  let searchIdx = 0

  while (true) {
    const startIdx = text.indexOf('data:image/', searchIdx)
    if (startIdx === -1) break

    let endIdx = text.indexOf('"', startIdx)
    const endAlt1 = text.indexOf("'", startIdx)
    const endAlt2 = text.indexOf(")", startIdx)
    const endAlt3 = text.indexOf(" ", startIdx)

    let validEnds = [endIdx, endAlt1, endAlt2, endAlt3].filter(idx => idx > startIdx)
    if (validEnds.length === 0) break

    endIdx = Math.min(...validEnds)
    const imgData = text.slice(startIdx, endIdx)
    images.push(imgData)
    searchIdx = endIdx
  }

  return images
}

// GET /api/posts/[id]
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const { data: post, error: postErr } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .single()

    if (postErr || !post) {
      return NextResponse.json({ error: 'Post not found: ' + (postErr?.message || '') }, { status: 404 })
    }

    const { data: pcData } = await supabase
      .from('blog_post_categories')
      .select('category_id')
      .eq('post_id', id)

    const category_ids = pcData?.map((r) => r.category_id) || []

    const { data: categories } = await supabase
      .from('blog_categories')
      .select('id, name, slug')
      .order('id', { ascending: true })

    return NextResponse.json({
      ...post,
      category_ids,
      all_categories: categories || []
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server Exception' }, { status: 500 })
  }
}

// PUT /api/posts/[id]
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const body = await req.json()
    let { title, excerpt, content, category_ids } = body

    // 기존 DB post 조회 (원본 이미지 복원용)
    const { data: existingPost } = await supabase
      .from('blog_posts')
      .select('content')
      .eq('id', id)
      .single()

    const dbOriginalImages = existingPost ? extractBase64Images(existingPost.content || '') : []

    // 1. [첨부 이미지 N] 또는 __ORIGINAL_IMAGE_PLACEHOLDER_N__ 표기를 DB 원본 고화질 Base64 이미지로 100% 복원!
    if (typeof content === 'string' && dbOriginalImages.length > 0) {
      dbOriginalImages.forEach((imgStr: string, idx: number) => {
        const num = idx + 1
        const tag1 = `[첨부 이미지 ${num}]`
        const tag2 = `[첨부 이미지${num}]`
        const tag3 = `__ORIGINAL_IMAGE_PLACEHOLDER_${idx}__`

        if (content.includes(tag1)) {
          content = content.replaceAll(tag1, imgStr)
        } else if (content.includes(tag2)) {
          content = content.replaceAll(tag2, imgStr)
        } else if (content.includes(tag3)) {
          content = content.replaceAll(tag3, imgStr)
        }
      })
    }

    // 2. 게시글 필드 업데이트
    const { data, error } = await supabase
      .from('blog_posts')
      .update({
        title: title || '',
        excerpt: excerpt || '',
        content: content || ''
      })
      .eq('id', id)
      .select()

    if (error) {
      console.error('[PUT Post Update Error]:', error)
      return NextResponse.json({ error: 'Post update error: ' + error.message }, { status: 500 })
    }

    // 3. 카테고리 매핑 업데이트
    if (Array.isArray(category_ids)) {
      await supabase.from('blog_post_categories').delete().eq('post_id', id)

      if (category_ids.length > 0) {
        const mappings = category_ids.map((cid: any) => ({
          post_id: id,
          category_id: parseInt(cid, 10)
        })).filter((m: any) => !isNaN(m.category_id))

        if (mappings.length > 0) {
          const { error: catErr } = await supabase.from('blog_post_categories').insert(mappings)
          if (catErr) {
            console.error('[PUT Category Mapping Insert Error]:', catErr)
          }
        }
      }
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('[PUT Server Error]:', err)
    return NextResponse.json({ error: 'Server error: ' + (err.message || String(err)) }, { status: 500 })
  }
}

// DELETE /api/posts/[id]
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    await supabase.from('blog_post_categories').delete().eq('post_id', id)

    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Delete error: ' + error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: 'Delete server error: ' + (err.message || String(err)) }, { status: 500 })
  }
}
