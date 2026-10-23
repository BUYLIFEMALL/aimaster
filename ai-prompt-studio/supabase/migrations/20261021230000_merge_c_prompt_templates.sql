-- 2026-10-21 병합 C: 프롬프트 템플릿 → AI Prompt 「📁 내 템플릿」 (운영 DB esgxyikcnnvmlhygjkth, 주인님 새 표 승인)
-- 템플릿은 회원이 직접 만들어 다시 쓰는 보관함이라 30일 자동 삭제 대상이 아니다(AI 생성 결과는 저장하지 않음).
create table if not exists public.ai_prompt_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  description text not null default '',
  content text not null default '',
  category text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_prompt_templates_user_idx on public.ai_prompt_templates (user_id, updated_at desc);

alter table public.ai_prompt_templates enable row level security;

drop policy if exists "ai_prompt_templates_select_own" on public.ai_prompt_templates;
drop policy if exists "ai_prompt_templates_insert_own" on public.ai_prompt_templates;
drop policy if exists "ai_prompt_templates_update_own" on public.ai_prompt_templates;
drop policy if exists "ai_prompt_templates_delete_own" on public.ai_prompt_templates;
create policy "ai_prompt_templates_select_own" on public.ai_prompt_templates for select using (auth.uid() = user_id);
create policy "ai_prompt_templates_insert_own" on public.ai_prompt_templates for insert with check (auth.uid() = user_id);
create policy "ai_prompt_templates_update_own" on public.ai_prompt_templates for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_prompt_templates_delete_own" on public.ai_prompt_templates for delete using (auth.uid() = user_id);
