// 2026-11-20 편집기 글자수 표시(Master msg_b877863aba09). 기존 countChars 기준(공백 제외) 재사용, HTML 서식 제외. 외부 요청 0.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const load = (file, requireMap = {}) => {
  const src = fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, (name) => requireMap[name] || {})
  return mod.exports
}
const promptRules = load('utils/news/promptRules.ts')
const { bodyCharCount, htmlToCountText, targetPercent } = load('utils/bodyCharCount.ts', { './news/promptRules': promptRules })

test('공백·줄바꿈은 세지 않고 한글 한 음절은 1자 — 생성기 countChars와 같은 결과', () => {
  assert.equal(bodyCharCount('안녕 하세요\n반갑습니다'), 10)
  assert.equal(bodyCharCount('안녕 하세요\n반갑습니다'), promptRules.countChars('안녕 하세요\n반갑습니다'))
  assert.equal(bodyCharCount(''), 0)
  assert.equal(bodyCharCount(null), 0)
})

test('HTML 태그·속성은 세지 않고 글자만 센다', () => {
  assert.equal(bodyCharCount('<h2 class="x">소제목</h2><p>본문 <strong>강조</strong> 끝</p>'), 8)
  assert.equal(bodyCharCount('<p><a href="https://example.com/아주긴주소">링크</a></p>'), 2)
})

test('이미지·이미지 설명·script/style·[첨부이미지 N]은 세지 않는다', () => {
  assert.equal(bodyCharCount('<figure><img src="a.png" alt="대체 글"><figcaption>📷 비주얼 (클릭하여 고화질 확대)</figcaption></figure><p>글</p>'), 1)
  assert.equal(bodyCharCount('<style>.a{color:red}</style><script>var a=1</script><p>가나</p>'), 2)
  assert.equal(bodyCharCount('앞 [첨부이미지 1] 뒤[첨부이미지 12]'), 2)
})

test('HTML 특수 기호는 실제 글자로 센다(&nbsp;는 공백이라 제외)', () => {
  assert.equal(htmlToCountText('A&amp;B&nbsp;C&lt;D&#39;&#x41;'), "A&B C<D'A")
  assert.equal(bodyCharCount('A&amp;B&nbsp;C'), 4)
  assert.equal(bodyCharCount('&unknown;'), 9, '모르는 이름은 글자 그대로')
})

test('이모지 계수 규칙: 기존 countChars(UTF-16) 그대로 — 대부분 2자', () => {
  assert.equal(bodyCharCount('😀'), 2)
  assert.equal(bodyCharCount('좋아요👍'), 5)
})

test('목표 대비는 목표가 있을 때만', () => {
  assert.equal(targetPercent(1000, 2000), 50)
  assert.equal(targetPercent(2300, 2000), 115)
  for (const target of [undefined, null, 0, -5, 'abc', NaN]) assert.equal(targetPercent(1000, target), null, String(target))
  assert.equal(targetPercent(NaN, 2000), null)
})

test('편집 화면: 글자수 한 줄만 추가, 저장·편집 흐름은 그대로', () => {
  const page = fs.readFileSync(path.join(__dirname, '../app/posts/[id]/edit/page.tsx'), 'utf8')
  assert.match(page, /import \{ bodyCharCount \} from '@\/blog\/utils\/bodyCharCount'/)
  assert.match(page, /bodyCharCount\(editorMode === 'code' \? removeImagePromptSection\(codeContent\) : visualMainContent\)/)
  assert.match(page, /본문 글자수\(공백 제외\) \{editorBodyChars\.toLocaleString\('ko-KR'\)\}자/)
  assert.doesNotMatch(page, /targetPercent\(|import \{[^}]*targetPercent/, '이 화면은 저장된 목표가 없어 목표 대비를 그리지 않음')
})
