-- 비전선포식 행사 현황 — Supabase 스키마
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여 넣고 Run 하세요. (여러 번 실행해도 안전)

-- 1) 데이터 테이블: 문서 하나 = 행 하나, 내용은 data(jsonb)에 그대로 저장
create table if not exists public.items (id text primary key, o double precision not null default 0, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table if not exists public.vj    (id text primary key, o double precision not null default 0, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table if not exists public.meta  (id text primary key, o double precision not null default 0, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());

-- 2) 편집자 명단 (여기 있는 이메일로 로그인한 사람만 수정 가능)
create table if not exists public.editors (email text primary key);

create or replace function public.is_editor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.editors where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
grant execute on function public.is_editor() to anon, authenticated;

-- 3) 권한 규칙: 누구나 읽기, 편집자만 쓰기
alter table public.items   enable row level security;
alter table public.vj      enable row level security;
alter table public.meta    enable row level security;
alter table public.editors enable row level security;

do $$
declare t text;
begin
  foreach t in array array['items','vj','meta'] loop
    execute format('drop policy if exists "read all" on public.%I', t);
    execute format('drop policy if exists "editors insert" on public.%I', t);
    execute format('drop policy if exists "editors update" on public.%I', t);
    execute format('drop policy if exists "editors delete" on public.%I', t);
    execute format('create policy "read all" on public.%I for select using (true)', t);
    execute format('create policy "editors insert" on public.%I for insert to authenticated with check (public.is_editor())', t);
    execute format('create policy "editors update" on public.%I for update to authenticated using (public.is_editor()) with check (public.is_editor())', t);
    execute format('create policy "editors delete" on public.%I for delete to authenticated using (public.is_editor())', t);
  end loop;
end $$;

-- 4) 부분 수정 함수 (data 안의 필드만 덮어쓰기). 권한은 위 규칙을 그대로 따름
create or replace function public.patch_doc(t text, p_id text, p jsonb) returns void
language plpgsql security invoker set search_path = public as $$
declare n int;
begin
  if t not in ('items', 'vj', 'meta') then raise exception 'bad table'; end if;
  execute format('update public.%I set data = data || $1, o = coalesce(($1 ->> ''o'')::float8, o), updated_at = now() where id = $2', t) using p, p_id;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'not allowed or not found' using errcode = '42501'; end if;
end $$;
revoke execute on function public.patch_doc(text, text, jsonb) from anon;
grant execute on function public.patch_doc(text, text, jsonb) to authenticated;

-- 5) 실시간 반영 (다른 사람이 고치면 바로 보이게)
do $$ begin
  begin alter publication supabase_realtime add table public.items; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.vj;    exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.meta;  exception when duplicate_object then null; end;
end $$;

-- 6) 파일 저장소 (시안·VJ 화면·영수증). 누구나 보기, 편집자만 올리기/지우기
insert into storage.buckets (id, name, public) values ('files', 'files', true) on conflict (id) do nothing;
drop policy if exists "files read" on storage.objects;
drop policy if exists "files editors insert" on storage.objects;
drop policy if exists "files editors delete" on storage.objects;
create policy "files read" on storage.objects for select using (bucket_id = 'files');
create policy "files editors insert" on storage.objects for insert to authenticated with check (bucket_id = 'files' and public.is_editor());
create policy "files editors delete" on storage.objects for delete to authenticated using (bucket_id = 'files' and public.is_editor());

-- 7) 편집자 명단 — 필요한 이메일을 추가하세요
insert into public.editors (email) values
  ('vision-editor@kyvikos.com'),  -- 공용 편집 계정 (화면의 편집 비밀번호)
  ('900arin@kyvikos.com'),
  ('methodair1552@gmail.com')
on conflict do nothing;

-- 8) 잠금 서류 저장소 (인력 신분증·통장사본). 공개 아님: 편집자로 로그인한 사람만 읽기·올리기·지우기.
--    파일은 브라우저에서 잠금 비밀번호로 암호화한 뒤 올라가요. 비밀번호는 어디에도 저장하지 않아요.
insert into storage.buckets (id, name, public) values ('secure', 'secure', false) on conflict (id) do update set public = false;
drop policy if exists "secure editors read" on storage.objects;
drop policy if exists "secure editors insert" on storage.objects;
drop policy if exists "secure editors delete" on storage.objects;
create policy "secure editors read" on storage.objects for select to authenticated using (bucket_id = 'secure' and public.is_editor());
create policy "secure editors insert" on storage.objects for insert to authenticated with check (bucket_id = 'secure' and public.is_editor());
create policy "secure editors delete" on storage.objects for delete to authenticated using (bucket_id = 'secure' and public.is_editor());
