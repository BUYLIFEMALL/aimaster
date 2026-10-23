"""Add only this analysis' documentation sections; skip folders with pre-existing tracked changes."""
import json,pathlib,subprocess
from proposal_data import ISSUES,MERGES
OUT=pathlib.Path(__file__).parent;ROOT=OUT.parents[1]
programs=json.loads((OUT/'inventory.json').read_text(encoding='utf-8'))['programs'];by={p['slug']:p for p in programs}
title='## 2026-10-19 플랫폼 분석 — 추가 검토·개발 제안 (미구현)'
targets=sorted({s for f in ISSUES for s in f['targets'] if s!='AIMaster'})
result=[]
for slug in targets:
 p=by[slug];folder=ROOT/p['folder']
 dirty=subprocess.check_output(['git','status','--porcelain','--untracked-files=no','--',p['folder']],cwd=ROOT).decode('utf-8').strip()
 if dirty:
  result.append({'slug':slug,'folder':p['folder'],'status':'skipped_existing_tracked_changes','note':'Preserve other CLI work; findings remain in central report.'});continue
 findings=[f for f in ISSUES if slug in f['targets']];merges=[m for m in MERGES if slug in m['sources']]
 relative='docs/IMPROVEMENT_HANDOFF_20261019_ANALYSIS.md';dest=folder/relative
 dest.parent.mkdir(exist_ok=True)
 body=f'# {p["name"]} — 2026-10-19 전수 분석 인수인계\n\n이번은 분석·제안만 작성했고 프로그램 코드/운영/DB/키/버전을 변경하지 않았습니다. 실제 버전·운영 적용 여부는 착수 전에 최신 인수인계/DB와 재대조합니다.\n\n'
 body+='## 발견·미완료\n\n| ID/우선 | 항목 | 확인 수준 | 다음 첫 단계 |\n|---|---|---|---|\n'
 for f in findings:body+=f'| {f["id"]} {f["priority"]} | {f["title"]} | {f["status"]} | {f["fix"].replace("|","/")} |\n'
 body+='\n상세 관찰·영향·승인·검수 기준은 [전체 보고서](../../docs/analysis-20261019/REPORT.md)의 같은 F-ID에 있습니다. 기록 자체는 DB/기존자료 삭제/유료호출/신규개발 승인이나 완료 증거가 아닙니다.\n\n'
 body+='## 기능·연계/병합 제안\n\n'
 for m in merges:body+=f'- **{m["id"]} {m["name"]}**: {m["mvp"]}. {m["risk"]}. 제안·미구현.\n'
 body+='\n## 다음 CLI\n\n루트 지침→ACTIVE/HANDOFF→프로그램 AGENTS/README→위 F-ID 최신 재현→개발 플랜 순서. 본인 계정/키·회원격리·생성일30일·기존 작업 보존 원칙을 지킵니다. 같은 폴더가 작업 중이면 시작하지 않습니다. 기존 작업 대체/판단 어려움은 원본 보존 후 주인님 확인. DB/키/기존자료 처리는 필요한 승인을 먼저 확인합니다.\n\n'
 body+='완료한 것: 분석/근거/수정 방향/검수 기준/협업 연결 문서. 미완료한 것: 제시된 수정·실제 회원/유료 API/렌더 검수·운영 배포.\n\n'+p['app_url']+'\n'
 dest.write_text(body,encoding='utf-8')
 paths=[str(dest.relative_to(ROOT)).replace('\\','/')]
 block=f'\n{title}\n\n'+', '.join(f'{f["id"]}({f["priority"]})' for f in findings)+'를 운영 설정/코드/조건부 위험과 구분해 기록했습니다. **수정·DB적용·배포는 미실행**입니다. [프로그램별 발견·다음 첫 단계](docs/IMPROVEMENT_HANDOFF_20261019_ANALYSIS.md) · [전체 분석/병합 제안](../docs/analysis-20261019/REPORT.md). 주인님 지정 작업과 최신 구현을 대조한 뒤 플랜부터 제시합니다.\n'
 for name in ['AGENTS.md','README.md']:
  f=folder/name
  if f.exists():
   txt=f.read_text(encoding='utf-8-sig')
   if title not in txt:f.write_text(txt.rstrip()+'\n'+block,encoding='utf-8')
   paths.append(str(f.relative_to(ROOT)).replace('\\','/'))
 f=folder/'docs/IMPROVEMENTS.md';txt=f.read_text(encoding='utf-8-sig') if f.exists() else '# 개선사항 원장\n'
 own='\n'+title+'\n\n'+', '.join(f'{v["id"]}: {v["title"]}' for v in findings)+' — 제안·미수정. 운영 설정/코드/조건부를 구분한 [분석 인수인계](IMPROVEMENT_HANDOFF_20261019_ANALYSIS.md)와 공통 보고서의 검수/승인 기준을 확인합니다. 이미 구현된 내용은 새 결함으로 되돌리지 않습니다.\n'
 if title not in txt:f.write_text(txt.rstrip()+'\n'+own,encoding='utf-8')
 paths.append(str(f.relative_to(ROOT)).replace('\\','/'))
 result.append({'slug':slug,'folder':p['folder'],'status':'analysis_handoff_added_no_product_change','paths':paths})
(OUT/'program-handoff-links.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'written':sum(r['status'].startswith('analysis') for r in result),'skipped':[r['slug'] for r in result if r['status'].startswith('skipped')]},ensure_ascii=False))
