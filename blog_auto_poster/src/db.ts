import { createClient } from '@supabase/supabase-js'
// import dotenv safely
try { require('dotenv').config() } catch(e) {}
import path from 'path'
import { GeneratedPostResult } from './generator'
import { CollectedNewsResult } from './collector'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.SUPABASE_URL || 'https://rjjtjakljjxsgjelqgek.supabase.co'
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_2WsUm7sfjdudZ9mr1re8RA_cJ1CzVun'

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function savePostToDatabase(
  postData: GeneratedPostResult,
  newsData: CollectedNewsResult
): Promise<{ postId: number; postUrl: string }> {
  // 1. 저자 가져오기 또는 생성 (AI Auto Poster)
  const { data: existingAuthor } = await supabase
    .from('blog_authors')
    .select('id')
    .eq('name', 'AI Auto Poster')
    .maybeSingle()

  let authorId: number | null = existingAuthor?.id ?? null

  if (!authorId) {
    const { data: newAuthor, error: authorErr } = await supabase
      .from('blog_authors')
      .insert({
        name: 'AI Auto Poster',
        role: '24h 실시간 트렌드 로봇',
        avatar_url: null,
      })
      .select('id')
      .single()

    if (authorErr || !newAuthor) {
      const { data: fallbackAuthor } = await supabase.from('blog_authors').select('id').limit(1).single()
      authorId = fallbackAuthor?.id ?? 1
    } else {
      authorId = newAuthor.id
    }
  }

  // 2. 카테고리 ID 가져오기
  const { data: categoryData } = await supabase
    .from('blog_categories')
    .select('id')
    .eq('slug', postData.categorySlug)
    .maybeSingle()

  let categoryId = categoryData?.id
  if (!categoryId) {
    const { data: firstCat } = await supabase.from('blog_categories').select('id').limit(1).single()
    categoryId = firstCat?.id ?? 1
  }

  // 3. blog_posts 테이블에 저장
  const { data: createdPost, error: postErr } = await supabase
    .from('blog_posts')
    .insert({
      title: postData.title,
      excerpt: postData.excerpt,
      content: postData.contentHtml,
      author_id: authorId,
      reading_minutes: postData.readingMinutes,
      like_count: 0,
    })
    .select('id, title')
    .single()

  if (postErr || !createdPost) {
    throw new Error(`DB insert failed: ${postErr?.message || 'Unknown error'}`)
  }

  // 4. blog_post_categories 매핑 저장
  if (categoryId) {
    await supabase.from('blog_post_categories').insert({
      post_id: createdPost.id,
      category_id: categoryId,
    })
  }

  return {
    postId: createdPost.id,
    postUrl: `http://localhost:3000/posts/${createdPost.id}`,
  }
}
