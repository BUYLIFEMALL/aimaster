import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
export type WorkerBinding={memberId:string;jobId:string;accountId:string;deviceId:string;actorId:string;bodyHash:string;approvalRevision:number;generation:number};
export type WorkerTicket=WorkerBinding&{v:1;issuedAt:number;expiresAt:number;nonce:string};
const fields=['memberId','jobId','accountId','deviceId','actorId','bodyHash','approvalRevision','generation','v','issuedAt','expiresAt','nonce'];
const uuid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(v);
function valid(v:WorkerTicket,now:number){return v&&typeof v==='object'&&Object.keys(v).length===fields.length&&Object.keys(v).every(k=>fields.includes(k))&&
 ['memberId','jobId','accountId','deviceId'].every(k=>uuid(v[k as keyof WorkerTicket]))&&/^[a-z0-9_-]{1,50}$/.test(v.actorId)&&/^[a-f0-9]{64}$/.test(v.bodyHash)&&
 [v.approvalRevision,v.generation].every(n=>Number.isSafeInteger(n)&&n>0)&&v.v===1&&/^[a-f0-9]{64}$/.test(v.nonce)&&
 Number.isSafeInteger(v.issuedAt)&&Number.isSafeInteger(v.expiresAt)&&v.issuedAt<=now&&v.expiresAt>now&&v.expiresAt>v.issuedAt&&v.expiresAt-v.issuedAt<=60000;}
const signature=(payload:string,secret:string)=>createHmac('sha256',secret).update(`bncw1.${payload}`).digest('hex');
/** Server-only issuer. Never expose via member/reader endpoints or log tickets. */
export function issueWorkerTicket(binding:WorkerBinding,secret:string,now=Date.now()):string{
 const claims={...binding,v:1 as const,issuedAt:now,expiresAt:now+60000,nonce:randomBytes(32).toString('hex')};
 if(typeof secret!=='string'||secret.length<32||!valid(claims,now))throw Error('Worker ticket unavailable');
 const payload=Buffer.from(JSON.stringify(claims)).toString('base64url');return `bncw1.${payload}.${signature(payload,secret)}`;
}
export function verifyWorkerTicket(token:unknown,secret:unknown,now=Date.now()):WorkerTicket|null{
 if(typeof token!=='string'||token.length>2048||typeof secret!=='string'||secret.length<32)return null;
 const parts=token.split('.');if(parts.length!==3||parts[0]!=='bncw1'||!/^[A-Za-z0-9_-]+$/.test(parts[1])||!/^[a-f0-9]{64}$/.test(parts[2]))return null;
 if(!timingSafeEqual(Buffer.from(signature(parts[1],secret),'hex'),Buffer.from(parts[2],'hex')))return null;
 try{const raw=Buffer.from(parts[1],'base64url');if(raw.toString('base64url')!==parts[1])return null;const claims=JSON.parse(raw.toString('utf8'));return valid(claims,now)?Object.freeze(claims):null;}catch{return null;}
}
