import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://esgxyikcnnvmlhygjkth.supabase.co'
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_vPq7LSl7-VA90DzXSQFONA_jQhutbgY'

const supabase = createClient(supabaseUrl, serviceKey)

// GET /api/posts/[id]
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PUT /api/posts/[id]
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const body = await req.json()
    const { title, excerpt, content, category_ids } = body

    const { data, error } = await supabase
      .from('blog_posts')
      .update({
        title,
        excerpt,
        content
      })
      .eq('id', id)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 카테고리 매핑 업데이트
    if (Array.isArray(category_ids)) {
      await supabase.from('blog_post_categories').delete().eq('post_id', id)
      if (category_ids.length > 0) {
        const mappings = category_ids.map((cid: number) => ({ post_id: id, category_id: cid }))
        await supabase.from('blog_post_categories').insert(mappings)
      }
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/posts/[id]
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    // 1. 카테고리 매핑 삭제
    await supabase.from('blog_post_categories').delete().eq('post_id', id)

    // 2. 게시글 삭제
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
