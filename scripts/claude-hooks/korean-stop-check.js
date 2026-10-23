// 종료 검사 훅(Stop) — 답변을 끝내기 직전, 이번 턴(마지막 주인님 메시지 이후)의 제 글에 영어 문장이 섞였는지 검사한다.
// 2026-10-23 주인님 지시 「종료 검사 훅 만들어」. 알림(UserPromptSubmit·PostToolUse 훅)만으로는 영어 진행 안내·영어 최종 보고가
// 반복돼(같은 날 여러 번 지적) 실제로 막는 장치를 둔다. 영어 줄이 있으면 decision "block" + 한국어로 다시 보고하라는 이유를 돌려준다.
// 무한 반복 방지: stop_hook_active(이미 한 번 되돌려 다시 쓰는 중)이면 통과시킨다.
// 되돌리기: settings.json의 Stop 훅에서 이 줄 삭제(백업 ~/.claude/settings.json.before-korean-stop-20261023).
// 한계(2026-10-23 확인): 이 훅은 대화 기록(transcript)의 「보이는 글」 블록만 읽는다. 같은 날 시험에서, 도구 호출 사이에 쓴 영어 안내 일부가
// 턴이 끝난 뒤에도 기록에 글로 저장되지 않아(기록에는 명령 안에만 있음) 이 훅이 볼 수 없었다 — 기록에 남는 줄은 막지만, 남지 않는 줄은 막지 못한다.
// 또 지난 영어 원문을 인용한 표 줄도 위반으로 잡으므로, 영어 원문을 언급할 때는 한국어 설명으로 쓴다.
const fs = require("fs");

const FUNCTION_WORDS = /\b(the|is|are|was|were|i|i'll|i've|i'm|we|you|it|it's|this|that|these|those|to|and|of|for|with|now|next|let|here|here's|there|done|will|can|should|has|have|be|been|not|no|so|then|before|after|into|from|on|in|at|by|my|our|your)\b/i;

function textOf(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.filter((b) => b && b.type === "text" && typeof b.text === "string").map((b) => b.text).join("\n");
}

function isRealUser(entry) {
  if (entry.type !== "user" || !entry.message) return false;
  const c = entry.message.content;
  if (typeof c === "string") return !c.startsWith("<"); // 시스템이 넣은 알림(태그로 시작)은 제외
  if (!Array.isArray(c)) return false;
  return c.some((b) => b && b.type === "text") && !c.some((b) => b && b.type === "tool_result");
}

/** 영어 문장 줄 찾기 — 코드·주소·경로를 빼고, 한글이 없고 영어 기능어가 있는 3단어 이상 줄 */
function englishLines(text) {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, "\n")
    .replace(/`[^`\n]*`/g, " ")
    .replace(/\]\([^)]*\)/g, "]")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[\w.-]*[\\/][\w./\\-]+/g, " ");
  const out = [];
  const lines = cleaned.split(/\n+/);
  lines.forEach((raw, i) => {
    const line = raw.replace(/^[\s>#*\-|0-9.)]+/, "").trim();
    if (!line || /[가-힣]/.test(line)) return;
    const words = line.match(/[A-Za-z][A-Za-z']+/g) || [];
    // 소제목(#)·표 머리글(다음 줄이 |---|)은 한글이 하나도 없고 영어 2단어 이상이면 영어로 본다 — 예: 「## Cost report」「| Item | Count |」
    const heading = /^\s*#{1,6}\s/.test(raw);
    const tableHeader = /^\s*\|/.test(raw) && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1] || "");
    if ((heading || tableHeader) && words.length >= 2) { out.push(raw.trim().slice(0, 120)); return; }
    if (words.length < 3) return;
    if (!FUNCTION_WORDS.test(line)) return;
    out.push(raw.trim().slice(0, 120));
  });
  return out;
}

let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input || "{}");
    if (data.stop_hook_active) return process.exit(0);
    const path = data.transcript_path;
    // 대화 기록이 없어도 마지막 답변(last_assistant_message)은 검사한다(2026-10-23 맥미니 설치 시험에서 발견)
    const raw = path && fs.existsSync(path) ? fs.readFileSync(path, "utf8") : "";
    const entries = raw.split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    let start = 0;
    for (let i = entries.length - 1; i >= 0; i--) if (isRealUser(entries[i])) { start = i + 1; break; }
    // 2026-10-23 보강: 대화 기록에는 턴 중간 안내가 검사 시점에 아직 글로 남지 않는 경우가 있어(실측), 훅 입력의 마지막 답변도 함께 본다
    const last = typeof data.last_assistant_message === "string" ? data.last_assistant_message : "";
    const text = entries.slice(start).filter((e) => e.type === "assistant" && e.message).map((e) => textOf(e.message.content)).join("\n") + "\n" + last;
    const found = englishLines(text);
    // 실행 기록(장치가 실제로 도는지 확인용) — 시각·검사한 글자 수·영어 줄 수·막았는지
    try {
      fs.appendFileSync(require("path").join(__dirname, "korean-stop-check.log"), JSON.stringify({ at: new Date().toISOString(), chars: text.length, hasLast: !!last, found: found.length, blocked: found.length > 0 }) + "\n");
    } catch { /* 기록 실패는 무시 */ }
    if (!found.length) return process.exit(0);
    const sample = found.slice(0, 3).map((l) => `「${l}」`).join(", ");
    process.stdout.write(JSON.stringify({
      decision: "block",
      reason:
        `[종료 검사 — 한국어 지침 위반] 이번 답변에 영어 문장 ${found.length}줄이 있습니다: ${sample}. ` +
        "같은 내용을 처음부터 한국어로 다시 보고하세요(첫 줄·소제목·표 머리글·칸까지 한국어, 전문 용어·경로·명령어만 영어). " +
        "맨 위에 「영어로 쓴 부분을 한국어로 다시 드립니다.」라고 밝히고, 도구는 다시 실행하지 마세요.",
    }));
  } catch {
    process.exit(0); // 검사 장치 오류로 답변을 막지 않는다
  }
});
