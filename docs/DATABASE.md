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

- `id` — uuid primary key
- `team_id` — uuid, foreign key to `teams`
- `email` — text, the invited address (lowercase)
- `invited_by` — uuid, foreign key to `profiles`
- `token` — uuid, unique random token for the invitation link
- `status` — text, one of `pending`, `accepted`, `expired`, `revoked`
- `expires_at` — timestamptz, when the invitation link stops being valid
- `accepted_by` — uuid, nullable foreign key to `profiles`, set when a user accepts
- `created_at` — timestamptz

Invitation acceptance flow:
1. Owner/admin creates an invitation row for an email address.
2. App emails the invite link containing `token`.
3. When the invited user signs up or signs in, the app looks up `team_invitations` by `email` and `status = pending`.
4. If a valid (non-expired, non-revoked) invitation exists, the app inserts a `team_members` row and updates the invitation `status` to `accepted`, setting `accepted_by`.

RLS notes:
- Only team owners/admins can insert invitations.
- The invitation token lookup should be readable without authentication so the sign-up flow can resolve it.
- Expired and revoked invitations should not be writable by the invited user.
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
