# 프로그램 목록 상단 로고 → 메인 사이트 링크

2026-10-12 주인님 요청: https://www.buylife.xyz/programs 의 AI Master 로고를 누르면 https://www.buylife.xyz 메인 사이트로 이동.

## 변경

공통 마케팅 헤더 components/layout/Header.tsx의 로고를 상대 경로 Next Link(/)에서 일반 a 링크 https://www.buylife.xyz로 변경했습니다. 접속한 별칭/현재 화면과 관계없이 정식 메인 도메인으로 전체 페이지 이동합니다. 접근성 이름은 AI Master 메인 사이트입니다. 메뉴/프로필/로그아웃/권한·회원 데이터는 수정하지 않았습니다. 같은 헤더를 사용하는 공개 페이지에도 동일하게 적용됩니다.

루트 AIMaster 웹 작업입니다. 독립 서브프로그램의 APP_VERSION·DB·확장은 이번 기능 수정 대상이 아니며 버전을 올리지 않습니다. 다른 CLI의 올인원 작업은 제외합니다.

## 검수 및 운영

- 로컬 npm run build 통과. 루트 설정이 타입 검사 생략을 사용하므로 빌드를 전체 타입 검사 통과로 표현하지 않습니다.
- 헤더 ESLint: 오류0·기존 supabase 의존성 경고1. 루트에 ESLint 설정이 없어 임시 next/core-web-vitals 설정을 지정해 해당 파일만 검사했습니다.
- 명시한 파일만 커밋/푸시하고 분리된 릴리스 worktree에서 aimaster/buylife 프로덕션에 배포합니다.
- 루트 배포에 필요한 Git 제외 데스크톱 설치 파일을 포함하고 기존 다운로드 주소를 확인합니다.
- 라이브 programs에서 로고의 실제 href를 확인하고 Chrome 클릭 후 메인 도메인/메인 내용 표시를 확인합니다.
- 커밋/푸시/배포/라이브 결과는 완료 후 추가합니다.
