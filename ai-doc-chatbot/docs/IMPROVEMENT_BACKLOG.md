# AI 문서 챗봇 자동화 — 작업 대기 백로그

## 검수·운영
- [ ] 본인 Upstage 키 등록 후 문서 1개 업로드 → 문서 질문 1회 → (Tavily 키 있으면) 최신 정보 질문 1회 — 결과·호출 수를 인수인계에 기록
- [ ] 카탈로그 썸네일 생성(`scripts/generate-program-thumbnail.mjs`, PLATFORM_PATTERNS §13, 글자 없는 이미지 확인)
- [ ] 30일 cron(`dcb-retention-30d`) 첫 실행 기록 확인(`cron.job_run_details`)

## 비즈니스 로직
- [ ] L2 4MB 초과 문서 직접 업로드
- [ ] L3 100쪽 초과 PDF 비동기 읽기
- [ ] L4 혼합 검색
- [ ] L5 중복 업로드 방지

## 디자인/UX
- [ ] U1 출처 원문 펼쳐 보기
- [ ] U2 업로드 단계 표시
- [ ] U3 채팅방 검색·고정·이름 바꾸기
- [ ] U4 특정 문서만 참고

## 외부 연계
- [ ] C1 문서번역 → 내 문서
- [ ] C2 eBook Studio → Q&A 챗봇
