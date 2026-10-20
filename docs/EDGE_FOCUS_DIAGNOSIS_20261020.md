# Edge 키보드 포커스 오류 진단

2026-10-20 Codex(윈도우). 주인님 요청: 잘되던 Edge 제어가 왜 실패하는지 확인. 블로그 BLC-01 후속 환경 진단이며 제품 코드/DB 변경은 없습니다.

## 관측 사실

1. 세션은 `danger-full-access`, 승인 방식 `never`입니다. 현재 `orca computer` 호출은 실행 가능하며, 이전 `CreateFile 0x5 / runtime_unavailable` 접근 문제는 재현하지 않았습니다.
2. Edge 창 ID `2884854`, 프로세스 `17488`. 접근성 트리·주소 값 설정·메뉴 클릭·실제 `/guide` 이동·FAQ 펼치기가 확인됐습니다. 키보드 명령에서만 `window_not_focused`가 반복됩니다.
3. 최소 재현 명령: `orca computer press-key --app msedge --window-id 2884854 --key Escape --restore-window --json --no-screenshot`. 같은 대상·옵션에서 한 번은 `ok:true`/synthetic input 응답이 나왔고 이후 같은 명령은 다시 포커스 오류입니다. Escape는 눈에 보이는 효과가 없는 키이므로 `ok:true` 한 번을 실제 입력 전달/안정적 복구 성공으로 계산하지 않습니다.
4. 실패 직전·직후 Windows `GetForegroundWindow()`는 모두 **0**이었습니다. 17:26:05~17:26:08 KST의 8개 읽기 표본도 모두 0입니다. 다른 프로그램이 포커스를 가진 것으로 오인하지 않도록 0은 ‘활성 창 핸들 없음’으로 기록합니다.
5. `query session`은 세션 2의 `rdp-tcp#0`가 `Active`임을 보였습니다. Edge/Orca/검사 프로세스는 모두 세션 2, 스레드 데스크톱과 입력 데스크톱 이름은 모두 `Default`였습니다. `LogonUI`는 다른 세션 1에 있어 이것만으로 세션 2 화면 잠금이라고 단정하지 않습니다.
6. 읽기 전용 토큰 검사: Edge·Orca·검사 PowerShell의 `TokenElevation`은 모두 true. 서로 다른 상승 여부 때문에 입력이 차단되는 가설은 이번 표본에 맞지 않습니다. 보안 설정/권한을 바꾸지 않았습니다.
7. 공식 해결 예시에 맞춰 최신 화면의 빈 제목 표시줄 좌표를 지원되는 `orca computer click --x 850 --y 20`으로 클릭했습니다. 직후 Escape는 `ok:true`였으나 다음 Ctrl+L은 다시 `window_not_focused`였습니다. 클릭 후에도 지속 복구되지 않아 해결 완료가 아닙니다. 주소/원고 입력·사이트 설정 변경은 하지 않았습니다.
8. 설치 Orca는 `1.4.232`, Windows runtime 파일 수정 시각은 2026-10-20 15:17:32입니다. 이전 정상 버전의 비교 자료가 없어 업데이트 회귀로 단정하지 않습니다.

## 설치 코드와 오류의 연결

대상: `C:/Users/Administrator/AppData/Local/Programs/orca/resources/computer-use-windows/runtime.ps1`.

| 위치 | 확인한 동작 |
|---|---|
| 332행 부근 `Restore-OrcaWindow` | `ShowWindow(...,9)` 후 `SetForegroundWindow` 요청. 반환값은 버림 |
| 338행 부근 `Test-OrcaWindowFocused` | `GetForegroundWindow()`와 대상 창 핸들이 같은지 대조 |
| 351행 부근 `Assert-OrcaKeyboardFocus` | 복원 옵션이 있어도 최대 500ms 안에 대상 창 포커스가 확인되지 않으면 관측된 오류 발생 |
| 1212행 부근 | type_text/press_key/hotkey/paste_text에 위 검사를 적용. 접근성 메뉴 클릭과 경로가 다름 |

runtime.ps1 SHA-256: `104d551f4d423c619eed22e65f0e6f74b37a104de01dadc49ce0b7844f32597c`.

설치된 JS sidecar의 Windows provider 경로/실행 구조도 읽기 확인했습니다. REA retained parent Evidence `ev_288efdc55cabd5d5853848d3cfe6b11b8cabc58a06855a972050d33787299f50`, summary Evidence `ev_a055acf62fcf63f3c99ef42ce4f505551cdbcbd0b86058348e05884ae2c742a3`. 전체 main 트리 정적 분석은 자원 한도로 semantic coverage가 partial이며, 설치본 전체의 동작을 검증했다는 뜻이 아닙니다. 오류 원인 경로는 위 PowerShell의 구체 코드와 실제 오류/Win32 표본으로 대조했습니다.

## 판단과 남은 확인

**후속 반증/추가 표본:** 주인님이 Edge가 앞에 있다고 확인한 뒤에도 키보드 오류가 남았습니다. 17:41:16 KST 읽기 결과는 window station `WinSta0`, Edge visible=true, foreground handle `3344724`(Orca 창)였습니다. 화면에 보이는 것과 OS 활성 창이 다를 수 있으며, **RDP 최소화로 원인을 확정하지 않습니다.** 직접 Edge 새 창 실행도 자동 검토에서 거부되어 별도 환경 비교는 미완료입니다. 접근성 메뉴 클릭은 가능하지만 transient 메뉴 항목은 상태 변경으로 stale 오류가 발생했습니다.

- **확인:** 현재 오류는 앱 로그인/API 키·Codex 파일 권한 실패가 아니라, 키보드 주입 전 Windows 활성 창 검사에서 발생합니다. 클릭이 되는 이유도 접근성 클릭은 이 키보드 검사 경로와 다르기 때문입니다.
- **유력 가설:** RDP 클라이언트 창의 최소화/전환 또는 원격 입력 데스크톱의 비활성 상태. 현재 RDP 세션·활성 창 0·간헐적 명령 수락이 이 가설에 맞습니다. 서버에서 RDP 클라이언트의 최소화 상태를 직접 읽은 것은 아니므로 **확정 원인으로 보고하지 않습니다.**
- **미확인:** 이전 정상 시점과 설치 버전 차이, 사용자의 RDP 창 상태를 바꾼 대조 결과, 실제 키보드 입력의 페이지 상태 변화. 원격 창을 보이게 둔 채 Edge 본문을 클릭하도록 요청했습니다. 답변 후 동일 명령/실제 주소 이동을 재검증합니다.
- **다음 첫 단계:** RDP 클라이언트를 최소화하지 않고 표시 → Edge 클릭 → 동일 재현 명령과 활성 창 핸들 대조 → 부작용 없는 실제 키보드 동작을 화면 변화로 확인. 계속 실패하면 입력 데스크톱 상태/사용 원격 클라이언트를 좁혀 조사합니다.
- 레지스트리·UAC·사용자 권한·Orca 설치본을 변경하거나 포커스 검사를 제거하지 않았습니다. 원격 세션 재시작/연결 해제도 하지 않았습니다. 운영 DB 변경/유료 호출/발행/배포 0회입니다. 진단 기록 미커밋/미푸시.

## 공식 근거

- [Microsoft GetForegroundWindow](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getforegroundwindow): 활성 창 핸들이 null인 경우가 있음.
- [Microsoft SetForegroundWindow](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setforegroundwindow): 전경 전환은 Windows 제한을 받으며 요청이 항상 성공하지 않음.
- [Microsoft UI 자동화 문제 해결](https://learn.microsoft.com/en-us/troubleshoot/power-platform/power-automate/desktop-flows/ui-automation/uipi-issues): 최소화된 RDP 창은 화면 자동화 실패 원인 중 하나. 이 문서는 Orca 자체에 대한 실증이 아니라 Windows 환경 가설의 근거로 사용.

블로그 BLC-01 [현재 인수인계](../naver-blog-agent/docs/IMPROVEMENT_HANDOFF_20261020_BLC01_RESUME.md). 서비스:

https://naver-blog-agent.buylife.xyz
