// 도구를 쓸 때마다 한국어 진행 표시 규칙을 짧게 상기시킨다(2026-10-19 주인님 「한글로 설명하도록 다시 명시해」).
// 2026-10-20 보강(주인님 「이 세션은 왜 영어로 설명하지」): 코드·diff를 길게 읽은 뒤 "Now I'll…", "The …", "Next, …", "I need to…"처럼
// 영어로 시작하는 진행 설명이 반복됨 → 금지 시작어와 자기 점검 문장을 넣었다.
// PostToolUse 훅은 JSON의 additionalContext만 Claude 맥락에 들어간다. 되돌리기: settings.json에서 이 훅 삭제(이전 문구 .before-20261020).
process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext:
      "[한국어 규칙] 다음 안내 문장은 첫 단어부터 한국어로 쓴다(예: \"확인했습니다.\", \"다음은 …입니다.\"). 영어 문장 금지. " +
      "코드·diff·로그를 읽은 직후일수록 영어로 흐른다 — \"Now/I'll/The/Next/Let me/I need/Card news/Page\"로 시작하면 지우고 「~하겠습니다.」「~했습니다. 다음은 ~입니다.」로 다시 쓴다.",
  },
}));
