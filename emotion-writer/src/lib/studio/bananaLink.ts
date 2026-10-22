// v1.24: 「바나나에서 배경 만들기」 — 지금 글귀의 분위기로 배경 이미지를 만들도록 바나나 캔버스 「이미지 생성」 아이디어 칸(최대 600자)을
// `/studio?idea=`로 채워 연다(자동 생성 없음). 배경 위에 글귀를 올릴 것이므로 「글자 없이」를 함께 적는다. 600자를 넘으면 링크를 만들지 않는다.
// 주소·한도는 공용 기준 코드 `banana-idea-link`(같은 폴더 bananaIdeaLink.ts 사본), 문구는 이 프로그램 것
import { bananaIdeaLink } from "./bananaIdeaLink";
export { BANANA_STUDIO_URL, MAX_BANANA_IDEA } from "./bananaIdeaLink";

export function quoteBackgroundIdea(quote: string): string {
  return `글자 없이, 이 글귀의 분위기를 담은 감성 배경 이미지: ${quote.replace(/\s+/g, " ").trim()}`;
}

export function bananaBackgroundLink(quote: string | null | undefined): string | null {
  const q = (quote ?? "").trim();
  if (!q) return null;
  return bananaIdeaLink(quoteBackgroundIdea(q), "emotion-writer");
}
