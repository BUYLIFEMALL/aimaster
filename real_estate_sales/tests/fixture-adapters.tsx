// Isolated fixture only: never imported from production routes.
import React from 'react';
declare global {interface Window {fixture:any}}
export default function Link({children,href,...props}:any){return <a href={href} {...props}>{children}</a>;}
export function notFound():never{throw Error('Fixture missing');}
export async function requireUser(){return {id:'fixture-owner'};}
export async function ensureListingAnalysis(){window.fixture.analysisChecks++;}
export async function reanalyzeListingAction(){throw Error('Paid action forbidden in fixture');}
export async function createClient(){return {from(table:string){
  let single=false;const filters:any[]=[];const q:any={};
  q.select=()=>q;q.eq=(k:string,v:any)=>{filters.push([k,v]);return q;};q.order=()=>q;q.maybeSingle=()=>{single=true;return q;};
  q.then=(ok:any,fail:any)=>{
    window.fixture.queries.push({table,filters});
    const rows=(window.fixture.data[table]??[]).filter((r:any)=>filters.every(([k,v])=>r[k]===v));
    return Promise.resolve({data:single?rows[0]??null:rows,error:null}).then(ok,fail);
  };return q;
}};}
