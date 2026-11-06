// U9-A(2026-11-06): 음성 분석 결과 → 업무 워크스페이스 「받은 업무」(공용 표 work_inbox).
// 이 프로그램은 분석 결과를 DB에 저장하지 않으므로, 화면이 보낸 분석 결과 "구조"를 서버에서 검사하고 마크다운을 여기서 만든다
// (화면이 만든 마크다운 본문을 그대로 넣지 않음 — 공용 기준 코드 work-inbox-client 주의사항).

const MAX_BODY = 200_000;
const MAX_TITLE = 200;

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const list = (v: unknown, max: number): Obj[] => (Array.isArray(v) ? v.map(obj).slice(0, max) : []);
/** 여러 줄 글(요약·통찰) */
const text = (v: unknown, max = 4000) => (typeof v === "string" ? v.slice(0, max).trim() : "");
/** 한 줄 글(목록 칸) — 줄바꿈이 목록을 깨지 않게 공백으로 */
const line = (v: unknown, max = 500) => text(v, max).replace(/\s+/g, " ");

function seoulDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function meetingInboxContent(raw: unknown, now = new Date()): { title: string; bodyMd: string } {
  const d = obj(raw);
  const summary = text(d.summary);
  const transcription = list(d.fullTranscription, 5000);
  if (!summary && transcription.length === 0) throw new Error("보낼 음성 분석 결과가 없습니다.");

  const tech = obj(d.technicalInfo);
  const speakers = list(d.speakerAnalysis, 50);
  const actions = list(d.actionItems, 100);
  const questions = list(d.keyQuestions, 100);
  const topics = list(d.topicsAndKeywords, 50);
  const insights = text(d.overallInsights);

  const firstTopic = line(topics[0]?.topic, 60);
  const title = `음성 분석 회의록 ${seoulDate(now)}${firstTopic ? ` — ${firstTopic}` : ""}`.slice(0, MAX_TITLE);

  const meta = [
    line(tech.duration, 40) && `**재생 시간:** ${line(tech.duration, 40)}`,
    line(tech.language, 40) && `**언어:** ${line(tech.language, 40)}`,
    speakers.length > 0 && `**참석자:** ${speakers.map((s) => `${line(s.name, 40)}${line(s.role, 40) ? `(${line(s.role, 40)})` : ""}`).join(", ")}`,
  ].filter(Boolean).join(" · ");

  const parts: string[] = [];
  if (meta) parts.push(meta);
  if (summary) parts.push(`## 요약\n${summary}`);
  if (actions.length > 0) {
    parts.push(`## 할 일\n${actions.map((a) => `- [ ] ${line(a.task)} (담당: ${line(a.assignee, 60) || "미정"}, 기한: ${line(a.dueDate, 60) || "미정"})`).join("\n")}`);
  }
  if (questions.length > 0) {
    parts.push(`## 핵심 질문\n${questions.map((q, i) => `${i + 1}. ${line(q.question)}${line(q.asker, 60) ? ` (질문자: ${line(q.asker, 60)})` : ""}${line(q.context) ? ` — ${line(q.context)}` : ""}`).join("\n")}`);
  }
  if (topics.length > 0) {
    parts.push(`## 주제·키워드\n${topics.map((t) => {
      const keywords = Array.isArray(t.keywords) ? t.keywords.map((k) => line(k, 40)).filter(Boolean).slice(0, 20).join(", ") : "";
      return `- ${line(t.topic, 120)}${keywords ? `: ${keywords}` : ""}`;
    }).join("\n")}`);
  }
  if (speakers.length > 0) {
    parts.push(`## 화자별 정리\n${speakers.map((s) => `- **${line(s.name, 40)}**${line(s.role, 40) ? ` (${line(s.role, 40)})` : ""}: ${line(s.keyContribution)}${line(s.style, 120) ? ` · 화법: ${line(s.style, 120)}` : ""}`).join("\n")}`);
  }
  if (insights) parts.push(`## 종합 통찰\n${insights}`);

  let body = parts.join("\n\n");
  if (transcription.length > 0) {
    const cut = "\n- (이하 생략 — 전체 받아쓰기는 AI Audio분석 화면에서 복사해 주세요)";
    body += "\n\n## 전체 받아쓰기";
    for (const t of transcription) {
      const row = `\n- [${line(t.timestamp, 20)}] ${line(t.speaker, 40)}: ${line(t.text, 2000)}`;
      if (body.length + row.length + cut.length > MAX_BODY) { body += cut; break; }
      body += row;
    }
  }
  return { title, bodyMd: body.slice(0, MAX_BODY) };
}
