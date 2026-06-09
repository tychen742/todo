# Product

Todo is a personal task and lightweight project/team management app. It should stay simple enough for individual todos while growing toward collaborative team and project workflows.

## Market Positioning

This app should not try to become a full ClickUp, Asana, or Todoist replacement. Those products are useful inspirations, but the goal is a smaller app that can make money by serving focused segments well.

- **ClickUp inspiration**: broad workspace thinking, tasks plus docs plus communication, but avoid becoming too heavy for everyday users.
- **Asana inspiration**: clear ownership, assignment, due dates, project status, and accountability, but avoid enterprise workflow complexity early.
- **Todoist inspiration**: fast personal task capture, priorities, due dates, recurring tasks, and clean mobile use, while adding lightweight teams and projects where useful.

The initial target markets are:

- **Higher education**: faculty, students, research groups, labs, committees, departments, and small academic project teams that need todos, assignments, project notes, recurring responsibilities, deadlines, and calendar integration without adopting a large enterprise system.
- **Personal users**: individuals who need a clean personal todo system that can grow into light collaboration.
- **SMEs**: small and medium-sized organizations that need practical task, team, and project coordination without paying for or managing a complex platform.

The product should compete through simplicity and genuine usefulness — a tool that is immediately helpful on day one without training, setup cost, or configuration overhead. It should stay simple enough to adopt in minutes and useful enough to keep using as work grows. It wins by being easier to understand and more directly helpful than ClickUp, Asana, or Todoist for focused personal, team, and project workflows, not by matching their feature count.

## Product Areas

- **Personal Todos**: private tasks owned by one signed-in user.
- **Team Workspaces**: ongoing groups of people who can share and assign todos.
- **Team Pages**: collaboratively edited team homepages for notes, links, lightweight widgets, and shared context.
- **Projects**: bounded efforts that belong to a team or user and support lifecycle planning, schedule management, phases, milestones, critical path awareness, and closure.
- **Todo Workflow**: task text, future annotations, completion, priority, optional due dates, assignment, timestamps, and filtering.
- **Notes**: workspace-level note taking for broader personal, team, or project context.
- **Calendars**: personal calendars, team calendars, recurring tasks, reminders, project milestones, and external calendar sync.
- **Communications**: personal messages, team chat, todo/project discussion, assignment notifications, acknowledgements, and external messages.
- **Customization**: user, team, and company branding such as logos, colors, and workspace appearance.
- **Business Model**: free personal and small-team use, with paid upgrades for advanced features.

## People Model: Members vs Collaborators

There are two distinct participation types in this product:

**Team Member** — someone who belongs to the team. They are involved in ongoing work, can see team todos and projects, and show up in team rosters. Membership is persistent and managed from Team settings.

**Collaborator** — someone who needs to perform specific tasks but does not need to be part of the team. Examples: HR processing an onboarding form, accounting approving an expense, a vendor delivering one asset, a reviewer signing off on a document. A Collaborator is added per-task or per-project, not per-team. They see only what they are assigned; they do not see the full team workspace.

This distinction matters for:

- **Assignment UX**: the assignee picker shows Team Members first, then Collaborators. Supports search: type to filter names, Tab to move between results, Enter to confirm. Offer "Add by email" at the bottom to invite a new Collaborator inline without leaving the task.
- **Visibility and permissions**: Collaborators have scoped access (the assigned task and its project context only); Team Members have full team access.
- **Notifications**: both get assignment notifications, but Collaborators may need email delivery since they may not use the app regularly.
- **Roster**: Team Members appear on the team member panel; Collaborators appear only on the tasks they are assigned to.

This model keeps teams clean (no bloat from one-off contributors) while supporting the real-world pattern of pulling in outside people for specific work.

## Domain Concepts

- **User Management**: authentication, profiles, sessions, account state, and user identity.
- **Team Management**: teams, team membership, team roles, and team invitations.
- **Team Knowledge Management**: shared team pages, editable sections, team notes, links, and lightweight dashboard widgets.
- **Project Management**: projects, project scope, project status, lifecycle planning, phases, milestones, critical path awareness, schedule management, resource planning, risk planning, and project closure.
- **Todo Management**: todos, future annotations, priority, optional due dates, assignment, timestamps, completion, and filtering.
- **Notes Management**: workspace notes, note ownership, note visibility, and future note tabs.
- **Calendar Management**: personal calendar views, team calendar views, recurrence rules, external calendar connections, and sync state.
- **Communications Management**: personal messaging, team chat, threaded discussion, unread state, notifications, acknowledgements, delivery channels, and moderation.
- **Customization Management**: personal themes, team branding, company logos, color palettes, and feature availability by plan.
- **Subscription Management**: plans, feature gates, usage limits, billing status, and upgrade paths.

Team invitations belong primarily to Team Management, but depend on User Management because invitations are resolved by email when a user signs up or signs in.

## Product Rules

- Personal todos should work without creating a team.
- Account navigation should expose user-level and administrative concepts such as Profile, Settings, Organizations, Teams, and Log Out.
- User-facing labels should prefer display names; full email addresses belong in Profile/account details and invitation flows.
- Workspace navigation should use tabs for active work surfaces: `Personal` and eventually each active or pinned `Project_Name`.
- The initial workspace shape should show `Personal`, a default `Project 1` placeholder, and a `+` action for new projects.
- Organizations and Teams are containers for people, permissions, billing, and ownership; they should be managed from the account/admin menu rather than treated as primary workspace tabs.
- Teams are ongoing/perpetual and can contain multiple projects over time.
- Each team should have a shared page that functions as the team's living workspace, not just a list of todos.
- Team pages should support co-editing one page of shared team context, closer to a lightweight team dashboard than a formal document.
- Team pages should reduce the need to maintain separate Google Docs or Sheets for basic shared notes, links, status, and coordination.
- Projects are bounded and should support lifecycle states such as active, paused, completed, and closed.
- Projects should support lifecycle planning through phases, milestones, schedule views, and critical path identification.
- Project names should be editable from an explicit project planning or settings surface rather than relying on double-click, because project naming is tied to planning metadata and must work well on mobile.
- Resource management and risk management should start as lightweight planning and annotation workflows, not as a heavy enterprise module.
- Todo annotations and project planning/annotation should capture resource constraints, risks, assumptions, blockers, and mitigation notes.
- Assignment only makes sense in a team or project context with multiple users.
- Priority should default to Normal on creation, stay visible on each todo row, and be changeable from that row.
- Due dates are central to time management and project management; they should support planning, workload visibility, reminders, calendars, and milestone tracking.
- Adding todos should stay as quick capture: the add area should have one text input for the todo text.
- Due dates should be set and adjusted from each todo row so planning can happen after capture.
- Completed todos should show when they were completed near their due-date value; this requires tracking completion time separately from creation time.
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
- Users should be able to choose different todo row spacing or density modes without changing task content or behavior.
- The app should remain free for personal and small-team use; monetization should come from advanced features rather than blocking basic task management.

## Project Management Philosophy

The goal is not to replicate ClickUp. ClickUp's core model is lists of tasks in folders in spaces — a todo hierarchy. This app makes the **project itself the primary object**: not a container for tasks, but a living plan with a lifecycle, gates, and real delivery signals.

Five principles distinguish this PM model from a task list with a project label:

**1. Phase-gating**
When a phase is active, its todos are the priority. Marking a phase complete prompts the user to move open todos forward or close them. The project knows its own state; phases are not just labels.

**2. Milestones with real weight**
A milestone is just a todo marked as a delivery commitment — a demo, a launch, a hand-off. It carries a due date and an `is_milestone` flag; no separate table or concept is needed. Milestone todos render prominently, show a countdown when near their due date, and surface at the project level when overdue. Completing a milestone feels like a delivery event, not just checking a box.

**3. Critical path visibility**
Because milestones are todos, critical path emerges naturally from due dates. Todos in the same phase with due dates before the nearest upcoming milestone are the critical path. No dependency graph or Gantt engine is needed — overdue or undone todos upstream of a milestone todo are the blockers. An optional `blocks_id` reference on a todo can make explicit dependencies available later without changing the core model.

**4. Project health at a glance**
A single project screen should answer: what phase are we in, what is overdue, what is the next milestone, and who or what is blocked. No digging through nested lists.

**5. Closure with a record**
Projects can close; task lists never end. Closing a project produces a lightweight summary — phases completed, todos completed versus dropped, milestones hit or missed. This makes projects feel like real bounded efforts rather than perpetual backlogs.

The full model stays intentionally flat:

- **Project** — planning container with a name and lifecycle state.
- **Phase** — organizes todos into lifecycle stages.
- **Todo** — the unit of work; can be a regular task or a milestone (distinguished by an `is_milestone` flag, not a separate table).
- **Due date** — what creates urgency and makes the critical path visible.

No milestones table, no dependencies table, no Gantt engine. Milestones and critical path are properties of todos, not separate systems. This keeps the user mental model simple: everything is a task; some tasks are commitments.

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
