-- DACO 일본어 코치 v5: Supabase 초기 설정
-- Supabase Dashboard > SQL Editor에서 전체 실행

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text,
  role text not null default 'user' check (role in ('user','admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_login timestamptz
);

create table if not exists public.learning_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles(username);
create index if not exists learning_progress_updated_idx on public.learning_progress(updated_at desc);

alter table public.profiles enable row level security;
alter table public.learning_progress enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = (select auth.uid()) and role='admin' and active=true
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_name text;
  v_role text := 'user';
begin
  v_username := lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)));
  v_name := coalesce(new.raw_user_meta_data->>'display_name', v_username);
  if v_username !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'invalid username';
  end if;
  -- 최초 admin 아이디는 관리자 권한. admin 계정 생성 후 비밀번호 변경 권장.
  if v_username='admin' then
    if exists(select 1 from public.profiles) then
      raise exception 'admin username is reserved';
    end if;
    v_role := 'admin';
  end if;
  insert into public.profiles(user_id,username,display_name,role)
  values(new.id,v_username,v_name,v_role);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.touch_last_login()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set last_login=now()
  where user_id=(select auth.uid()) and active=true;
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.touch_last_login() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.touch_last_login() to authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.learning_progress to authenticated;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;
drop policy if exists "progress_select_own_or_admin" on public.learning_progress;
drop policy if exists "progress_insert_own" on public.learning_progress;
drop policy if exists "progress_insert_own_or_admin" on public.learning_progress;
drop policy if exists "progress_update_own_or_admin" on public.learning_progress;
drop policy if exists "progress_delete_admin" on public.learning_progress;

-- profiles: 본인은 자기 프로필 조회, 관리자는 전체 조회
create policy "profiles_select_own_or_admin" on public.profiles
for select to authenticated
using ((select auth.uid())=user_id or public.is_admin());

-- 프로필 수정은 관리자만 (일반 사용자가 role/active를 바꾸지 못하도록 차단)
create policy "profiles_update_admin" on public.profiles
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 학습기록: 본인 기록 + 관리자는 전체 기록 조회 가능
create policy "progress_select_own_or_admin" on public.learning_progress
for select to authenticated
using ((select auth.uid())=user_id or public.is_admin());

create policy "progress_insert_own_or_admin" on public.learning_progress
for insert to authenticated
with check ((select auth.uid())=user_id or public.is_admin());

create policy "progress_update_own_or_admin" on public.learning_progress
for update to authenticated
using ((select auth.uid())=user_id or public.is_admin())
with check ((select auth.uid())=user_id or public.is_admin());

create policy "progress_delete_admin" on public.learning_progress
for delete to authenticated
using (public.is_admin());
