// 2026-11-20 편집기 글자수 표시(Master msg_b877863aba09) + 반례 보완(Mac msg_85d453cbcc0f · msg_c48da43bc6ab · msg_9910402d9a22).
// 기존 countChars 기준(공백 제외) 재사용, HTML은 cheerio/slim으로 판독, 코드 모드는 서버 저장 변환과 같은 의미로 계수. 외부 요청 0.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const transpile = (source) => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
const load = (file, requireMap = {}) => {
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', transpile(read(file)))(mod, mod.exports, (name) => (name in requireMap ? requireMap[name] : require(name)))
  return mod.exports
}
const promptRules = load('utils/news/promptRules.ts')
const markdown = load('utils/markdown.ts')
const stripImageSchema = load('utils/stripImageSchema.ts')
const counter = load('utils/bodyCharCount.ts', { './news/promptRules': promptRules, './markdown': markdown, './stripImageSchema': stripImageSchema, 'cheerio/slim': require('cheerio/slim') })
const { bodyCharCount, markdownBodyCharCount, htmlToCountText, targetPercent, extractAttachmentSources } = counter

// 서버 PUT(app/api/posts/[id]/route.ts)의 실제 추출 함수 원문을 잘라 와 기준으로 쓴다.
const route = read('app/api/posts/[id]/route.ts').replace(/\r\n/g, '\n')
const fnStart = route.indexOf('function extractBase64ImagesPureString')
assert.ok(fnStart >= 0, '서버 추출 함수를 찾지 못함')
const serverExtract = new Function(`${transpile(route.slice(fnStart, route.indexOf('\n}\n', fnStart) + 2))}; return extractBase64ImagesPureString`)()
// 서버 저장 변환 그대로: DB 원본에서 뽑은 주소로 정확한 표시만 바꾸고 mdLiteToHtml → (화면과 같은) 프롬프트 섹션 제외 → 계수
const serverCount = (md, dbContent) => {
  let final = md
  serverExtract(dbContent).forEach((src, idx) => { final = final.split(`[첨부이미지 ${idx + 1}]`).join(src) })
  return bodyCharCount(stripImageSchema.removeImagePromptSection(markdown.mdLiteToHtml(final)))
}
const count = (md, dbContent) => markdownBodyCharCount(md, extractAttachmentSources(dbContent))
const IMG = (n) => `data:image/png;base64,${'QUJD'.repeat(n)}`
const DB1 = `<p>글</p><img src="${IMG(40)}">`
const DB2 = `<img src="${IMG(40)}"><p>글</p><img src="${IMG(700)}">`
const M = (n) => `[첨부이미지 ${n}]`

test('공백·줄바꿈은 세지 않고 한글 한 음절은 1자 — 생성기 countChars와 같은 결과', () => {
  assert.equal(bodyCharCount('<p>안녕 하세요<br>반갑습니다</p>'), 10)
  assert.equal(bodyCharCount('안녕 하세요\n반갑습니다'), promptRules.countChars('안녕 하세요\n반갑습니다'))
  for (const empty of ['', null, undefined, 0, {}, []]) assert.equal(bodyCharCount(empty), 0)
})

test('태그·속성은 세지 않는다 — 속성 안의 > 도 표준대로', () => {
  assert.equal(bodyCharCount('<h2 class="x">소제목</h2><p>본문 <strong>강조</strong> 끝</p>'), 8)
  assert.equal(bodyCharCount('<p><a href="https://example.com/아주긴주소" title="a > b">링크</a></p>'), 2)
  assert.equal(bodyCharCount('<p data-x="1>2>3">가나</p>'), 2)
})

test('엔티티: 일반·숫자는 실제 글자로, 잘못된 숫자 엔티티도 예외 없이(대체 문자 1자)', () => {
  assert.equal(htmlToCountText('A&amp;B&nbsp;C&lt;D&#39;&#x41;&quot;'), 'A&B C<D\'A"')
  assert.equal(bodyCharCount('A&amp;B&nbsp;C'), 4, '&nbsp;는 공백이라 제외')
  for (const bad of ['&#99999999;', '&#x110000;', '&#0;', '&#xD800;', '&#;', '&#xZZ;']) {
    assert.doesNotThrow(() => bodyCharCount(`<p>가${bad}나</p>`), bad)
    assert.ok(Number.isInteger(bodyCharCount(`<p>가${bad}나</p>`)), bad)
  }
  assert.equal(bodyCharCount('<p>가&#99999999;나</p>'), 3)
})

test('이미지·이미지 설명·script/style/noscript/template은 세지 않는다', () => {
  assert.equal(bodyCharCount('<figure><img src="a.png" alt="대체 글"><figcaption>📷 비주얼 (클릭하여 고화질 확대)</figcaption></figure><p>글</p>'), 1)
  assert.equal(bodyCharCount('<style>.a{color:red}</style><script>var a="<p>x</p>"</script><noscript>n</noscript><template>t</template><p>가나</p>'), 2)
})

test('이모지 계수 규칙: 기존 countChars(UTF-16) 그대로 — 대부분 2자', () => {
  assert.equal(bodyCharCount('<p>😀</p>'), 2)
  assert.equal(bodyCharCount('<p>좋아요👍</p>'), 5)
})

test('코드 모드: 서버 저장과 같은 변환(mdLiteToHtml) 뒤 계수 — 마크다운 기호는 세지 않음', () => {
  const md = '## 소제목\n\n**강조** 문장 [링크](https://example.com)\n\n- 항목1\n- 항목2\n\n> 인용'
  assert.equal(markdownBodyCharCount(md), bodyCharCount(markdown.mdLiteToHtml(md)))
  assert.equal(markdownBodyCharCount(md), promptRules.countChars('소제목강조문장링크항목1항목2인용'))
})

test('서버 추출과 같은 목록: extractAttachmentSources = route.ts extractBase64ImagesPureString', () => {
  for (const content of ['', DB1, DB2, `![a](${IMG(3)}) 뒤 "x"`, `data:image/png;base64,끝없는주소`, `<img src='${IMG(2)}'> ) "`, `a ${'data:image/x;base64,' + 'A'.repeat(12000)}`]) {
    assert.deepEqual(extractAttachmentSources(content), serverExtract(content), content.slice(0, 40))
  }
  for (const odd of [null, undefined, 5, {}]) assert.deepEqual(extractAttachmentSources(odd), [])
})

test('반례 1 — 비정규 표기(01·공백 다름·0)는 서버처럼 그대로 보존', () => {
  for (const marker of ['[첨부이미지 01]', '[첨부이미지 001]', '[첨부이미지1]', '[첨부이미지  1]', '[첨부이미지 0]', '[첨부이미지 +1]']) {
    for (const md of [`![설명](${marker})\n\n본문`, `앞 ${marker} 뒤`]) {
      assert.equal(count(md, DB1), serverCount(md, DB1), md)
      assert.equal(count(md, DB1), bodyCharCount(markdown.mdLiteToHtml(md)), `${md} — 치환 없음`)
    }
  }
})

test('반례 2 — 혼자 있는 첨부 표시는 실제 저장 변환과 같은 숫자(주소 글자가 본문 글자가 됨)', () => {
  for (const md of [`앞 ${M(1)} 뒤`, `${M(1)}`, `- 목록 ${M(1)}\n- 둘 ${M(2)}`, `<img src="${M(1)}">\n\n글`, `${M(1)}${M(1)} 두 번`, `## 제목 ${M(2)}\n\n> 인용 ${M(1)}`]) {
    assert.equal(count(md, DB2), serverCount(md, DB2), md)
  }
  assert.ok(count(`앞 ${M(2)} 뒤`, DB2) > 2800, '큰 주소 길이가 반영됨')
})

test('이미지 문법 안의 첨부 표시는 그림이 되어 설명 글까지 세지 않는다 — 서버 변환과 같은 숫자', () => {
  for (const md of [`![대표 비주얼 설명](${M(1)})\n\n본문`, `![가](${M(1)})\n\n![나](${M(2)})\n\n끝`, `![가](${M(2)}) 그리고 혼자 ${M(1)}`]) {
    assert.equal(count(md, DB2), serverCount(md, DB2), md)
  }
  assert.equal(count(`![대표 비주얼 설명](${M(1)})\n\n본문`, DB1), 2)
})

test('반례 3 — 기준은 DB 원본 첨부 목록: 미저장 추가·삭제와 무관, 범위 밖 번호는 보존', () => {
  const attachments = extractAttachmentSources(DB1) // 편집 진입 시 DB 원본(이미지 1개)
  const edited = `![새로 추가](${M(2)})\n\n![기존](${M(1)})\n\n본문` // 편집 중 2번을 써도 DB에는 없음
  assert.equal(markdownBodyCharCount(edited, attachments), serverCount(edited, DB1))
  const removed = '본문만 남김' // 편집 중 이미지를 지워도 목록은 그대로
  assert.equal(markdownBodyCharCount(removed, attachments), serverCount(removed, DB1))
  assert.equal(markdownBodyCharCount(`앞 ${M(1)} 뒤`, []), bodyCharCount(markdown.mdLiteToHtml(`앞 ${M(1)} 뒤`)), 'DB에 첨부가 없으면 표시는 그대로')
  for (const odd of [undefined, null, 3, 'x', [1, null]]) assert.doesNotThrow(() => markdownBodyCharCount(`앞 ${M(1)} 뒤`, odd))
})

test('base64 형식이 아닌 주소(예: svg 문자)도 서버 변환과 같은 숫자', () => {
  const db = '<img src="data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\'><text>글 *자*</text></svg>">'
  for (const md of [`앞 ${M(1)} 뒤`, `![설명](${M(1)})`]) assert.equal(count(md, db), serverCount(md, db), md)
})

test('마크다운 제목으로 쓴 이미지 프롬프트 섹션은 변환 뒤 기존 분리 규칙으로 제외', () => {
  const md = '본문 글\n\n---\n\n### 🎨 생성 이미지 AI 프롬프트\n\n이미지 1 설명 문장\n\n이미지 2 설명 문장'
  assert.equal(markdownBodyCharCount(md), promptRules.countChars('본문글'))
  assert.equal(markdownBodyCharCount('본문만'), 3, '섹션이 없으면 그대로')
})

test('같은 본문이면 비주얼(HTML)과 코드(Markdown)가 같은 숫자 — 이미지·프롬프트 섹션 포함', () => {
  const visual = `<h2>소제목</h2><figure><img src="${IMG(40)}" alt="그림"><figcaption>📷 그림 (클릭하여 고화질 확대)</figcaption></figure><p><strong>강조</strong> 문장</p><ul><li>항목1</li><li>항목2</li></ul>`
  const code = `## 소제목\n\n![그림](${M(1)})\n\n**강조** 문장\n\n- 항목1\n- 항목2\n\n---\n\n### 🎨 생성 이미지 AI 프롬프트\n\n설명`
  assert.equal(count(code, visual), bodyCharCount(visual))
})

test('코드 모드 혼합 입력(HTML이 섞인 원고)도 예외 없이 — 서버가 실제로 저장할 의미대로 계수', () => {
  const mixed = '<p>문단</p>\n\n## 제목 &amp; 기호\n\n<script>alert(1)</script> 끝'
  assert.doesNotThrow(() => markdownBodyCharCount(mixed))
  assert.equal(markdownBodyCharCount(mixed), bodyCharCount(markdown.mdLiteToHtml(mixed)))
  for (const odd of [null, undefined, 123, '```\n코드\n```', '#'.repeat(5000), '&#99999999;']) assert.doesNotThrow(() => markdownBodyCharCount(odd), String(odd).slice(0, 20))
})

test('4차 반례 — 원고에 이미 있는 자리값 모양 글자와 실제 첨부가 함께 있어도 서버 변환과 같은 숫자', () => {
  const oldToken = (n) => `data:image/png;base64,ATT${n}ATT` // 이전 판(2d4fdd7be)이 찾던 자리값
  const newShort = `data:image/png;base64,${'A'.repeat(8)}` // 현재 판 자리값과 같은 모양의 평문
  for (const plain of [oldToken(1), oldToken(2), `data:image/png;base64,ATT1 ATT`, newShort, `data:image/png;base64,${'A'.repeat(9)}`, `${'A'.repeat(40)}`]) {
    for (const md of [`평문 ${plain} 그리고 ${M(1)} 끝`, `${plain}\n\n![그림](${M(1)})\n\n${plain}`, `${plain} ${M(1)} ${M(2)} ${plain} ${M(2)}`, `${M(1)}${plain}`]) {
      assert.equal(count(md, DB2), serverCount(md, DB2), `${plain.slice(0, 40)} / ${md.slice(0, 30)}`)
    }
  }
})

test('첨부가 많거나 같은 표시를 여러 번 써도(자릿값 한도 초과 시 안전 경로) 서버 변환과 같은 숫자', () => {
  const many = Array.from({ length: 14 }, (_, i) => `<img src="${IMG(10 + i)}">`).join('')
  const md = Array.from({ length: 14 }, (_, i) => `문단${i} ${M(i + 1)} ${i % 3 ? `![그림](${M(i + 1)})` : M(i + 1)}`).join('\n\n')
  assert.equal(count(md, many), serverCount(md, many))
  const repeated = `${`${M(1)} `.repeat(30)}\n\n${`![a](${M(2)})\n\n`.repeat(5)}끝`
  assert.equal(count(repeated, DB2), serverCount(repeated, DB2))
})

test('긴 원고 + 큰 첨부: 서버 변환과 같은 숫자이고, 큰 주소를 변환기에 넣지 않아 빠르다', () => {
  const bigDb = `<img src="${IMG(500000)}"><img src="${IMG(300000)}">` // 약 2MB·1.2MB 주소
  const body = Array.from({ length: 400 }, (_, i) => `## 소제목 ${i}\n\n**강조** 문장 가나다 라마 [링크](https://example.com/${i})\n\n- 항목 ${i}`).join('\n\n')
  const md = `![대표](${M(1)})\n\n${body}\n\n혼자 ${M(2)} 끝\n\ndata:image/png;base64,ATT2ATT`
  const attachments = extractAttachmentSources(bigDb)
  const expected = serverCount(md, bigDb)
  const started = process.hrtime.bigint()
  const got = markdownBodyCharCount(md, attachments)
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6
  assert.equal(got, expected)
  assert.ok(got > 1200000, '혼자 있는 큰 주소 길이가 반영됨')
  for (let i = 0; i < 2; i++) assert.equal(markdownBodyCharCount(md, attachments), got)
  assert.ok(elapsedMs < 1500, `한 번 계산 ${elapsedMs.toFixed(0)}ms`)
})

test('긴 원고도 같은 결과(윤곽 안정성): 같은 입력을 여러 번 세도 같은 값', () => {
  const big = '<p>' + '가나다 라마'.repeat(2000) + '</p>'
  const first = bodyCharCount(big)
  assert.equal(first, 10000, '「가나다 라마」 공백 제외 5자 × 2,000')
  for (let i = 0; i < 3; i++) assert.equal(bodyCharCount(big), first)
})

test('목표 대비는 목표가 있을 때만', () => {
  assert.equal(targetPercent(1000, 2000), 50)
  assert.equal(targetPercent(2300, 2000), 115)
  for (const target of [undefined, null, 0, -5, 'abc', NaN]) assert.equal(targetPercent(1000, target), null, String(target))
  assert.equal(targetPercent(NaN, 2000), null)
})

test('편집 화면 연결: DB 원본 첨부는 불러올 때 한 번만 보관하고 코드 모드 계수에 전달 — 저장 흐름·목표 대비 없음', () => {
  const page = read('app/posts/[id]/edit/page.tsx')
  assert.match(page, /import \{ bodyCharCount, markdownBodyCharCount, extractAttachmentSources \} from '@\/blog\/utils\/bodyCharCount'/)
  assert.match(page, /setDbAttachments\(extractAttachmentSources\(postData\.content \|\| ''\)\)/)
  assert.equal((page.match(/setDbAttachments\(/g) || []).length, 1, '편집 중에는 목록을 바꾸지 않음')
  assert.match(page, /editorMode === 'code' \? markdownBodyCharCount\(removeImagePromptSection\(codeContent\), dbAttachments\) : bodyCharCount\(visualMainContent\)/)
  assert.match(page, /본문 글자수\(공백 제외\) \{editorBodyChars\.toLocaleString\('ko-KR'\)\}자/)
  assert.doesNotMatch(page, /targetPercent\(|import \{[^}]*targetPercent/)
  const src = read('utils/bodyCharCount.ts')
  assert.match(src, /from 'cheerio\/slim'/, '네트워크 모듈 없는 파싱 전용 입구')
  assert.doesNotMatch(src, /document\.|innerHTML|DOMParser|fetch\(|eval\(/, '원고를 실제 문서에 넣거나 실행하지 않음')
})
