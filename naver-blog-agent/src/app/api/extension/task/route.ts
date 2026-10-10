import { NextResponse } from "next/server";
import { authenticateExtension, buildBridgePayload } from "@/lib/extensionBridge";
import { getPostReview } from "@/lib/postReview";
import { connectionOwner, newExecution, OWNER_PATH, publicExecution, readExecution, withExecution } from "@/lib/executionRuns";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const reply=(body:Record<string,unknown>,init:Parameters<typeof NextResponse.json>[1]={})=>NextResponse.json(body,{...init,headers:{"Cache-Control":"no-store"}});

// 크롬 확장이 발행 대기(queued) 원고 1건을 가져가는 경로 (확장 폴링)
export async function POST(req: Request) {
  try {
    const auth = await authenticateExtension(req);
    if (!auth.ok) return reply({ error: auth.error }, { status: auth.status });
    const { admin, userId, token } = auth;

    await admin.from("nba_extension_tokens").update({ last_ping_at: new Date().toISOString() }).eq("token", token);

    const body = await req.json().catch(() => ({}));
    const blogId = typeof body?.blogId === "string" ? body.blogId : "";
    if (body.supportsRuns === true) {
      if (!/^[A-Za-z0-9_-]{2,40}$/.test(blogId)) return reply({error:"연결한 블로그 ID를 확인해 주세요."},{status:400});
      // A lost claim response must never result in another authoring attempt.
      const {data:running,error:runningError}=await admin.from("nba_posts").select("id,research_summary")
        .eq("user_id",userId).eq("blog_id",blogId).eq("status","publishing")
        .eq(OWNER_PATH,connectionOwner(token)).limit(1);
      if(runningError)return reply({error:"기존 실행을 확인하지 못했습니다."},{status:503});
      if(running?.length)return reply({task:null,recovery:{id:running[0].id,...publicExecution(running[0].research_summary)}},{headers:{"Cache-Control":"no-store"}});
    }

    let query = admin
      .from("nba_posts")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(1);
    if (blogId) query = query.eq("blog_id", blogId);

    const { data: posts, error: postErr } = await query;
    if (postErr) return reply({error:"작업 대기 목록을 확인하지 못했습니다."},{status:503});
    if (!posts || posts.length === 0) return reply({ task: null });

    const row = posts[0];
    if(readExecution(row.research_summary) && body.supportsRuns!==true)return reply({error:"실행 복구를 지원하는 최신 확장으로 업데이트해 주세요."},{status:409});
    if(!getPostReview(row).allowed)return reply({error:"원고가 미검수·검수 실패 또는 검수 후 변경 상태입니다. 대기를 취소하고 보관함에서 최종 원고를 직접 검수해 주세요."},{status:409});
    const { data: account, error: accountError } = await admin.from("nba_accounts").select("default_category")
      .eq("user_id", userId).eq("blog_id", row.blog_id).maybeSingle();
    if (accountError) return reply({ error: "블로그 발행 기본값을 확인하지 못했습니다." }, { status: 500 });
    const payload = buildBridgePayload(row, account?.default_category);
    if (payload.executionMode === "prepare" && body.supportsPrepare !== true) {
      return reply({ error: "발행 전 준비를 지원하는 최신 확장으로 업데이트해 주세요." }, { status: 409 });
    }

    // 동시에 두 번 폴링해도 한 번만 가져가도록 queued일 때만 전환
    const run=body.supportsRuns===true?newExecution(token):null;
    let claim = admin
      .from("nba_posts")
      .update({ status: "publishing", error_message: null, updated_at: new Date().toISOString(), ...(run?{research_summary:withExecution(row.research_summary,run)}:{}) })
      .eq("id", row.id)
      .eq("user_id", userId)
      .eq("status", "queued");
    if(row.updated_at)claim=claim.eq("updated_at",row.updated_at);
    const {data:claimed,error:claimError}=await claim.select("id");
    if(claimError)return reply({error:"작업 가져오기를 확인하지 못했습니다."},{status:503});
    if (!claimed || claimed.length === 0) return reply({ task: null });

    return reply({
      task: {
        id: row.id,
        ...(run?{runId:run.runId,leaseExpiresAt:run.leaseExpiresAt}:{}),
        type: payload.executionMode === "prepare" ? "prepare" : "publish",
        platform: "naver",
        blogId: row.blog_id,
        payload,
      },
    });
  } catch (err: any) {
    return reply({ error: err.message }, { status: 500 });
  }
}
