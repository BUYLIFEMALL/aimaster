# naver-blog-auto-poster_web 개선사항

## 2026-10-17 (Claude Code 윈도우) 권한 없는 회원이 404를 봄
- **증상**: 권한 없는 회원이 프로그램 화면에 들어가면 `checkProgramAccess` 거부 후 메인 `https://www.buylife.xyz/programs/<slug>`로 이동하는데, 프로그램이 비공개(`is_active=false`)라 그 페이지가 404다. 회원은 왜 막혔는지 알 수 없다.
- **제안(미처리, 우선순위 중간)**: 비공개 프로그램이면 메인 소개 페이지 대신 "현재 이용할 수 없는 프로그램입니다" 안내(또는 메인 `/programs` 목록)로 보내기. 공개 전환 시에는 문제 없음.
- 관련 파일: `web/app/naver-blog-auto-poster-web/page.tsx` 46행 근처.

## 2026-10-23 (Claude Code 윈도우) — 보류: 확장 자동 연결(주인님 결정 「보류하고 ⑩ 먼저」)
- 다른 확장 프로그램(티스토리 v1.89·블로그 에이전트 v2.10·SEO 스튜디오)은 「자동 연결」(사이트 연결 화면 → 사이트용 콘텐츠 스크립트 → background가 서버 확인 뒤 코드 저장)로 바뀌었지만, 이 확장은 아직 연결 코드 붙여넣기 방식.
- 이 프로그램은 비공개(`is_active=false`, v1.13)이고 블로그 통합 분석에서도 「옛 전송 도구」로 분류돼 존폐 미정이라, **다시 공개하기로 정할 때 함께 넣는다.** 넣을 곳: `web/`에 연결 화면, 확장에 사이트 연결 콘텐츠 스크립트·`background.js` `connect` 처리·manifest 사이트 주소 허용(기준 구현 `naver-blog-seo-studio/extension/web-bridge.js`·`background.js` `connectWithToken`). 웹·확장 동시 변경이라 배포(빌드 1회)와 확장 버전 올리기가 따르고, 실제 확인은 관리자 계정 로그인 필요.
