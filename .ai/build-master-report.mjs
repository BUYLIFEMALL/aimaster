// Local, dependency-free report export. No product build, network, DB, or Git mutation.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const state = JSON.parse(read('.ai/master-status.json'));
const source = 'docs/PROGRAM_CAPABILITY_MAP.md';
const aliases = {
  'personality-code':'mbti','website-scraper':'ghost-scraper','ai-web-ui':'react-ui-showcase',
  'real-estate-sales':'real_estate_sales','auto-threads-posting':'threads','auto-shorts-posting':'shots',
  'music-automation':'music','auto-instagram-posting':'insta_auto_poster','kakao-auto-posting':'kakao_auto_poster',
  'web-crawler-saas':'web-crawler','tarot-reading':'tarot','naver-blog-auto-poster':'naver-blog-auto-poster_app',
  'naver-blog-auto-poster-web':'naver-blog-auto-poster_web'
};
const overrides = new Map(state.programOverrides.map(p => [p.slug, p]));
const programs = read(source).split(/\r?\n/).flatMap((line,i) => {
  const m = line.match(/^\|\s*(\d+)\s*\|\s*([^|]+)\|\s*`([^`]+)`\s*\|\s*(.*?)\s*\|\s*(v[^|]+)\|\s*([^|]+)\|/);
  if (!m) return [];
  const slug=m[3], folder=aliases[slug]??slug, o=overrides.get(slug);
  return [{sourceId:Number(m[1]),name:m[2].trim(),slug,folder,category:m[4].trim(),catalogVersion:m[5].trim(),
    catalogState:m[6].trim(),source:{path:source,line:i+1},owner:'既存担当の確認待ち',
    stage:'比較表の記録・現担当の再確認待ち',completed:'個別完了根拠の回収前',next:'既存担当・最新記録を確認してから作業を配分',
    ...o,reportedVersion:o?.reportedVersion??null,
    evidence:o?.evidence??`${source}:${i+1}`,evidenceLevel:o?.evidenceLevel??'一覧記録のみ・今回の実行確認なし'}];
});
// Korean labels are kept explicit, rather than inferring completion from absence of a pending marker.
for(const p of programs) if(!overrides.has(p.slug)) Object.assign(p,{owner:'기존 담당 확인 대기',stage:'비교표 기록·담당 재확인',
  completed:'개별 완료 근거 미회수',next:'기존 담당·최신 기록 대조 후 배정',evidenceLevel:'목록 기록만 확인·이번 실동작 검증 없음'});
const esm=overrides.get('esm-register');
if(esm&&!programs.some(p=>p.slug===esm.slug)) programs.push({sourceId:null,name:'G마켓·옥션 등록기',slug:esm.slug,folder:esm.slug,
  category:'이커머스 (현재 비공개)',catalogVersion:null,catalogState:'비교표 미등재 신규',source:{path:esm.evidence},...esm});
if(new Set(programs.map(p=>p.slug)).size!==programs.length) throw Error('Duplicate portfolio slug');
const missing = [...overrides.keys()].filter(k=>!programs.some(p=>p.slug===k));
if(missing.length) console.warn('Overrides not in summary (review slug): '+missing.join(', '));
const md=v=>String(v??'—').replaceAll('|','\\|').replaceAll('\n',' ');
const row=a=>'| '+a.map(md).join(' | ')+' |';
const table=(heads,rows)=>[row(heads),row(heads.map(()=>'---')),...rows.map(row)].join('\n');
const snap=new Date().toLocaleString('sv-SE',{timeZone:'Asia/Seoul'})+' KST';
const inspectionAt=state.monitoring?.lastInspection?.at;
const inspectionLabel=inspectionAt ? new Date(inspectionAt).toLocaleString('sv-SE',{timeZone:'Asia/Seoul'})+' KST' : '미기록';
const outsideInspection=state.monitoring?.outsideTurnAutomation?.enabled ? (state.monitoring.outsideTurnAutomation.kind === 'windows_scheduled_message' ? '30분 메시지 예약 활성화 · 현재 Master 터미널에서 점검' : '30분 Orca 예약 활성화 · 실제 실행/전달 상태는 monitoring 기록 참조') : '미설정';
const counts={};for(const t of state.tasks)counts[t.status]=(counts[t.status]??0)+1;
const intro=[
'# AIMaster 총괄 개발 플랜·작업 지휘표', '',
`기준: ${snap} · 총괄: Codex(Master), CX-MASTER-01 · 최종 결정권자: 주인님`, '',
'이 문서는 비교표 전체와 실제 담당 보고를 함께 정리한 작업판이다. 완료율은 산출하지 않는다. 담당 보고·Git·문서 확인과 Master의 제품 실동작 재시험을 구분한다. 실시간 화면이 아니라 아래 명령으로 갱신하는 스냅샷이다.', '',
`Master 마지막 실제 점검: ${inspectionLabel} · 실행 중 점검 주기: ${state.monitoring?.activeTurnIntervalMinutes ?? 5}분 · 턴 밖 자동 점검: ${outsideInspection}`, '',
`점검 범위: ${md(state.monitoring?.lastInspection?.scope ?? '미기록')} · 문서 생성 시각과 실제 점검 시각은 다르며 전체 서비스 운영 검증을 뜻하지 않는다.`, '',
`범위: 비교표 ${programs.filter(p=>p.sourceId!==null).length}개 + 신규 ESM 1개 = ${programs.length}개. 병합·폐지·비공개 기록도 누락 없이 포함한다. 메인 사이트·공통 보안/저장 정책은 별도 공통 업무다. 비교표의 '운영'은 지금 모든 기능이 검수 완료됐다는 의미가 아니다.`, '',
'[팀·실제 연결](../.ai/TEAM.md) · [수정 전 점유표](../.ai/FILE_OWNERSHIP.md) · [사람의 결정함](../.ai/decisions/DEC-20261116-001.md) · [전체 목록 CSV](MASTER_DEVELOPMENT_PLAN_20261116.csv) · [전체 목록 JSON](MASTER_DEVELOPMENT_PLAN_20261116.inventory.json)', '',
'## 지금 내린 지휘와 우선순위', '',
table(['순서','담당','진행 단계','다음 작업·통과 기준'],state.commandBoard?.map(x=>[x.order,x.owner,x.stage,x.next]) ?? [
['1 · 146 리뉴얼','Workspace + AGY + Mac Tester',overrides.get('ai-work-workspace')?.stage,overrides.get('ai-work-workspace')?.next],
['2 · 교환·결제 정합성','B2BBackend + Mac Tester','자동 구매확정/교환7일 후속0103·결제0104 분리','confirmed 정책 보완 독립검수·결제는 별도 준비기록 commit/unknown 복구 mock 단계, 운영·실결제 승인 아님'],
['3 · 달력 복사','Workspace + Mac Tester','취소·원자복제·엄격날짜 지정검수 PASS','코드 검수 완료·실DOM/배포 미검수, 146 실제 화면에서 달별 구분·240px와 함께 확인'],
['4 · ESM 안내','ecommerce + Mac Tester','썸네일 실등록·독립 이미지 PASS, 매뉴얼 소스 PASS','27ae+c909는 다음 v1.02 묶음 배포 대기·운영 가이드는 아직 v1.01·실ESM 등록 미검수'],
['5 · Lab 교환 실흐름','B2BBackend + Mac Tester','0102 적용·합성fixture 준비, verify12/13에서 3일 자동확정 충돌 발견','기존0102 재적용/강제상태복원 없음·새0103 패키지 검토 후 별도 적용·기존17주문/공용cron 수동변경0'],
['6 · 운영·배포 묶음','각 담당 + Master','부동산1.46 운영/guide/ZIP 독립 읽기PASS·다른 기승인 릴리스 유지','실회원 설치/첫회차 등 한계 분리·Music/Front/Workspace 작은 수정은 다음 묶음·같은 배포 반복 없음'],
['7 · 공통 운영','Master','메인 실행·맥 독립검수 v1.6','직접 지시와 Master 배정 취합·단일 담당/경로·타인 미커밋 보존·중복 실행 방지'],
['키트','Support · 주인님 전담','주인님이 Lab 설치·배포 직접 진행','Master 타업무 배정 제외. 기존 6회 예산을 다른 배포에 전용하지 않음'],
['공통','Master','편집 범위·공식 완료 통제','매 편집 직전 점유/status/diff→예약→재조회. 범위 추가는 Master 승인, 작업자는 ready_review로 제출']]),'',
'## 운영 순서', '',
'1. 담당 보고를 실제 SHA·현재 파일·기배포 근거와 대조한다. 잘못 보고된 전역 HEAD와 실제 작업 커밋을 구분한다.',
'2. 기본 기술 판단은 Master가 승인하고, 담당 한 명·정확 경로·완료조건으로 배정한다. 다른 역할 파일을 임의로 수정하지 않는다.',
'3. 작업자는 변경·검증·한계와 함께 ready_review로 반환한다. Master가 범위별 done/보완/다음 작업을 결정한다.',
'4. 유료 빌드·외부 쓰기·운영 DB·사람 인증은 이미 받은 승인 이력을 먼저 대조한다. 기존 승인에 없는 필수 결정만 사용자에게 취합한다.', '',
'## 완료를 정정한 항목', '',
'- B2B v1.09·v1.14 대기 표는 v1.15 배포 증거로 정정. 기존 프론트 5건/0095/S61은 재구현하지 않는다. 새 프론트 미배포는 5bfed663d로 분리했다.',
'- 음악 공통 6곳은 이미 배포됐다. 11-16의 사용자 직접 승인 5회 배포도 Ready 보고를 회수했고, 가사 MP4/플레이리스트 곡0개 화면은 실제 검증 근거를 받았다.',
'- ESM 웹 v1.01·11번가 실제 전송·영상v1.32 검수·단지2936·플레이리스트 첫30일 정리는 완료 기록이 있다. 옛 대기를 재요청하지 않는다.',
'- MOV/Blog의 커밋 보고가 같은 시각 다른 세션 HEAD를 가리켜 실제 파일 커밋으로 정정했다. 영상 efc72da60, 이웃 e35947191, 티스토리 a27861137이 기준이다.',
'- AG 정적 지적은 담당이 대조해 사실·추정을 구분했다. 실제 25MB 입력 검사 누락과 모바일 그리드는 수정, 자동 최적화/모든 WebP 애니메이션이라는 가정은 채택하지 않았다.', '',
'## 현재 작업 ID와 Master 처리', '',
`작업 기록 ${state.tasks.length}개: ${Object.entries(counts).map(([k,v])=>k+' '+v+'개').join(' · ')}. 아래 done은 해당 작업의 완료조건만 닫은 것이며 제품 전체 개발·배포 완료율이 아니다.`, '',
table(['작업 ID','담당','상태 / 전달','완료·진행 범위','Master의 다음 지휘'],state.tasks.map(t=>[t.task_id,t.owner,t.status+' / '+t.delivery,t.title,t.next])), '',
'## 현재 담당 회신이 확보된 프로젝트', '',
table(['프로젝트','담당','운영/후속 버전 (보고)','단계','완료 근거 요약','다음 작업'],programs.filter(p=>overrides.has(p.slug)).map(p=>[p.name,p.owner,p.reportedVersion??p.catalogVersion,p.stage,p.completed,p.next])), '',
'## 사람의 조치와 결정', '',
'기존 요청을 다시 만들지 않고 결정함에서 취합한다. Workspace v1.52·영상 v1.33·음악5회·상세페이지 v1.46은 담당에게 확인된 사용자 직접 승인 범위를 보존한다. QA 미통과나 안전성 미해결은 Master가 먼저 해결하며 새 승인을 요청할 이유로 바꾸지 않는다.', '',
table(['조건','필요한 사람의 일','추천 처리'],state.humanActions?.map(x=>[x.condition,x.action,x.recommendation]) ?? [
['카카오/카페/이웃/ESM 계정','관리자 로그인, 가입카페/받은신청 있는 본인계정, ESM 로그인·확장설치','기존 요청 유지·해당 검수 시 한 번만 안내'],
['볼타 Lab','본인 테스트 키 등록','운영키/다른회원키 폴백 없음·실발급은 지정 시험만'],
['B2B 다음 운영 묶음','0100 운영 적용+v1.16 1빌드 승인 범위 확인','415시험·권한/중복검증·Front 합의 뒤 묶음으로'],
['바나나/부동산 후속','기존 추가 빌드 승인 유무 대조','없으면 정확 묶음·1회 비용만 취합'],
['OS 화면 녹화','공유할 화면 직접 선택·권한 클릭','우회하지 않고 준비된 화면에서 사용자 조작'],
['외부조건/보류','API 신청 답장·실주문파일·유료생성 충전/필요시','기다리는 항목만 표시·임의 재실행 없음']]), '',
'## 전체 포트폴리오 목록', '',
'비교표의 버전·라이프사이클은 원문 기록이며 보고 버전이 있으면 함께 표시한다. 담당 회신이 없는 항목을 완료나 미담당으로 단정하지 않는다. 요약 번호 97 중복 때문에 최대번호로 프로그램 개수를 세지 않는다.', '',
table(['번호','프로그램 / slug','카테고리','비교표 버전 / 상태','최신 보고 버전','담당·단계','다음 작업'],programs.map((p,i)=>[i+1,p.name+' / '+p.slug,p.category,(p.catalogVersion??'신규')+' / '+p.catalogState,p.reportedVersion,p.owner+' · '+p.stage,p.next])), '',
'## 근거와 갱신', '',
'각 행의 원본 경로·줄, 보고근거·SHA·작업별 증거는 inventory JSON과 `.ai/master-status.json`에 있다. 전체 프로그램의 직접 운영 접속/실행·DB/유료 AI 재검증을 수행한 보고가 아니다. 담당 미응답·문서 충돌·실물 미검수는 그대로 남긴다.', '',
'```text', 'node .ai/build-master-report.mjs', '```', '',
'먼저 Master가 실제 보고·검토 결과를 `.ai/master-status.json`에 반영하고 이 명령으로 표를 내보낸다. 날짜만 새로 만들고 검증한 것으로 표시하지 않는다.', ''
].join('\n');
const csvCell=v=>'"'+String(v??'').replaceAll('"','""')+'"';
const csv=[['순번','프로그램','slug','폴더','카테고리','비교표 버전','비교표 상태','보고 버전','담당','현재단계','완료근거','다음작업','근거','확인수준'],
...programs.map((p,i)=>[i+1,p.name,p.slug,p.folder,p.category,p.catalogVersion,p.catalogState,p.reportedVersion,p.owner,p.stage,p.completed,p.next,p.evidence,p.evidenceLevel])]
.map(r=>r.map(csvCell).join(',')).join('\r\n')+'\r\n';
fs.writeFileSync(path.join(root,'docs/MASTER_DEVELOPMENT_PLAN_20261116.md'),intro);
fs.writeFileSync(path.join(root,'docs/MASTER_DEVELOPMENT_PLAN_20261116.csv'),'\ufeff'+csv);
fs.writeFileSync(path.join(root,'docs/MASTER_DEVELOPMENT_PLAN_20261116.inventory.json'),JSON.stringify({checkedAt:snap,method:state.method,monitoring:state.monitoring,count:programs.length,programs,tasks:state.tasks},null,2)+'\n');
console.log(`Master report exported: ${programs.length} programs / ${state.tasks.length} task records; runtime verification is not inferred.`);
