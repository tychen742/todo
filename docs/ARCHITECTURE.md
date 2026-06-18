# Architecture

## Stack

- Expo SDK 54
- React Native 0.81
- React 19.1
- Expo Router
- Supabase Auth
- Supabase Postgres
- Supabase Realtime

The project is intentionally on Expo SDK 54 because the App Store version of Expo Go can run it on the current iPhone workflow. Expo's versioned docs list SDK 54 with React Native 0.81, React 19.1, React Native Web 0.21, and minimum Node 20.19.x.

## Runtime

- Web runs through Expo/Metro at `localhost:8081`.
- iPhone runs through Expo Go using the LAN URL from the Metro server.
- Vercel serves the static Expo web build from `dist/`.
- Vercel Cron calls `/api/keep-supabase-awake` once per day to send lightweight
  Supabase REST reads and reduce idle-pause risk.
- Node version is pinned with `.nvmrc`.

## App Structure

- `app/index.tsx`: primary screen and current product workflow.
- `components/TodoItem.tsx`: todo row rendering.
- `api/keep-supabase-awake.js`: Vercel Cron endpoint for Supabase keep-alive
  reads.
- `lib/supabase.ts`: Supabase client and auth persistence.
- `supabase/schema.sql`: database schema, RLS policies, and realtime publication.

## Data Flow

1. User signs in through Supabase Auth.
2. The app upserts a `profiles` row for the signed-in user.
3. The app loads personal todos when the Personal workspace is selected.
4. The app loads team todos and members when a team workspace is selected.
5. Writes go directly through Supabase with RLS enforcing access.
6. Realtime subscriptions refresh todos and team members across web and iPhone.

## Security Model

Supabase Row Level Security is the main security boundary.

- Users can read and update their own profile.
- Users can read teams they created or belong to.
- Users can read team memberships for teams they belong to.
- Team owners/admins can manage team memberships.
- Users can manage personal todos where `team_id` is null and `created_by` is their user ID.
- Team members can manage team todos for teams they belong to.
- Todo assignment must target a member of the same team.

## Known Tradeoffs

- The app currently uses direct Supabase client writes from the frontend.
- Adding unknown users to teams is not complete; it needs `team_invitations`.
- The main screen is doing too much and should eventually split into domain components.

## Future Notes Architecture

Notes should be modeled separately from todo annotations and Team Pages.

Likely architecture:

- Store workspace-level notes in a first-party table such as `workspace_notes`.
- Scope notes to the active workspace: personal, team, or project.
- Show notes under the todo list first.
- Consider a dedicated Notes tab after workspace tabs exist or notes become a primary workflow.
- Keep todo annotations as task detail records or fields; keep workspace Notes for broader context.

## Future Team Page Architecture

Each team should eventually have a shared page for co-edited notes, links, status, pinned todos, and lightweight widgets. This should be an internal team workspace, not a dependency on Google Docs or Sheets.

Likely architecture:

- Store team pages in first-party Supabase tables such as `team_pages` and `team_page_sections`.
- Use Supabase Realtime for shared updates.
- Start with section-level editing before adding rich text or arbitrary widgets.
- Keep todo annotations separate from team pages: annotations describe one task; team pages describe shared team context.
- Consider edit history and conflict handling before supporting simultaneous rich text editing.

## Future Project Architecture

Projects should model bounded work with lifecycle and schedule planning, not just another todo list. See `PRODUCT.md` — Project Management Philosophy for the full design intent.

Likely architecture:

- Store projects in a first-party `projects` table owned by a user or team. ✓ Done.
- Store editable project names on the project record and update them from a project planning/settings surface.
- Store project phases in a `project_phases` table with ordering, planned dates, and status. ✓ Done.
- Store Kanban workflow on todos as `workflow_status`, separate from project phase. ✓ Done.
- Milestones are todos with `is_milestone = true` — no separate table. A milestone todo carries a due date representing an external commitment (demo, launch, hand-off). Completing a milestone is a delivery event, not just a checkbox.
- Critical path emerges from due dates: todos in the same phase with due dates before the nearest upcoming milestone todo are the critical path. No dependency graph or Gantt engine needed.
- An optional `blocks_id` reference on a todo can make explicit dependencies available later without changing the core model.
- Surface overdue milestone todos prominently on the project screen; show a countdown to the next upcoming milestone.
- Keep project-scoped todos in the existing todo workflow, linked to a project and optionally to a phase. Plan uses `phase_id`; Kanban uses `workflow_status`. ✓ Done.
- Add a project health view: current phase, overdue items, next milestone countdown, and blocked items in one screen.
- Add project closure: closing a project produces a lightweight summary — phases completed, todos completed vs dropped, milestones hit or missed.
- Use todo annotations for task-level resource notes, risk notes, blockers, assumptions, and mitigation details.
- Avoid building heavy resource-management or risk-management modules until lightweight annotation workflows prove useful.

## Future Calendar Architecture

The app should model its own Personal Calendar and Team Calendar before integrating with Outlook Calendar or Google Calendar. External providers should be optional sync targets, not the source of truth for tasks.

Calendar concepts to model first:

- Personal calendar items from personal todos, assigned todos, reminders, and project milestones.
- Team calendar items from team-visible todos, recurring team duties, and project milestones.
- Calendar view modes: Day, Week, and Month.
- Day notes for planning context. Current implementation keeps these local-only until scope is decided.
- Recurrence rules for team leader-created tasks.
- Sync visibility rules so personal items, team items, and external calendar events do not leak across boundaries.

Likely architecture:

- Store calendar connection metadata per user.
- Keep OAuth tokens out of the client when possible.
- Use Supabase Edge Functions or another backend worker for provider API calls.
- Support one-way export first before attempting full two-way sync.
- Make calendar sync explicit per todo, recurring task, or project milestone to avoid noisy calendars.
