import json,pathlib,subprocess,datetime
out=pathlib.Path(__file__).parent;root=out.parents[1]
inventory=json.loads((out/'inventory.json').read_text(encoding='utf-8'))
latest=json.loads((out/'catalog-final-recheck.json').read_text(encoding='utf-8'))
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
rows=[]
for p in inventory['programs']:
 d=next(x for x in latest['programs'] if x['slug']==p['slug'])
 if p['version']!=d['version']:
  versions=[]
  for v in p['code_versions']:
   txt=subprocess.check_output(['git','show',head+':'+v['file']],cwd=root).decode('utf-8')
   import re
   m=re.search(r'APP_VERSION\s*=\s*[\'\"]([^\'\"]+)',txt)
   versions.append(m.group(1) if m else '미발견')
  rows.append({'slug':p['slug'],'initial_db':p['version'],'final_db':d['version'],'final_code':', '.join(versions),'head':head})
data={'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'analysis_base':inventory['source_revision'],'metadata_recheck_head':head,'changes':rows,'meaning':'Other CLI work during analysis. Catalog table uses rechecked public versions for these rows; source screening totals remain fixed baseline. This is not a defect.'}
(out/'updates-during-review.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(rows,ensure_ascii=False))
