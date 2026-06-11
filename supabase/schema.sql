create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  status text,
  created_at timestamptz not null default now()
);
alter table profiles add column if not exists status text;

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

-- Columns added after initial schema; priority/due_date/note are already in CREATE TABLE above.
alter table todos add column if not exists team_id uuid references teams(id) on delete cascade;
alter table todos add column if not exists position integer;
alter table todos add column if not exists created_by uuid references profiles(id) on delete cascade;
alter table todos add column if not exists assigned_to uuid references profiles(id) on delete set null;
alter table todos add column if not exists assigned_at timestamptz;
alter table todos add column if not exists accepted_at timestamptz;
alter table todos add column if not exists completed_at timestamptz;

-- One-time migration: remove orphaned rows that pre-date the created_by column.
-- Safe to skip on a fresh database; idempotent because created_by is NOT NULL after this block.
delete from todos where created_by is null;
alter table todos alter column team_id drop not null;
alter table todos alter column created_by set default auth.uid();
alter table todos alter column created_by set not null;

-- Indexes to support RLS helper functions and common query patterns.
create index if not exists team_members_user_id_idx on team_members (user_id);
create index if not exists todos_team_id_idx on todos (team_id);
create index if not exists todos_created_by_idx on todos (created_by);
create index if not exists todos_assigned_to_idx on todos (assigned_to);
create index if not exists todos_accepted_at_idx on todos (accepted_at);

-- Partial unique indexes so active drag positions stay consistent per workspace.
drop index if exists todos_position_personal_unique;
drop index if exists todos_position_team_unique;

create unique index if not exists todos_position_personal_active_unique
  on todos (created_by, position)
  where team_id is null and done = false and position is not null;

create unique index if not exists todos_position_team_active_unique
  on todos (team_id, position)
  where team_id is not null and done = false and position is not null;

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

-- Auto-create a profile row whenever a new auth user signs up.
-- This runs as a privileged trigger so it bypasses RLS, making it
-- more reliable than the client-side ensureProfile upsert.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, lower(new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table profiles enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table todos enable row level security;

drop policy if exists "Profiles are readable by signed-in users" on profiles;
drop policy if exists "Users can read own and team profiles" on profiles;
drop policy if exists "Users can insert their own profile" on profiles;
drop policy if exists "Users can update their own profile" on profiles;

-- Users can read their own profile and profiles of people in shared teams.
create policy "Users can read own and team profiles"
  on profiles for select
  to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from team_members tm1
      join team_members tm2 on tm1.team_id = tm2.team_id
      where tm1.user_id = auth.uid()
        and tm2.user_id = profiles.id
    )
  );

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

-- Projects: bounded efforts with lifecycle planning.
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  start_date date,
  finish_date date,
  team_id uuid references teams(id) on delete cascade,
  created_by uuid not null references profiles(id) on delete cascade default auth.uid(),
  status text not null default 'active'
    check (status in ('active', 'paused', 'completed', 'closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

alter table projects add column if not exists start_date date;
alter table projects add column if not exists finish_date date;

create table if not exists project_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  order_index integer not null default 0,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'active', 'completed')),
  planned_start date,
  planned_end date,
  created_at timestamptz not null default now()
);

alter table todos add column if not exists project_id uuid references projects(id) on delete set null;
alter table todos add column if not exists phase_id uuid references project_phases(id) on delete set null;
alter table todos add column if not exists workflow_status text not null default 'backlog'
  check (workflow_status in ('backlog', 'doing', 'review', 'done'));
alter table todos add column if not exists workflow_position integer;
alter table todos add column if not exists is_milestone boolean not null default false;

update todos
set workflow_status = 'done'
where done = true
  and workflow_status <> 'done';

create index if not exists todos_project_id_idx on todos (project_id);
create index if not exists project_phases_project_id_idx on project_phases (project_id);

-- Personal position index must exclude project-scoped todos to avoid conflicts.
drop index if exists todos_position_personal_active_unique;
create unique index if not exists todos_position_personal_active_unique
  on todos (created_by, position)
  where team_id is null and project_id is null and done = false and position is not null;

drop index if exists todos_position_project_active_unique;
create unique index if not exists todos_position_project_active_unique
  on todos (project_id, position)
  where project_id is not null and done = false and position is not null;

drop index if exists todos_workflow_position_project_active_unique;
create unique index if not exists todos_workflow_position_project_active_unique
  on todos (project_id, workflow_status, workflow_position)
  where project_id is not null and done = false and workflow_position is not null;

alter table projects enable row level security;
alter table project_phases enable row level security;

drop policy if exists "Project members can read projects" on projects;
drop policy if exists "Users can create projects" on projects;
drop policy if exists "Project owners can update projects" on projects;
drop policy if exists "Project owners can delete projects" on projects;

create policy "Project members can read projects"
  on projects for select to authenticated
  using (
    created_by = auth.uid()
    or (team_id is not null and public.is_team_member(team_id, auth.uid()))
  );

create policy "Users can create projects"
  on projects for insert to authenticated
  with check (created_by = auth.uid());

create policy "Project owners can update projects"
  on projects for update to authenticated
  using (
    created_by = auth.uid()
    or (team_id is not null and public.can_manage_team(team_id, auth.uid()))
  );

create policy "Project owners can delete projects"
  on projects for delete to authenticated
  using (
    created_by = auth.uid()
    or (team_id is not null and public.can_manage_team(team_id, auth.uid()))
  );

drop policy if exists "Project members can read phases" on project_phases;
drop policy if exists "Project members can manage phases" on project_phases;

create policy "Project members can read phases"
  on project_phases for select to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = project_phases.project_id
        and (
          p.created_by = auth.uid()
          or (p.team_id is not null and public.is_team_member(p.team_id, auth.uid()))
        )
    )
  );

create policy "Project members can manage phases"
  on project_phases for all to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = project_phases.project_id
        and (
          p.created_by = auth.uid()
          or (p.team_id is not null and public.can_manage_team(p.team_id, auth.uid()))
        )
    )
  );

-- Extend todos RLS to allow project-scoped access.
-- Existing policies already cover team_id is null (personal) and team_id is not null (team).
-- Project todos have project_id set; access mirrors the project's visibility.
drop policy if exists "Project members can read project todos" on todos;
drop policy if exists "Project members can add project todos" on todos;
drop policy if exists "Project members can update project todos" on todos;
drop policy if exists "Project members can delete project todos" on todos;

create policy "Project members can read project todos"
  on todos for select to authenticated
  using (
    project_id is not null
    and exists (
      select 1 from projects p
      where p.id = todos.project_id
        and (
          p.created_by = auth.uid()
          or (p.team_id is not null and public.is_team_member(p.team_id, auth.uid()))
        )
    )
  );

create policy "Project members can add project todos"
  on todos for insert to authenticated
  with check (
    project_id is not null
    and created_by = auth.uid()
    and exists (
      select 1 from projects p
      where p.id = project_id
        and (
          p.created_by = auth.uid()
          or (p.team_id is not null and public.is_team_member(p.team_id, auth.uid()))
        )
    )
  );

create policy "Project members can update project todos"
  on todos for update to authenticated
  using (
    project_id is not null
    and exists (
      select 1 from projects p
      where p.id = todos.project_id
        and (
          p.created_by = auth.uid()
          or (p.team_id is not null and public.is_team_member(p.team_id, auth.uid()))
        )
    )
  );

create policy "Project members can delete project todos"
  on todos for delete to authenticated
  using (
    project_id is not null
    and exists (
      select 1 from projects p
      where p.id = todos.project_id
        and (
          p.created_by = auth.uid()
          or (p.team_id is not null and public.is_team_member(p.team_id, auth.uid()))
        )
    )
  );

-- Organizations: company or workspace containers that sit above teams.
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references profiles(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists org_members (
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- Teams can optionally belong to an organization.
alter table teams add column if not exists org_id uuid references organizations(id) on delete set null;

create index if not exists org_members_user_id_idx on org_members (user_id);
create index if not exists teams_org_id_idx on teams (org_id);

create or replace function public.is_org_member(p_org_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from org_members
    where org_id = p_org_id
      and user_id = p_user_id
  );
$$;

create or replace function public.can_manage_org(p_org_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from org_members
    where org_id = p_org_id
      and user_id = p_user_id
      and role in ('owner', 'admin')
  )
  or exists (
    select 1
    from organizations
    where id = p_org_id
      and created_by = p_user_id
  );
$$;

alter table organizations enable row level security;
alter table org_members enable row level security;

drop policy if exists "Org members can read organizations" on organizations;
drop policy if exists "Users can create organizations" on organizations;
drop policy if exists "Org admins can update organizations" on organizations;
drop policy if exists "Org owners can delete organizations" on organizations;

create policy "Org members can read organizations"
  on organizations for select to authenticated
  using (created_by = auth.uid() or public.is_org_member(id, auth.uid()));

create policy "Users can create organizations"
  on organizations for insert to authenticated
  with check (created_by = auth.uid());

create policy "Org admins can update organizations"
  on organizations for update to authenticated
  using (public.can_manage_org(id, auth.uid()))
  with check (public.can_manage_org(id, auth.uid()));

create policy "Org owners can delete organizations"
  on organizations for delete to authenticated
  using (created_by = auth.uid());

drop policy if exists "Org members can read org memberships" on org_members;
drop policy if exists "Org admins can add org memberships" on org_members;
drop policy if exists "Org admins can update org memberships" on org_members;
drop policy if exists "Org admins can delete org memberships" on org_members;

create policy "Org members can read org memberships"
  on org_members for select to authenticated
  using (public.is_org_member(org_id, auth.uid()));

create policy "Org admins can add org memberships"
  on org_members for insert to authenticated
  with check (public.can_manage_org(org_id, auth.uid()));

create policy "Org admins can update org memberships"
  on org_members for update to authenticated
  using (public.can_manage_org(org_id, auth.uid()))
  with check (public.can_manage_org(org_id, auth.uid()));

create policy "Org admins can delete org memberships"
  on org_members for delete to authenticated
  using (public.can_manage_org(org_id, auth.uid()));

-- Org members can see all teams in their organization.
drop policy if exists "Team members can read teams" on teams;
create policy "Team members can read teams"
  on teams for select to authenticated
  using (
    created_by = auth.uid()
    or public.is_team_member(id, auth.uid())
    or (org_id is not null and public.is_org_member(org_id, auth.uid()))
  );

drop policy if exists "Team admins can update teams" on teams;
drop policy if exists "Team owners can delete teams" on teams;

create policy "Team admins can update teams"
  on teams for update to authenticated
  using (public.can_manage_team(id, auth.uid()))
  with check (public.can_manage_team(id, auth.uid()));

create policy "Team owners can delete teams"
  on teams for delete to authenticated
  using (
    created_by = auth.uid()
    or (org_id is not null and public.can_manage_org(org_id, auth.uid()))
  );

-- Org co-members can see each other's profiles.
drop policy if exists "Users can read own and team profiles" on profiles;
create policy "Users can read own and team profiles"
  on profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from team_members tm1
      join team_members tm2 on tm1.team_id = tm2.team_id
      where tm1.user_id = auth.uid()
        and tm2.user_id = profiles.id
    )
    or exists (
      select 1
      from org_members om1
      join org_members om2 on om1.org_id = om2.org_id
      where om1.user_id = auth.uid()
        and om2.user_id = profiles.id
    )
  );

-- Free-tier enforcement: 3 orgs per user, 5 members per org.
-- Both limits are checked on every insert into org_members, which covers
-- org creation (creator is inserted as owner) and member additions.
create or replace function public.check_org_membership_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_org_count integer;
  v_org_member_count integer;
begin
  select count(*) into v_user_org_count
  from org_members
  where user_id = NEW.user_id;

  if v_user_org_count >= 3 then
    raise exception 'Free accounts can belong to a maximum of 3 organizations. Upgrade to join more.';
  end if;

  select count(*) into v_org_member_count
  from org_members
  where org_id = NEW.org_id;

  if v_org_member_count >= 5 then
    raise exception 'Free organizations can have a maximum of 5 members. Upgrade to add more.';
  end if;

  return NEW;
end;
$$;

drop trigger if exists enforce_org_membership_limits on org_members;
create trigger enforce_org_membership_limits
  before insert on org_members
  for each row execute procedure public.check_org_membership_limits();

-- Atomically transfer org ownership: promotes the new owner, demotes the caller to admin.
-- security invoker so auth.uid() resolves to the caller, not the definer.
create or replace function public.transfer_org_ownership(p_org_id uuid, p_new_owner_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1 from org_members
    where org_id = p_org_id and user_id = auth.uid() and role = 'owner'
  ) then
    raise exception 'Only the current owner can transfer ownership';
  end if;

  if not exists (
    select 1 from org_members
    where org_id = p_org_id and user_id = p_new_owner_id
  ) then
    raise exception 'New owner must already be a member of the organization';
  end if;

  update org_members set role = 'owner'
  where org_id = p_org_id and user_id = p_new_owner_id;

  update org_members set role = 'admin'
  where org_id = p_org_id and user_id = auth.uid();
end;
$$;

-- Look up a profile by email for the "add member by email" flow.
-- Security definer so the lookup works before the two users share a team/org.
-- Returns only id and email — no other profile data is exposed.
create or replace function public.find_profile_by_email(p_email text)
returns table(id uuid, email text)
language sql
security definer
set search_path = public
as $$
  select id, email
  from profiles
  where email = lower(p_email)
  limit 1;
$$;

-- Batch-update todo positions in a single round trip after a drag reorder.
-- Accepts a JSON array of {id, position} objects and updates each row,
-- respecting the same access rules as the todos UPDATE policy.
create or replace function public.batch_update_todo_positions(updates jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  with incoming as (
    select
      (item->>'id')::uuid as id,
      (item->>'position')::integer as position,
      row_number() over () as ordinal
    from jsonb_array_elements(updates) as item
  )
  update todos
  set position = -1000000 + incoming.ordinal
  from incoming
  where todos.id = incoming.id
    and todos.done = false;

  with incoming as (
    select
      (item->>'id')::uuid as id,
      (item->>'position')::integer as position
    from jsonb_array_elements(updates) as item
  )
  update todos
  set position = incoming.position
  from incoming
  where todos.id = incoming.id
    and todos.done = false;
end;
$$;

create or replace function public.batch_update_todo_workflow_positions(updates jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  with incoming as (
    select
      (item->>'id')::uuid as id,
      (item->>'position')::integer as position,
      row_number() over () as ordinal
    from jsonb_array_elements(updates) as item
  )
  update todos
  set workflow_position = -1000000 + incoming.ordinal
  from incoming
  where todos.id = incoming.id;

  with incoming as (
    select
      (item->>'id')::uuid as id,
      (item->>'position')::integer as position
    from jsonb_array_elements(updates) as item
  )
  update todos
  set workflow_position = incoming.position
  from incoming
  where todos.id = incoming.id;
end;
$$;

-- Allow reading todos assigned to the current user across all workspaces.
-- This enables the "Inbox" section and accepted assigned todos in the Personal workspace.
drop policy if exists "Team members can read team todos" on todos;
create policy "Team members can read team todos"
  on todos for select
  to authenticated
  using (
    (team_id is null and created_by = auth.uid())
    or public.is_team_member(team_id, auth.uid())
    or assigned_to = auth.uid()
  );

-- Allow assignees to accept and update their assigned todos.
drop policy if exists "Team members can update team todos" on todos;
create policy "Team members can update team todos"
  on todos for update
  to authenticated
  using (
    (team_id is null and created_by = auth.uid())
    or public.is_team_member(team_id, auth.uid())
    or assigned_to = auth.uid()
  );

-- ============================================================
-- Migration: archive support, decline tracking, task comments
-- ============================================================

-- Soft-delete for todos: archived tasks are hidden from all active views
-- but retained for history and can be un-archived.
alter table todos add column if not exists archived_at timestamptz;

-- Decline lifecycle: assignee can decline before accepting.
-- declined_at records when; declined_by records who (always the assignee).
alter table todos add column if not exists declined_at  timestamptz;
alter table todos add column if not exists declined_by  uuid references profiles(id) on delete set null;

create index if not exists todos_archived_at_idx on todos (archived_at)
  where archived_at is not null;
create index if not exists todos_declined_at_idx on todos (declined_at)
  where declined_at is not null;

-- Soft-delete for projects.
-- Projects are archived rather than deleted to preserve task history.
alter table projects add column if not exists archived_at timestamptz;

create index if not exists projects_archived_at_idx on projects (archived_at)
  where archived_at is not null;

-- Task comments: pre- and post-acceptance discussion thread on a todo.
-- Both assigner and assignee can post at any lifecycle stage.
create table if not exists task_comments (
  id         uuid        primary key default gen_random_uuid(),
  todo_id    uuid        not null references todos(id) on delete cascade,
  user_id    uuid        not null references profiles(id) on delete cascade,
  body       text        not null check (char_length(body) > 0),
  created_at timestamptz not null default now()
);

create index if not exists task_comments_todo_id_idx    on task_comments (todo_id);
create index if not exists task_comments_created_at_idx on task_comments (todo_id, created_at desc);

alter table task_comments enable row level security;

-- Helper: can the current user access a given todo's comment thread?
-- Mirrors the union of all todo SELECT policies.
create or replace function public.can_access_todo(p_todo_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from todos t
    where t.id = p_todo_id
      and (
        (t.team_id is null and t.created_by = p_user_id)
        or public.is_team_member(t.team_id, p_user_id)
        or t.assigned_to = p_user_id
        or (
          t.project_id is not null
          and exists (
            select 1 from projects p
            where p.id = t.project_id
              and (
                p.created_by = p_user_id
                or (p.team_id is not null and public.is_team_member(p.team_id, p_user_id))
              )
          )
        )
      )
  );
$$;

drop policy if exists "Accessible todo members can read comments" on task_comments;
drop policy if exists "Accessible todo members can post comments" on task_comments;

create policy "Accessible todo members can read comments"
  on task_comments for select
  to authenticated
  using (public.can_access_todo(todo_id, auth.uid()));

create policy "Accessible todo members can post comments"
  on task_comments for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.can_access_todo(todo_id, auth.uid())
  );

-- Publish task_comments to realtime so threads update live.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'task_comments'
  ) then
    alter publication supabase_realtime add table task_comments;
  end if;
end $$;

alter table todos add column if not exists estimate text;
alter table todos add column if not exists scheduled_start_at timestamptz;
alter table todos add column if not exists started_work_at timestamptz;

create index if not exists todos_scheduled_start_at_idx on todos (scheduled_start_at)
  where scheduled_start_at is not null;
create index if not exists todos_started_work_at_idx on todos (started_work_at)
  where started_work_at is not null;

-- Atomically create a team and add the caller as owner in one transaction.
-- Using security invoker so auth.uid() resolves to the calling user.
create or replace function public.create_team_with_owner(p_name text, p_org_id uuid default null)
returns table(id uuid, name text, org_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_team_id uuid;
begin
  insert into teams (name, created_by, org_id)
  values (p_name, auth.uid(), p_org_id)
  returning teams.id into v_team_id;

  insert into team_members (team_id, user_id, role)
  values (v_team_id, auth.uid(), 'owner');

  return query
    select t.id, t.name, t.org_id
    from teams t
    where t.id = v_team_id;
end;
$$;

-- Atomically create an organization and add the caller as owner in one transaction.
-- Using security invoker so auth.uid() resolves to the calling user.
create or replace function public.create_org_with_owner(p_name text)
returns table(id uuid, name text)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  insert into organizations (name, created_by)
  values (p_name, auth.uid())
  returning organizations.id into v_org_id;

  insert into org_members (org_id, user_id, role)
  values (v_org_id, auth.uid(), 'owner');

  return query
    select o.id, o.name
    from organizations o
    where o.id = v_org_id;
end;
$$;
