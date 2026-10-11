# 2026-10-12 BLOG v1.60 — 상세 화면 카테고리 줄 정렬

주인님 요청: `/posts/109`에서 네이버 카테고리를 버튼 아래로 옮겨 한 줄로 읽기 쉽게 정렬.

## 변경

- `app/posts/[id]/page.tsx`: 작성자/관리 버튼 아래에 전체 폭의 카테고리 행을 배치했습니다. 관리 버튼은 글자 단위로 줄바꿈하거나 폭이 찌그러지지 않으며, 좁은 화면에서는 버튼 단위로 다음 줄에 배치합니다.
- `components/NaverCategoryPicker.tsx`: 이름·선택 상자·불러오기 버튼을 같은 높이의 한 줄로 정렬하고 선택 상자를 넓혔습니다. 긴 안내/오류 문구는 아래에서 전체 폭을 사용합니다. 이 공통 컴포넌트를 쓰는 글쓰기 결과에도 같은 간격이 적용됩니다. 모바일에서는 요소 단위로 줄바꿈합니다.
- `utils/version.ts`·확장 manifest·최신/버전 ZIP v1.60 동기화. 확장 실행 코드/API 계약/선택 저장·전송 동작은 그대로입니다.

본문/이미지/카테고리 저장값은 편집하지 않습니다. 네이버 입력 시작·최종 발행·유료 AI 호출·키/환경변수/DB 스키마 변경 없음.

## 검수

- React 검수 지침: 기존 label/select 연결·disabled 상태·버튼 type·핸들러 유지, 클래스/배치만 수정, 추가 의존성/이벤트/요청 없음.
- `npm run build`: TypeScript와 프로덕션 컴파일 통과.
- 수정 전 실제 일반 회원 Chrome `/posts/109`에서 좁아진 버튼·카테고리 줄/안내 혼합을 접근성 및 픽셀 캡처로 확인했습니다.
- Aside 브라우저는 실행 중이 아니어서 기존 Chrome을 `orca computer`로 확인했습니다. 인증정보 복사나 새 로그인은 하지 않습니다.
- 수정 후 실제 일반 회원 Chrome `/posts/109`에서 카테고리 label/선택/불러오기가 버튼 아래 한 줄, 작성자·복사/전송/수정/삭제도 가로 정렬됨을 접근성 및 픽셀 캡처로 확인했습니다. 좁은 모바일 실측은 수행하지 않았으며 요소 단위 wrapping은 코드에 적용했습니다.
- 페이지 새로고침 시 회원 세션이 만료되어 저장된 본인 회원 로그인으로 복구하고 정상 상세 화면을 확인했습니다. 로그인 때 Chrome 비밀번호 보안 안내가 떠 팝업을 닫았습니다. 비밀번호 조회/변경은 하지 않았고 주인님께 해당 안내를 알렸습니다.
- 본문 MD5 00c67ef8063d4b9e0f707e90c7d67a3d, naver_category id31/●국제뉴스, naver_input_status publish_ready/error NULL이 배포 전후 동일합니다. 기존 자동화 결과는 변경하지 않았으며 이번 작업에서 입력·발행 성공을 새로 검수한 것이 아닙니다.

## 릴리스

배포 대상 Vercel ai-auto-blog / buylife, 운영 https://ai-auto-blog-one.vercel.app. 메타데이터 SQL `supabase/migrations/20261011152953_category_controls_layout_v160.sql`. 운영 확인 완료:

- 코드 a39e2792·origin/master 푸시 성공. 별도 worktree D:/Antigravity/AIMaster-release-blog-v160의 확정된 커밋에서 대상만 배포했습니다.
- 프로덕션 dpl_GuZo3RjMZY1GMrCjKjWinWSRJF48 / target production / READY, https://ai-auto-blog-7uce2fh9b-buylife.vercel.app → 운영 ai-auto-blog-one.vercel.app.
- DB programs의 version/extension_version/extension_download_url을 같은 SQL로 갱신. v1.60 일치.
- `node scripts/check-extension-release.mjs ai-auto-blog`: 실패0/경고0. 라이브 ZIP200·manifestv1.60·14파일이 소스와 CRLF 정규화 후 일치, /auth200.
- 이 작업의 남은 구현/데스크톱 정렬 검수 없음. 새 네이버 카테고리 읽기/전송/입력은 실행하지 않았고 관련 기존 미검수 항목은 별도입니다. PC 설치 확장은 이 레이아웃 변경에 필요한 동작 변경이 없으므로 강제 재로드하지 않았습니다.

설치 확장은 자동 업데이트되지 않습니다. ZIP 재다운로드→기존 폴더 덮어쓰기→chrome://extensions 새로고침. 웹 정렬은 페이지 새로고침으로 적용되며 옛 v1.57 이상 카테고리 확장과 호환됩니다. 입력 중인 확장은 재로드하지 않습니다.
