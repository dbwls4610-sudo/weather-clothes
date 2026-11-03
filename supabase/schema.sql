-- 오늘 입은 옷 사진 기록용 테이블 + 사진 보관함(Storage)
-- 사용법: Supabase 대시보드 → SQL Editor → New query 에 이 파일 내용을 붙여넣고 Run (여러 번 실행해도 괜찮아요)

-- 하루에 한 장: 사용자 + 날짜가 기본키
create table if not exists public.outfit_logs (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  log_date   date not null,
  photo_path text not null,      -- Storage 안의 파일 경로 ("사용자id/날짜.jpg")
  label      text,               -- 그날의 기온 구간 (쌀쌀함 등)
  temp       numeric,            -- 사진을 올릴 때의 기온
  place      text,               -- 날씨를 본 지역
  created_at timestamptz not null default now(),
  primary key (user_id, log_date)
);

-- 그날의 날씨 전체 (하늘·기온·바람·오전/오후 등). 처음 만든 뒤에 추가된 칸이라 따로 더해 줍니다
alter table public.outfit_logs add column if not exists weather jsonb;

-- 입어 본 느낌: -2 많이 추웠어요 / -1 조금 추웠어요 / 0 딱 좋았어요 / 1 조금 더웠어요 / 2 많이 더웠어요 (안 고르면 비어 있음)
alter table public.outfit_logs add column if not exists feel smallint;
alter table public.outfit_logs drop constraint if exists outfit_logs_feel_range;
alter table public.outfit_logs add constraint outfit_logs_feel_range check (feel between -2 and 2);

-- 한 줄 후기 (안 써도 돼요, 최대 200자)
alter table public.outfit_logs add column if not exists note text;
alter table public.outfit_logs drop constraint if exists outfit_logs_note_len;
alter table public.outfit_logs add constraint outfit_logs_note_len check (char_length(note) <= 200);

-- 내 기록만 보고/쓰고/지울 수 있게 (RLS)
alter table public.outfit_logs enable row level security;

drop policy if exists "outfit_logs select own" on public.outfit_logs;
drop policy if exists "outfit_logs insert own" on public.outfit_logs;
drop policy if exists "outfit_logs update own" on public.outfit_logs;
drop policy if exists "outfit_logs delete own" on public.outfit_logs;
create policy "outfit_logs select own" on public.outfit_logs for select to authenticated using (auth.uid() = user_id);
create policy "outfit_logs insert own" on public.outfit_logs for insert to authenticated with check (auth.uid() = user_id);
create policy "outfit_logs update own" on public.outfit_logs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "outfit_logs delete own" on public.outfit_logs for delete to authenticated using (auth.uid() = user_id);

-- 사진 보관함: 비공개(public = false). 자기 폴더("사용자id/")의 파일만 접근 가능
insert into storage.buckets (id, name, public)
values ('outfit-photos', 'outfit-photos', false)
on conflict (id) do nothing;

drop policy if exists "outfit photos select own" on storage.objects;
drop policy if exists "outfit photos insert own" on storage.objects;
drop policy if exists "outfit photos update own" on storage.objects;
drop policy if exists "outfit photos delete own" on storage.objects;
create policy "outfit photos select own" on storage.objects for select to authenticated
  using (bucket_id = 'outfit-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "outfit photos insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'outfit-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "outfit photos update own" on storage.objects for update to authenticated
  using (bucket_id = 'outfit-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "outfit photos delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'outfit-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ─────────────────────────────────────────────────────────────
-- AI 도우미: 하루 질문 횟수 제한 (한 사람당 하루 10번, 한국 시간 기준)
-- 횟수는 사용자가 직접 고칠 수 없게, 아래 함수로만 세어요 (테이블에는 정책이 없어서 직접 읽기·쓰기 불가)
-- 횟수를 바꾸려면 두 함수의 10 을 바꿔서 다시 실행하세요.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.agent_usage (
  user_id    uuid not null references auth.users (id) on delete cascade,
  usage_date date not null,
  used       int  not null default 0,
  primary key (user_id, usage_date)
);
alter table public.agent_usage enable row level security;

-- 질문 1번 사용: 아직 10번 미만이면 1 늘리고 ok=true, 이미 다 썼으면 ok=false
create or replace function public.use_agent_quota()
returns table (ok boolean, used_count int, left_count int)
language plpgsql security definer set search_path = public as $$
declare
  daily_limit constant int := 10;
  today date := (now() at time zone 'Asia/Seoul')::date;
  new_used int;
begin
  if auth.uid() is null then raise exception 'not logged in'; end if;

  insert into public.agent_usage as u (user_id, usage_date, used)
  values (auth.uid(), today, 1)
  on conflict (user_id, usage_date) do update set used = u.used + 1 where u.used < daily_limit
  returning u.used into new_used;

  if new_used is null then   -- 이미 한도를 다 썼음 (위의 update 가 막힘)
    select u.used into new_used from public.agent_usage u where u.user_id = auth.uid() and u.usage_date = today;
    return query select false, new_used, 0;
  else
    return query select true, new_used, daily_limit - new_used;
  end if;
end $$;

-- 오늘 남은 질문 횟수 (화면에 "오늘 남은 질문 N번"으로 보여줄 때 씀)
create or replace function public.agent_quota_left()
returns int
language sql stable security definer set search_path = public as $$
  select greatest(10 - coalesce((
    select used from public.agent_usage
    where user_id = auth.uid() and usage_date = (now() at time zone 'Asia/Seoul')::date
  ), 0), 0)
$$;

revoke all on function public.use_agent_quota() from public;
revoke all on function public.agent_quota_left() from public;
grant execute on function public.use_agent_quota() to authenticated;
grant execute on function public.agent_quota_left() to authenticated;
