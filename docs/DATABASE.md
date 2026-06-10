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
- `assigned_at`
- `accepted_at`
- `completed_at`
- `created_at`

Priority values:

- `low`
- `normal`
- `high`
- `urgent`

Personal todos have `team_id = null`. Team todos have `team_id` set and can be assigned to a team member.
Assigned tasks start as incoming work until the assignee accepts them. `assigned_at` records when the task was assigned, `accepted_at` records when the assignee accepted it into their todo list, and `completed_at` records when the task was marked done.

`due_date` is optional. Todos without a due date should store `null`.

`note` currently stores optional per-task detail text. Product language should treat this as a future todo annotation concept, not workspace-level Notes.

#### Timestamp Modeling Notes

Keep direct timestamp columns on `todos` only for lifecycle moments that the current product depends on directly:

- `created_at` — task capture time.
- `assigned_at` — when a task was assigned to a user.
- `accepted_at` — when the assignee accepted the incoming task into their todo list.
- `completed_at` — when the task was marked done.

These fields support near-term product behavior:

- separating incoming work from accepted todos
- showing task age and completion timing
- measuring assignment-to-acceptance and acceptance-to-completion time
- project closure summaries such as completed vs dropped work and milestone hit/miss timing
- future notification and reminder rules

Possible future timestamps include:

- `updated_at` for last material edit
- `started_at` for work-in-progress state
- `reopened_at` for tasks moved from completed back to active
- `dropped_at` or `canceled_at` for tasks closed without completion
- `deleted_at` for recoverable trash
- `snoozed_until` for hiding a task until a later time
- `reminder_at` for explicit reminders
- `due_date_changed_at` if due-date churn becomes important
- `blocked_at` and `unblocked_at` if blockers become a first-class workflow

If a timestamp can happen more than once, needs an actor, needs a reason, or must preserve history, prefer a future `todo_events` table instead of adding another nullable column to `todos`.

Expected event shape:

- `id`
- `todo_id`
- `actor_id`
- `event_type`
- `from_value`
- `to_value`
- `reason`
- `created_at`

Good candidates for `todo_events` are assignment changes, due-date changes, reopen events, priority changes, comments/annotations, blocked/unblocked transitions, and project phase moves. Keep `todos` as the current-state table; use events only when the product needs audit history, analytics, or timeline UI.

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
