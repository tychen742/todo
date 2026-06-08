# Product

Todo is a personal task and lightweight project/team management app. It should stay simple enough for individual todos while growing toward collaborative team and project workflows.

## Product Areas

- **Personal Todos**: private tasks owned by one signed-in user.
- **Team Workspaces**: ongoing groups of people who can share and assign todos.
- **Team Pages**: collaboratively edited team homepages for notes, links, lightweight widgets, and shared context.
- **Projects**: bounded efforts that belong to a team or user and can end or close.
- **Todo Workflow**: task text, future annotations, completion, priority, optional due dates, assignment, timestamps, and filtering.
- **Notes**: workspace-level note taking for broader personal, team, or project context.
- **Calendars**: personal calendars, team calendars, recurring tasks, reminders, project milestones, and external calendar sync.
- **Communications**: personal messages, team chat, todo/project discussion, assignment notifications, acknowledgements, and external messages.
- **Customization**: user, team, and company branding such as logos, colors, and workspace appearance.
- **Business Model**: free personal and small-team use, with paid upgrades for advanced features.

## Domain Concepts

- **User Management**: authentication, profiles, sessions, account state, and user identity.
- **Team Management**: teams, team membership, team roles, and team invitations.
- **Team Knowledge Management**: shared team pages, editable sections, team notes, links, and lightweight dashboard widgets.
- **Project Management**: projects, project scope, project status, and project closure.
- **Todo Management**: todos, future annotations, priority, optional due dates, assignment, timestamps, completion, and filtering.
- **Notes Management**: workspace notes, note ownership, note visibility, and future note tabs.
- **Calendar Management**: personal calendar views, team calendar views, recurrence rules, external calendar connections, and sync state.
- **Communications Management**: personal messaging, team chat, threaded discussion, unread state, notifications, acknowledgements, delivery channels, and moderation.
- **Customization Management**: personal themes, team branding, company logos, color palettes, and feature availability by plan.
- **Subscription Management**: plans, feature gates, usage limits, billing status, and upgrade paths.

Team invitations belong primarily to Team Management, but depend on User Management because invitations are resolved by email when a user signs up or signs in.

## Product Rules

- Personal todos should work without creating a team.
- Workspace navigation should use tabs: `Personal`, each `Team_Name`, and eventually each active or pinned `Project_Name`.
- Teams are ongoing/perpetual and can contain multiple projects over time.
- Each team should have a shared page that functions as the team's living workspace, not just a list of todos.
- Team pages should support co-editing one page of shared team context, closer to a lightweight team dashboard than a formal document.
- Team pages should reduce the need to maintain separate Google Docs or Sheets for basic shared notes, links, status, and coordination.
- Projects are bounded and should support lifecycle states such as active, paused, completed, and closed.
- Assignment only makes sense in a team or project context with multiple users.
- Priority should default to Normal on creation, stay visible on each todo row, and be changeable from that row.
- Due dates are central to time management and project management; they should support planning, workload visibility, reminders, calendars, and milestone tracking.
- Adding todos should stay as quick capture: the add area should have one text input for the todo text.
- Due dates should be set and adjusted from each todo row so planning can happen after capture.
- Notes should be a separate workspace-level concept; the first UI placement should be under the todo list, with a possible dedicated tab later.
- Todo annotations should stay scoped to one task; workspace Notes should hold broader context, thoughts, snippets, and running notes.
- Calendar sync should be optional per user and should not be required for basic todo use.
- Personal calendars should show the user's own todos, assignments, reminders, and synced external calendar context.
- Team calendars should show shared team tasks, recurring team duties, and project milestones visible to team members.
- Team leaders should be able to create recurring team tasks when role permissions allow it.
- External calendar integration should respect boundaries: personal items sync to personal calendars, team-visible items sync only where the team has opted in.
- Communications should start as lightweight team coordination and should not replace focused todo, notes, or project workflows.
- Task assignment should trigger an app notification by default.
- Read state and acknowledgement should be separate assignee responses, especially for project-management workflows where handoff needs confirmation.
- Email or text messaging should be later optional delivery channels beyond the default app UI notification.
- UI customization should let users, teams, and companies adjust branding without breaking app consistency or accessibility.
- The app should remain free for personal and small-team use; monetization should come from advanced features rather than blocking basic task management.

## Due Date Semantics

Due dates are optional at capture time, but they become a planning signal when present. The app should use due dates to support:

- Personal time management and daily planning.
- Team workload coordination.
- Project milestone tracking.
- Calendar views and reminder scheduling.
- Future filtering and reporting around overdue, due soon, and unscheduled work.

## Current Features

- Email/password sign in and sign up
- Personal todos
- Optional team workspaces
- Add members by email for existing users
- Team todo assignment
- Todo priority levels: low, normal, high, urgent
- Optional due dates
- Todo annotations planned for per-task details
- Supabase-backed sync across web and iPhone

## Near-Term Feature Ideas

- Team invitations for users who have not signed up yet
- Priority dropdown from the Add flow
- Facebook-style relative timestamps
- Notes area under the todo list
- Team pages for shared notes, links, status, and lightweight widgets
- Filters for assigned to me, created by me, urgent, completed, team, and project
- Project creation and closure
- Project-scoped todos
- Personal calendar and team calendar views
- Recurring tasks for team calendars
- Outlook Calendar and Google Calendar integration
- Personal messaging and team chat for lightweight coordination
- Assignment notifications and acknowledgement requests through app UI, email, or text messaging
- Custom logos, colors, and workspace appearance for users, teams, and companies
- Paid feature boundaries for larger teams, advanced project management, automation, integrations, storage, admin controls, or reporting
