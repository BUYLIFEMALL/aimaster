# AI 문서번역 자동화 — 분석·개발 계획

2026-10-14. 주인님이 Google AI Studio 앱을 면밀히 분석하고 프로그램명을 추천한 뒤 개발 플랜을 작성하도록 요청하셨습니다. **현재는 분석·계획 단계이며 프로그램 구현·DB 등록·배포는 하지 않았습니다.**

- 추천 프로그램명: **AI 문서번역 자동화**. 이름은 아직 주인님이 확정하지 않았습니다.
- 후보 폴더·slug·배포 프로젝트: `document-translator`. 이 폴더는 계획을 보관하는 임시 작업 위치입니다.
- 제품 목표: 문서·텍스트를 번역하고 원문과 비교하며 문맥·전문 용어·문체를 검수하는 작업 공간.
- 원본: [번역의 정석](https://aistudio.google.com/apps/9596827a-a428-415c-aaae-8547cbe137ea?fullscreenApplet=true&showAssistant=true&showPreview=true).
- [원본 정밀 분석](docs/REFERENCE_ANALYSIS.md): 소스19개, 실행 HTML·JS, 실제 화면·DOCX 관찰.
- [개발 플랜](docs/DEVELOPMENT_PLAN.md): 범위, 화면, API·데이터 설계, 단계별 완료 기준.
- [CLI 인수인계](docs/CLI_HANDOFF.md): 확인한 사실, 미검증 항목, 재개 절차.

회원은 본인 AIMaster 계정으로 로그인하고 본인 Gemini 키만 사용합니다. 별도 회원가입·공용 API 키·Meta OAuth 앱은 만들지 않습니다. 원본의 코드·브랜드·문구를 복제하지 않고 기능 구조를 참고해 새로 구현합니다.
