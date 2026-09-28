# Meta 앱 심사 제출 가이드 — `threads_keyword_search` (Threads 쇼핑제휴 자동화)

목적: `/trends` 키워드 검색이 본인 글만이 아니라 **다른 사용자의 공개 게시글**도 검색하도록
`threads_keyword_search` 권한의 **고급 액세스(Advanced Access)** 승인을 받는다.
승인되면 코드 변경 없이 바로 공개 글 검색이 열린다(`src/lib/threads/client.ts` `searchThreadsByKeyword`).

> 이 프로그램은 회원별 Meta 앱(BYOK) 구조다. 아래는 **운영자 본인 앱** 기준이며, 다른 회원이 공개 글
> 검색을 쓰려면 각자 같은 절차를 거쳐야 한다(비즈니스 인증 포함).

## 1. 준비 상태 체크리스트

| 항목 | 담당 | 상태 | 값/비고 |
|---|---|---|---|
| 비즈니스 인증 (business.facebook.com → 보안 센터) | 운영자 | ☐ | 사업자등록증 등 서류 제출 |
| 개인정보처리방침 URL | 개발 | ✅ 2026-09-28 | `https://www.buylife.xyz/privacy` (제12조 Meta 연동 정보 추가, 영문 요약 포함) |
| 데이터 삭제 안내 URL | 개발 | ✅ 2026-09-28 | `https://www.buylife.xyz/data-deletion` (한/영) |
| Uninstall Callback URL | 개발 | ✅ 2026-09-28 | `https://threads-affiliate-poster.vercel.app/api/threads/uninstall` |
| Delete Callback URL | 개발 | ✅ 2026-09-28 | `https://threads-affiliate-poster.vercel.app/api/threads/delete` |
| Redirect Callback URL | 기존 | ✅ | `https://threads-affiliate-poster.vercel.app/api/threads/callback` |
| 앱 아이콘 (512~1024px, 5MB 이하) | 운영자 | ☐ | Meta 앱 설정 > 기본 설정 |
| 앱 카테고리 / 연락처 이메일 | 운영자 | ☐ | 예: 비즈니스 및 페이지 / buylifemall@gmail.com |
| 심사관용 테스트 계정 | 운영자+개발 | ☐ | 아래 3번 참고 |
| 권한 사용 설명(영문) | 개발 | ✅ | 아래 2번 복사 사용 |
| 시연 녹화 영상 | 운영자 | ☐ | 아래 4번 대본대로 녹화 |

콜백 두 개는 Meta가 보내는 `signed_request`를 **그 회원이 등록한 Threads 앱 시크릿**으로 HMAC-SHA256 검증한 뒤에만
처리한다(`src/lib/threads/signedRequest.ts`).

**한 Meta 앱을 쓰레드 프로그램 3개(`threads` 자동포스팅, `threads-comment-reply`, `threads-affiliate-poster`)가 공유**하고,
Meta는 제거/삭제 콜백 URL을 앱당 1개만 받는다. 그래서 이 프로그램의 콜백이 세 프로그램을 함께 처리한다
(2026-09-28 — 그전에는 세 프로그램 모두 콜백 라우트가 없었다).
- Uninstall: `tap_accounts`, `threads_accounts`, `th_accounts`에서 그 회원·그 Threads 계정의 연결(토큰) 삭제
- Delete: 위 연결 삭제 + 댓글자동화가 Threads에서 가져온 `th_posts`(→ `th_comments` cascade) + 쇼핑제휴 검색 보관함
  (`tap_saved_posts`의 `th-%`) 삭제 후 `{url, confirmation_code}` 반환. 회원이 프로그램으로 직접 작성한 게시글은 회원 소유 콘텐츠라 유지.
- 새 쓰레드 프로그램을 추가하면 `THREADS_ACCOUNT_TABLES`와 Delete 라우트에 그 프로그램의 연결/수집 테이블을 반드시 추가할 것.

## 2. 권한 사용 설명 (App Review 제출 칸에 그대로 붙여넣기)

**threads_keyword_search**

```
Our app, "Threads Affiliate Automation" (AI Master), helps a Threads creator plan posts for products
they promote. In the "Trends" page, the signed-in user types a keyword (for example "autumn travel")
and we call the Threads keyword search endpoint with the user's own access token to show recent and
top public posts about that topic. Each result shows the post text, author username, time and a link
to the original post on Threads. The user can bookmark a post as a reference and then write their own
new post with AI assistance, referencing the style of the saved post. We do not republish other
people's posts, do not modify them, and do not display or store engagement metrics. Search results
are shown only to the user who searched and are never shared, sold, or used for advertising.
Saved references and the access token are deleted when the user disconnects, removes the app, or
requests data deletion (https://www.buylife.xyz/data-deletion).
```

요청 권한은 `threads_keyword_search` **하나만**(+ 기본 `threads_basic`) 신청한다. 쓰지 않는 권한을 같이 신청하면 반려 사유가 된다.

## 3. 심사관용 테스트 계정

심사관이 직접 로그인해 기능을 볼 수 있어야 한다.
1. 운영자가 `https://threads-affiliate-poster.vercel.app/signup`(또는 buylife.xyz 회원가입)으로 심사 전용 계정을 만든다
   (예: 별도 이메일). **비밀번호는 심사 제출 칸에만 적고 저장소·채팅에 남기지 않는다.**
2. 개발 측에서 그 계정에 이 프로그램 이용 권한(`user_program_access`, slug `threads-affiliate-poster`)을 부여한다.
3. 그 계정의 `API키등록·플랫폼연동`에 운영자 앱의 Threads 앱 ID/시크릿을 등록하고, 심사관이 쓸 Threads 테스트 계정을
   앱의 **Threads 테스터**로 추가한다(또는 녹화 영상으로 대체 설명).
4. 제출 칸 "Test instructions" 예시:

```
1. Go to https://threads-affiliate-poster.vercel.app/login and sign in with the test account below.
2. Open "API키등록·플랫폼연동" (Settings) and click "Threads 계정 연결하기" to connect a Threads account.
3. Open "트렌드 & 떡상 탐지기" (Trends). Type a keyword such as "travel" and press "검색" (Search).
4. If prompted, click "검색 권한 포함해서 Threads 다시 연결" to grant threads_keyword_search.
5. Results labeled "실제 Threads 글" are returned by the keyword search endpoint; click
   "Threads에서 원문·반응 보기" to open the original post.
Test account: <email> / <password>
```

## 4. 시연 녹화 대본 (1~2분, 화면 녹화 + 영문 자막 권장)

1. 로그인 화면 → 테스트 계정으로 로그인 (자막: "User signs in to the app")
2. 설정(API키등록·플랫폼연동) → Threads 계정 연결 → Threads 권한 동의 화면에서 `threads_keyword_search` 포함 권한 승인
   (자막: "User grants threads_basic and threads_keyword_search")
3. 트렌드 페이지 → 검색창에 키워드 입력 → 검색 (자막: "The app calls the keyword search endpoint with the user's token")
4. "실제 Threads 글" 배지가 붙은 결과 확인 → 원문 링크 클릭 → Threads 원문 열림
   (자막: "Results show public posts with a link to the original")
5. 결과 하나를 찜 → 벤치마킹 캡션 생성 → 새로 작성된 캡션 확인 (자막: "User writes their own new post; other users' posts are never republished")
6. 설정 → 연결 해제 (자막: "Disconnecting deletes the stored token")

## 5. 제출 순서

1. 비즈니스 인증 완료
2. Meta 앱 설정 > 기본 설정: 개인정보처리방침 URL, 데이터 삭제 URL, 앱 아이콘, 카테고리 입력
3. 사용 사례 > Threads API > 설정: Uninstall/Delete Callback URL 입력, `threads_keyword_search` 권한 추가
4. 앱 검수 > 권한 및 기능: `threads_keyword_search` 고급 액세스 요청 → 2번 설명 + 4번 영상 + 3번 테스트 안내 제출
5. 승인 후 앱 게시(Publish) → `/trends`에서 타인 공개 글 검색 확인
