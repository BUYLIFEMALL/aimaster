import type {ExecutionJob} from './approvedWork';
export function jobMatchesBrowserUrl(job:Pick<ExecutionJob,'kind'|'actor_id'|'neighbor_id'|'post_id'>,value:string){
 try{
  const u=new URL(value);if(u.protocol!=='https:'||u.hostname!=='blog.naver.com'||u.username||u.password||u.port||u.hash)return false;
  if(job.kind==='request')return u.pathname==='/BuddyAddForm.naver'&&u.searchParams.getAll('blogId').length===1&&u.searchParams.get('blogId')===job.neighbor_id;
  let actor,post;const m=/^\/([a-z0-9_-]{1,50})\/(\d{1,30})\/?$/.exec(u.pathname);
  if(m&&!u.search){[,actor,post]=m;}
  else if(u.pathname==='/PostView.naver'&&u.searchParams.getAll('blogId').length===1&&u.searchParams.getAll('logNo').length===1){actor=u.searchParams.get('blogId');post=u.searchParams.get('logNo');}
  return actor===(job.kind==='reply'?job.actor_id:job.neighbor_id)&&post===job.post_id;
 }catch{return false;}
}
