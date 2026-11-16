# WS-20261117-02 결과 — 네이버 상품 도착 주소 판정 최소 수정 (CC-WORKSPACE-01)

- 담당: Claude(Workspace) `CC-WORKSPACE-01` · 지시: Master `msg_00a3d8dc7c6a` · 근거: WS-20261117-01 결함 3-2(`ea78dc181`)
- 상태: **ready_review** · 보고 형식: 공통지침 v1.3 · **미배포**(ZIP·버전·build·deploy·운영 DB·실제 네이버 0)
- 산출물 커밋: **`78e893c90`**(`git log -1 -- threads-affiliate-poster/src/lib/naver/brandConnect.ts`) · 예약 기록 ACTIVE_WORK 제 줄

## 1. 완료 조건과 충족

| 완료 조건 | 결과 |
|---|---|
| 시작 전 점유 확인 | 대상 3파일 `git status` 미커밋 0, `2d373c8ad` 이후 변경 0. ACTIVE_WORK상 폴더 범위는 ecommerce-image이나 Master가 3파일만 배정 → 제 줄에 3파일 예약 기록 후 시작 |
| 서버·확장 판정 일치 | `brandConnect.ts` `naverProductIdentity`: https 확인 다음에 `if (url.username \|\| url.password \|\| url.port) return null;` · `extension/background.js` `productIdentity`: 같은 조건이면 `false`. 각 1줄 + 주석 1줄 |
| :443 처리 | URL 정규화로 `https://…:443/`의 `port`가 빈 값 → 허용(정상 주소와 같은 결과)을 시험으로 증명 |
| 시험 추가(관련 경계만) | `tests/naver-brand-connect.test.cjs`에 시험 1개: 확장 `background.js`를 `chrome` 흉내로 같은 vm에 불러 **서버·확장 두 함수를 같은 표로 대조**. 거부 8(계정+비번·계정만·:8443·https에 :80·여행 계정·여행 :8080·가짜 접미 호스트·다른 호스트), 허용 5(스마트스토어·:443·브랜드·쇼핑·여행, 서버는 kind/productKey까지 정확 비교) |
| 빨강 → 초록 | 고치기 전: 새 시험 실패(`서버 거부: https://u:p@smartstore…`). 고친 뒤: 6/6 통과 |
| 회귀 | 기존 네이버 시험 5개 그대로 통과, `test:coupang-multi` 5/5, `test:affiliate-clients` 7/7, `npx tsc --noEmit` 0, `node --check extension/background.js` 통과 |
| 범위 밖 변경 없음 | 수집·응답·후기·큐·고지·ZIP·버전·manifest 변경 0. 커밋은 3파일 +39줄뿐(다른 세션 미커밋 파일 미포함, 파일별 diff 확인) |

## 2. 검증 / 미검수
- 실제 검증: 위 로컬 시험·타입·문법.
- 미검수(지시상 안 함): 확장 실제 설치·실제 naver.me 리디렉션, 운영 배포, 운영 DB.
- 판정이 엄격해진 영향: 네이버 정상 리디렉션은 계정·포트를 붙이지 않으므로 정상 수집 영향 없음(실 리디렉션은 미확인).

## 3. 릴리스 선행 조건(담당 몫, 차기 배포 승인 후)
- **ZIP이 이제 확장 폴더와 다름**: `public/downloads/threads-affiliate-poster-extension-latest.zip`·`-v1.88.zip` 안 `background.js`는 수정 전 판(확인함). 지시대로 다시 만들지 않음 → v1.89 배포 때 `prebuild`로 manifest·ZIP 재생성 결과를 같은 커밋에 포함, DB `extension_version`·`extension_download_url` 채움, `check-extension-release.mjs` OK(WS17-01 4절과 같음).
- 미배포 변경 기록(`threads-affiliate-poster/docs/IMPROVEMENTS.md` 「미배포 대기」 줄)은 이 배정 범위 밖이라 쓰지 않음 — 담당이 v1.89 묶음 목록에 `78e893c90`을 넣어 주면 됨.

## 4. 막힘·해소안
- 없음.

## 5. 다음 단계
- Master 판정. WS17-01 결함 3-1(등록·대기열 중복)은 Backend 큐 담당으로 분리돼 있어 손대지 않음.

## 비용
없음(빌드 0·AI 0·DB 0·외부 호출 0).

## 6. 보완 — 확장 판정 https 검사 (Master `msg_6ce1480fc011`)
- 지적: 서버 `naverProductIdentity`는 https만 허용하는데 확장 `productIdentity`는 프로토콜 검사가 없어 `http://smartstore.naver.com/s/products/1`이 `true` → 「서버·확장 일치」 주장이 불충분했음(인정).
- 시험 먼저: 같은 표 거부 목록에 `http://`(스마트스토어·브랜드·여행), `ftp://`(쇼핑), `ws://`(여행) 5개 추가 → 고치기 전 **실패**(`확장 거부: http://smartstore.naver.com/s/products/1`, 5/6).
- 수정: `extension/background.js` 같은 줄을 `if (u.protocol !== 'https:' || u.username || u.password || u.port) return false;`로(주석 포함 2줄 변경). 서버 파일은 이미 https 검사가 있어 변경 없음.
- 결과: **6/6 통과**(거부 13·허용 5를 서버·확장 같은 표로 대조, https 정상·`:443` 허용 그대로), `node --check` 통과.
- 산출물 커밋 **`eaaebe027`**(`git log -1 -- threads-affiliate-poster/extension/background.js`) — 2파일 +8/−2. 같은 폴더의 다른 세션 미커밋 변경(`src/lib/actions/naverCollect.ts`·`src/types/database.types.ts`, Backend 대기열 작업)은 포함하지 않고 그대로 둠.
- ZIP 재생성 안 함(유지) — ZIP 안 `background.js`는 여전히 수정 전 판, v1.89 배포 때 담당 재생성. 비용 0.
