import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveSaveStatus } from "@/lib/postStatus";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface SavedPostPayload {
  id?: string;
  blog_id?: string;
  category_name?: string;
  title: string;
  content: string;
  excerpt?: string;
  tags?: string[];
  images?: any[];
  status?: "draft" | "queued" | "publishing" | "published" | "failed";
  published_at?: string;
  post_url?: string;
  error_message?: string;
  scheduled_at?: string;
  publish_visibility?: "private" | "public";
}

// 사용할 테이블 탐색 캐시 (nba_posts 우선, 부재 시 naver_blog_seo_drafts)
let activeTableCache: "nba_posts" | "naver_blog_seo_drafts" | null = null;

async function resolveActiveTable(admin: any): Promise<"nba_posts" | "naver_blog_seo_drafts"> {
  if (activeTableCache) return activeTableCache;

  try {
    const { error } = await admin.from("nba_posts").select("id").limit(1);
    if (!error) {
      activeTableCache = "nba_posts";
      return "nba_posts";
    }
  } catch {}

  activeTableCache = "naver_blog_seo_drafts";
  return "naver_blog_seo_drafts";
}

function isUuid(id?: string): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// GET: 로그인 사용자의 원고 목록 조회
export async function GET(request: Request) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
    const user = { id: access.userId };

    const { searchParams } = new URL(request.url);
    const filterStatus = searchParams.get("status");

    const admin: any = createAdminClient();
    const targetTable = await resolveActiveTable(admin);

    if (targetTable === "nba_posts") {
      let query = admin
        .from("nba_posts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (filterStatus && filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const posts = (data || []).map((row: any) => ({
        id: row.id,
        blog_id: row.blog_id || "myblog_sample",
        category_name: row.category_name || "일반",
        title: row.title || "",
        content: row.content || "",
        tags: Array.isArray(row.tags) ? row.tags : [],
        images: Array.isArray(row.images) ? row.images : [],
        status: row.status || "draft",
        created_at: row.created_at,
        published_at: row.published_at,
        post_url: row.post_url,
        error_message: row.error_message,
      }));

      return NextResponse.json({ posts });
    } else {
      // naver_blog_seo_drafts 테이블 활용
      let query = admin
        .from("naver_blog_seo_drafts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (filterStatus && filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const posts = (data || []).map((row: any) => {
        const seoReport = typeof row.seo_report === "object" && row.seo_report ? row.seo_report : {};
        return {
          id: row.id,
          blog_id: seoReport.blog_id || "myblog_sample",
          category_name: row.strategy || seoReport.category || "일반",
          title: row.title || "",
          content: row.body || "",
          excerpt: seoReport.excerpt || (row.body ? row.body.replace(/<[^>]*>?/gm, "").substring(0, 150) : ""),
          tags: Array.isArray(row.keywords) ? row.keywords : [],
          images: Array.isArray(row.image_prompts) ? row.image_prompts : [],
          status: row.status || "draft",
          created_at: row.created_at,
          published_at: row.extension_imported_at || row.naver_input_completed_at,
          post_url: seoReport.post_url,
          error_message: row.naver_input_error,
        };
      });

      return NextResponse.json({ posts });
    }
  } catch (err: any) {
    console.error("GET /api/posts error:", err);
    return NextResponse.json({ error: err.message || "원고 목록 조회 실패" }, { status: 500 });
  }
}

// POST: 신규 원고 영구 저장 (생성 완료/수동 저장 시)
export async function POST(request: Request) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
    const user = { id: access.userId };

    const payload: SavedPostPayload = await request.json();
    if (!payload.title && !payload.content) {
      return NextResponse.json({ error: "제목 또는 본문이 비어있습니다." }, { status: 400 });
    }

    const admin: any = createAdminClient();
    const targetTable = await resolveActiveTable(admin);

    if (targetTable === "nba_posts") {
      // 이미 대기·발행 중인 글에 "임시보관 저장"이 들어오면 상태를 되돌리지 않는다.
      // 다른 회원의 글 ID가 오면 그 글을 덮어쓰지 않고(소유자 불일치) 새 글로 저장한다.
      let existingStatus: string | null = null;
      let usableId = false;
      if (isUuid(payload.id)) {
        const { data: existing } = await admin
          .from("nba_posts")
          .select("status, user_id")
          .eq("id", payload.id)
          .maybeSingle();
        if (!existing) usableId = true;
        else if (existing.user_id === user.id) {
          usableId = true;
          existingStatus = existing.status ?? null;
        }
      }

      const record: any = {
        user_id: user.id,
        blog_id: payload.blog_id || "myblog_sample",
        category_name: payload.category_name || "일반",
        title: payload.title || "제목 없음",
        content: payload.content || "",
        tags: Array.isArray(payload.tags) ? payload.tags : [],
        images: Array.isArray(payload.images) ? payload.images : [],
        status: resolveSaveStatus(existingStatus, payload.status),
        updated_at: new Date().toISOString(),
      };

      if (usableId) {
        record.id = payload.id;
      }
      if (payload.scheduled_at) record.scheduled_at = payload.scheduled_at;
      if (payload.post_url) record.post_url = payload.post_url;

      const { data, error } = await admin
        .from("nba_posts")
        .upsert(record)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ post: data, success: true });
    } else {
      // naver_blog_seo_drafts 테이블 활용
      const record: any = {
        user_id: user.id,
        topic: payload.category_name || payload.title || "네이버 블로그 포스팅",
        strategy: payload.category_name || "일반",
        title: payload.title || "제목 없음",
        body: payload.content || "",
        keywords: Array.isArray(payload.tags) ? payload.tags : [],
        image_prompts: Array.isArray(payload.images) ? payload.images : [],
        status: payload.status || "draft",
        seo_report: {
          blog_id: payload.blog_id || "myblog_sample",
          category: payload.category_name || "일반",
          excerpt: payload.excerpt,
          post_url: payload.post_url,
          source: "naver-blog-agent",
        },
        updated_at: new Date().toISOString(),
      };

      if (isUuid(payload.id)) {
        record.id = payload.id;
      }

      const { data, error } = await (admin as any)
        .from("naver_blog_seo_drafts")
        .upsert(record)
        .select()
        .single();

      if (error) {
        console.error("Insert into naver_blog_seo_drafts error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const row = data as any;
      const transformed = {
        id: row.id,
        blog_id: payload.blog_id || "myblog_sample",
        category_name: row.strategy || payload.category_name,
        title: row.title,
        content: row.body,
        tags: row.keywords,
        images: row.image_prompts,
        status: row.status,
        created_at: row.created_at,
      };

      return NextResponse.json({ post: transformed, success: true });
    }
  } catch (err: any) {
    console.error("POST /api/posts error:", err);
    return NextResponse.json({ error: err.message || "원고 저장 실패" }, { status: 500 });
  }
}

// PUT: 기존 원고 수정 및 상태 갱신 (에디터 수정/발행 큐 등록 시)
export async function PUT(request: Request) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
    const user = { id: access.userId };

    const payload: SavedPostPayload & { id: string } = await request.json();
    if (!payload.id) {
      return NextResponse.json({ error: "원고 ID가 필요합니다." }, { status: 400 });
    }

    const admin: any = createAdminClient();
    const targetTable = await resolveActiveTable(admin);

    if (targetTable === "nba_posts") {
      const updates: any = {
        updated_at: new Date().toISOString(),
      };
      if (payload.title !== undefined) updates.title = payload.title;
      if (payload.content !== undefined) updates.content = payload.content;
      if (payload.category_name !== undefined) updates.category_name = payload.category_name;
      if (payload.tags !== undefined) updates.tags = payload.tags;
      if (payload.images !== undefined) updates.images = payload.images;
      if (payload.status !== undefined) updates.status = payload.status;
      if (payload.post_url !== undefined) updates.post_url = payload.post_url;
      if (payload.error_message !== undefined) updates.error_message = payload.error_message;
      if (payload.publish_visibility !== undefined) {
        updates.publish_visibility = payload.publish_visibility === "public" ? "public" : "private";
      }

      const { data, error } = await admin
        .from("nba_posts")
        .update(updates)
        .eq("id", payload.id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ post: data, success: true });
    } else {
      // naver_blog_seo_drafts 테이블 업데이트
      const updates: any = {
        updated_at: new Date().toISOString(),
      };
      if (payload.title !== undefined) updates.title = payload.title;
      if (payload.content !== undefined) updates.body = payload.content;
      if (payload.category_name !== undefined) updates.strategy = payload.category_name;
      if (payload.tags !== undefined) updates.keywords = payload.tags;
      if (payload.images !== undefined) updates.image_prompts = payload.images;
      if (payload.status !== undefined) updates.status = payload.status;
      if (payload.error_message !== undefined) updates.naver_input_error = payload.error_message;

      if (payload.status === "queued") {
        updates.naver_input_status = "not_started";
        updates.extension_handoff_at = new Date().toISOString();
      }

      const { data, error } = await admin
        .from("naver_blog_seo_drafts")
        .update(updates)
        .eq("id", payload.id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ post: data, success: true });
    }
  } catch (err: any) {
    console.error("PUT /api/posts error:", err);
    return NextResponse.json({ error: err.message || "원고 수정 실패" }, { status: 500 });
  }
}

// DELETE: 원고 삭제
export async function DELETE(request: Request) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
    const user = { id: access.userId };

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "삭제할 원고 ID가 필요합니다." }, { status: 400 });
    }

    const admin: any = createAdminClient();
    const targetTable = await resolveActiveTable(admin);

    if (targetTable === "nba_posts") {
      const { error } = await admin
        .from("nba_posts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { error } = await admin
        .from("naver_blog_seo_drafts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/posts error:", err);
    return NextResponse.json({ error: err.message || "원고 삭제 실패" }, { status: 500 });
  }
}
