# 개발 플랜 (2026-10-19, Claude Code 윈도우): 인물사진 v1.28 — 저장 파일 이름 날짜를 현지(한국) 날짜로

> 상태: 주인님 "진행해줘"(v1.27 보고의 발견 항목) → 진행.

## 문제
- 저장 파일 이름 날짜가 `new Date().toISOString().slice(0, 10)`(세계 표준시)라 한국 시간 오전 0~9시에는 하루 전 날짜가 찍힌다.
- 위치: `Studio.tsx` 4곳(증명사진 ZIP·인물사진 ZIP·프로필 세트 ZIP·규격 저장 JPG), `HistoryList.tsx` 1곳(기록 사진 저장).

## 수정
- `src/lib/portrait/post.ts`에 순수 함수 `localDateStamp(d = new Date())` — 회원 PC 현지 날짜 `YYYY-MM-DD`(`getFullYear`/`getMonth`/`getDate`).
- 5곳을 이 함수로 교체. 서버 저장 시각(`apiKeys.ts`·`saved.ts`의 만료 시각)은 시각 비교용이라 그대로 둔다.

## 검수·비용·배포
- 단위 테스트(현지 시각 오전 8시 → 같은 날짜, 한 자리 월·일 0 채움), tsc, 빌드, 브라우저 자동 테스트(크롬 포그라운드).
- AI 비용 없음. 회원에게 보이는 버그라 Vercel 1회 배포, v1.28(코드+DB), 메인 크롬에서 버전 확인.
