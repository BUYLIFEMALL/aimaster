import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { leaseExpired, nextTimestamp, publicPost, readExecution, RUN_PATH, withExecution } from "@/lib/executionRuns";
import { getPostReview } from "@/lib/postReview";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const reply=(body:Record<string,unknown>,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(req:Request,context:{params:Promise<{id:string}>}) {
  try{
    const access=await checkProgramAccessApi();
    if(!access.allowed)return reply({error:access.error},access.status);
    const {id}=await context.params;
    const body=await req.json().catch(()=>null);
    if(!body || body.confirmed!==true || typeof body.runId!=="string")return reply({error:"네이버 글·예약 목록을 직접 확인한 뒤 복구해 주세요."},400);
    const admin:any=createAdminClient();
    const {data:row,error}=await admin.from("nba_posts").select("*").eq("id",id).eq("user_id",access.userId).maybeSingle();
    if(error)return reply({error:"원고 상태를 확인하지 못했습니다."},503);
    if(!row)return reply({error:"본인 원고를 찾을 수 없습니다."},404);
    const run=readExecution(row.research_summary);
    if(!run || run.runId!==body.runId || row.status!=="publishing" || !leaseExpired(run))return reply({error:"현재 실행이 진행 중이거나 상태가 바뀌었습니다. 새로고침 후 확인해 주세요."},409);
    const now=nextTimestamp(row.updated_at);
    let query=admin.from("nba_posts").update({status:"draft",error_message:"회원이 네이버 글·예약 목록 확인 후 복구했습니다. 기존 입력은 자동 재사용하지 않습니다.",updated_at:now,
      research_summary:withExecution(row.research_summary,{...run,stage:"abandoned",message:"회원 확인 후 임시보관으로 복구",updatedAt:now,endedAt:now})})
      .eq("id",id).eq("user_id",access.userId).eq("status","publishing").eq(RUN_PATH,run.runId);
    if(row.updated_at)query=query.eq("updated_at",row.updated_at);
    const {data:saved,error:saveError}=await query.select("*").maybeSingle();
    if(saveError)return reply({error:"복구 저장을 확인하지 못했습니다."},503);
    if(!saved)return reply({error:"실행 상태가 변경됐습니다. 새로고침해 주세요."},409);
    return reply({success:true,post:{...publicPost(saved),review:getPostReview(saved)}});
  }catch{return reply({error:"실행 복구를 확인하지 못했습니다."},503);}
}
