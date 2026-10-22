// v1.12: 「바나나 캔버스로 보내기」 — 이미지 프롬프트를 바나나 캔버스 「이미지 생성」 아이디어 칸(최대 600자)에
// `/studio?idea=`로 채워 연다(글자만 전달, 자동 생성 없음). 600자를 넘으면 링크를 만들지 않는다.
// 주소·한도는 공용 기준 코드 `banana-idea-link`(같은 폴더 bananaIdeaLink.ts 사본)
import { bananaIdeaLink } from "./bananaIdeaLink";
export { BANANA_STUDIO_URL, MAX_BANANA_IDEA } from "./bananaIdeaLink";

export function bananaLink(prompt: string | null | undefined): string | null {
  return bananaIdeaLink(prompt, "reverse-prompt");
}
