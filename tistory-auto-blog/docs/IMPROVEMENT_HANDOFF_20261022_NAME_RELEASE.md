# 티스토리 포스팅 자동화 — 운영 이름 변경 완료(v1.83)

2026-10-22 Codex(윈도우). 운영 ① DB ref `esgxyikcnnvmlhygjkth`.

## 완료 결과

사용자가 보고 있던 운영 v1.82에는 아직 옛 이름이 있었고 master 소스의 이름만 바뀐 상태였습니다. 사용자 재지시에 따라 **운영 이름 변경을 먼저 끝냈습니다.** 공식 이름은 **티스토리 포스팅 자동화**입니다.

- 명칭 유지보수 소스: `release/tistory-name-v183-20261022`, 커밋 `8589073f`(원격 푸시 완료), 기반 `58789eac`(자동 최종 발행 도입 전). 별도 작업트리 `.vercel/tistory-name-release/`에서 빌드/배포했습니다. 기존 생성·입력 준비·마지막 수동 발행 경계 유지. 이후 API·엔진 추가분을 이전 버전으로 덮어쓰지 않았습니다.
- 프로덕션: **v1.83**, `dpl_XNn3nGXS8ie45DQXvyDhda5YfGC5` Ready. 공식 alias 및 기존 pearl alias 확인. DB `programs`의 해당 id만 name/version/extension_version을 맞췄습니다. 회원 원고·RLS·스키마·환경변수 변경 없음.
- Edge 포그라운드 지정 일반 회원으로 `/posts/13`을 새로고침해 **브라우저 탭·문서 제목·상단 제목·왼쪽 메뉴의 새 이름과 v1.83**을 확인했습니다. 실제 창을 유지합니다. [개인 북마크/회원 원고를 제외한 헤더 캡처](evidence/name-release-v183/edge-name-header.png).
- 공개 auth/guide/docs/privacy 응답에서 새 title/옛 이름 부재, 라이브 ZIP의 새 manifest 이름/v1.83 및 자동 최종 발행 모듈 미포함 확인. [운영 응답/ZIP 확인](evidence/name-release-v183/live-name-checks.json) · [배포/DB/Edge 요약](evidence/name-release-v183/deployment.json).
- 타입 검사·로컬 빌드 통과(별도 작업트리의 기존 node_modules 연결 때문에 로컬은 webpack, Vercel 정상 Turbopack 빌드도 성공). 이름만 바뀌는 경로에 새 테스트를 추가하지 않았습니다. 비용=Vercel 운영 빌드1회·유료AI0·최종발행0.

## 공용 사본과 보존한 후속 작업

이 기반에 이미 있던 `openai-request-params` 사본/호출 수정도 이번 배포에 포함됐습니다(사본 직접 수정 없음). 파라미터 사본의 실제 배포와, master의 모델 성격/비용 안내 UI를 구분합니다. 안내 UI는 후속 v1.84에 있습니다. 공용 등록부에 이 부분 적용 상태를 추가했습니다.

**master의 자동 최종 발행 추가분은 v1.84 개발 후보로 그대로 보존**하고 manifest/다운로드 ZIP 버전도 v1.84로 맞췄습니다. master의 latest ZIP은 차기 개발 자산이며 현재 운영에 배포한 파일은 release 브랜치의 v1.83 ZIP입니다. master를 배포하면 자동 발행 추가분이 나가므로 다음 실제 발행 검수 사이클의 플랜/검증을 먼저 확인해야 합니다. 21~22일의 ‘v1.83 자동 발행 후보’ 문서는 개발 당시 이력입니다.

재로그인 확인: AIMaster `buylifemall@naver.com` 및 새 본인 토큰의 확장 연결·buylifemall 블로그 저장 확인. 원고13의 재전송 run `30c55e1c-ae77-49fa-822d-c810671b5fd1`은 처음 티스토리 로그인 화면에서 대기했으며, 이후 서버가 **publish_ready/오류null**로 기록된 것을 확인했습니다. 이는 로컬 검수용 확장의 수정된 입력/댓글/비공개 설정이 실제로 끝났다는 근거입니다. **기존 입력 준비 완료이며 실제 최종 발행 완료는 아닙니다.** 현재 운영 다운로드 v1.83의 소스와 검수용 master 확장의 자동 발행 추가분을 혼동하지 않습니다.

## 다음 첫 단계

이름 변경 사이클은 종료합니다. [자동 발행 현재 위치](IMPROVEMENT_HANDOFF_20261022_AUTO_PUBLISH_CONTINUE.md)에서 이어서 v1.84 전체 로컬 확인/ZIP → 배포·버전 일치 → 새 본인 합성 원고 비공개 자동 최종발행 최소1건 → 실제 URL·시각/결과만 확인·웹 기록/복제·안내/516px를 검수합니다. 결과 불확실은 최종 버튼 재클릭 금지. 에이전트 실제 발행은 티스토리 종료 후 순차 진행합니다.

https://tistory-auto-blog.buylife.xyz
