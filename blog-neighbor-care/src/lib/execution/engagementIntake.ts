// Trusted, permitted reader intake only. No member route accepts observations.
export type EngagementScope={memberId:string;accountId:string;deviceId:string;actorId:string};
export type IncomingComment={accountId:string;actorId:string;neighborId:string;ownPostId:string;commentId:string;returnPostId:string|null;returnPostOwnerId?:string;
 checkedAt:number;restriction:'none'|'login'|'captcha'|'platform';parentIsTopLevel:boolean;alreadyReplied:boolean|null};
type Dependencies={authorize:(id:string)=>Promise<boolean>;connected:(scope:Readonly<EngagementScope>)=>Promise<boolean>;permitted:()=>Promise<boolean>;
 adapter:{inspect:()=>Promise<IncomingComment>;assertCurrent:(snapshot:Readonly<IncomingComment>)=>Promise<boolean>};
 save:(scope:Readonly<EngagementScope>,snapshot:Readonly<IncomingComment>)=>Promise<unknown>;stop:(id:string)=>Promise<unknown>;now?:()=>number};
const uuid=(s:unknown)=>typeof s==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(s);
const blog=(s:unknown)=>typeof s==='string'&&/^[a-z0-9_-]{1,50}$/.test(s);
const post=(s:unknown)=>typeof s==='string'&&/^\d{1,30}$/.test(s);
export async function captureIncomingComment(input:EngagementScope,d:Dependencies){
 const scope=Object.freeze({...input}),now=d.now??Date.now;
 const blocked=(reason:string)=>({status:'blocked' as const,reason,externalActions:0 as const});
 if(![scope.memberId,scope.accountId,scope.deviceId].every(uuid)||!blog(scope.actorId))return blocked('invalid_scope');
 const allowed=async()=>await d.authorize(scope.memberId)===true&&await d.connected(scope)===true&&await d.permitted()===true;
 try{
  if(!await allowed())return blocked('read_not_permitted');
  const snapshot=Object.freeze({...await d.adapter.inspect()});
  if(!await allowed())return blocked('read_authorization_changed');
  const current=()=>Number.isFinite(snapshot.checkedAt)&&snapshot.checkedAt<=now()&&snapshot.checkedAt>now()-30000;
  if(snapshot.accountId!==scope.accountId||snapshot.actorId!==scope.actorId||!blog(snapshot.neighborId)||snapshot.neighborId===scope.actorId||
   !post(snapshot.ownPostId)||!/^[a-zA-Z0-9_-]{1,128}$/.test(snapshot.commentId)||!current())return blocked('source_context_changed');
  if(snapshot.restriction!=='none'){await d.stop(scope.memberId);return blocked('platform_restricted');}
  if(!snapshot.parentIsTopLevel||snapshot.alreadyReplied!==false||!(snapshot.returnPostId===null||
   (post(snapshot.returnPostId)&&snapshot.returnPostOwnerId===snapshot.neighborId)))return blocked('source_unverified');
  if(!await d.adapter.assertCurrent(snapshot)||!await allowed()||!current())return blocked('source_context_changed');
  await d.save(scope,snapshot);return {status:'captured' as const,externalActions:0 as const};
 }catch{return blocked('capture_unconfirmed');}
}
