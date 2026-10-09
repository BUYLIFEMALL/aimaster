-- Database RLS verification, NOT a real application login.
-- Fixtures use explicit IDs (no sequence increments) and an exception subtransaction
-- rolls back every fixture and mutation before returning the assertion summary.
do $verify$
declare
  member_id uuid;
  admin_id uuid;
  category_id bigint;
  author_a_id bigint;
  author_b_id bigint;
  candidate_a uuid := gen_random_uuid();
  candidate_b uuid := gen_random_uuid();
  own_posts bigint;
  n bigint;
  blocked boolean;
  table_name text;
  results jsonb := '[]'::jsonb;
begin
  select id into strict member_id from public.profiles
    where email = 'buylifemall@naver.com' and not coalesce(is_admin, false);
  select id into strict admin_id from public.profiles
    where email = 'buylifemall@gmail.com' and is_admin = true;
  select id into strict category_id from public.blog_categories order by id limit 1;
  select count(*) into own_posts from public.blog_posts where user_id = member_id;
  begin
    -- Authors have a unique user_id index; reuse an existing author if present.
    select id into author_a_id from public.blog_authors where user_id = member_id;
    select id into author_b_id from public.blog_authors where user_id = admin_id;
    if author_a_id is null then
      insert into public.blog_authors (id, name, user_id) values
        (-900000001, 'RLS verification A', member_id) returning id into author_a_id;
    end if;
    if author_b_id is null then
      insert into public.blog_authors (id, name, user_id) values
        (-900000002, 'RLS verification B', admin_id) returning id into author_b_id;
    end if;
    insert into public.blog_posts (id, title, content, author_id, user_id) values
      (-900000001, 'RLS verification A', 'Temporary rollback fixture', author_a_id, member_id),
      (-900000002, 'RLS verification B', 'Temporary rollback fixture', author_b_id, admin_id);
    insert into public.blog_candidates (id, user_id, source_type, source_input, title, summary, keywords) values
      (candidate_a, member_id, 'rss', 'rollback-fixture', 'RLS A', 'Temporary', '{}'),
      (candidate_b, admin_id, 'rss', 'rollback-fixture', 'RLS B', 'Temporary', '{}');
    insert into public.blog_post_categories (post_id, category_id) values
      (-900000001, category_id), (-900000002, category_id);
    insert into public.blog_comments (id, post_id, author_name, content) values
      (-900000001, -900000001, 'RLS A', 'Temporary'), (-900000002, -900000002, 'RLS B', 'Temporary');
    insert into public.blog_likes (id, post_id) values
      (-900000001, -900000001), (-900000002, -900000002);

    perform set_config('request.jwt.claim.sub', member_id::text, true);
    perform set_config('request.jwt.claims', jsonb_build_object('sub', member_id, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    if current_user <> 'authenticated' or auth.uid() <> member_id then raise exception 'Role switch failed'; end if;
    select count(*) into n from public.blog_posts;
    if n <> own_posts + 1 then raise exception 'Owner post read failed'; end if;
    results := results || jsonb_build_array('member sees exactly own posts');
    foreach table_name in array array['blog_posts','blog_authors','blog_candidates'] loop
      execute format('select count(*) from public.%I where user_id is distinct from $1', table_name) into n using member_id;
      if n <> 0 then raise exception 'Private row leaked in %', table_name; end if;
      results := results || jsonb_build_array(table_name || ': foreign/unowned rows hidden');
      blocked := false;
      begin
        execute format('update public.%I set user_id = $1 where user_id = $2', table_name) using admin_id, member_id;
      exception when insufficient_privilege then blocked := true;
      end;
      if not blocked then raise exception 'Ownership transfer allowed in %', table_name; end if;
      results := results || jsonb_build_array(table_name || ': ownership transfer blocked');
      execute format('update public.%I set user_id = $1 where user_id = $2', table_name) using member_id, admin_id;
      get diagnostics n = row_count;
      if n <> 0 then raise exception 'Foreign update allowed in %', table_name; end if;
      execute format('delete from public.%I where user_id = $1', table_name) using admin_id;
      get diagnostics n = row_count;
      if n <> 0 then raise exception 'Foreign delete allowed in %', table_name; end if;
      results := results || jsonb_build_array(table_name || ': foreign update/delete affect zero rows');
    end loop;
    insert into public.blog_posts (id, title, content, user_id) values
      (-900000003, 'Own insert', 'Temporary rollback fixture', member_id);
    update public.blog_posts set title = 'Own edit' where id = -900000003;
    get diagnostics n = row_count;
    if n <> 1 then raise exception 'Own update blocked'; end if;
    delete from public.blog_posts where id = -900000003;
    get diagnostics n = row_count;
    if n <> 1 then raise exception 'Own delete blocked'; end if;
    results := results || jsonb_build_array('owner post insert/update/delete allowed');

    select count(*) into n from public.blog_categories;
    if n = 0 then raise exception 'Shared category read blocked'; end if;
    blocked := false;
    begin
      insert into public.blog_categories (id, name, slug) values (-900000003, 'Denied', 'rls-denied-fixture');
    exception when insufficient_privilege then blocked := true;
    end;
    if not blocked then raise exception 'Member category insert allowed'; end if;
    update public.blog_categories set name = 'Denied' where id = category_id;
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'Member category update allowed'; end if;
    delete from public.blog_categories where id = category_id;
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'Member category delete allowed'; end if;
    results := results || jsonb_build_array('member category read allowed; insert/update/delete blocked');

    foreach table_name in array array['blog_post_categories','blog_comments','blog_likes'] loop
      execute format('select count(*) from public.%I where post_id = -900000001', table_name) into n;
      if n <> 1 then raise exception 'Own child read blocked in %', table_name; end if;
      execute format('select count(*) from public.%I where post_id = -900000002', table_name) into n;
      if n <> 0 then raise exception 'Foreign child read leaked in %', table_name; end if;
      results := results || jsonb_build_array(table_name || ': only own parent rows visible');
    end loop;
    delete from public.blog_post_categories where post_id = -900000001;
    insert into public.blog_post_categories (post_id, category_id) values (-900000001, category_id);
    results := results || jsonb_build_array('owner category mapping delete/insert allowed');
    blocked := false;
    begin
      insert into public.blog_post_categories (post_id, category_id) values (-900000002, category_id);
    exception when insufficient_privilege then blocked := true;
    end;
    if not blocked then raise exception 'Foreign category mapping insert allowed'; end if;
    results := results || jsonb_build_array('foreign category mapping insert blocked');
    foreach table_name in array array['blog_comments','blog_likes'] loop
      blocked := false;
      begin
        execute format('delete from public.%I where post_id = -900000001', table_name);
      exception when insufficient_privilege then blocked := true;
      end;
      if not blocked then raise exception 'Member child writes allowed in %', table_name; end if;
      if has_table_privilege('authenticated', 'public.' || table_name, 'INSERT')
        or has_table_privilege('authenticated', 'public.' || table_name, 'UPDATE') then
        raise exception 'Member child write grants remain in %', table_name;
      end if;
      results := results || jsonb_build_array(table_name || ': member writes denied');
    end loop;

    execute 'reset role';
    perform set_config('request.jwt.claim.sub', admin_id::text, true);
    perform set_config('request.jwt.claims', jsonb_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    insert into public.blog_categories (id, name, slug) values (-900000003, 'Admin fixture', 'rls-admin-fixture');
    update public.blog_categories set name = 'Admin edit' where id = -900000003;
    get diagnostics n = row_count;
    if n <> 1 then raise exception 'Admin category edit blocked'; end if;
    delete from public.blog_categories where id = -900000003;
    get diagnostics n = row_count;
    if n <> 1 then raise exception 'Admin category delete blocked'; end if;
    results := results || jsonb_build_array('actual admin category insert/update/delete allowed');

    execute 'reset role';
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    execute 'set local role anon';
    foreach table_name in array array['blog_posts','blog_authors','blog_candidates','blog_categories',
      'blog_post_categories','blog_comments','blog_likes'] loop
      blocked := false;
      begin
        execute format('select count(*) from public.%I', table_name) into n;
      exception when insufficient_privilege then blocked := true;
      end;
      if not blocked then raise exception 'Anon read allowed in %', table_name; end if;
      if has_table_privilege('anon', 'public.' || table_name, 'INSERT')
        or has_table_privilege('anon', 'public.' || table_name, 'UPDATE')
        or has_table_privilege('anon', 'public.' || table_name, 'DELETE') then
        raise exception 'Anon write grants remain in %', table_name;
      end if;
      if has_table_privilege('authenticated', 'public.' || table_name, 'TRUNCATE')
        or has_table_privilege('authenticated', 'public.' || table_name, 'REFERENCES')
        or has_table_privilege('authenticated', 'public.' || table_name, 'TRIGGER') then
        raise exception 'Dangerous member grants remain in %', table_name;
      end if;
      results := results || jsonb_build_array(table_name || ': anon read/write and dangerous member grants denied');
    end loop;
    raise exception using errcode = 'ZX001', message = 'Rollback verification fixtures';
  exception when sqlstate 'ZX001' then
    -- All fixtures and updates roll back; PL/pgSQL local assertion results remain.
    null;
  end;
  if current_user <> 'postgres' then raise exception 'Verification role was not restored'; end if;
  perform set_config('aimaster.blog_security_results', jsonb_build_object(
    'checks', jsonb_array_length(results), 'passed', true, 'fixtures_rolled_back', true,
    'real_browser_login', false, 'results', results)::text, false);
end
$verify$;
select current_setting('aimaster.blog_security_results')::jsonb as verification;
