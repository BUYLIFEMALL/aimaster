import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const escape = value => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const inline = value => escape(value)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
const lines = fs.readFileSync(path.join(dir,'REPORT.md'),'utf8').split(/\r?\n/);
const body = [], toc = [];
let index = 0, section = 0, tables = 0;
while (index < lines.length) {
  const line = lines[index];
  if (!line.trim()) { index++; continue; }
  if (/^<!--.*-->$/.test(line.trim())) { index++; continue; }
  if (/^<a id="[a-z0-9-]+"><\/a>$/.test(line.trim())) { body.push(line.trim()); index++; continue; }
  const heading = /^(#{1,3}) (.+)$/.exec(line);
  if (heading) {
    const level = heading[1].length, id = 'section-' + section++;
    body.push(`<h${level} id="${id}">${inline(heading[2])}</h${level}>`);
    if (level === 2) toc.push(`<a href="#${id}">${inline(heading[2])}</a>`);
    index++; continue;
  }
  if (line.startsWith('|')) {
    const rows = [];
    while (index < lines.length && lines[index].startsWith('|')) rows.push(lines[index++].split('|').slice(1,-1).map(cell=>cell.trim()));
    const expected = rows[0].length;
    if (rows.some(row=>row.length!==expected)) throw Error('Unequal table cells: ' + rows[0].join(' / '));
    const data = rows.slice(1).filter(row=>!row.every(cell=>/^:?-+:?$/.test(cell)));
    const comparisonClass = expected === 7 && rows[0][0] === '#' ? ' class="program-comparison"' : '';
    body.push('<div class="table-scroll"><table' + comparisonClass + '><thead><tr>' + rows[0].map(cell=>`<th scope="col">${inline(cell)}</th>`).join('') + '</tr></thead><tbody>' + data.map(row=>'<tr>'+row.map(cell=>`<td>${inline(cell)}</td>`).join('')+'</tr>').join('') + '</tbody></table></div>');
    tables++; continue;
  }
  if (line.startsWith('- ')) {
    const items=[]; while(index<lines.length && lines[index].startsWith('- ')) items.push(`<li>${inline(lines[index++].slice(2))}</li>`);
    body.push('<ul>'+items.join('')+'</ul>'); continue;
  }
  const paragraph=[];
  while(index<lines.length && lines[index].trim() && !/^(#{1,3} |\||- )/.test(lines[index])) paragraph.push(lines[index++]);
  body.push('<p>'+inline(paragraph.join(' '))+'</p>');
}
const output=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AIMaster 블로그 7개 분석·통합 제안</title><style>
:root{font-family:"Segoe UI","Malgun Gothic",sans-serif;color:#182438;background:#f3f6fb;line-height:1.75;scroll-behavior:smooth}*{box-sizing:border-box}body{margin:0}header{padding:34px max(20px,calc((100vw - 1440px)/2));background:#102a43;color:#fff}header p{margin:8px 0}header strong{color:#9de8d9}.tags{display:flex;gap:10px;flex-wrap:wrap}.tag{padding:4px 12px;border:1px solid #53728c;border-radius:16px;font-size:13px}.layout{max-width:1480px;margin:auto;display:grid;grid-template-columns:230px minmax(0,1fr);gap:24px;padding:24px}aside{position:sticky;top:16px;align-self:start;max-height:95vh;overflow:auto;font-size:13px}aside a{display:block;padding:8px;color:#324a65;text-decoration:none;border-bottom:1px solid #d9e2ee}aside a:hover{background:#e0eafb}main{min-width:0;background:#fff;padding:30px;border:1px solid #dbe3ee;border-radius:14px}h1{font-size:25px;line-height:1.4;margin:0 0 18px}h2{font-size:22px;color:#173d62;margin-top:42px;padding-top:16px;border-top:2px solid #d6e4f0;scroll-margin-top:20px}h3{font-size:18px;margin-top:30px;color:#174d55}p,li{font-size:14px}a{color:#075faf;overflow-wrap:anywhere}code{font-family:Consolas,monospace;font-size:12px;background:#edf2f8;padding:2px 4px;border-radius:4px;overflow-wrap:anywhere}.table-scroll{overflow-x:auto;margin:16px 0 24px;border:1px solid #dce5ee;border-radius:8px}table{border-collapse:collapse;width:100%;font-size:13px;min-width:650px}table.program-comparison{table-layout:fixed;min-width:1320px}table.program-comparison th:nth-child(1){width:40px}table.program-comparison th:nth-child(2){width:200px}table.program-comparison th:nth-child(3){width:280px}table.program-comparison th:nth-child(4){width:230px}table.program-comparison th:nth-child(5){width:190px}table.program-comparison th:nth-child(6){width:240px}table.program-comparison th:nth-child(7){width:80px}th{background:#eaf1f8;text-align:left;font-weight:700;color:#173b5c}td,th{padding:11px 13px;vertical-align:top;border-bottom:1px solid #dce5ee}td:first-child{font-weight:600}tr:nth-child(even)td{background:#f8fafc}tr:hover td{background:#edf7ff}th+th,td+td{border-left:1px solid #e5eaf0}input{width:100%;padding:11px 13px;margin:12px 0;border:1px solid #abbfd2;border-radius:8px;font:inherit;background:white;color:#142f49}label{font-size:13px;font-weight:600}.searchnote{font-size:12px;color:#546a82}.actions{display:flex;gap:16px;flex-wrap:wrap;margin-top:14px}.actions a{color:#b9e8ff}footer{max-width:1440px;margin:0 auto;padding:20px;font-size:12px;color:#54657c}@media(max-width:900px){.layout{display:block;padding:12px}aside{position:static;max-height:none;margin-bottom:14px;display:flex;overflow:auto;gap:10px}aside a{white-space:nowrap;border:1px solid #d9e2ee;border-radius:6px}main{padding:18px}h1{font-size:22px}h2{font-size:19px}table{min-width:650px}}@media print{header,aside,.filter{display:none}.layout{display:block;padding:0}main{border:0;padding:0}.table-scroll{overflow:visible}table{min-width:0;font-size:10px}td,th{padding:5px}h2{break-after:avoid}tr{break-inside:avoid}}
</style></head><body><header><div class="tags"><span class="tag">AIMaster 운영 · 최초 2026-10-20 / 최신 재비교 2026-10-21</span><span class="tag">최초 cde4c6fa / 최신 f34a2ba1</span><span class="tag">제품 병합 제안 / BLC 이력·SEO 재비교 포함</span></div><p><strong>7개를 검토해, 역할이 다른 4개로 정리하는 조건부 추천</strong></p><p>일반 제작 · 키워드 분석 · 정밀 집필/SEO · 티스토리. 장점 이관과 검수가 먼저이며, 기존 프로그램은 중단하지 않았습니다.</p><div class="actions"><a href="#seo-recompare-20261021">최신 SEO 비교표</a><a href="REPORT.md">전체 Markdown</a><a href="HANDOFF.md">다음 CLI 인수인계</a><a href="NAVER_GENERATORS_EVIDENCE.md">소스 근거</a></div></header><div class="layout"><aside aria-label="목차">${toc.join('')}</aside><main><div class="filter"><label for="search">표 안에서 찾기</label><input id="search" type="search" placeholder="예: 사진, 30일, 발행, 키워드, BC-01" autocomplete="off"><div class="searchnote" id="result" role="status">표 ${tables}개 · 입력하면 표의 행을 검색합니다. 본문과 제목은 유지됩니다.</div></div>${body.join('\n')}</main></div><footer>최신 SEO 재비교는 읽기 분석·무료 검사만 진행했습니다. BLC 구현/배포 이력의 비용·DB 변경·실검수는 각 단계 기록을 확인하세요.</footer><script>
const input=document.querySelector('#search');input.addEventListener('input',()=>{const query=input.value.trim().toLocaleLowerCase('ko-KR');let shown=0,total=0;document.querySelectorAll('tbody tr').forEach(row=>{total++;row.hidden=Boolean(query&&!row.textContent.toLocaleLowerCase('ko-KR').includes(query));if(!row.hidden)shown++});document.querySelector('#result').textContent=query?('표 행 '+total+'개 중 '+shown+'개 표시'):('표 ${tables}개 · 입력하면 표의 행을 검색합니다. 본문과 제목은 유지됩니다.');});
</script></body></html>`;
fs.writeFileSync(path.join(dir,'REPORT.html'),output);
console.log(JSON.stringify({tables,sections:toc.length,output:'REPORT.html',bytes:Buffer.byteLength(output)}));
