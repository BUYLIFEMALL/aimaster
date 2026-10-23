# BLC-00 운영 실검수 결과 — 신규 원고 준비 기본값 (Claude Code, 2026-10-20)

- 작업목록: [`docs/BLOG_CONSOLIDATION_TASKS.md`](../../docs/BLOG_CONSOLIDATION_TASKS.md) BLC-00 / 0단계 인수인계: [`IMPROVEMENT_HANDOFF_20261020_BLOG_CONSOLIDATION_STAGE0.md`](IMPROVEMENT_HANDOFF_20261020_BLOG_CONSOLIDATION_STAGE0.md) (Codex 작성, 미커밋 상태라 이 파일로 따로 남김)
- 대상: AIMaster 운영 https://naver-blog-agent.buylife.xyz (코드·DB v2.00, 배포 `naver-blog-agent-z1v26l3j2`), DB ref `esgxyikcnnvmlhygjkth`
- 방법: Claude Code 메인 크롬, 일반 회원 `buylifemall@naver.com` 실제 로그인(주인님 직접 로그인). 코드 수정 없음. 발행 전송·최종 발행 0회.

## 결과

| 항목 | 결과 | 근거 |
|---|---|---|
| ② 기존 원고 저장 모드 보존 | ✅ | 테스트 계정 원고 19건을 `GET /api/posts/[id]/publishing`으로 읽기만 함. v2.00 이전 원고 중 설정이 없던 11건은 `publish`(옛 기본값 그대로), 회원이 `prepare`를 저장했던 8건은 `prepare` 유지 |
| ① 신규 원고 준비 기본값 | ✅ | v2.00 배포 후 홈판형 1건 생성(원고 `0ec0122c`, 2026-10-20 16:34 KST) → `executionMode: prepare` |
| ③ 회원 설정 변경·저장 | ✅ | 같은 시험 원고에서만 보관함 「발행 설정」 → 「최종 발행까지」 저장 시 서버 `publish`, 다시 「준비까지만」 저장 시 `prepare`. 화면 안 안내 문구 정상. 다른 원고는 변경하지 않음 |
| (함께) v2.00 본문 정리 | ✅ | 새 원고에 글자 그대로의 `\n` 없음, 맨 앞 `# 제목` 줄 없음. 분량 1,734자(범위 내). 원문 대조 경고 3개는 기사에 없는 소비자 일반화를 사실처럼 쓴 문장(감상 오탐 아님) |

- 비용: 글감 정리 0회(기존 v1.99 글감 재사용) + 생성 1회(`gpt-4o-mini`) + 이미지 1장(NanoBanana 1K), 테스트 계정 본인 키.
- 운영 데이터 쓰기: 시험 원고 1건 생성, 그 원고의 진행 방식 2회 저장(최종 상태 `prepare`로 원복). 삭제 0회.

## 다음 첫 단계

- BLC-00은 운영 검수 기준 **완료**로 볼 수 있습니다. 작업목록 상태 갱신은 그 문서를 맡은 CLI가 이 결과를 보고 반영합니다.
- 다음은 BLC-01(에이전트 사진 비공개 저장·회원 소유권·30일 정리·확장 전달) 세부 플랜 제시입니다.
- 남은 미커밋: Codex의 0단계 문서·증거·`scripts/test-new-draft-mode.cjs`·`/guide` 안내 문단·README/IMPROVEMENTS 변경(Codex 세션 `.git` 읽기 전용). 주인님 승인 시 다른 CLI가 내용 변경 없이 커밋할 수 있음. `/guide` 변경은 다음 배포(v2.01) 때 함께.
