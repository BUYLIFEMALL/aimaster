# REA(리버스 엔지니어링 도구) 사용 지침

> 2026-10-15 주인님 지시: "프로그램을 분석할 때 필요하다면 REA를 사용하라." 모든 CLI 공통(CLAUDE.md 핵심 원칙 21, AGENTS.md 핵심 원칙 20).

## 1. 언제 쓰나
- **소스가 없는 완성품을 분석할 때**: EXE·설치 파일·ZIP/MSIX·크롬 확장·Electron 앱(`app.asar`)·.NET 어셈블리·APK·웹사이트 번들(JS).
- 목적: 그 프로그램이 **무슨 기능을 어떻게 하는지**(화면·기능·서버 통신·설정값·문자열)를 근거와 함께 파악하고, 우리 플랫폼 방식(웹 / 웹+크롬 확장 / 웹+데스크톱 앱)으로 **새로 설계해 재구현**하는 것.
- 참고 사이트 주소를 받았을 때의 전수 분석(핵심 원칙 14)에도 웹 번들 분석(`analyze-web-bundle`)으로 쓸 수 있다.
- **쓰지 않는 경우**: 이 저장소처럼 소스 코드가 이미 있는 프로젝트의 구조 분석 — 평소 도구(grep·파일 읽기)로 한다.

## 2. 지킬 것
- **권리 확인 먼저**: 주인님이 만들었거나 권리가 있는 프로그램은 자유롭게 분석. **남의 상용 프로그램은 코드를 옮겨 쓰지 않고** 기능·동작만 파악해 우리 방식으로 새로 만든다(이용약관이 분해를 금지하는 경우가 많다). 애매하면 주인님께 먼저 묻는다.
- **출처를 모르는 EXE는 실행하지 않는다** — 정적 분석(파일 내용)만 한다. 실행 관찰(capture-process 등)이 꼭 필요하면 주인님 승인 후 격리 환경에서.
- **분석 대상 원본 보관 위치: `D:\PDS\Program_dev`** (2026-10-21 주인님 지시). 주인님이 이 폴더에 넣어 두면 여기서 찾아 쓰고, 원본은 옮기거나 지우지 않는다.
- 분석 대상 파일은 원본 폴더에서 바로 풀지 말고 **새 빈 폴더**에 복사해 두고, 분석 결과(JSON Evidence)는 크기가 크니 파일로 저장한 뒤 필요한 부분만 읽는다.
- 재구현에도 최상위 규칙(회원 본인 계정·본인 API 키), 흰색 화면, 버전 관리 등 모든 핵심 원칙이 그대로 적용된다.

## 3. 설치 현황 (2026-10-15, 이 PC)

> 함께 쓰는 도구(ILSpy·.NET 8 SDK·Detect It Easy·7-Zip 등) 전체 목록·주소·재설치 순서: [`docs/ANALYSIS_TOOLKIT.md`](ANALYSIS_TOOLKIT.md)

| 항목 | 위치/값 |
|---|---|
| REA CLI | `rea` 6.4.0 (`npm` 전역, `AppData\Roaming\npm\rea`) |
| Ghidra | 12.1.4 — `C:\Tools\ghidra_12.1.4_PUBLIC` (NSA 공식 GitHub, SHA-256 검증) · 사용자 환경변수 `GHIDRA_INSTALL_DIR` |
| Java | Temurin JDK 21.0.12 (winget `EclipseAdoptium.Temurin.21.JDK`) · 사용자 환경변수 `JAVA_HOME` |
| Claude Code 연결(MCP `rea`) | 메인 `~/.claude.json`, 보조 `~/.claude-account2/.claude.json` (각 `.rea.backup` 백업) |
| REA 지침(skill) | 메인 `~/.claude/skills/reverse-engineer-anything`, 보조 `~/.claude-account2/skills/reverse-engineer-anything` (v37) |
| Codex·Antigravity·Gemini CLI | MCP `rea` 연결(Ghidra·Java 경로 포함) + 공용 지침 `~/.agents/skills/reverse-engineer-anything` — 상세 `docs/ANALYSIS_TOOLKIT.md` 2-1 |
| 없음 | IDA·Hopper(유료/선택) — 필요 없음 |

- 연결 후 **Claude Code를 새로 시작해야** `rea` 도구가 보인다. 그 전에는 CLI(`rea analyze <경로> --provider ghidra --format json > out.json`)로 쓴다.
- 동작 확인: `whoami.exe` 사본을 Ghidra로 분석 → 36초, 함수 341·문자열 308 (2026-10-15).

## 4. 종류별 첫 도구
| 대상 | 도구 |
|---|---|
| Electron 앱(`resources\app.asar`)·JS 폴더 | `analyze_javascript_application` |
| .NET(C#) EXE/DLL | `inspect_managed_artifact` |
| C/C++ 일반 EXE | `open_binary` → Ghidra 디컴파일(`decompile`) |
| ZIP·MSIX·설치 패키지 | `open_binary` / `inspect_artifact` |
| APK | `inspect_android_package` |
| 웹사이트 | `analyze-web-bundle`, HAR는 `inspect_web_network_capture` |

## 5. 점검·복구
```bash
rea doctor --client claude_code          # 보조 계정(CLAUDE_CONFIG_DIR 설정된 세션)
env -u CLAUDE_CONFIG_DIR rea doctor --client claude_code   # 메인 계정
rea setup --client claude_code --dry-run # 연결이 사라졌을 때: 계획 확인 후 --yes
```
- `rea` 업데이트(`npm i -g rea-agents`) 뒤에는 위 setup을 다시 실행해 지침(skill)을 갱신한다.
