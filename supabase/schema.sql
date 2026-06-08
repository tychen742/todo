create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references profiles(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists team_members (
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  done boolean not null default false,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  due_date date,
  note text,
  created_at timestamptz not null default now()
);

alter table todos add column if not exists team_id uuid references teams(id) on delete cascade;
alter table todos add column if not exists created_by uuid references profiles(id) on delete cascade;
alter table todos add column if not exists assigned_to uuid references profiles(id) on delete set null;
alter table todos add column if not exists priority text not null default 'normal';
alter table todos add column if not exists due_date date;
alter table todos add column if not exists note text;
alter table todos drop constraint if exists todos_priority_check;
alter table todos add constraint todos_priority_check check (priority in ('low', 'normal', 'high', 'urgent'));

delete from todos where created_by is null;
alter table todos alter column team_id drop not null;
alter table todos alter column created_by set default auth.uid();
alter table todos alter column created_by set not null;

create or replace function public.is_team_member(p_team_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from team_members
    where team_id = p_team_id
      and user_id = p_user_id
  );
$$;

create or replace function public.can_manage_team(p_team_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from team_members
    where team_id = p_team_id
      and user_id = p_user_id
      and role in ('owner', 'admin')
  )
  or exists (
    select 1
    from teams
    where id = p_team_id
      and created_by = p_user_id
  );
$$;

alter table profiles enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table todos enable row level security;

drop policy if exists "Profiles are readable by signed-in users" on profiles;
drop policy if exists "Users can insert their own profile" on profiles;
drop policy if exists "Users can update their own profile" on profiles;

create policy "Profiles are readable by signed-in users"
  on profiles for select
  to authenticated
  using (true);

create policy "Users can insert their own profile"
  on profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Team members can read teams" on teams;
drop policy if exists "Users can create teams" on teams;

create policy "Team members can read teams"
  on teams for select
  to authenticated
  using (created_by = auth.uid() or public.is_team_member(id, auth.uid()));

create policy "Users can create teams"
  on teams for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists "Team members can read memberships" on team_members;
drop policy if exists "Team admins can add memberships" on team_members;
drop policy if exists "Team admins can update memberships" on team_members;
drop policy if exists "Team admins can delete memberships" on team_members;

create policy "Team members can read memberships"
  on team_members for select
  to authenticated
  using (public.is_team_member(team_id, auth.uid()));

create policy "Team admins can add memberships"
  on team_members for insert
  to authenticated
  with check (public.can_manage_team(team_id, auth.uid()));

create policy "Team admins can update memberships"
  on team_members for update
  to authenticated
  using (public.can_manage_team(team_id, auth.uid()))
  with check (public.can_manage_team(team_id, auth.uid()));

create policy "Team admins can delete memberships"
  on team_members for delete
  to authenticated
  using (public.can_manage_team(team_id, auth.uid()));

drop policy if exists "Users can read their own todos" on todos;
drop policy if exists "Users can add their own todos" on todos;
drop policy if exists "Users can update their own todos" on todos;
drop policy if exists "Users can delete their own todos" on todos;
drop policy if exists "Team members can read team todos" on todos;
drop policy if exists "Team members can add team todos" on todos;
drop policy if exists "Team members can update team todos" on todos;
drop policy if exists "Team members can delete team todos" on todos;

create policy "Team members can read team todos"
  on todos for select
  to authenticated
  using (
    (team_id is null and created_by = auth.uid())
    or public.is_team_member(team_id, auth.uid())
  );

create policy "Team members can add team todos"
  on todos for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and (
      (team_id is null and assigned_to is null)
      or (
        public.is_team_member(team_id, auth.uid())
        and (assigned_to is null or public.is_team_member(team_id, assigned_to))
      )
    )
  );

create policy "Team members can update team todos"
  on todos for update
  to authenticated
  using (
    (team_id is null and created_by = auth.uid())
    or public.is_team_member(team_id, auth.uid())
  )
  with check (
    (
      (team_id is null and created_by = auth.uid() and assigned_to is null)
      or (
        public.is_team_member(team_id, auth.uid())
        and (assigned_to is null or public.is_team_member(team_id, assigned_to))
      )
    )
  );

create policy "Team members can delete team todos"
  on todos for delete
  to authenticated
  using (
    (team_id is null and created_by = auth.uid())
    or public.is_team_member(team_id, auth.uid())
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'todos'
  ) then
    alter publication supabase_realtime add table todos;
  end if;
end $$;
