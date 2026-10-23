# BLC-06 v2.08 편집 상태 보존·이미지 생성 선택 인수인계

2026-10-21 Codex · AIMaster 운영 · DB ref `esgxyikcnnvmlhygjkth`.

## 완료 결과

비주얼 편집 후 코드 모드로 전환하면 이전 원문으로 돌아가던 오류를 수정했습니다. 실제 편집이 있을 때 최신 HTML을 넘기며, 수정 없이 왕복하면 원본 텍스트·사진 위치 표시를 보존합니다. 일반 글 생성에는 ‘이번 원고 이미지도 생성’ 선택을 추가했습니다. 기본은 기존과 같이 켜짐이고 해제하면 글 생성·저장은 진행하고 자동 이미지 요청을 건너뜁니다. 선택은 현재 화면에만 적용되며 회원 기본 모델 설정을 저장하지 않습니다. 4단계 편집 안내·복사·팁·주의·공식 콘솔 링크를 추가했습니다.

[플랜과 BLOG 편집기 비교](PLAN_20261021_BLC06_EDITOR.md). BLOG `ai-auto-blog`는 읽기 비교만 했으며 서비스·계정·권한·코드를 유지했습니다. 기존 Tiptap 전체를 교체하지 않았고 공용 기준/사본 변경도 없습니다.

## 배포·검수 근거

| 항목 | 결과 |
|---|---|
| 코드·배포 | `8c3b1f39` origin/master 푸시. 배포 `dpl_38yCfeG8v7dgu6UT7VhmzGvVJcxJ` Ready, 공식 별칭 확인. [운영 검사](evidence/blc06-editor/production-release.json) |
| 버전 | 앱 v2.08 / package·manifest 2.8.0 / DB version·extension_version v2.08 / 설치 확장 v2.08 / 라이브 ZIP 일치. 루트 확장 검사 실패 0·경고 0 |
| 로컬 | 신규 7개 포함 회귀 202/202, 확장 수명주기 모의 42개·브리지·발행 설정·모델·타입·프로덕션 빌드 통과. ESLint 해당 변경/연결 범위 오류 0·경고 40. [기록](evidence/blc06-editor/release-checks.json) |
| 수정 전 | v2.07 실제 Edge H1 적용 후 코드 모드에서 서식 유실 재현, 저장하지 않고 취소. [재현](evidence/blc06-editor/before-mode-switch.json) |
| 수정 후 실제 회원 | 기존 합성 시험 원고에서 미수정 원문 142자 보존 → H1 편집 → 코드 HTML 확인 → 공개 출처 링크 추가 → 비주얼/코드 왕복 동일 → 저장 → 보관함 열람·출처 펼침 확인. H1/링크 유지·링크 1회, 수정 후 검수 STALE. [메타데이터](evidence/blc06-editor/live-member.json) |
| 원문·수명 | 기존 원고 `77a327ee-d953-4953-af2b-f471216ec9c0`, draft 유지. source_bundle MD5 `0bc1a6963e98034f00ec61cd73f7cd99`, 원래 생성/수집일 `2026-10-21T03:10:42.535Z`, 만료 `2026-11-20T03:10:42.535Z` 보존. 변경 후 본문 MD5 `406218f3c85f1f72afc891b3f1b45bf1` |
| 생성 선택 | 실제 화면에서 기본 On → Off 확인. 생성 버튼은 누르지 않음. 실제 executeGeneration 함수의 무료 모의 시험으로 글 생성/저장·이미지 0, 기본 On 경로, 저장 실패 시 이미지 차단 확인 |
| 안내 | 4개 단계 전환·동적 제목·복사 성공. 복사 SHA256 `f2d7bcae0a0feb4a524d8fbbc753eb9052ee4bb9a7b3cd272da83f1bf9f847e2`. [1433px](evidence/blc06-editor/guide-desktop.png)·[실제 516px](evidence/blc06-editor/guide-516.png) 캡처 열어 확인, 창 1433×1399 일반 상태로 복원 |
| 비용·개인 설정 | 추가 AI/이미지 호출 0. 기본 설정 MD5 `872848afbc431c8625a8c9d53a3981be` 전후 일치. 키·계정 변경 없음 |
| 확장·발행 | 대기/입력 중 원고 0을 확인한 뒤 본인 확장 카드만 v2.07→v2.08 다시 로드. 기존 7개 탭 보존. 이번 실제 최종 발행 0, published_at/post_url null. 기존 BLC-04 prepared 8/8 이력은 별도이며 이번 새 준비/최종 발행을 검수한 것으로 표시하지 않음 |

## 파일·DB·한계

소스: `BlogSmartEditorModal.tsx`, 생성 `page.tsx`, `EditorWorkflowGuide.tsx`, 안내 `page.tsx`, `test-editor-mode.cjs`, 기존 검수 모의의 상태 연결부, 버전/manifest/ZIP. DB는 Ready 뒤 프로그램 버전 메타데이터만 갱신했으며 스키마·권한·회원 설정 변경은 없습니다. [실행 이력 SQL](../supabase/migrations/20261021023000_nba_blc06_release_v208.sql)은 이미 적용한 DML의 기록입니다.

Edge에서 주소창 변경과 실제 문서 이동을 별도로 확인해야 했습니다. `/queueqlr` 잘못된 경로를 바로잡았으며 로그인 만료의 증거가 아니었습니다. `aria-pressed` 단계 버튼은 UIA Invoke 대신 Toggle을 지원하므로 패턴에 맞춰 검수했습니다. 도구 입력 실패를 제품 결함으로 기록하지 않습니다. 실제 창 최소 폭은 516px이며 375px 검수는 하지 않았습니다.

BLC-05의 Replicate 인증/모델 권한 오류는 미해결이며 이번에 재호출하지 않았습니다. 비공개 사진은 기존 원본 텍스트 전용 제약을 유지합니다. 이미지/캡션/순서의 모드 보존은 무료 실제 함수 회귀 근거이며 이번 실제 편집기에서는 합성 텍스트·H1·링크만 검수했습니다. 원본 AI 본문·원시 UI 덤프·회원 캡처는 커밋하지 않습니다.

## 다음 첫 단계

주인님 후속 지시 「하던 작업 마치고 SEO블로그 스튜디오 비교」에 따라 **BLC-07에 바로 착수하지 않고**, 기존 블로그 비교 보고서와 SEO 앱의 최신 코드·운영 메타데이터를 읽어 병합/독립 유지 방향을 먼저 비교합니다. 실제 병합·기존 서비스 중단·권한 변경은 이 비교 작업에 포함하지 않습니다.

새 [블로그·티스토리 자동화 완성 기준](../../docs/BLOG_AUTOMATION_COMPLETION_POLICY.md)을 공통 지침에 반영했습니다. 모든 대상의 목표는 확장프로그램을 통한 자동 포스팅·결과 기록까지이며, 이번 BLC-06 편집 개선 완료와 전체 자동화 완료를 구분합니다. 남은 입력 검증·실제 발행 검수는 해당 후속 작업에서 이어갑니다.

https://naver-blog-agent.buylife.xyz
