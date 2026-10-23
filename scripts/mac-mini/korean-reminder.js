// 매 질문마다 Claude에게 한국어 진행 표시 규칙을 상기시킨다(2026-10-19 주인님 지시 — 영어 진행 안내 반복 재발 대책).
// UserPromptSubmit 훅의 표준 출력은 Claude가 읽는 추가 맥락으로 들어간다. 윈도우 원본: C:/Users/Administrator/.claude/korean-reminder.js(내용 동일).
// 설치: node scripts/mac-mini/install-korean-reminder.mjs (맥미니 ~/.claude 와 Orca 계정 폴더 전부에 훅 추가)
process.stdout.write(
  "[0순위 규칙 상기] 화면에 보이는 모든 문장(도구 호출 사이 안내·확인 한 줄·다음 단계·명령 설명)은 한국어로 쓴다. " +
    "도구 결과를 받은 뒤 첫 문장은 반드시 한국어 단어로 시작한다(예: \"배포가 끝났습니다.\"). " +
    "영어 로그·배포/검수·스크린샷 오류·대화 압축 직후에 특히 확인한다. 영어는 경로·함수명·명령어·출력 원문에만.\n"
);
