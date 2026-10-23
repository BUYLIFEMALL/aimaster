# 보안 마무리 작업 — 2026-10-10

## 현재 상태 — 승인된 BLOG RLS 적용·v1.39 운영 배포 완료

- 주인님이 "BLOG DB 보안 정책 변경을 승인합니다. 기존 데이터는 보존하고 진행하세요."라고 승인했습니다.
- Supabase CLI 2.120.0으로 생성·운영 적용 후 원격 기록과 시각을 맞춘 파일:
  `supabase/migrations/20261009164750_blog_personal_access_hardening.sql`.
- 7개 테이블 익명/PUBLIC 권한 회수·본인 행과 본인 글 연결만 허용.
  공통 분류 변경은 관리자만, 댓글/좋아요는 본인 글 관련 조회만 허용하며 쓰기는 차단합니다.
  authenticated의 TRUNCATE/REFERENCES/TRIGGER도 제거했습니다.
- 게시글 20(미귀속 7)·작성자 11·글감 60·분류 10·연결 16·댓글/좋아요 0 보존,
  전체 행 내용 지문 7곳 모두 일치. 기존 행 삭제·내용 변경·임의 귀속 없음.
- DB 역할 검증 27개 통과, 시험용 행과 변경은 예외 하위 트랜잭션으로 전부 되돌림.
  `verify-blog-access.sql`, `approved-application-verification.json`에 기록했습니다.
- 실제 REST 익명 조회 7곳 HTTP 401/42501, `node scripts/check-blog-anon-access.mjs`로 재검증 가능.
- v1.39 로컬/운영 빌드·보안 테스트 39개 통과. 코드 커밋 `d0e014b5`·origin/master 푸시,
  프로덕션 배포 `dpl_HCYqUNJKrWyw1rQES1jPRxYwtNmR` READY,
  라이브 https://ai-auto-blog-one.vercel.app .
- 운영 버전 3칸 갱신 마이그레이션 `20261009165944_blog_bump_version_v1_39.sql` 적용 완료.
  DB/확장/라이브 ZIP v1.39 일치·실패/경고 0. 운영 API 두 곳 401+no-store+캐시 MISS,
  상세 페이지 307→auth 확인. 고정 다운로드 ZIP 200 확인.
- 브라우저 장애 해소·루트 시험 계정 실제 로그인 성공. BLOG 자체 로그인 화면에는 저장된 정보
  자동 입력이 없어 주인님께 로그인 확인을 요청했습니다. 실제 BLOG 회원 화면 검수는 그 확인 후 진행합니다.
- advisors 재실행: BLOG 관련 추가 지적 없음. 기존 공통 함수 search_path 3곳,
  handle_new_user 실행 권한, 유출 비밀번호 보호 설정은 이번 BLOG 승인 범위 밖이며 유지합니다.
- RLS는 TRUNCATE/REFERENCES를 제한하지 않으므로 GRANT도 함께 검증합니다.
  [PostgreSQL 공식 문서](https://www.postgresql.org/docs/17/ddl-rowsecurity.html).

## 이전 v1.38 코드 배포 기록 (아래 당시 상태는 위 적용 기록으로 갱신)

BLOG v1.38 코드 커밋 `01bb999f`·푸시·운영 배포를 완료했습니다.
프로그램 DB·확장·운영 ZIP은 모두 v1.38입니다. 배포 ID는
`dpl_58t2bftvriNo9V2ScPD1QmQsn2dj`, 라이브는 https://ai-auto-blog-one.vercel.app 입니다.
이후 DB 정책을 승인받아 적용했습니다. 실제 BLOG 회원 검수·옛 서비스 키 폐기는 남아 있습니다.

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
  준비해 승인 후 적용했습니다. 이전 정책·권한은 `before-blog-access.json`,
  적용 직전 스냅샷·지문은 `before-approved-application.json`에 보관했습니다.
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
  실제 서비스 데이터 변경·유료 API 호출 없음. 승인된 SQL 정책 검증 27개도 완료했습니다.
- `npm run build`: 최종 코드 타입·컴파일 통과. 확장 manifest와 로컬 ZIP v1.38.
- `node scripts/check-security-lint.cjs`: 기존 HEAD와 비교한 신규 린트 오류 0건.
  변경 파일의 기존 오류 7건·경고 3건은 남습니다. 전체 lint 성공으로 보고하지 않습니다.
- 로컬 production 서버: `/api/posts/1`, `/api/categories` 비로그인 401;
  `Cache-Control: private, no-store, max-age=0`. `/posts/1`은 307→`/auth?redirect=...`.
  로컬 최신 ZIP은 200. 운영에서도 두 API 401+no-store+X-Vercel-Cache MISS와 상세 화면 307을 확인했습니다.
  `node scripts/check-extension-release.mjs ai-auto-blog`: 라이브 ZIP 200, DB/확장/ZIP v1.38 일치, 실패·경고 0건.
- 로컬 ZIP 내부 manifest도 확인해 version_name=v1.38, version=1.38.0 일치를 검증했습니다.
- 이전 실행에서는 경로 지정 git add가 `.git/index.lock: Permission denied`로 실패했습니다.
  이어진 세션에서 파일·네트워크 제한이 해제됐고 GitHub 원격 조회도 정상입니다.
  보안 테스트 39개와 신규 린트 오류 0건을 다시 확인했으며, BLOG 변경 파일만 지정해
  커밋·푸시를 완료했습니다. DB 정책도 승인받아 적용했으며 실제 BLOG 회원 검수는 남아 있습니다.
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

1. **완료:** v1.38 경로 지정 커밋·origin/master 푸시·BLOG 운영 배포.
2. **완료:** RLS 승인·CLI 마이그레이션 생성·운영 적용·데이터 내용 보존·소유권·익명 차단 검증.
3. **완료:** `release-v1.38.sql`로 programs.version·extension_version·extension_download_url을
   함께 갱신하고 `node scripts/check-extension-release.mjs ai-auto-blog`로 라이브 ZIP을 검증했습니다.
4. 타로를 같은 소스로 재배포하고 실제 회원으로 모든 영향 앱의 정상 동작을 확인합니다.
5. 옛 서비스 키 폐기와 저장소 밖 임시 키 파일 삭제는 별도 승인 후 진행합니다.
6. Supabase 대시보드 사용량 경고를 확인합니다. 비용이 드는 플랜 변경은 자동 실행하지 않습니다.

회원 안내(릴리스 후): ZIP 재다운로드 → 기존 폴더에 덮어쓰기 → chrome://extensions 새로고침.
