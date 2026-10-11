# 프로그램 목록 상단 로고 → 메인 사이트 링크

2026-10-12 주인님 요청: https://www.buylife.xyz/programs 의 AI Master 로고를 누르면 https://www.buylife.xyz 메인 사이트로 이동.

## 변경

공통 마케팅 헤더 components/layout/Header.tsx의 로고를 상대 경로 Next Link(/)에서 일반 a 링크 https://www.buylife.xyz로 변경했습니다. 접속한 별칭/현재 화면과 관계없이 정식 메인 도메인으로 전체 페이지 이동합니다. 접근성 이름은 AI Master 메인 사이트입니다. 메뉴/프로필/로그아웃/권한·회원 데이터는 수정하지 않았습니다. 같은 헤더를 사용하는 공개 페이지에도 동일하게 적용됩니다.

루트 AIMaster 웹 작업입니다. 독립 서브프로그램의 APP_VERSION·DB·확장은 이번 기능 수정 대상이 아니며 버전을 올리지 않습니다. 다른 CLI의 올인원 작업은 제외합니다.

## 검수 및 운영

- 로컬 npm run build 통과. 루트 설정이 타입 검사 생략을 사용하므로 빌드를 전체 타입 검사 통과로 표현하지 않습니다.
- 헤더 ESLint: 오류0·기존 supabase 의존성 경고1. 루트에 ESLint 설정이 없어 임시 next/core-web-vitals 설정을 지정해 해당 파일만 검사했습니다.
- 코드 커밋 `16779659`를 원격 `origin/master`에 푸시했습니다. 분리된 릴리스 worktree에서 `vercel deploy --prod --yes --scope buylife`로 aimaster 프로덕션 배포를 완료했습니다.
- 루트 배포에 필요한 Git 제외 데스크톱 설치 파일을 포함했습니다. 기존 설치 파일 다운로드는 HTTP 200 / 72,796,208바이트, 기존 확장 ZIP 다운로드도 HTTP 200으로 확인했습니다.
- 운영 `/programs`와 `/` 모두 HTTP 200이며, 로고의 실제 href가 `https://www.buylife.xyz`인 것을 확인했습니다. 별도 Chrome 창에서 프로그램 목록의 로고를 직접 눌렀고, 주소가 `https://www.buylife.xyz/`로 이동하면서 메인 제목 “마케팅을 자동화하세요”가 표시되는 것을 실제 화면으로 확인했습니다.
- 운영 배포 `dpl_4nyFTsRJnbs9bWRZJDw5hGSccWiS`는 READY입니다. 배포 주소: https://aimaster-95mbhuzjp-buylife.vercel.app / 운영 주소: https://www.buylife.xyz .
- 화면 증거: [프로그램 목록](evidence/home-logo-2026-10-12/programs.png), [로고 클릭 후 메인 화면](evidence/home-logo-2026-10-12/home.png).
- 이번 요청의 남은 작업은 없습니다. 다른 프로그램 자동화 작업의 진행 상태는 해당 프로그램 인수인계 문서에서 별도로 관리합니다.
