"""Read-only committed-source inventory. Never reads .env, member rows or credentials."""
import json,re,subprocess,pathlib,collections,hashlib,datetime
ROOT=pathlib.Path(__file__).resolve().parents[2]; OUT=pathlib.Path(__file__).parent
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT).decode('utf-8',errors='replace')
BASE=git('rev-parse','HEAD').strip();paths=git('ls-tree','-r','--name-only',BASE).splitlines()
dirty=set(git('diff','--name-only',BASE).splitlines());cache={}
def read(p):
 if p not in cache:
  try:cache[p]=git('show',BASE+':'+p) if p in dirty else (ROOT/p).read_text(encoding='utf-8-sig',errors='replace')
  except (OSError,subprocess.CalledProcessError):cache[p]=''
 return cache[p]
cat=json.loads((OUT/'catalog-db.json').read_text(encoding='utf-8'))['programs'];cap=read('docs/PROGRAM_CAPABILITY_MAP.md');design=read('DESIGN.md')
cards={m.group(1):m.group(2) for m in re.finditer(r'^#### .*?\(`([^`]+)`\)\n([\s\S]*?)(?=^#### |^### |\Z)',cap,re.M)}
alias={'naver-blog-seo-studio':'naver-blog-seo-studio','website-scraper':'ghost-scraper','web-crawler-saas':'web-crawler','auto-instagram-posting':'insta_auto_poster','auto-threads-posting':'threads','kakao-auto-posting':'kakao_auto_poster','real-estate-sales':'real_estate_sales','personality-code':'mbti','tarot-reading':'tarot','auto-shorts-posting':'shots','ai-web-ui':'react-ui-showcase','naver-blog-auto-poster':'naver-blog-auto-poster_app','naver-blog-auto-poster-web':'naver-blog-auto-poster_web'}
rules={
 'env_ai':r'process\.env\.(?:OPENAI_API_KEY|GEMINI_API_KEY|ANTHROPIC_API_KEY|YOUTUBE_API_KEY|PERPLEXITY_API_KEY)',
 'local_storage':r'localStorage\.(?:setItem|getItem)|indexedDB',
 'fetch_url':r'fetch\(\s*(?:url|targetUrl|sourceUrl|imageUrl|inputUrl|body\.url)',
 'html_sink':r'dangerouslySetInnerHTML|iframe[^\n]*srcDoc|\.innerHTML\s*=',
 'blank_catch':r'catch\s*(?:\([^)]*\))?\s*\{\s*\}',
 'cap_1000':r'\.limit\(\s*(?:50|100|1000)\s*\)',
 'auth_check':r'checkProgramAccessApi|requireProgramAccess|requireUser|auth\.getUser',
 'retention':r'30\s*\*\s*24|30 days|30日|30일|RETENTION|retention|expires_at|expiresAt',
 'scheduler':r'CRON_SECRET|cron|schedule|scheduled_at|scheduledAt',
 'idempotency':r'idempotenc|idempotent|skipDuplicates|onConflict|claim.*(?:job|task)|processing_token',
 'timeout':r'AbortSignal\.timeout|AbortController|timeoutMs|timeout_ms',
}
programs=[]
for p in cat:
 slug=p['slug'];card=cards.get(slug,'');m=re.search(r'주소·폴더:.*?`([^`]+?)/`',card);folder=alias.get(slug,m.group(1) if m else slug)
 if not any(q.startswith(folder+'/') for q in paths):folder=slug
 own=[q for q in paths if q.startswith(folder+'/') and not any(x in q.split('/') for x in ['node_modules','.next','.vercel','.git','vendor','dist','build'])]
 source=[q for q in own if re.search(r'\.(?:tsx?|jsx?|mjs|cjs|py|sql)$',q) and not re.search(r'/(?:docs|tests?|scripts|supabase/\.temp)/',q) and not q.endswith(('package-lock.json','next-env.d.ts'))]
 docs=[q for q in own if q.endswith('.md') and (q in [folder+'/AGENTS.md',folder+'/README.md',folder+'/CLAUDE.md'] or '/docs/' in q)]
 hits=collections.defaultdict(list);tables=set();loc=0;versions=[]
 for q in source:
  txt=read(q);lines=txt.splitlines();loc+=len(lines)
  if q.endswith('/version.ts'):
   vm=re.search(r'APP_VERSION\s*=\s*[\'\"]([^\'\"]+)',txt)
   if vm:versions.append({'file':q,'version':vm.group(1)})
  tables.update(re.findall(r'\.from\(\s*[\'\"]([a-zA-Z_][a-zA-Z_0-9]*)[\'\"]',txt))
  for k,pat in rules.items():
   for i,line in enumerate(lines,1):
    if re.search(pat,line,re.I):hits[k].append({'file':q,'line':i})
 routes=[q for q in source if re.search(r'/api/.*/route\.(?:ts|js)$',q)]
 docs_text=[]
 for q in docs:
  if q.endswith(('/AGENTS.md','/README.md','/IMPROVEMENTS.md','/IMPROVEMENT_BACKLOG.md')) or 'HANDOFF_2026101' in q:
   text=read(q);docs_text.append({'file':q,'text':text})
 fields={}
 for k in ['차별점','기능','장점','단점·한계','키·계정·주의']:
  mm=re.search(r'^- \*\*'+re.escape(k)+r'\*\*:\s*(.*)$',card,re.M);fields[k]=mm.group(1) if mm else ''
 designrow=next((l for l in design.splitlines() if l.startswith('| ') and ('`'+slug+'`') in l),'')
 tests=[q for q in own if re.search(r'/(?:tests?|__tests__)/',q) and re.search(r'\.(?:mjs|cjs|ts|tsx|py)$',q)]
 pkg=[]
 for q in own:
  if q.endswith('/package.json') and len(q.split('/'))<=4:
   try:
    d=json.loads(read(q));pkg.append({'file':q,'version':d.get('version'),'next':d.get('dependencies',{}).get('next'),'test_scripts':{k:v for k,v in d.get('scripts',{}).items() if 'test' in k or k in ['lint','build']}})
   except ValueError:pass
 programs.append({**p,'folder':folder,'baseline_capabilities':fields,'code_versions':versions,'packages':pkg,'source_files':len(source),'source_lines':loc,'api_routes':len(routes),'routes':routes,'table_names':sorted(tables),'docs':docs,'test_files':len(tests),'design_record':designrow,'signals':{k:{'count':len(v),'locations':v[:35]} for k,v in hits.items()}})
 extracts=ROOT/'.vercel'/'analysis-20261019-extracts';extracts.mkdir(exist_ok=True)
 (extracts/f'{slug}.json').write_text(json.dumps(docs_text,ensure_ascii=False,indent=2),encoding='utf-8')
result={'date':'2026-10-19','source_revision':BASE,'method':'Committed source; dirty tracked files read from fixed revision. Pattern hits are screening signals, not confirmed vulnerabilities. No full paid/runtime audit.','programs':programs}
(OUT/'inventory.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
summary=[{'slug':p['slug'],'folder':p['folder'],'db':p['version'],'code':','.join(v['version'] for v in p['code_versions']),'src':p['source_files'],'routes':p['api_routes'],'tests':p['test_files'],'docs':len(p['docs']),'env_ai':p['signals'].get('env_ai',{}).get('count',0)} for p in programs]
print(json.dumps({'revision':BASE,'programs':len(programs),'categories':dict(collections.Counter(p['category'] for p in programs)),'source_files':sum(p['source_files'] for p in programs),'source_lines':sum(p['source_lines'] for p in programs),'summary':summary},ensure_ascii=False))
