# Admin PC 작업 요청 — 음악 남은 일 3건 (2026-11-11)

- 보낸 사람: 음악 담당 `claude-win-20261024-music`(메인 윈도우 PC) · [역할: music]
- 받는 사람: Admin PC 세션(`claude-admin-…`) — 주인님 지시 「Admin 피시에서 할꺼야 관련 내용 정리해서 줘」
- Admin PC 규칙: 작업 폴더 `\\GT1_MEGA\d\Antigravity\AIMaster`, **맥미니 수준**(코드·문서 편집, 브라우저 확인, 내 파일만 도우미로 커밋). `npm install/build/dev`·배포·운영 DB 쓰기는 하지 않고 메인 PC 음악 담당에 넘긴다. 브라우저는 ego lite. 상세 `docs/ADMIN_PC_WORK_GUIDE.md`
- 시작 전: `docs/ACTIVE_WORK.md`에 내 줄 추가 · `git status --porcelain -- music/components/remix free-music-studio/docs`로 남의 미커밋 확인

---

## 1. 실물 확인 — 마스터링 「AI 설정 제안」 1번 (주인님 + Admin PC)

- **무엇**: 무료음악 곡 마스터링 창의 「AI 설정 제안」 — 원하는 소리를 글로 쓰면 AI가 소리 색깔(EQ·포화·압축·폭)·음량을 골라 줌. v1.60에 AI 마스터링 스튜디오에서 옮겨 왔고, 실제 AI 호출로는 아직 한 번도 확인하지 않았다.
- **어디서**: https://free-music-studio.buylife.xyz → 「모든 음악」 → 곡 하나 → 곡 메뉴 「마스터링」 → 창 안 「AI 설정 제안」 칸
- **순서**
  1. 엔진이 켜진 PC에서 곡 하나를 고른다(아무 곡이나).
  2. 「원하는 소리」 칸에 적는다. 예: `따뜻하고 부드럽게, 저음은 조금 살리고 고음은 너무 날카롭지 않게`
  3. 칸 아래에 「제공자 · 모델 (회원님 키, 1번 호출)」이 보인다(제공자·모델은 계정에 저장된 글 AI 설정을 따름 — Claude 권장). 「설정 만들기」 1번.
  4. 확인할 것: (가) 오류 없이 제안이 오는지 (나) 프리셋·EQ 칸 값이 실제로 바뀌는지 (다) 미리 듣기에서 소리가 달라지는지 (라) 적용한 결과로 마스터링을 끝까지 저장할 수 있는지
- **비용**: 회원 본인 키 AI 호출 1번(가장 저렴한 모델로, 수 원 수준). 실행 직전 주인님께 한 번 더 말씀드린다.
- **코드 위치**(문제가 있을 때): 화면 `free-music-studio/src/components/library/MasteringDialog.tsx`(176행 부근) · 서버 `src/app/api/master-preset/route.ts`

## 2. 실물 확인 — 연주곡 장르 고르고 「AI 작곡 기획」 1번 (주인님 + Admin PC)

- **무엇**: v1.58에서 연주곡 장르를 2단계(대분류 9개·세부 49개)로 나눴고, 「AI 작곡 기획」이 **고른 장르 안에서만** 곡 제목·스타일을 짜도록 바꿨다. 실제 AI 호출로 장르를 지키는지 아직 보지 않았다.
- **어디서**: 무료음악 → 「곡 만들기」(`/songs`) → 「연주곡」으로 바꾸기 → 1단계 「AI 작곡 기획」 칸
- **순서**
  1. 「연주곡」 선택 → 연주곡 장르에서 대분류·세부를 하나 고른다(예: 재즈 → 세부 하나). 기본 장르가 아닌, 눈에 띄는 장르일수록 좋다.
  2. 「AI 작곡 기획」 1번(회원 본인 키, 기본 Claude).
  3. 확인할 것: (가) 나온 곡마다 제목·스타일 글이 **고른 장르·세부에 맞는지** (나) 다른 장르가 섞이지 않는지 (다) 아래 스타일 프리셋 목록이 그 장르만 보이는지 (라) 기획 결과를 곡 칸에 넣어 저장이 되는지
  4. 곡 생성까지는 하지 않아도 된다(장르 지키기만 보는 시험). 생성까지 하면 내 PC 엔진이라 비용은 없다.
- **비용**: 회원 본인 키 AI 호출 1번. 실행 직전 주인님께 말씀드린다.
- **코드 위치**: 화면 `src/app/(dashboard)/songs/page.tsx`(770행 부근) · 서버 `src/app/api/plan/route.ts`

## 3. 작은 개발 — 음악(SUNO) 리믹스 카드에 「🎬 가사 영상 만들기」 링크 (Admin PC 코드 편집 → 메인 PC 배포)

- **무엇**: SUNO 일반 곡 카드에는 가사 영상으로 넘기는 링크가 있는데(`music/components/plannings/TrackCard.tsx` 413~424행, `?suno=<변주 id>`), 리믹스 결과 카드에는 없다. 받는 쪽 `lyric-video-studio`는 v1.12부터 `?remix=<리믹스 변주 id>`를 받는다(`lyric-video-studio/src/components/views/SourceView.tsx` 26행, `src/lib/suno.ts` 62행 — 회원 본인 리믹스만, 반주 추가·연주곡은 가사 없이 음악·커버만).
- **고칠 파일 1개**: `music/components/remix/RemixCard.tsx` — 변주곡마다 `<audio …/>` 바로 아래(187행 부근)에 TrackCard와 같은 모양의 링크:
  ```tsx
  <a
    href={`https://lyric-video-studio.buylife.xyz/source?remix=${variant.id}`}
    target="_blank"
    rel="noreferrer"
    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border border-violet-500/40 bg-violet-950/40 text-violet-200 hover:text-white hover:border-violet-400/60 hover:bg-violet-900/40 transition-all"
  >
    <span>🎬</span>
    <span>가사 영상 만들기 →</span>
  </a>
  ```
  리믹스 종류와 상관없이 보여 준다(가사 없는 종류는 받는 쪽이 알아서 처리).
- **버전**: 고치지 않는다(`music/lib/version.ts` v1.49 그대로). 메인 PC가 배포할 때 v1.50으로 올린다.
- **커밋**: `node scripts/commit-paths.mjs "feat(music): remix card -> lyric video link (?remix=), undeployed [role: music]" music/components/remix/RemixCard.tsx --as <Admin 세션>` → 커밋 뒤 `git show --stat HEAD`로 1개 파일인지 확인.
- **검사**: Admin PC에서는 빌드하지 않는다. 메인 PC 음악 담당이 `tsc`·`npm run build` 후 배포(빌드 1회, 주인님 승인 뒤).

---

## 끝나면 남길 것 (Admin PC)
1. 결과를 `free-music-studio/docs/IMPROVEMENTS.md` 맨 위(1·2번)와 `music/docs/IMPROVEMENTS.md` 맨 위(3번, 「미배포 대기: 리믹스 → 가사 영상 링크 `<커밋>`」)에 「음악 담당께」로 적는다. 작업 중 발견한 특이사항도 함께.
2. 이 파일 맨 아래 「결과」 칸에 한 줄씩 채운다.
3. 메인 PC 음악 담당에 넘길 한 줄 프롬프트를 주인님께 채팅으로 드린다. 예: `[음악 담당께] Admin PC에서 1·2번 확인 끝(결과 …), 3번 커밋 <해시> — 스테이징 맞추기(git add -- <경로>)와 music v1.50 배포 부탁`
4. Admin PC는 공용 스테이징(`.git/index`)을 못 맞추므로, 메인 PC에 `git add -- <커밋한 경로>` 요청을 같이 적는다.
5. `docs/ACTIVE_WORK.md` 내 줄 지우기.

## 결과
| 번호 | 결과 | 날짜·세션 |
|---|---|---|
| 1 AI 설정 제안 | | |
| 2 AI 작곡 기획(연주곡 장르) | | |
| 3 리믹스 → 가사 영상 링크 | | |
