// 공용 마크다운 → HTML 변환(정제 전). 미리보기와 3단계 내보내기가 같은 규칙을 쓴다.
// GFM에 없는 알파벳 목록(a. b. c.)만 확장한다: 'a.'로 시작하는 연속 줄을 <ol type="a">로 보여 준다.
import { Marked, type TokenizerAndRendererExtension, type Tokens } from "marked";

interface AlphaListToken extends Tokens.Generic { type: "alphaList"; raw: string; items: Tokens.Generic[][] }

const alphaList: TokenizerAndRendererExtension = {
  name: "alphaList",
  level: "block",
  start(src: string) { return src.match(/(?:^|\n) {0,3}a[.)] /)?.index; },
  tokenizer(this, src: string) {
    const m = /^((?: {0,3}[a-z][.)] [^\n]*(?:\n|$))+)/.exec(src);
    if (!m || !/^ {0,3}a[.)] /.test(m[1])) return undefined; // 'a.'로 시작할 때만 목록으로 본다
    const lines = m[1].replace(/\n$/, "").split("\n");
    const items = lines.map(l => this.lexer.inlineTokens(l.replace(/^ {0,3}[a-z][.)] /, "")));
    return { type: "alphaList", raw: m[1], items } as AlphaListToken;
  },
  renderer(this, token) {
    const t = token as AlphaListToken;
    return `<ol type="a">${t.items.map(tokens => `<li>${this.parser.parseInline(tokens)}</li>`).join("")}</ol>\n`;
  },
};

export const markdownParser = new Marked({
  gfm: true, breaks: false, async: false,
  extensions: [alphaList],
  renderer: { checkbox: ({ checked }) => `<span class="task-marker" aria-label="${checked ? "완료" : "미완료"}">${checked ? "☑" : "☐"}</span> ` },
});

export const parseMarkdown = (markdown: string): string => markdownParser.parse(markdown) as string;
