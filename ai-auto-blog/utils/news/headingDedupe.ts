// 2026-10-23 (티스토리 v1.90에서 옮김): 문단 안의 작은 제목(###·####, <h3>·<h4>)이 그 문단의 소제목(##)과 같은 문구면 지운다.
// gpt-4o-mini가 「### 를 정확히 3번」 지시를 소제목 문구를 한 번 더 쓰는 것으로 채우는 경우(티스토리 글 18번)를 막는다. 문단 내용은 그대로 둔다.
const normalize = (value: string) =>
  String(value ?? '').replace(/<[^>]+>/g, '').replace(/[*_`#]/g, '').replace(/[\s\p{P}]+/gu, '').toLowerCase()

export function dropRepeatedHeading(body: string, heading: string): string {
  const target = normalize(heading)
  if (!target) return body
  return String(body ?? '')
    .split('\n')
    .filter((line) => {
      const md = /^\s*#{3,4}\s+(.+?)\s*#*\s*$/.exec(line)
      const html = /^\s*<h[34][^>]*>([\s\S]*?)<\/h[34]>\s*$/i.exec(line)
      const text = md?.[1] ?? html?.[1]
      return text === undefined || normalize(text) !== target
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
}
