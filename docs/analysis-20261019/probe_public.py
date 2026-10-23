"""Unauthenticated, read-only public availability and empty-input gate checks."""
import json,pathlib,urllib.request,urllib.error,concurrent.futures,datetime,collections
OUT=pathlib.Path(__file__).parent
rows=json.loads((OUT/'catalog-db.json').read_text(encoding='utf-8'))['programs']
def head(p):
 url=p.get('app_url');r={'slug':p['slug'],'url':url,'active':p['is_active']}
 if not url:r['status']='missing_url';return r
 try:
  q=urllib.request.Request(url,method='HEAD',headers={'User-Agent':'AIMaster-ReadOnly-Inventory/1.0'})
  with urllib.request.urlopen(q,timeout=15) as v:r.update(status=v.status,final_url=v.url,content_type=v.headers.get('content-type',''))
 except urllib.error.HTTPError as e:r.update(status=e.code,final_url=e.url)
 except Exception as e:r.update(status='network_error',error=type(e).__name__)
 return r
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:results=list(pool.map(head,rows))
gates=[]
for route,body in [('/api/scrape',{'urls':[]}),('/api/ai/cover',{'title':''})]:
 url='https://ebook-studio.buylife.xyz'+route
 try:
  req=urllib.request.Request(url,data=json.dumps(body).encode(),headers={'Content-Type':'application/json'})
  with urllib.request.urlopen(req,timeout=20) as v:status=v.status;text=v.read(512).decode('utf-8','replace');final=v.url
 except urllib.error.HTTPError as e:status=e.code;text=e.read(512).decode('utf-8','replace');final=e.url
 except Exception as e:status='network_error';text=type(e).__name__;final=url
 gates.append({'url':url,'input':body,'status':status,'response':text,'final_url':final,'safety':'No valid URL/title/key; no external fetch/generation/data mutation requested.'})
data={'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'method':'Unauthenticated HEAD, follows redirect; reachability only, NOT functional certification. Two empty-input POST gate probes only.','availability':results,'empty_input_gates':gates}
(OUT/'http-evidence.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'counts':dict(collections.Counter(str(r['status']) for r in results)),'non200':[r for r in results if r['status']!=200],'gates':gates},ensure_ascii=False))
