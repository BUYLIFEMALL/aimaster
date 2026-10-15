# 인수인계 — "도톨이 AI"(DotoliAI-1.2-setup.exe) 분석 → 웹 자동화 프로그램 재구현 (2026-10-15, 맥미니 세션)

> 주인님 지시: "DotoliAI-1.2-setup.exe 이 프로그램을 한번 분석해서 웹용 자동화 프로그램으로 구현해 보자." 맥미니에서 정적 분석을 시작했고, **설치 파일 압축 해제 단계에서 막혀 윈도우에서 이어간다**(주인님 지시).
> 먼저 읽을 것: 루트 `CLAUDE.md` 핵심 원칙 14(레퍼런스 전수 분석 후 플랜 보고)·21(REA 분석, 권리 확인), `docs/REA_REVERSE_ENGINEERING.md`, `docs/ANALYSIS_TOOLKIT.md`.

> **2026-10-15 윈도우에서 이어서 완료**: `innounp` 2.70.1로 해제(`D:PDSdotoli_extract`) → 본체는 Python 3.12·PySide6·PyInstaller 데스크톱 앱(네이버 블로그 글쓰기 보조, ChatGPT 구독을 Codex 로그인으로 사용). 권리: 주인님 "권리 없음 — 기능만 참고". 기능 분석·웹 재구현 플랜: [DOTOLI_AI_REFERENCE_ANALYSIS.md](DOTOLI_AI_REFERENCE_ANALYSIS.md). 다음: 주인님이 이름·1차 범위 결정 → 구현.

## 1. 한 일 (맥미니, 정적 분석만 — EXE 실행 없음)
| 항목 | 결과 |
|---|---|
| 원본 파일 | `D:\PDS\DotoliAI-1.2-setup.exe` (410,114,288바이트, 2026-10-12) |
| SHA-256 | `952ea9015c5a3d0ba6254a7d27a26c4266977f5350b477cc196a87086ce7638d` |
| 형식 | PE32 GUI(x86) — **Inno Setup 6.7.0** 설치 파일(파일 안 문자열 `Inno Setup Setup Data (6.7.0)`) |
| 버전 정보(리소스) | 회사명·제품명 **"도톨이 AI"**, 설명 "도톨이 AI Setup", 제품 버전 **1.2**. 저작권·원본 파일명 칸은 비어 있음 |
| 공개 정보 | "도톨이 AI"·"DotoliAI"로 웹 검색 → 공식 사이트·소개 자료 **없음**(이름만 비슷한 무관 결과뿐) |
| REA | `open_binary` 성공, `inspect_artifact`는 "하위 항목 없음" — **REA는 Inno Setup 내부를 풀지 못함** |
| innoextract | 맥미니에 Homebrew로 `innoextract 1.9` 설치(오픈소스). 결과: `Could not determine setup data version!` — **Inno Setup 6.4까지만 지원**(GitHub master 최신 지원도 6.4.0, 2025-01) |

- 제품명 해석: 리소스의 한글은 UTF-16 `U+B3C4 U+D1A8 U+C774` = "도톨이". 파일명의 DotoliAI와 일치.
- 분석용 사본은 맥미니 임시 폴더에만 있다(공유 폴더에 만든 것 없음). 윈도우에서는 원본 `D:\PDS\DotoliAI-1.2-setup.exe`를 쓴다.

## 2. 커밋·푸시·배포
- 이 문서와 `docs/HANDOFF.md` 안내 한 줄만 커밋한다. 코드·DB·배포 없음. 프로그램 폴더·slug는 아직 만들지 않았다(용도 파악 후 결정).

## 3. 확인한 것 / 확인하지 못한 것
- 확인: 설치기 종류·버전, 제품명·버전, 공개 정보 없음.
- **미확인: 프로그램 본체가 무엇으로 만들어졌는지(Electron·.NET·Python·네이티브), 화면·기능·서버 통신·필요한 API 키.** 설치 데이터가 압축되어 있어 내용물을 아직 못 봤다.

## 4. 남은 일과 이어서 할 첫 단계 (윈도우)
| 순서 | 할 일 | 확인할 것 |
|---|---|---|
| 1 | **주인님께 권리 확인**: 이 프로그램을 어디서 받았는지, 남의 상용 프로그램인지 | 남의 것이면 코드를 옮기지 않고 기능·동작만 파악해 새로 구현(원칙 21) |
| 2 | Inno Setup 6.7을 지원하는 해제 도구로 **실행 없이** 내용물 추출. 후보: `innounp` 최신판(Inno Setup 6.x 지원판, 공식 배포처에서 받기) | 새 빈 폴더 `D:\PDS\dotoli_extract\`에 풀기. EXE 자체는 실행하지 않는다 |
| 3 | 꺼낸 파일로 종류 판별(Detect It Easy 등, `docs/ANALYSIS_TOOLKIT.md`) | `resources\app.asar` → Electron(`analyze_javascript_application`), .NET DLL → `inspect_managed_artifact`/ILSpy, Python(`_internal`, `.pyz`) → PyInstaller 추출, 그 외 네이티브 → Ghidra |
| 4 | 화면 구성·기능·설정값·서버 주소·사용 API(OpenAI/Gemini 등)·외부 계정 연동 목록화 | 분석 결과는 새 프로그램 폴더의 `docs/REFERENCE_ANALYSIS.md`에 저장(원칙 14) |
| 5 | 우리 방식(웹 / 웹+크롬 확장 / 웹+데스크톱)으로 재구현 플랜 작성 → **주인님께 보고 후 구현** | 본인 계정·본인 API 키, 흰색 화면, 표준 사이드바, 프리미엄 후보 여부(운영 비용) |
| (대안) | 추출이 안 되면 **윈도우 샌드박스**에 설치해 화면 관찰 | 출처 모르는 EXE 실행이므로 **주인님 승인 필수**, 격리 환경에서만 |

- 내용물을 `D:\PDS\dotoli_extract\`에 풀어 두면 맥미니(`/Volumes/gt1_mega/PDS/dotoli_extract/`)에서도 분석을 이어갈 수 있다.

## 5. 주의점
- **EXE를 실행하지 않는다**(원칙 21, 출처 미상). 해제 도구만 실행한다.
- 분석 대상 파일은 새 빈 폴더에 두고, 분석 결과(JSON Evidence)는 파일로 저장한 뒤 필요한 부분만 읽는다.
- 설치 파일·추출물 원문은 Git에 넣지 않는다(크기·권리). 핵심 사실만 문서로 남긴다.
- 맥미니에 `innoextract`(Homebrew)를 설치했다 — 필요 없으면 `brew uninstall innoextract`.

## 6. 작업 장비
- 맥미니(Claude Code 보조 계정) — 정적 분석까지. 이어서: 윈도우(메인 PC) 세션.

## 7. 윈도우에서 실행할 단계
| 순서 | 실행할 것 | 확인할 것 |
|---|---|---|
| 1 | 주인님께 권리·용도 확인 | 남의 상용 프로그램인지 |
| 2 | `innounp`(Inno 6.7 지원판)로 `D:\PDS\DotoliAI-1.2-setup.exe`를 `D:\PDS\dotoli_extract\`에 해제 | 실행하지 않고 추출만, 파일 목록 확인 |
| 3 | DIE로 본체 종류 판별 → REA/ILSpy/Ghidra 분석 | 화면·기능·통신·키 목록 |
| 4 | 분석 문서·재구현 플랜 작성 → 주인님 보고 | 승인 후 새 서브프로젝트 폴더 생성·구현 |
