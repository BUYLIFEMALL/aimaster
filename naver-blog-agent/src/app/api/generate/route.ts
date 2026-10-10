import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveAvailableAI } from "@/lib/apiKeys";
import { runBlogGenerationPipeline } from "@/lib/ai/pipeline";
import { createAdminClient } from "@/lib/supabase/admin";
import { isWritingTone, isWritingStyle } from "@/lib/ai/writingStyles";
import { reviewFingerprint, withPostReview } from "@/lib/postReview";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(req: Request) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
    const user = { id: access.userId };
    const body = await req.json();
    const blogId=typeof body.blogId==="string"?body.blogId.trim():"";
    const {
      topic,
      category,
      searchKeywords,
      publishPurpose,
      preferredTone,
      writingStyle,
      provider,
      persona,
      targetLength,
    } = body;

    if (!category) {
      return NextResponse.json({ error: "카테고리를 입력해주세요." }, { status: 400 });
    }

    if ((preferredTone !== undefined && !isWritingTone(preferredTone)) ||
        (writingStyle !== undefined && !isWritingStyle(writingStyle))) {
      return NextResponse.json({ error: "지원하는 말끝과 문체를 선택해 주세요." }, { status: 400 });
    }
    if(!/^[A-Za-z0-9_-]{2,40}$/.test(blogId))return NextResponse.json({error:"본인 블로그 ID를 선택해 주세요."},{status:400});

    if(body.imageCount !== undefined && (!Number.isInteger(body.imageCount) || body.imageCount < 1 || body.imageCount > 5))return NextResponse.json({error:"이미지 장수는 1~5장으로 선택해 주세요."},{status:400});

    const targetProvider = body.engine?.provider || provider;
    if(targetProvider && !["openai","anthropic","gemini"].includes(targetProvider))return NextResponse.json({error:"지원하는 AI 공급사를 선택해 주세요."},{status:400});
    // 1. 사용자 AI 키 조회
    const ai = await resolveAvailableAI(user.id, targetProvider);
    if (!ai) {
      return NextResponse.json(
        {
          error: targetProvider ? `선택한 ${targetProvider}의 본인 API 키를 등록해 주세요. 다른 공급사로 자동 전환하지 않습니다.` : "등록된 본인 AI API 키가 없습니다. [API키등록·플랫폼연동]에서 본인 키를 등록해 주세요.",
          needKey: true,
        },
        { status: 400 }
      );
    }

    const admin=createAdminClient() as any;
    const {data:account,error:accountError}=await admin.from("nba_accounts").select("id").eq("user_id",user.id).eq("blog_id",blogId).maybeSingle();
    if(accountError)return NextResponse.json({error:"블로그 계정을 확인하지 못했습니다."},{status:503});
    if(!account)return NextResponse.json({error:"본인 블로그 계정을 먼저 등록해 주세요."},{status:400});
    const {data:recent,error:recentError}=await admin.from("nba_posts").select("title").eq("user_id",user.id).eq("blog_id",blogId).order("created_at",{ascending:false}).limit(10);
    if(recentError)return NextResponse.json({error:"최근 원고 제목을 확인하지 못했습니다. 잠시 후 다시 생성해 주세요."},{status:503});

    // 2. 5단계 AI 글 생성 파이프라인 실행
    const result = await runBlogGenerationPipeline({
      topic,
      category,
      searchKeywords,
      publishPurpose,
      preferredTone,
      writingStyle,
      persona,
      targetLength: typeof targetLength === "number" ? targetLength : undefined,
      imageCount:body.imageCount ?? 2,
      recentTitles:(recent || []).map((post:any)=>post.title).filter((title:unknown)=>typeof title==="string" && title.trim()),
      aiConfig: {
        provider: ai.provider,
        apiKey: ai.apiKey,
        model: body.engine?.model,
      },
    });

    const row={user_id:user.id,blog_id:blogId,category_name:result.category,title:result.title,content:result.content,tags:result.tags,images:result.images,status:"draft"};
    const summary=withPostReview(null,{status:result.reviewStatus || "UNKNOWN",source:"ai",note:result.reviewNote || "",fingerprint:reviewFingerprint(row),checkedAt:new Date().toISOString()});
    let post:{id:string}|null=null,saveError:unknown=null;
    try {const saved=await admin.from("nba_posts").insert({...row,research_summary:summary}).select("id").single();post=saved.data;saveError=saved.error;}
    catch {saveError=true;}

    return NextResponse.json({
      success: true,
      result,
      postId:post?.id || null,
      saved:!saveError && Boolean(post?.id),
      ...((saveError || !post?.id)?{saveError:"생성한 원고의 서버 저장에 실패했습니다. 화면의 원고를 저장한 뒤 직접 검수해 주세요."}:{}),
    });
  } catch (error: any) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: error?.message || "글 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
