import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveAvailableAI } from "@/lib/apiKeys";
import { runBlogGenerationPipeline } from "@/lib/ai/pipeline";
import { createAdminClient } from "@/lib/supabase/admin";
import { isWritingTone, isWritingStyle } from "@/lib/ai/writingStyles";
import { isArticleFormat } from "@/lib/ai/articleFormats";
import { normalizeShoppingLinks } from "@/lib/shoppingLinks";
import { normalizeSourceMaterial } from "@/lib/ai/sourceGrounding";
import { reviewFingerprint, withPostReview } from "@/lib/postReview";
import { savedPost } from "@/lib/postSaveProtocol";
import { newNaverDraftSummary } from "@/lib/naverPublishing";
import { loadCollected, SourceError } from "@/lib/collectedMaterials";
import { fetchPublicHtml, extractMainText } from "@/lib/collector";
import { normalizeReferenceUrls, normalizeExtraInstructions, readReferencePages, mergeReferenceMaterial, ReferenceInputError } from "@/lib/referenceUrls";

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

    if(body.articleFormat !== undefined && !isArticleFormat(body.articleFormat))return NextResponse.json({error:"지원하는 글 구성을 선택해 주세요."},{status:400});
    const shopping=normalizeShoppingLinks(body.shoppingLinks);
    if(shopping.rejected.length)return NextResponse.json({error:`네이버 쇼핑 커넥트 링크(https://naver.me/… 등)만 넣을 수 있습니다. 확인할 주소: ${shopping.rejected.slice(0,3).join(", ")}`},{status:400});

    // 병합 A-1(v2.16 후보): 참고 URL 본문을 실제로 읽어 근거에 합치고, 추가 지시를 기획·작성에 반영
    let referenceUrls:string[], extraInstructions:string;
    try{referenceUrls=normalizeReferenceUrls(body.referenceUrls);extraInstructions=normalizeExtraInstructions(body.extraInstructions);}
    catch(error){if(error instanceof ReferenceInputError)return NextResponse.json({error:error.message},{status:400});throw error;}

    if(body.imageCount !== undefined && (!Number.isInteger(body.imageCount) || body.imageCount < 1 || body.imageCount > 5))return NextResponse.json({error:"이미지 장수는 1~5장으로 선택해 주세요."},{status:400});

    const admin=createAdminClient() as any;
    const source = body.source_id ? await loadCollected(admin, user.id, body.source_id) : undefined;
    if (!source && body.sourceMaterial) return NextResponse.json({error: "서버 글감 목록에서 자료를 다시 선택해 주세요. 이전 브라우저 자료는 자동 이관하지 않습니다."}, {status: 409});
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

    const {data:account,error:accountError}=await admin.from("nba_accounts").select("id").eq("user_id",user.id).eq("blog_id",blogId).maybeSingle();
    if(accountError)return NextResponse.json({error:"블로그 계정을 확인하지 못했습니다."},{status:503});
    if(!account)return NextResponse.json({error:"본인 블로그 계정을 먼저 등록해 주세요."},{status:400});
    const {data:recent,error:recentError}=await admin.from("nba_posts").select("title").eq("user_id",user.id).eq("blog_id",blogId).order("created_at",{ascending:false}).limit(10);
    if(recentError)return NextResponse.json({error:"최근 원고 제목을 확인하지 못했습니다. 잠시 후 다시 생성해 주세요."},{status:503});

    const references=await readReferencePages(referenceUrls,async(url)=>{const {html}=await fetchPublicHtml(url);return extractMainText(html,4000);});
    const groundingMaterial=mergeReferenceMaterial(source ? normalizeSourceMaterial(source.material) : undefined,references.pages);

    // 2. 5단계 AI 글 생성 파이프라인 실행
    const result = await runBlogGenerationPipeline({
      topic,
      category,
      searchKeywords,
      publishPurpose,
      preferredTone,
      writingStyle,
      articleFormat: body.articleFormat,
      shoppingLinks: shopping.links,
      sourceMaterial: groundingMaterial || undefined,
      extraInstructions,
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

    if (source && Date.parse(source.bundle.expiresAt) <= Date.now()) throw new SourceError("생성 중 근거 자료가 만료됐습니다. 원고를 저장하지 않았습니다.", 410);
    if (source) result.sourceBundle = source.bundle;
    const row={user_id:user.id,blog_id:blogId,category_name:result.category,title:result.title,content:result.content,tags:result.tags,images:result.images,status:"draft", ...(source ? {created_at: source.bundle.collectedAt} : {})};
    const summary=withPostReview({...newNaverDraftSummary(blogId), ...(source ? {source_bundle: source.bundle} : {}), ...(references.pages.length ? {reference_urls: references.pages.map((page)=>page.url)} : {})},{status:result.reviewStatus || "UNKNOWN",source:"ai",note:result.reviewNote || "",fingerprint:reviewFingerprint(row),checkedAt:new Date().toISOString()});
    let post:any=null,saveError:unknown=null;
    try {const saved=await admin.from("nba_posts").insert({...row,research_summary:summary}).select("*").single();post=saved.data;saveError=saved.error;}
    catch {saveError=true;}

    return NextResponse.json({
      success: true,
      result,
      postId:post?.id || null,
      post:!saveError && post?.id ? savedPost(post) : null,
      saved:!saveError && Boolean(post?.id),
      ...(references.failed.length?{referenceFailed:references.failed}:{}),
      ...((saveError || !post?.id)?{saveError:"생성한 원고의 서버 저장에 실패했습니다. 화면의 원고를 저장한 뒤 직접 검수해 주세요."}:{}),
    });
  } catch (error: any) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: error?.message || "글 생성 중 오류가 발생했습니다." },
      { status: error instanceof SourceError ? error.status : 500 }
    );
  }
}
