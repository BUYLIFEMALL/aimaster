// BLC-08b (2026-10-22): 본인 문체 프롬프트 — 순수 함수. blog-workroom src/lib/prompts.ts의 stylePrompt·styleBrief 기반.
// 문체가 없으면 styleSection은 빈 문자열이라 생성 프롬프트가 v1.84와 같다.
import type { StyleProfile, StylePost } from "../style";

export function stylePrompt(name: string, posts: StylePost[], samples: string[]): { system: string; user: string } {
  const postText = posts.map((p, i) => `#${i + 1} 제목: ${p.title}\n본문: ${p.text.slice(0, 1800)}`).join("\n\n");
  const sampleText = samples.map((s, i) => `표본 ${i + 1}: ${s.slice(0, 2000)}`).join("\n\n");
  return {
    system: "당신은 한국어 블로그 글쓰기 분석가입니다. 제공된 글에서 근거가 보이는 특징만 쓰고 JSON만 반환합니다.",
    user: `아래는 「${name}」 작성자의 최근 글과 붙여 넣은 글 표본입니다. 이 작성자의 글쓰기 특징을 분석하세요. 글에 없는 사실·경력·경험은 만들지 마세요.\n\n${postText}${sampleText ? `\n\n${sampleText}` : ""}\n\n다음 JSON으로 답하세요:\n{"summary":"글 성격 2~3문장","tone":"어조·말투(존댓말/반말, 친근함 정도 등)","sentence":"문장 길이·리듬·문단 습관","structure":"글 구성 습관(도입·소제목·마무리)","reader":"주로 염두에 둔 독자","expressions":["자주 쓰는 표현(최대 8개)"],"avoid":["이 작성자가 쓰지 않는 표현(최대 5개)"],"strengths":["강점(최대 4개)"],"cautions":["따라 쓸 때 주의할 점(최대 4개)"]}`,
  };
}

export function styleSection(style: { name: string; profile: StyleProfile } | undefined): string {
  if (!style) return "";
  const s = style.profile;
  return `\n\n사용자가 승인한 「${style.name}」 문체를 따르세요(사실·경험은 지어내지 말고 말투·문장·구성 습관만 따름). 말투·문장 끝맺음(예: ~요/~습니다)은 위 페르소나 톤보다 이 문체를 우선하고, 페르소나는 관점과 내용 구성에만 반영합니다. 자주 쓰는 표현에 보이는 끝맺음을 본문 전체에 일관되게 씁니다:\n어조: ${s.tone}\n문장: ${s.sentence}\n구성: ${s.structure}\n독자: ${s.reader}${s.expressions.length ? `\n자주 쓰는 표현(자연스러울 때만): ${s.expressions.join(", ")}` : ""}${s.avoid.length ? `\n쓰지 않는 표현: ${s.avoid.join(", ")}` : ""}`;
}
