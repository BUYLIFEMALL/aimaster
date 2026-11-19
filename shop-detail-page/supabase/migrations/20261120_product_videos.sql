-- 상품에 붙인 쇼츠(유튜브) 기록 — MOV-20261119-01. 주인님 승인 2026-11-20 「DB 표 추가 승인할게 진행해」.
-- ⚠ 2026-11-20 현재 운영 DB 미적용(로컬 후보). 적용 순번은 Master가 정한다. 지금은 이 표를 읽거나 쓰는 화면이 없다.
--
-- 이 표가 담는 것은 **회원이 자기 상품에 적어 둔 영상 참조**(유튜브 영상 번호와 그때 적은 제목·공개 범위·예약 시각)뿐이다.
-- 그 영상이 그 회원의 것인지, 지금 공개 상태인지는 이 표가 보증하지 않는다(외부 소유·공개 보증 없음 —
-- 보내는 쪽 기록은 회원이 고칠 수 있다). privacy·publish_at 은 「적을 때의 값」이지 현재 상태가 아니다.
-- 그래서 이 값을 화면에 「공개됨」「내 영상」처럼 단정해 보여 주면 안 된다. 들어오는 길과 표시는 송수신 계약에서 따로 정한다.
-- 이 표가 보장하는 것은 「본인 행·본인 상품에만 저장」「같은 상품에 같은 영상은 한 줄」 두 가지다. 파일은 없고 글자 정보뿐이다.
-- 상품 표(shop_products)에 칸을 붙이지 않는 이유: 마켓 등록 프로그램들과 AI 문구 작성이 상품 표를 통째로 읽어,
-- 영상 참조가 그 경로로 딸려 갈 수 있다.

create table public.shop_product_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.shop_products(id) on delete cascade,
  video_id text not null check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text not null default '' check (char_length(title) <= 100),
  privacy text not null check (privacy in ('public', 'unlisted', 'private')),
  publish_at timestamptz,
  uploaded_at timestamptz,
  source text not null default 'shorts-onestop-studio',
  source_item_id uuid,
  created_at timestamptz not null default now(),
  -- 예약 없는 비공개 영상은 붙이지 않는다
  constraint shop_product_videos_private_needs_schedule check (privacy <> 'private' or publish_at is not null),
  -- 예약 시각은 비공개(예약 공개)일 때만. 공개·일부 공개인데 예약 시각이 붙은 값은 앞뒤가 맞지 않아 거절한다
  -- (시각이 과거든 미래든 같다 — 제약에 현재 시각을 쓰지 않는다. 서버 검사 lib/productVideo.ts 와 같은 규칙)
  constraint shop_product_videos_schedule_needs_private check (publish_at is null or privacy = 'private'),
  -- 같은 상품에 같은 영상은 한 줄만(연타·창 두 개가 동시에 와도 DB가 한 줄만 남긴다)
  constraint shop_product_videos_once unique (user_id, product_id, video_id)
);

create index shop_product_videos_product_id_idx on public.shop_product_videos(product_id);

alter table public.shop_product_videos enable row level security;

-- 최소 권한: 읽기와 넣기만. 고치기·지우기 정책은 두지 않는다(「떼기」는 후속 작업에서 정책과 함께 추가).
-- 상품이 지워지면(회원 삭제·30일 정리) product_id 연결로 함께 지워진다.
create policy "shop_product_videos_select_own"
  on public.shop_product_videos for select
  using (auth.uid() = user_id);

-- 본인 행이면서 **본인 상품**일 때만 넣는다. 외래 키는 「상품이 있다」만 보장하므로 소유는 여기서 한 번 더 막는다
-- (서버 동작에 실수가 있어도 남의 상품에는 저장되지 않는다).
create policy "shop_product_videos_insert_own_product"
  on public.shop_product_videos for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.shop_products p where p.id = product_id and p.user_id = auth.uid())
  );

-- 되돌리기: drop table public.shop_product_videos;
