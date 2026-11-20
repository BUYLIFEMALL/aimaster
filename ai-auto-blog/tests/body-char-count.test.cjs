// 2026-11-20 편집기 글자수 표시(Master msg_b877863aba09) + 반례 보완(Mac msg_85d453cbcc0f · Master msg_4481ff5a213f).
// 기존 countChars 기준(공백 제외) 재사용, HTML은 cheerio/slim으로 판독, 코드 모드는 mdLiteToHtml 변환 뒤 계수. 외부 요청 0.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const compile = (file) => ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
const load = (file, requireMap = {}) => {
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', compile(file))(mod, mod.exports, (name) => (name in requireMap ? requireMap[name] : require(name)))
  return mod.exports
}
const promptRules = load('utils/news/promptRules.ts')
const markdown = load('utils/markdown.ts')
const counter = load('utils/bodyCharCount.ts', { './news/promptRules': promptRules, './markdown': markdown, 'cheerio/slim': require('cheerio/slim') })
const { bodyCharCount, markdownBodyCharCount, htmlToCountText, targetPercent } = counter

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

test('코드 모드 첨부 표시는 세지 않고, 비주얼과 같은 본문이면 같은 숫자', () => {
  assert.equal(markdownBodyCharCount('앞 [첨부이미지 1] 뒤[첨부이미지 12]'), 2)
  const visual = '<h2>소제목</h2><p><strong>강조</strong> 문장</p><ul><li>항목1</li><li>항목2</li></ul>'
  const code = '## 소제목\n\n**강조** 문장\n\n- 항목1\n- 항목2'
  assert.equal(markdownBodyCharCount(code), bodyCharCount(visual))
})

test('코드 모드 혼합 입력(HTML이 섞인 원고)도 예외 없이 — 서버가 실제로 저장할 의미대로 계수', () => {
  const mixed = '<p>문단</p>\n\n## 제목 &amp; 기호\n\n<script>alert(1)</script> 끝'
  assert.doesNotThrow(() => markdownBodyCharCount(mixed))
  assert.equal(markdownBodyCharCount(mixed), bodyCharCount(markdown.mdLiteToHtml(mixed.replace(/\[첨부이미지\s*\d+\]/g, ' '))))
  for (const odd of [null, undefined, 123, '```\n코드\n```', '#'.repeat(5000), '&#99999999;']) assert.doesNotThrow(() => markdownBodyCharCount(odd), String(odd).slice(0, 20))
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

test('편집 화면 연결: 비주얼은 bodyCharCount, 코드는 markdownBodyCharCount — 저장 흐름·목표 대비 없음', () => {
  const page = fs.readFileSync(path.join(__dirname, '../app/posts/[id]/edit/page.tsx'), 'utf8')
  assert.match(page, /import \{ bodyCharCount, markdownBodyCharCount \} from '@\/blog\/utils\/bodyCharCount'/)
  assert.match(page, /editorMode === 'code' \? markdownBodyCharCount\(removeImagePromptSection\(codeContent\)\) : bodyCharCount\(visualMainContent\)/)
  assert.match(page, /본문 글자수\(공백 제외\) \{editorBodyChars\.toLocaleString\('ko-KR'\)\}자/)
  assert.doesNotMatch(page, /targetPercent\(|import \{[^}]*targetPercent/)
  const src = fs.readFileSync(path.join(__dirname, '../utils/bodyCharCount.ts'), 'utf8')
  assert.match(src, /from 'cheerio\/slim'/, '네트워크 모듈 없는 파싱 전용 입구')
  assert.doesNotMatch(src, /document\.|innerHTML|DOMParser|fetch\(|eval\(/, '원고를 실제 문서에 넣거나 실행하지 않음')
})
