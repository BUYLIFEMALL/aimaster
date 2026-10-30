import {createExtensionSchedule} from './schedule-bridge.mjs';
export const ACCEPT_SCHEDULE_ALARM='bnc-incoming-accept-schedule';
/** Explicit foreground current-page acceptance only. It never reads new
 * invitations, makes drafts, approves them, navigates or calls an AI. */
export function createAcceptSchedule(browser,identity,acceptance,now=Date.now,popupFocused=async()=>false){
 const normalized=r=>r.phase==='idle'?r:{...r,phase:r.state==='idle'?'idle':['succeeded','skipped'].includes(r.state)?'done':'unsettled',resultState:r.state};
 return createExtensionSchedule(browser,identity,{
  status:async()=>normalized(await acceptance.status()),
  stop:()=>acceptance.stop(true),
  start:async()=>normalized(await acceptance.start({scheduled:true})),
 },now,popupFocused,{alarm:ACCEPT_SCHEDULE_ALARM,storageKey:'acceptSchedule',host:'admin.blog.naver.com',progressType:'accept_schedule_progress',subject:'현재 페이지 신청'});
}
