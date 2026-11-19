import { randomUUID } from 'node:crypto';
import { readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const boardPath = fileURLToPath(new URL('../.ai/master-status.json', import.meta.url));
const json = name => JSON.parse(readFileSync(name, 'utf8').replace(/^\uFEFF/, ''));
export function renderDashboard(root) {
const board = json(boardPath);
const checkpoint = json(path.join(root, 'CHECKPOINT.json'));
const log = readFileSync(path.join(root, 'events.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const events = log.filter(e => !e.stale && e.seq <= checkpoint.lastSequence);
if (checkpoint.lastSequence && !log.some(e => e.seq === checkpoint.lastSequence)) {
  throw new Error('체크포인트와 이벤트 순번 불일치. 기존 대시보드를 유지합니다.');
}
const generated = new Date();
const label = { done:'완료', cancelled:'취소', ready_review:'검수 요청', running:'진행', waiting_human:'사람 대기', superseded:'대체', reviewing:'검수 중', queued:'순번 대기' };
const phases = { delivered:'전달 확인', accepted:'수락', failed:'실패', assigned:'발송 준비', planned:'계획 반영', verified:'검증', integrated:'통합', review:'검수', applied:'적용', received:'접수', add:'추가', change:'변경', priority:'우선순위', resume:'재개', stop:'중지' };
const roleNames = {'CX-MASTER-01':'Master','CX-QA-01':'맥미니 Tester','ADMIN-TESTER':'AdminPC Tester','AG-UI-01':'디자인','CC-MUSIC-01':'음악','CC-MOVIE-01':'영상','CC-REALTY-01':'부동산','CC-ECOM-01':'이커머스','CC-BLOG-01':'블로그','CC-SNS-01':'SNS','CC-SUPPORT-01':'키트 지원','CC-B2B-FRONT-01':'B2B 프런트','CC-B2B-BACK-01':'B2B 백엔드','CC-WORKSPACE-01':'Workspace'};
const entities = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
function html(input) {
  return String(input ?? '').replace(/[\x00-\x1f]/g,' ')
    .replace(/(?:https?|postgres(?:ql)?):\/\/\S+|[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[주소 생략]')
    .replace(/(?:bearer|basic)\s+[\w.+/=:-]+|\b(?:sk-[\w-]{10,}|gh[pousr]_[\w]{10,}|eyJ[\w-]+\.[\w-]+\.[\w-]+)/gi, '[값 생략]')
    .replace(/(?:["']?(?:pass(?:word|phrase)|otp|api[_ -]?key|access[_ -]?token|refresh[_ -]?token|token|secret|비밀번호|인증번호|인증코드|토큰)["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,'[값 생략]')
    .replace(/\b\d{6}\b/g,'[숫자 생략]').replace(/[&<>"']/g, c=>entities[c]);
}
const timeFormatter = new Intl.DateTimeFormat('ko-KR', { timeZone:'Asia/Seoul', dateStyle:'short', timeStyle:'medium', hour12:false });
function time(stamp) {
  const date = stamp && new Date(stamp);
  return date && Number.isFinite(+date) ? timeFormatter.format(date) : '시각 미확인';
}
const counts = new Map();
for (const t of board.tasks) counts.set(t.status,(counts.get(t.status) || 0) + 1);
const assignments = new Map();
for (const e of events) {
  if (e.stage === 'assigned') assignments.set(e.task, { claim:e, stages:new Set(), last:e });
  const entry = assignments.get(e.task);
  if (entry && entry.claim.assignment === e.assignment && entry.claim.attempt === e.attempt && entry.claim.cmd === e.cmd) {
    entry.stages.add(e.stage);
    entry.last = e;
  }
}
const entries = [...assignments.values()];
const numStage = stage => entries.filter(e => e.stages.has(stage)).length;
const latestFor = owner => entries.filter(e => e.claim.actor === owner).sort((a,b)=>b.last.seq-a.last.seq)[0];
const overview = [['전체 작업',board.tasks.length],['진행',counts.get('running')||0],['검수', (counts.get('ready_review')||0)+(counts.get('reviewing')||0)],['주인님 확인 대기',counts.get('waiting_human')||0]];
const roleRows = [...board.sessionReviews, {owner:'CX-MASTER-01',state:'통합·최종 판정',next:checkpoint.state==='PAUSED_BY_ADMIN'?'재개 지시 확인':'선행 조건·점유 대조 후 배정 또는 독립 검수'},
  {owner:'ADMIN-TESTER',state:'고부하 로컬 모델 전담',next:'해당 시험이 준비되면 배정'}];
const kpi = overview.map(([name,value])=>`<div class="kpi"><span>${html(name)}</span><strong>${value}</strong></div>`).join('');
const breakdown = [...counts].map(([k,v])=>`<span>${html(label[k] || k)} <b>${v}</b></span>`).join('');
const options = [...counts.keys()].map(k=>`<option value="${html(k)}">${html(label[k]||k)}</option>`).join('');
const closed = new Set(['done','cancelled','superseded']);
const taskRows = board.tasks.map(t=>`<tr data-status="${html(t.status)}" data-open="${!closed.has(t.status)}"><td><b>${html(t.title)}</b><small>${html(t.task_id)}</small></td><td>${html(roleNames[t.owner]||t.owner)}</td><td>${html(label[t.status]||t.status)}</td><td>${html(t.next||'—')}</td></tr>`).join('');
const roles = roleRows.map(r=>{
  const entry = latestFor(r.owner);
  return `<tr><td><b>${html(roleNames[r.owner]||r.owner)}</b><small>${html(r.owner)}</small></td><td>${html(r.state)}</td><td>${html(r.next)}</td><td>${entry?html(phases[entry.last.stage]||entry.last.stage):'기록 없음'}</td></tr>`;
}).join('');
const actionRows = board.humanActions.map(h=>`<tr><td><b>${html(h.condition)}</b></td><td>${html(h.action)}</td><td>${html(h.recommendation)}</td></tr>`).join('');
const page = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AIMaster 운영 현황</title>
<style>
:root{color-scheme:light;--ink:#142e32;--line:#d4dedd;--paper:#fcfdfb;--green:#066b58}*{box-sizing:border-box}body{margin:0;background:#eff3ef;color:var(--ink);font:15px/1.55 "Malgun Gothic",system-ui,sans-serif}main,header>div{max-width:1360px;margin:auto;padding:22px clamp(14px,4vw,64px)}header{background:#123b38;color:white}header nav{display:flex;gap:20px;flex-wrap:wrap}a{color:inherit}h1{font-size:clamp(26px,4vw,42px);margin:0 0 5px;letter-spacing:-.04em}h2{font-size:22px;margin:0}p{margin:6px 0 12px}section{background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:clamp(12px,2vw,24px);margin:14px 0;scroll-margin:12px}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.kpi{background:var(--paper);border:1px solid var(--line);border-top:3px solid var(--green);border-radius:8px;padding:12px 18px}.kpi strong{display:block;font-size:32px;color:var(--green);font-variant-numeric:tabular-nums}.badges,form{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.badges span{background:#eaf2ee;padding:3px 9px;border-radius:5px}input,select,button{font:inherit;border:1px solid #79938d;border-radius:5px;background:white;padding:7px;color:var(--ink)}input{min-width:200px}button{cursor:pointer}button:focus-visible,input:focus-visible,select:focus-visible,a:focus-visible{outline:3px solid #d8690a}small{display:block;font-size:12px;color:#4f6363;overflow-wrap:anywhere}.scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;margin-top:8px;text-align:left}th,td{padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}th{color:#425954;font-size:13px;background:#edf3ef}td{overflow-wrap:anywhere}td:first-child{min-width:140px}footer{font-size:13px;color:#425954}@media(max-width:700px){.kpis{grid-template-columns:1fr 1fr;gap:6px}.scroll table{min-width:580px}input{min-width:0;width:100%}main{padding-top:10px}}
</style></head><body><header><div><h1>AIMaster 운영 현황</h1><p>생성 ${time(generated)} KST · 공식 작업표 마지막 점검 ${time(board.monitoring?.lastInspection?.at||board.checkedAt)} KST</p><nav><a href="#roles">담당 세션</a><a href="#human">주인님 요청</a><a href="#tasks">전체 작업</a></nav></div></header><main>
<div class="kpis">${kpi}</div><section><h2>하네스 배정</h2><p>현재 배정 회차 ${entries.length}건 · 전달 확인 ${numStage('delivered')}건 · 담당자 수락 ${numStage('accepted')}건 · 실패 기록 ${numStage('failed')}건</p>
<p>최근 지시 ${html(checkpoint.lastCommand || '없음')} · ${html(phases[checkpoint.lastCommandStage]||checkpoint.lastCommandStage||'기록 없음')} · 이벤트 ${checkpoint.lastSequence}번 · ${time(events.at(-1)?.stamp)} KST</p><div class="badges">${breakdown}</div></section>
<section id="roles"><h2>담당 세션 · ${roleRows.length}</h2><div class="scroll"><table><thead><tr><th>역할</th><th>공식 기록</th><th>다음 행동</th><th>최근 하네스 단계</th></tr></thead><tbody>${roles}</tbody></table></div></section>
<section id="human"><h2>주인님 요청 원장 · ${board.humanActions.length}</h2><p>조건이 충족된 항목부터 Master가 현재 필요한 조치를 확인합니다.</p><div class="scroll"><table><thead><tr><th>조건</th><th>요청 행동</th><th>추천안</th></tr></thead><tbody>${actionRows}</tbody></table></div></section>
<section id="tasks"><h2>전체 작업</h2><form onsubmit="return false"><label>검색 <input id="search" type="search" placeholder="작업 번호, 이름, 담당"></label><label>상태 <select id="state"><option value="OPEN">미완료</option><option value="ALL">모두</option>${options}</select></label><output id="shown" aria-live="polite"></output></form><div class="scroll"><table><thead><tr><th>작업</th><th>담당</th><th>상태</th><th>다음 행동</th></tr></thead><tbody id="rows">${taskRows}</tbody></table></div></section>
<footer>새로 고침으로 최근 생성본을 확인할 수 있습니다. <button type="button" id="reload">새로 고침</button></footer></main>
<script>const q=document.querySelector('#search'),s=document.querySelector('#state'),out=document.querySelector('#shown');function filter(){let count=0;const term=q.value.trim().toLowerCase();for(const row of document.querySelectorAll('#rows tr')){row.hidden=!(s.value==='ALL'||s.value==='OPEN'&&row.dataset.open==='true'||row.dataset.status===s.value)||!row.textContent.toLowerCase().includes(term);if(!row.hidden)count++}out.textContent=count+'건 표시'}q.addEventListener('input',filter);s.addEventListener('change',filter);document.querySelector('#reload').addEventListener('click',()=>location.reload());filter()</script></body></html>`;
const destination = path.join(root,'dashboard.html');
const temporary = destination+'.'+randomUUID()+'.tmp';
try {
  writeFileSync(temporary,page,{flag:'wx',flush:true});
  renameSync(temporary,destination);
} finally {
  rmSync(temporary,{force:true});
}
return {destination,tasks:board.tasks.length,roles:roleRows.length,human:board.humanActions.length,assignments:entries.length,delivered:numStage('delivered'),accepted:numStage('accepted'),failed:numStage('failed')};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(process.env.AIMASTER_CONTROL_ROOT || 'D:/AIMaster-Control/AIMaster');
  console.log(JSON.stringify(renderDashboard(root)));
}
