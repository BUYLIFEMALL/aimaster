import { NextResponse } from "next/server";
import { authenticateExtension } from "@/lib/extensionBridge";
import { advanceExecution, leaseExpired, nextTimestamp, ownsExecution, publicExecution, readExecution, RUN_PATH, withExecution } from "@/lib/executionRuns";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const reply=(body:Record<string,unknown>,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(req:Request) {
  try {
    const auth=await authenticateExtension(req);
    if(!auth.ok)return reply({error:auth.error},auth.status);
    const {admin,userId,token}=auth;
    const body=await req.json().catch(()=>({}));
    if(body.disconnect===true){
      const {error}=await admin.from("nba_extension_tokens").delete().eq("token",token).eq("user_id",userId);
      return error?reply({error:"연결 해제를 확인하지 못했습니다."},503):reply({success:true});
    }
    if(body.action==="heartbeat" || !body.id){
      const {error:pingError}=await admin.from("nba_extension_tokens").update({last_ping_at:new Date().toISOString()}).eq("token",token).eq("user_id",userId);
      if(pingError)return reply({error:"확장 연결 확인이 지연되고 있습니다."},503);
    }
    if(typeof body.id!=="string" || !body.id)return reply({success:true,userId});
    const {data:row,error}=await admin.from("nba_posts").select("id,status,research_summary,updated_at").eq("id",body.id).eq("user_id",userId).maybeSingle();
    if(error)return reply({error:"실행 상태를 확인하지 못했습니다."},503);
    if(!row)return reply({state:"missing"});
    const run=readExecution(row.research_summary);
    if(!ownsExecution(run,body.runId,token))return reply({error:"이전 실행 또는 다른 PC의 요청입니다. 보관함에서 현재 실행을 확인해 주세요.",code:"RUN_SUPERSEDED",state:"superseded"},409);
    if(row.status!=="publishing")return reply({state:row.status,execution:publicExecution(row.research_summary)});
    if(run && leaseExpired(run))return reply({error:"실행 연결이 끊겼습니다. 네이버 글·예약 목록을 확인한 뒤 보관함에서 복구해 주세요.",code:"LEASE_EXPIRED",state:"expired",execution:publicExecution(row.research_summary)},409);
    if(body.action!==undefined && !["heartbeat","stage","progress","waiting"].includes(body.action))return reply({error:"진행 요청 형식이 올바르지 않습니다."},400);
    if(run && body.action){
      let next;
      try{next=advanceExecution(run,body);}catch{return reply({error:"진행 단계·횟수·안내문을 확인해 주세요."},400);}
      next.updatedAt=nextTimestamp(row.updated_at,Date.parse(next.updatedAt));
      let query=admin.from("nba_posts").update({research_summary:withExecution(row.research_summary,next),updated_at:next.updatedAt})
        .eq("id",row.id).eq("user_id",userId).eq("status","publishing").eq(RUN_PATH,run.runId);
      if(row.updated_at)query=query.eq("updated_at",row.updated_at);
      const {data:saved,error:saveError}=await query.select("id").maybeSingle();
      if(saveError || !saved)return reply({error:"실행 연결 갱신을 확인하지 못했습니다. 입력을 멈추고 상태를 다시 확인해 주세요."},503);
      return reply({state:"running",runId:run.runId,leaseMs:Math.max(0,Date.parse(next.leaseExpiresAt)-Date.now()),execution:publicExecution(withExecution(null,next))});
    }
    return reply({state:"running",...(run?{runId:run.runId,leaseMs:Math.max(0,Date.parse(run.leaseExpiresAt)-Date.now()),execution:publicExecution(row.research_summary)}:{})});
  }catch{return reply({error:"실행 상태 확인이 지연되고 있습니다."},503);}
}
