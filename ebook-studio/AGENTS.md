# eBook Studio — AI 에이전트 인수인계 문서 (AGENTS.md)

> # ★★★ 절대 불변 최상위 규칙 (2026-10-09 주인님 지시)
> **사용자는 본인의 계정과, 본인이 사용할 본인 API 키(Google Gemini)를 직접 등록·연동해서 사용한다.**
> 운영자(buylifemall)·다른 회원의 키로 대신 처리하지 않는다. 키가 없으면 "본인 키를 등록해주세요" 안내 모달을 띄운다.

## 1. 프로그램 개요
- **프로그램명**: eBook Studio (국문: eBook Studio, 영문: eBook Studio)
- **슬러그**: `ebook-studio`
- **버전**: `v1.01`
- **배포 주소**: `https://ebook-studio.buylife.xyz` (Vercel: `ebook-studio-buylife.vercel.app`)
- **카테고리**: 콘텐츠 / 퍼블리싱 (contents)
- **배지**: `["new", "free"]` (초기 가입 회원 누구나 무료 이용)

## 2. 핵심 워크플로우 (4단계 스텝퍼)
1. **STEP 1 (자료 수집 & 기획)**: 원문 문서/메모 입력, 파일(TXT/MD) 업로드, AI 제목/부제/10~15개 장(Chapter) 목차 자동 설계. (3대 정리 모드: 맥락과 사례까지 충실하게 / 중요한 내용만 간결하게 / 낱말은 그대로 서식만 다시).
2. **STEP 2 (목차 & 챕터 집필)**: 챕터별 원고 작성 및 인라인 위지윅 편집기, 소제목/핵심 인사이트/생각하고 실천하기 질문 관리. 단일 챕터 AI 집필 및 전체 챕터 일괄 집필 지원.
3. **STEP 3 (디자인 & 표지)**: 21종 테마(밝은 계열 12, 어두운 계열 8, 고대비 1), 5종 한글 서체(본고딕, 본명조, 리디바탕, 마루부리, 페이퍼로지), 지면 꾸밈(클래식/스튜디오), 줄간격 및 글자 크기 실시간 조절, AI 3:4 규격 표지 생성 및 직접 업로드.
4. **STEP 4 (배포 & 내보내기)**:
   - **독립형 단일 HTML 다운로드**: 외부 의존성 없이 단 하나의 `.html` 파일로 오프라인에서도 테마/검색/목차가 완벽 동작.
   - **웹 배포용 ZIP 다운로드**: Vercel Drop(vercel.com/new/drop) 등에 올려 3초 만에 나만의 라이브 웹 도메인 전자책 사이트 구축.
   - **표준 EPUB 다운로드**: 전자책 리더기 호환.
   - **인쇄 / PDF 저장**: 브라우저 인쇄창을 통한 책 규격 PDF 출력.
   - **프로젝트 JSON 백업 / 복원**.

## 3. UI/UX 표준 준수
- **배경**: 흰색 베이스 클린 UI (`docs/SIDEBAR_LAYOUT_STANDARD.md` 규격 Sidebar 준수).
- **연도 기준**: 2026년 기준 (`const currentYear = new Date().getFullYear();`).
- **권한 연동**: AIMaster 공유 Supabase DB(`esgxyikcnnvmlhygjkth`)의 `requireProgramAccess()` SSO 쿠키 연동.
