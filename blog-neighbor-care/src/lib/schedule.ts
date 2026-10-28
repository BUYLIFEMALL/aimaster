// Adapted from real_estate_sales/src/lib/publicdata/schedule.ts: KST and
// overnight-window semantics only. No collector, credentials or dispatch code.
export type SchedulePreferences={interval_minutes:number;start_minute:number;end_minute:number};
const MINUTE=60000,DAY=24*60*MINUTE,KST=9*60*MINUTE;
export function validSchedule(value:unknown):value is SchedulePreferences{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const p=value as SchedulePreferences;
 return Number.isInteger(p.interval_minutes)&&(p.interval_minutes===30||(p.interval_minutes>=60&&p.interval_minutes<=1440&&p.interval_minutes%60===0))&&
  Number.isInteger(p.start_minute)&&p.start_minute>=0&&p.start_minute<1440&&Number.isInteger(p.end_minute)&&p.end_minute>=0&&p.end_minute<1440;
}
export function withinSchedule(minute:number,p:SchedulePreferences):boolean{
 if(!validSchedule(p)||!Number.isInteger(minute)||minute<0||minute>=1440)return false;
 return p.start_minute===p.end_minute|| (p.start_minute<p.end_minute?minute>=p.start_minute&&minute<p.end_minute:minute>=p.start_minute||minute<p.end_minute);
}
/** A hypothetical next check from now, never a backlog of missed runs. */
export function nextSchedulePreview(now:number,p:SchedulePreferences):string{
 if(!Number.isFinite(now)||!validSchedule(p))throw new Error('주기와 한국 시간대를 확인해 주세요.');
 const candidate=now+p.interval_minutes*MINUTE,local=candidate+KST,day=Math.floor(local/DAY)*DAY,minute=Math.floor((local-day)/MINUTE);
 if(withinSchedule(minute,p))return new Date(candidate).toISOString();
 const tomorrow=p.start_minute<p.end_minute&&minute>=p.end_minute;
 return new Date(day+(tomorrow?DAY:0)+p.start_minute*MINUTE-KST).toISOString();
}
