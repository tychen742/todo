# Database

The source of truth for the database is:

```text
supabase/schema.sql
```

Run that file in Supabase SQL Editor whenever schema or policy changes are made.

## Tables

### `profiles`

Application profile for each Supabase Auth user.

- `id`
- `email`
- `display_name`
- `created_at`

### `teams`

Ongoing team workspaces.

- `id`
- `name`
- `created_by`
- `created_at`

### `team_members`

Membership and role for users in teams.

- `team_id`
- `user_id`
- `role`
- `created_at`

Current roles:

- `owner`
- `admin`
- `member`

### `todos`

Personal or team-scoped tasks.

- `id`
- `text`
- `done`
- `priority`
- `due_date`
- `note` (transitional; future name/concept should be annotation)
- `team_id`
- `created_by`
- `assigned_to`
- `created_at`

Priority values:

- `low`
- `normal`
- `high`
- `urgent`

Personal todos have `team_id = null`. Team todos have `team_id` set and can be assigned to a team member.

`due_date` is optional. Todos without a due date should store `null`.

`note` currently stores optional per-task detail text. Product language should treat this as a future todo annotation concept, not workspace-level Notes.

## RLS Summary

- Profiles are readable by signed-in users.
- Users can insert/update their own profile.
- Teams are readable by creators and members.
- Team memberships are readable by team members.
- Team memberships are managed by owners/admins.
- Personal todos are managed by their creator.
- Team todos are managed by members of that team.
- Todo assignment must target a member of the same team.

## Realtime

The schema adds `todos` to the `supabase_realtime` publication so web and iPhone clients can refresh when todo rows change.

## Planned Tables

### `team_invitations`

Needed for inviting emails that do not yet have profiles.

Expected fields:

- `id`
- `team_id`
- `email`
- `invited_by`
- `accepted_by`
- `accepted_at`
- `created_at`

### `projects`

Needed for bounded work that can end or close.

Expected fields:

- `id`
- `team_id`
- `name`
- `status`
- `created_by`
- `closed_at`
- `created_at`
