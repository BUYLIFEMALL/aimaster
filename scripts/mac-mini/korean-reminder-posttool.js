// 도구를 쓸 때마다 한국어 진행 표시 규칙을 짧게 상기시킨다(2026-10-19 주인님 「한글로 설명하도록 다시 명시해」).
// PostToolUse 훅은 JSON의 additionalContext만 Claude 맥락에 들어간다. 되돌리기: settings.json에서 이 훅 삭제.
process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: "[한국어 규칙] 다음 안내 문장은 첫 단어부터 한국어로 쓴다(예: \"확인했습니다.\", \"다음은 …입니다.\"). 영어 문장 금지.",
  },
}));
