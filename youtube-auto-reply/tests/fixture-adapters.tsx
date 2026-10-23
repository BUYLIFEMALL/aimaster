import React from 'react';
declare global { interface Window { fixture: any; renderFixture: any; } }
export default function Link({href,children,...props}:any){return <a href={href} {...props}>{children}</a>;}
export function usePathname(){return window.fixture.pathname;}
export function useRouter(){return {refresh(){},push(){throw Error('Unexpected fixture navigation');}};}
export async function requireProgramAccess(){return {id:'fixture-owner',email:'fixture@example.test'};}
export const signOutAction=forbidden,postReplyAction=forbidden,skipReplyAction=forbidden;
export const syncCommentsAction=forbidden,syncVideosAction=forbidden;
export const toggleVideoMonitorAction=forbidden,hideVideoAction=forbidden,setVideoLinkAction=forbidden;
export const bulkSetMonitorAction=forbidden,bulkHideAction=forbidden,unhideVideoAction=forbidden;
async function forbidden(){window.fixture.actions++;throw Error('External actions disabled in fixture');}
export async function createClient(){return {from(table:string){
 const q:any={table,filters:[],options:{},limit:null};
 const b:any={select(_columns:any,options:any={}){q.options=options;return b;},eq(k:any,v:any){q.filters.push([k,v]);return b;},in(k:any,v:any){if(!v.length||v.includes('__none__'))throw Error('Invalid empty UUID lookup');q.filters.push([k,v]);return b;},gte(k:any,v:any){q.filters.push([k,{gte:v}]);return b;},order(){return b;},limit(n:any){q.limit=n;return b;},maybeSingle(){q.single=true;return b;},then(resolve:any,reject:any){
  window.fixture.queries.push(q);let rows=[...(window.fixture.data[table]||[])];
  for(const [k,v] of q.filters)rows=rows.filter((r:any)=>Array.isArray(v)?v.includes(r[k]):v&&typeof v==='object'?r[k]>=v.gte:r[k]===v);
  const count=rows.length;if(q.limit!==null)rows=rows.slice(0,q.limit);
  return Promise.resolve({data:q.options.head?null:q.single?rows[0]??null:rows,count,error:null}).then(resolve,reject);
 }};return b;
}};}
