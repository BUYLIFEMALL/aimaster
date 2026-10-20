import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkProgramAccessApi } from "@/lib/access";
import { handlePostSave } from "@/lib/postSaveHandler";
import { postSaveRevision } from "@/lib/postSaveProtocol";
import { getPostReview } from "@/lib/postReview";
import { publicExecution } from "@/lib/executionRuns";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

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
        photo_review: row.research_summary?.photo_review,
        status: row.status || "draft",
        created_at: row.created_at,
        updated_at: row.updated_at,
        save_revision: postSaveRevision(row),
        published_at: row.published_at,
        post_url: row.post_url,
        error_message: row.error_message,
        is_reserved: Boolean(row.is_reserved),
        scheduled_at: row.scheduled_at ?? null,
        review: getPostReview(row),
        execution: publicExecution(row.research_summary),
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

// Saved drafts use a client revision and an atomic request receipt in the existing JSON.
async function saveRequest(request: Request, method: "POST" | "PUT") {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) return NextResponse.json({error: access.error}, {status: access.status, headers: {"Cache-Control": "no-store"}});
    const payload = await request.json().catch(() => null);
    const admin = createAdminClient() as any;
    if (await resolveActiveTable(admin) !== "nba_posts") return NextResponse.json({error: "원고 저장소를 확인하지 못했습니다. 현재 편집 내용을 보관한 뒤 다시 시도해 주세요."}, {status: 503, headers: {"Cache-Control": "no-store"}});
    return await handlePostSave(admin, access.userId, payload, method);
  } catch {
    return NextResponse.json({error: "원고 저장을 확인하지 못했습니다. 같은 내용으로 다시 저장해 주세요."}, {status: 503, headers: {"Cache-Control": "no-store"}});
  }
}
export const POST = (request: Request) => saveRequest(request, "POST");
export const PUT = (request: Request) => saveRequest(request, "PUT");

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
      const {data:current,error:readError}=await admin.from("nba_posts").select("id,status,updated_at").eq("id",id).eq("user_id",user.id).maybeSingle();
      if(readError)return NextResponse.json({error:"삭제 전 실행 상태를 확인하지 못했습니다."},{status:503});
      if(!current)return NextResponse.json({error:"본인 원고를 찾을 수 없습니다."},{status:404});
      if(current.status==="publishing")return NextResponse.json({error:"입력 중인 원고는 삭제할 수 없습니다. 연결 종료 후 복구해 주세요."},{status:409});
      const { data:deleted,error } = await admin
        .from("nba_posts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id).eq("status",current.status).eq("updated_at",current.updated_at).select("id");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if(!deleted?.length)return NextResponse.json({error:"원고 상태가 변경됐습니다. 새로고침해 주세요."},{status:409});
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
