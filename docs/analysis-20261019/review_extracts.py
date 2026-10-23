import json,pathlib,re,sys
p=pathlib.Path(__file__).parent
inventory=json.loads((p/'inventory.json').read_text(encoding='utf-8'))
groups=sys.argv[1:]
for row in inventory['programs']:
 if groups and row['category'] not in groups:continue
 print('\n'+row['slug']+' | '+row['version']+' | '+row['folder'])
 print('기능:',row['baseline_capabilities']['기능'][:210]);print('한계:',row['baseline_capabilities']['단점·한계'])
 ds=json.loads((p.parents[1]/'.vercel'/'analysis-20261019-extracts'/f"{row['slug']}.json").read_text(encoding='utf-8'))
 candidates=[d for d in ds if d['file'].endswith(('/IMPROVEMENTS.md','/IMPROVEMENT_BACKLOG.md'))]
 for d in candidates:
  lines=[l for l in d['text'].splitlines() if re.search('제안|미구현|미완료|TODO|보류|위험|실패|추가|단점|한계|P[012]|높음',l) and not l.startswith('#')]
  print(d['file'])
  for l in lines[-5:]:print(' ',l[:230])
 if not candidates:
  for d in ds:
   if d['file'].endswith('/AGENTS.md'):
    for l in [l for l in d['text'].splitlines() if re.search('TODO|미구현|남은|한계|제안|단점',l)][-3:]:print(' ',l[:210])
 print('분석 신호:',{k:v['count'] for k,v in row['signals'].items() if k not in ['auth_check','retention']})
