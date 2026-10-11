# 2026-10-11 v1.79 — JPEG 첨부 후 잘못된 파일명 비교 수정

## 실제 회원 테스트 결과와 원인

주인님이 진행 중인 일반 회원 buylifemall@naver.com의 원고0887ba88-ed7b-4c0c-93e8-ee8477370660을 확인했습니다. 실행cca7d0a7-533c-4b57-a24a-bfc4c0bb22e6은 한국21:50:13에 failed, 완료2/28, 대표 이미지3/28에서 중단했습니다. 오류는 `[AUTHORING_FAILED] 입력 3/28 (image · blog_img_title.png) 결과가 원고와 달라 중지했습니다.`입니다.

대표 이미지 원본은 HTTP200 / image/jpeg입니다. 실제 Chrome의 실패한 네이버 글쓰기 화면을 접근성으로 읽어 제목·제목 인용구 뒤 `그래픽 blog_img_title.jpg`와 `AI 활용 설정`을 확인했습니다. 이미지가 첨부되지 않은 문제가 아니라 **실제 JPEG 파일명과 확장이 기대한 PNG 파일명이 달라 입력 완료 판정이 실패한 문제**입니다. 픽셀 캡처/수정 후 실제 재입력 성공을 확인한 것은 아닙니다.

서버 본문 MD5 6aec06b9afcb353b9098380c06882baf, images MD5 e2214df49faf08607ca8ff8383275254입니다. 3장 이미지와 본문을 보존합니다. 비공개/예약 없음/published_at·post_url NULL이며 서버 발행 완료 기록은 없습니다. 회원이 네이버에서 직접 수행한 작업까지 판정하지 않습니다.

## 수정 방식

`extension/background.js`:

- `loadAsset`: 실제 가져온 Blob MIME을 기준으로 JPEG→jpg, PNG→png, WebP→webp, GIF→gif 파일명을 정합니다. 이미지 바이트/기존 본문/서버 원고는 바꾸지 않습니다. 추가 다운로드나 이미지 변환·유료 호출이 없습니다.
- `writeArticle`: 파일 업로드 전에 같은 파일명을 기대 단계에 반영합니다. 옛 서버 payload의 고정 PNG 이름도 올바르게 처리합니다. 실행 유효성 확인 뒤에 적용하며 취소/탭 보호는 유지합니다.
- `writer.js`의 엄격한 이미지 이름 비교는 유지합니다. 전혀 다른 이미지 이름이면 계속 중지합니다. 이미지 장수만으로 통과시키거나 불확실한 업로드를 자동 반복하지 않습니다.

서버 API/개인 키·계정/환경변수/DB 스키마/BLOG·티스토리·올인원은 변경하지 않습니다. 준비 모드의 최종 발행 차단도 유지합니다.

## 자동 검수

- 기존 worker에 새 테스트를 적용하면 image/jpeg인데 blog_img_title.png가 반환돼 실패했습니다. 수정 후 동일 테스트 통과.
- 실제 `writer.js`와 worker를 연결한 모의에서 JPEG 첨부3/3·체크포인트jpg 통과, 다른 이름이면2/3에서 중지·다른 준비 탭 보존·최종 클릭 없음.
- JPEG/PNG/WebP/GIF 이름과 바이트 보존 검사 포함 worker42개 통과.
- `node --test scripts/test-*.cjs`: 전체133개 통과(독립 worker 스크립트 포함;42를133에 별도로 더하지 않음).
- `node --check extension/background.js`: 통과.
- `npm run build`: TypeScript/프로덕션 컴파일·14파일 확장ZIP v1.79 생성 통과.
- 프로덕션/DB/ZIP/설치 확장 확인은 아래 운영 기록에서 확인했습니다. 자동 검사는 실제 네이버 재실행 성공을 대신하지 않습니다.

## 운영 기록

v1.79 코드·manifest·다운로드 ZIP·버전 메타데이터 SQL을 함께 반영했습니다. SQL: `supabase/migrations/20261011130543_jpeg_upload_identity_v179.sql`. 운영 확인 완료:

- 코드 커밋88285c4c, origin/master 푸시 성공.
- 해당 커밋의 별도 worktree D:/Antigravity/AIMaster-release-nba-v179에서 해당 프로그램만 배포. 프로젝트/팀 naver-blog-agent/buylife.
- 프로덕션 dpl_C3L4EpAyF62TbihjUjAohUZpSTPF, target production / READY. 배포주소 https://naver-blog-agent-pobgd8f9k-buylife.vercel.app, 운영별칭 https://naver-blog-agent.vercel.app.
- 같은 SQL로 DB programs.version/extension_version/extension_download_url 갱신, v1.79 일치.
- 루트 check-extension-release.mjs naver-blog-agent: 실패0/경고0. 라이브 latest ZIP HTTP200·manifest1.79.0/v1.79·14파일(디렉터리 항목 포함 ZIP15항목) 소스와 CRLF 정규화 후 전체 일치. 로그인/공개 버전 API200·latestv1.79.
- 회원 대기/입력 작업0건을 확인한 뒤 이 PC의 기존 압축해제 확장을 Chrome 세부정보에서 새로고침. ID jghcffojjhpadflbhmdbophincpciajm·경로 D:/Antigravity/AIMaster/naver-blog-agent/extension·v1.79·켜짐을 접근성 화면으로 확인했습니다. 다른 확장/네이버 원고에는 입력하지 않았습니다.
- 회원 원고0887ba88은 배포/설치 후에도 원래 failed·updated_at12:50:13.915Z·본문/이미지MD5 동일·발행 기록NULL입니다. 기존1/2/3/5장 prepared 및4장 draft의 상태/지문도 그대로입니다.
- 기존 실패 네이버 탭으로 돌아가 제목/인용구/JPG/AI활용 설정이 보존된 것을 재확인했습니다. 확장 갱신으로 현재 실패 원고가 자동 재실행되거나 성공한 것은 아닙니다.
- screenshot_failed로 픽셀 캡처는 얻지 못했습니다. 접근성 읽기/탭 선택/확장 새로고침은 실제 상태 확인됐고 키 입력은 window_not_focused 제약입니다. 설치된 확장은 자동 갱신되지 않으므로 ZIP 재다운로드→기존 폴더 덮어쓰기→chrome://extensions에서 해당 확장 새로고침이 필요합니다.

## 남은 실제 검수와 후속 문제

1. 현재 실패한 회원 원고/네이버 탭을 보존합니다. 원고의 naver_publishing 설정이 없으면 호환 기본값은 publish이므로 Codex가 임의로 재전송하지 않습니다. 별도 빈 검수 원고에 prepare 저장 ACK를 먼저 확인한 뒤 JPEG 입력·전체 검수·prepared ACK를 검수합니다. 최종 발행은 실행하지 않습니다.
2. 보관함 failed 배지/실패 단계·이유가 보이지 않는 문제는 별도 기능 단위로 수정해야 합니다.
3. 현재 회원 본문에는 출처 URL 없는 통계/개인 수익 경험이 있지만 AI는 PASS를 반환했습니다. 실제 거짓이라고 확인한 것은 아니며, 근거 없는 PASS 방지를 위한 검수 보완이 필요합니다.
4. 기존4장 이미지 BODY3 글자 품질·4장 prepare·개별 삭제·실제 부분 생성 실패 복구는 기존 미완료 상태입니다. 이번 JPEG 수정으로 통과한 것으로 바꾸지 않습니다.

Chrome 창36576024 읽기는 가능하지만 키 입력은 window_not_focused, restore1회 후에도 실패했습니다. 화면 제어를 우회하거나 기존 원고를 덮어쓰지 않습니다. 먼저 실제 제어 창·확장 버전·대기/실행 작업 유무를 확인하고 진행합니다.
