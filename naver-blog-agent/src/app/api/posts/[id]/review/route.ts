import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPostReview, withPostReview } from "@/lib/postReview";
import { postReviewSnapshot } from "@/lib/postReviewSnapshot";

export const dynamic="force-dynamic";
export const fetchCache="force-no-store";
type Context={params:Promise<{id:string}>};
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
async function owned(context:Context,userId:string) {
  const {id}=await context.params;
  const admin=createAdminClient() as any;
  const {data,error}=await admin.from("nba_posts").select("*").eq("id",id).eq("user_id",userId).maybeSingle();
  return {admin,data,error};
}
export async function GET(_req:Request,context:Context) {
  const access=await checkProgramAccessApi();if(!access.allowed)return reply({error:access.error},access.status);
  const {data,error}=await owned(context,access.userId);
  if(error)return reply({error:"검수 기록을 확인하지 못했습니다."},503);
  if(!data)return reply({error:"본인 원고를 찾을 수 없습니다."},404);
  return reply({review:getPostReview(data),snapshot:postReviewSnapshot(data),postStatus:data.status});
}
export async function POST(req:Request,context:Context) {
  const access=await checkProgramAccessApi();if(!access.allowed)return reply({error:access.error},access.status);
  const body=await req.json().catch(()=>null);
  if(body?.confirmed!==true || typeof body.fingerprint!=="string")return reply({error:"저장한 원고의 사실·출처·이미지·표현을 확인하고 직접 검수를 완료해 주세요."},400);
  const {admin,data,error}=await owned(context,access.userId);
  if(error)return reply({error:"원고를 확인하지 못했습니다."},503);
  if(!data)return reply({error:"본인 원고를 찾을 수 없습니다."},404);
  if(["queued","publishing"].includes(data.status))return reply({error:"작업 대기를 취소한 뒤 직접 검수해 주세요."},409);
  const review=getPostReview(data);
  if(review.fingerprint!==body.fingerprint)return reply({error:"검수 중 원고가 변경됐습니다. 최신 원고를 다시 확인해 주세요."},409);
  if(!String(data.title || "").trim() || !String(data.content || "").trim())return reply({error:"제목과 본문을 저장한 뒤 검수해 주세요."},400);
  let query=admin.from("nba_posts").update({research_summary:withPostReview(data.research_summary,{status:"CONFIRMED",source:"manual",note:"회원이 저장된 최종 원고의 사실·출처·이미지·표현을 직접 확인했습니다. AI 검수 통과와는 별개입니다.",fingerprint:review.fingerprint,checkedAt:new Date().toISOString()}),updated_at:new Date().toISOString()})
    .eq("id",data.id).eq("user_id",access.userId).eq("status",data.status);
  if(data.updated_at)query=query.eq("updated_at",data.updated_at);
  const {data:saved,error:saveError}=await query.select("*").maybeSingle();
  if(saveError)return reply({error:"직접 검수 기록을 저장하지 못했습니다."},503);
  if(!saved)return reply({error:"원고가 변경됐습니다. 다시 확인해 주세요."},409);
  return reply({success:true,review:getPostReview(saved)});
}
