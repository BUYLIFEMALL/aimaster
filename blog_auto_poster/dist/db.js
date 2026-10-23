"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
exports.savePostToDatabase = savePostToDatabase;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
const supabaseUrl = process.env.SUPABASE_URL || 'https://rjjtjakljjxsgjelqgek.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_2WsUm7sfjdudZ9mr1re8RA_cJ1CzVun';
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
async function savePostToDatabase(postData, newsData) {
    // 1. 저자 가져오기 또는 생성 (AI Auto Poster)
    const { data: existingAuthor } = await exports.supabase
        .from('blog_authors')
        .select('id')
        .eq('name', 'AI Auto Poster')
        .maybeSingle();
    let authorId = existingAuthor?.id ?? null;
    if (!authorId) {
        const { data: newAuthor, error: authorErr } = await exports.supabase
            .from('blog_authors')
            .insert({
            name: 'AI Auto Poster',
            role: '24h 실시간 트렌드 로봇',
            avatar_url: null,
        })
            .select('id')
            .single();
        if (authorErr || !newAuthor) {
            const { data: fallbackAuthor } = await exports.supabase.from('blog_authors').select('id').limit(1).single();
            authorId = fallbackAuthor?.id ?? 1;
        }
        else {
            authorId = newAuthor.id;
        }
    }
    // 2. 카테고리 ID 가져오기
    const { data: categoryData } = await exports.supabase
        .from('blog_categories')
        .select('id')
        .eq('slug', postData.categorySlug)
        .maybeSingle();
    let categoryId = categoryData?.id;
    if (!categoryId) {
        const { data: firstCat } = await exports.supabase.from('blog_categories').select('id').limit(1).single();
        categoryId = firstCat?.id ?? 1;
    }
    // 3. blog_posts 테이블에 저장
    const { data: createdPost, error: postErr } = await exports.supabase
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
        .single();
    if (postErr || !createdPost) {
        throw new Error(`DB insert failed: ${postErr?.message || 'Unknown error'}`);
    }
    // 4. blog_post_categories 매핑 저장
    if (categoryId) {
        await exports.supabase.from('blog_post_categories').insert({
            post_id: createdPost.id,
            category_id: categoryId,
        });
    }
    return {
        postId: createdPost.id,
        postUrl: `http://localhost:3000/posts/${createdPost.id}`,
    };
}
