# Claude Code 하단 상태바 표시 지침 (2026-10-15 주인님 지시)

> 목적: Claude Code(메인 `buylifemall@gmail.com`·보조 `buylifemall1@gmail.com` 두 계정 모두)의 하단 상태바가 **터미널을 다시 열어도, Orca 등이 설정을 덮어써도 항상 같은 형식으로 고정 표시**되게 한다. 이 PC 로컬 설정이므로 코드 배포와 무관하다. Codex 상태바는 [CODEX_STATUSBAR_STARTUP.md](CODEX_STATUSBAR_STARTUP.md).

## 1. 고정 표시 형식

```
[모델명]·[effort] | 5h [남은%] ([초기화까지 남은 시간]) | weekly [남은%] ([남은 시간]) | context [남은%]
예) Opus 5.5·medium | 5h 100% (4h 56m) | weekly 100% (6d 18h 56m) | context 71%
```

- **모든 % 값은 "남은 양"**이다(사용량 아님). 시간은 `0h 34m`·`6d 18h 56m`처럼 공백을 둔다.
- Orca 하단 표시줄의 `XX% 사용`은 반대로 **사용량**이다(핵심 원칙 9번) — 두 화면을 섞어 읽지 않는다.

## 2. 구성 파일 (이 PC, 저장소 밖)

| 파일 | 역할 |
|---|---|
| `C:/Users/Administrator/.claude/statusline-extra.js` | 표시 스크립트(위 형식 출력). 마지막 입력을 `%TEMP%/last-agy-statusline.json`에 저장 |
| `…/statusline-extra.js.good` | 정상본 백업. 표시 스크립트가 지워지거나 비면 guard가 이것으로 되살린다 |
| `C:/Users/Administrator/.claude/statusline-guard.js` | 고정 장치. `~/.claude`·`~/.claude-account2`·`CLAUDE_CONFIG_DIR`의 `settings.json`에서 `statusLine`이 표시 스크립트를 부르지 않으면 다시 붙이고(Orca 호출은 유지), 스크립트 파일도 복구한다 |
| 두 계정 `settings.json`의 `hooks.SessionStart`·`hooks.UserPromptSubmit` | 매 세션 시작·매 질문마다 guard 실행 → 덮어써져도 다음 입력에서 자동 복구 |

## 3. 지킬 것

1. **상태바 설정을 바꾸는 작업(Orca 재설치, Claude Code 설정 변경, 새 계정 폴더 추가 등) 뒤에는 반드시 아래 4번 점검을 실행**한다. 새 Claude 계정 폴더를 만들면 guard의 점검 대상과 그 폴더 `settings.json` 훅 두 개를 함께 추가한다.
2. `statusline-extra.js`를 고치면 동작을 확인한 뒤 `.good` 백업도 같이 갱신한다(고장 난 파일을 백업으로 덮지 않는다).
3. 상태바가 "이상하다"는 말을 들으면 추측하지 말고 `last-agy-statusline.json`(Claude Code가 실제로 보낸 값)과 스크립트 출력을 대조해 보고한다. 예: 2026-10-15 오전 "100%"로 보인 것은 주간 한도가 05:00에 초기화되고 5시간 구간이 새로 시작된 정상 값이었다.
4. 출력이 비면 Claude Code가 그 칸의 값을 보내지 않은 경우가 많다(예: 세션 첫 응답 전에는 한도 값이 없음). 스크립트를 고치기 전에 입력 JSON부터 본다.

## 4. 점검 명령 (Git Bash)

```bash
for d in .claude .claude-account2; do f=/c/Users/Administrator/$d/settings.json; echo "$d guard=$(grep -c statusline-guard $f) extra=$(grep -c statusline-extra.js $f)"; done   # 각각 guard=2 extra=1
cat "$TEMP/last-agy-statusline.json" | node C:/Users/Administrator/.claude/statusline-extra.js   # 위 형식 한 줄
cmp /c/Users/Administrator/.claude/statusline-extra.js /c/Users/Administrator/.claude/statusline-extra.js.good && echo same
```

복구: `node C:/Users/Administrator/.claude/statusline-guard.js` 실행 후 Claude Code에서 아무 질문이나 한 번 입력. 그래도 안 나오면 `docs/ERROR_LESSONS.md` 2026-10-14 "하단 상태바가 재실행 후 빠짐" 항목.
