# Tailwind가 설치되지 않은 Next/React 프로그램에서, CSS 어디에도 정의되지 않은 Tailwind 모양 클래스를 찾는다.
# 배경: 2026-10-20 personality-suite v1.20 대시보드·매뉴얼이 Tailwind 없이 Tailwind 클래스로 작성돼 배치가 전부 무시됨(256개).
# 실행: python scripts/check-unstyled-tailwind.py  (저장소 루트에서, 출력이 없으면 문제 없음)
import os,re,json,glob
tw=re.compile(r'^(?:(?:sm|md|lg|xl|hover|group-hover|focus|group-open):)*(?:flex|inline-flex|grid|items-(?:center|start|end)|justify-(?:between|center|end)|(?:p|px|py|pt|pb|m|mx|my|mt|mb|ml|mr|gap|space-y|space-x)-[\d.]+|text-(?:xs|sm|base|lg|xl|\dxl|\[\d+px\])|font-(?:bold|black|extrabold|semibold|medium)|rounded(?:-(?:xl|2xl|full|lg|md))?|bg-[a-z]+(?:-\d+)?(?:/\d+)?|text-[a-z]+-\d+(?:/\d+)?|border(?:-[a-z]+-\d+(?:/\d+)?)?|w-\d+|h-\d+|grid-cols-\d|shadow(?:-sm|-md|-lg)?|leading-[a-z]+|tracking-[a-z]+|uppercase|truncate|line-clamp-\d)$')
cls_re=re.compile(r'className=(?:"([^"]*)"|\{`([^`]*)`\})')
rows=[]
for pj in glob.glob('*/package.json')+glob.glob('*/*/package.json'):
    d=os.path.dirname(pj)
    if 'node_modules' in d or d.startswith(('labs','scratch')): continue
    try: pkg=json.load(open(pj,encoding='utf-8'))
    except Exception: continue
    deps={**pkg.get('dependencies',{}),**pkg.get('devDependencies',{})}
    if 'next' not in deps and 'react' not in deps: continue
    if 'tailwindcss' in deps or '@tailwindcss/postcss' in deps: continue
    css=''; files=[]
    for dp,dn,fn in os.walk(d):
        dn[:]=[x for x in dn if x not in('node_modules','.next','.vercel','dist','out','test-artifacts')]
        for f in fn:
            fp=os.path.join(dp,f)
            if f.endswith('.css'): css+=open(fp,encoding='utf-8',errors='ignore').read()
            elif f.endswith(('.tsx','.jsx')): files.append(fp)
    defined=set(re.findall(r'\.([A-Za-z_][\w-]*)',css))
    total=0; per={}; samples=set()
    for fp in files:
        src=open(fp,encoding='utf-8',errors='ignore').read()
        n=0
        for a,b in cls_re.findall(src):
            for tok in (a or re.sub(r'\$\{[^}]*\}',' ',b)).split():
                if tw.match(tok) and tok.split(':')[-1] not in defined:
                    n+=1; samples.add(tok)
        if n: per[os.path.relpath(fp,d)]=n; total+=n
    if total: rows.append((d,total,len(per),sorted(per.items(),key=lambda x:-x[1])[:3],sorted(samples)[:6]))
for d,t,nf,h,s in sorted(rows,key=lambda r:-r[1]):
    print(f"{d}\t미정의 {t}개 / 파일 {nf}개\t"+"; ".join(f"{k}({v})" for k,v in h)+"\t예: "+" ".join(s))
