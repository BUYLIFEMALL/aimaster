-- 상품에 붙인 쇼츠(유튜브) 기록 — MOV-20261119-01. 주인님 승인 2026-11-20 「DB 표 추가 승인할게 진행해」.
-- ⚠ 2026-11-20 현재 운영 DB 미적용(로컬 후보). 적용 순번은 Master가 정한다. 적용 전에도 상품 화면은 정상 동작한다(목록이 비어 보일 뿐).
--
-- AI 쇼츠 원스톱에서 회원 본인이 자기 상품에 붙인 영상만 저장한다(들어오는 길은 송수신 계약 수정판에서 정한다). 파일은 없고 글자 정보뿐이다.
-- 상품 표(shop_products)에 칸을 붙이지 않는 이유: 마켓 등록 프로그램들과 AI 문구 작성이 상품 표를 통째로 읽어,
-- 공개 전 영상 정보가 그 경로로 딸려 갈 수 있다. 별도 표는 이 프로그램의 상품 화면만 읽는다.

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
