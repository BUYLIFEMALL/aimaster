# 인수인계 — B-4 가사 자동 맞추기 2번째 곡 비교 (2026-11-11)

받는 사람: 음악 담당(`claude-win-20261024-music`)
보낸 사람: 윈도우 미니PC 세션(주인님 지시로 ego lite 사용)

## 한 줄 요약
2번째 곡(후렴 3번 반복, 22줄)을 자동 맞추기 → 주인님이 22줄 모두 듣고 **고친 줄 0**(「거의 차이 없어」). 반복 후렴도 맞았으므로 **「반복 가사 줄은 확인 필요」 규칙은 넣지 않고 B-4를 닫음.** 코드·엔진·배포 변경 없음, 비용 없음.

## 한 일
| 단계 | 누가 | 내용 |
|---|---|---|
| 1 곡 만들기 | 이 세션(ego lite) | 「B-4 후렴 반복 시험 (K-POP)」 트랙 `9872b14f-0b1c-4562-a022-c24849b37814`. ACE-Step 1.5, 3분, 밝은 K-POP 댄스·남성 보컬(지난 곡과 다른 장르), [Chorus] 3번. 엔진 0.8.4, 생성 5분 7초 |
| 2 자동 맞추기 | 이 세션 | 곡 상세 「가사 시간」→「자동 맞추기」, 2분 23초. 22줄 중 자동 확정 20·확인 필요 2(21·22번) |
| 3 처음 시간 기록 | 이 세션 | 사이트 `GET /api/tracks`(로그인 화면에서 읽기만)의 `lyric_timing`을 그대로 저장 |
| 4 정답 맞추기 | 주인님 | 22줄 「듣기」 확인, 고친 줄 없이 저장(status `manual`) |
| 5 비교 | 이 세션 | 저장본과 원본 시작 시각 22줄 모두 0.00초 차이 |

## 결과
| 구분 | 줄 수 | 고친 줄 | 0.5초 안 |
|---|---:|---:|---:|
| 반복 후렴(5~8·13~16·19~22번) | 12 | 0 | 100% |
| 나머지 | 10 | 0 | 100% |
| 전체 | 22 | 0 | 100% |

- 자동 확정인데 0.5초 넘게 틀린 줄: 0.
- 「확인 필요」 21·22번은 실제로 맞았음(지나친 조심, 해로운 쪽 아님).
- 한계: 정답은 귀로 판단한 것이라 0.2초 안쪽 어긋남은 구분 안 함. 지금까지 곡 2개(1번째 577b0398은 반복 후렴 33번째 +2.03초 틀림, 2번째는 모두 맞음).

## 근거 파일
- 엔진 원본(손대기 전): `docs/evidence/b4-auto-original-20261111-9872b14f.json`
- 주인님 확인 뒤 저장본: `docs/evidence/b4-manual-20261111-9872b14f.json`
- 기록: `docs/IMPROVEMENTS.md` 맨 위 2026-11-11, `docs/IMPROVEMENT_BACKLOG.md` B-4 줄 닫음 표시

## 음악 담당이 할 일
1. **커밋 부탁**: 이 세션에서는 `git commit`이 `fatal: unable to write new index file`로 3번 실패(`.git` 쓰기 권한은 정상, `index.lock` 없음 — 이 PC에서 `index` 덮어쓰기만 실패). 아래 5개 파일이 아직 커밋되지 않았습니다.
   - `free-music-studio/docs/IMPROVEMENTS.md`
   - `free-music-studio/docs/IMPROVEMENT_BACKLOG.md`
   - `free-music-studio/docs/evidence/b4-auto-original-20261111-9872b14f.json`
   - `free-music-studio/docs/evidence/b4-manual-20261111-9872b14f.json`
   - `free-music-studio/docs/HANDOFF_20261111_B4_LYRIC_TIMING.md`(이 파일)
   - 커밋 메시지 예: `docs(fms): close B-4 - 2nd song 22/22 lines correct by ear, no repeat-chorus rule [role: music]`
2. **판단 확인**: 「반복 가사 줄은 확인 필요」 규칙을 넣지 않기로 한 결론에 이견이 있으면 주인님께 알려 주세요. 다시 볼 조건은 앞으로 반복 후렴이 또 틀린 곡이 나올 때입니다.
3. 시험 곡 `9872b14f`는 일반 곡으로 「모든 음악」에 남아 있습니다(30일 규칙). 지울지 둘지는 주인님 판단.

## 참고
- 이 세션이 쓴 ego 작업 공간 8번과 비교용 공간은 모두 닫았습니다.
- 연결된 Supabase 도구(`rjjtjakljjxsgjelqgek`)는 운영 DB(`esgxyikcnnvmlhygjkth`)가 아니어서 쓰지 않았습니다. DB 쓰기 없음.
