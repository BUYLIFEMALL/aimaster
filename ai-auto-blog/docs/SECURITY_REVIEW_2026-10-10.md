# 보안 마무리 작업 — 2026-10-10

## 현재 상태

BLOG v1.38 코드는 로컬에서 검수했습니다. 운영 배포·DB 정책 적용·옛 서비스 키 폐기는
아직 완료하지 않았습니다. 프로그램 DB와 운영 ZIP은 v1.37입니다.
운영 보안 취약점은 배포와 RLS 정책 변경을 마칠 때까지 남아 있습니다.

## 확인된 운영 문제와 준비한 수정

- BLOG: `GET /api/posts/[id]`에 인증이 없고, PUT/DELETE는 user_id=null인 글을 허용했습니다.
  세 메서드에 로그인·이용 권한·본인 행 필터·no-store를 추가했습니다.
  상세 화면의 인증 없는 Supabase SDK 조회도 제거하고 서버 권한 게이트를 추가했습니다.
- 공통 분류: 기존 클라이언트가 누구나 분류를 추가·수정·삭제했습니다.
  관리자만 변경하는 서버 API로 전환했습니다. 회원은 분류 선택·읽기를 계속 사용합니다.
  개인별 분류 테이블 추가는 이번 범위에 포함하지 않았습니다.
- 권한 판정은 RLS에 막히지 않도록 관리자 클라이언트로 조회합니다.
  서버 키 미설정 시 공개 키로 대신 동작하지 않습니다.
- `supabase/security/blog-access-hardening.proposed.sql`에 7개 BLOG 테이블의 RLS·권한 변경안을
  준비했습니다. 아직 미적용. 이전 정책·권한은 `before-blog-access.json`에 보관했습니다.
- 운영 데이터: 게시글 20건, 이 중 소유자 없는 7건. 작성자 11건, 분류 10건,
  분류 연결 16건, 댓글·좋아요 0건. 귀속이 확인된 13건은 작성자 소유권도 일치합니다.
  소유자 없는 글을 임의로 관리자/시험 회원에게 귀속시키지 않습니다. 삭제도 하지 않습니다.

## 서비스 키 교체 확인

- Vercel 프로젝트 32개를 연결된 도구로 읽기 조회했습니다. 루트에 포함된
  threads-content-ops의 별도 프로젝트는 제외했습니다(배포 대상 아님).
- 서버 키 환경변수 있는 29개 중 28개는 10월 9일 변수 변경 이후 READY production 배포가
  있습니다. **타로는 예외**: 변수 변경 `2026-10-09 06:16:00.976 UTC`, 최신 운영 배포 생성
  `06:11:32.509 UTC`. 즉 최신 배포가 변수 변경보다 약 4분 28초 이릅니다.
- 타로 운영 별칭: `tarot-eight-jet.vercel.app`, `tarot-buylife.vercel.app`.
  새 환경변수를 읽는 재배포를 시도했지만 도구가 `MCP tool call requires approval,
  but approval policy is never`로 거부했습니다. 다른 경로로 우회하지 않았습니다.
- 키 환경변수 없는 mbti·mbti-character·video-to-gif는 이 변수 교체 검증 대상 밖입니다.
- 메타데이터 비교는 키 값 일치·회원 인증 후 DB 접근 성공을 증명하지 않습니다.
  키는 복호화·출력하지 않았습니다. 기록: `rotation-deployment-metadata.json`.
- `node scripts/audit-supabase-key-rotation.mjs`(루트): 추적 텍스트 2,889개에서 검사 패턴에
  해당하는 평문/인코딩 서비스 키 없음. 로컬 서비스 키 설정 18개에서 알려진 옛 키 없음.
  저장소 밖의 새 키 임시 파일은 아직 존재합니다. 스캔은 git 이력·비텍스트·2MB 초과
  파일·인코딩 조각 결합 등 모든 노출 형태를 보장하지 않습니다.
- **옛 키 폐기는 아직 금지**: 타로 재배포와 실제 회원 검수가 끝난 뒤 별도 승인으로
  진행합니다. 새 키 임시 파일 삭제도 저장소 밖 경로라 이번 세션에서 실행하지 않았습니다.

## 검수 결과

- `npm run test:security`: 39개 통과. 실제 핸들러를 격리된 모의 DB로 호출하며
  비로그인·권한 없음·타인·소유자 없음·소유권 변경·DB 오류·관리자 위장 요청을 검사합니다.
  실제 서비스 데이터 변경·유료 API 호출 없음. SQL 정책 검증은 승인 후 수행해야 합니다.
- `npm run build`: 최종 코드 타입·컴파일 통과. 확장 manifest와 로컬 ZIP v1.38.
- `node scripts/check-security-lint.cjs`: 기존 HEAD와 비교한 신규 린트 오류 0건.
  변경 파일의 기존 오류 7건·경고 3건은 남습니다. 전체 lint 성공으로 보고하지 않습니다.
- 로컬 production 서버: `/api/posts/1`, `/api/categories` 비로그인 401;
  `Cache-Control: private, no-store, max-age=0`. `/posts/1`은 307→`/auth?redirect=...`.
  로컬 최신 ZIP은 200. 운영 ZIP 검증은 아직 미수행입니다.
- 로컬 ZIP 내부 manifest도 확인해 version_name=v1.38, version=1.38.0 일치를 검증했습니다.
- 이전 실행에서는 경로 지정 git add가 `.git/index.lock: Permission denied`로 실패했습니다.
  이어진 세션에서 파일·네트워크 제한이 해제됐고 GitHub 원격 조회도 정상입니다.
  보안 테스트 39개와 신규 린트 오류 0건을 다시 확인했으며, BLOG 변경 파일만 지정해
  커밋·푸시합니다. DB 정책 승인과 운영 반영 검증은 여전히 별도 미완료 항목입니다.
- Google Inter 다운로드가 네트워크 제한으로 실패해 저장소에 있는 Geist 글꼴을
  자기완결적으로 복사하고 `next/font/local`로 변경했습니다. Latin 글꼴은 바뀝니다.
  라이선스는 `app/fonts/OFL.txt`, 출처는 `app/fonts/README.md`.
- Aside 브라우저는 `uv_os_get_passwd returned ENOMEM`으로 시작하지 못했습니다.
  Supabase 프로젝트 도구는 ACTIVE_HEALTHY였지만 대시보드의 10월 20일 사용량 제한 화면,
  실제 회원 로그인, API 키 목록의 폐기 상태는 확인하지 못했습니다.
- Supabase security advisors 추가 사항: 함수 search_path 미설정 3곳,
  handle_new_user SECURITY DEFINER 실행 권한, 유출 비밀번호 보호 비활성.
  이 안내는 실제 악용의 증거가 아닙니다. 함수·Auth 설정 변경은 별도 검토/승인 대상으로 기록합니다.

## 이어서 적용할 순서

1. v1.38 로컬 변경을 경로 지정 커밋·origin/master 푸시하고 BLOG 운영에 배포합니다.
2. 준비한 BLOG RLS 변경안을 승인받고, Supabase CLI로 마이그레이션 파일을 생성합니다.
   기존 정책 스냅샷을 확인하고 운영 적용 뒤 데이터 건수 보존·소유권·익명 차단을 검증합니다.
3. `release-v1.38.sql`로 programs.version·extension_version·extension_download_url을
   함께 갱신하고 `node scripts/check-extension-release.mjs ai-auto-blog`로 라이브 ZIP을 검증합니다.
4. 타로를 같은 소스로 재배포하고 실제 회원으로 모든 영향 앱의 정상 동작을 확인합니다.
5. 옛 서비스 키 폐기와 저장소 밖 임시 키 파일 삭제는 별도 승인 후 진행합니다.
6. Supabase 대시보드 사용량 경고를 확인합니다. 비용이 드는 플랜 변경은 자동 실행하지 않습니다.

회원 안내(릴리스 후): ZIP 재다운로드 → 기존 폴더에 덮어쓰기 → chrome://extensions 새로고침.
