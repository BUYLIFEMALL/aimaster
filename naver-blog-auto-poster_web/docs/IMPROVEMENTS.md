# naver-blog-auto-poster_web 개선사항

## 2026-10-17 (Claude Code 윈도우) 권한 없는 회원이 404를 봄
- **증상**: 권한 없는 회원이 프로그램 화면에 들어가면 `checkProgramAccess` 거부 후 메인 `https://www.buylife.xyz/programs/<slug>`로 이동하는데, 프로그램이 비공개(`is_active=false`)라 그 페이지가 404다. 회원은 왜 막혔는지 알 수 없다.
- **제안(미처리, 우선순위 중간)**: 비공개 프로그램이면 메인 소개 페이지 대신 "현재 이용할 수 없는 프로그램입니다" 안내(또는 메인 `/programs` 목록)로 보내기. 공개 전환 시에는 문제 없음.
- 관련 파일: `web/app/naver-blog-auto-poster-web/page.tsx` 46행 근처.
