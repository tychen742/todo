# TODOs

This file collects product and implementation TODOs from working sessions. Move items into `ROADMAP.md`, `PRODUCT.md`, or `DECISIONS.md` when they become stable plans.

## Recently Completed

- Personal workspace remains usable without creating a team.
- Todo priority levels: low, normal, high, urgent.
- New todos default to Normal priority.
- Priority is changed from each todo row, not during todo creation.
- Relative timestamps are shown on todo rows, including Personal workspace todos.
- Due dates are optional for personal and team todos.
- Due dates are set from each todo row instead of the add-todo input area.
- Todo annotations are a future per-task detail feature.
- `docs/` is the project documentation home.
- Future Outlook Calendar and Google Calendar integration is documented.
- Workspace switching uses tabs for Personal, with Projects planned.
- Teams and Organizations live under the account/admin menu.

## Near-Term

- Keep add-todo quick capture limited to a single todo text input.
- Add schema-backed Organization creation from the account menu.
- Add schema-backed Project creation from the workspace `+` menu.
- Keep a default `Project 1` workspace tab visible as the first planned project surface until schema-backed projects exist.
- Add Profile editing so users can set or change their display name.
- Add due-date views for overdue, due soon, today, and unscheduled work.
- Track `completed_at` and show completed date near the due date for completed todos.
- Add team invitations when adding an email that does not yet belong to a user profile.
- Add a Notes area under the todo list as a separate concept from todo annotations.
- Add a Team Page for shared notes, links, status, and lightweight widgets.
- Add filters for urgent, assigned to me, created by me, active, and completed.
- Add empty states for Personal and Team workspaces.
- Add a Trash for deleted todos so items can be recovered before permanent deletion.
- Define paid feature boundaries while keeping personal and small-team use free.
- Add Communications as a future concept for personal messaging, team chat, and lightweight coordination.
- Add default assignment notifications, plus read state and acknowledgement responses as a project-management communication workflow.
- Add UI customization as a future business feature for personal themes, team branding, company logos, and color choices.
- Add choices for todo list item spacing, such as compact, comfortable, and spacious density modes.

## Team Pages

- Create a shared, co-editable team homepage for each team.
- Support simple sections such as notes, links, status, upcoming work, pinned todos, and team calendar preview.
- Treat Team Pages as an internal shared workspace, not as an embedded Google Doc or Sheet.
- Use realtime sync so team members can co-edit and see updates quickly.
- Decide whether Team Pages need edit history, section-level permissions, or conflict handling before adding rich editing.

## Notes

- Treat Notes as a separate workspace concept, not as the same thing as todo annotations.
- Place the Notes area under the todo list in the initial UI.
- Consider moving Notes into its own tab after workspace tabs exist.
- Support quick note taking for personal, team, or project context depending on the active workspace.
- Keep annotations scoped to one task; keep Notes for broader context, thoughts, snippets, and running notes.

## Todo Annotations

- Add annotations as a future per-todo feature.
- Use annotations for task-specific details, comments, clarifications, and context.
- Keep annotations attached to exactly one todo item.
- Do not use workspace Notes for task-specific annotation.

## Assignment & Collaborators

- Replace the cycle-tap assignee mechanic on kanban cards with a searchable picker modal.
- Picker shows Team Members first (from the project's linked team), then any existing Collaborators on the project.
- Search filters by name or email in real time; Tab moves between results; Enter confirms selection.
- "Add by email" option at the bottom invites a new Collaborator without leaving the task.
- Schema: add a `project_collaborators` table (project_id, user_id, invited_by, created_at) distinct from `team_members`. Collaborators get scoped RLS access — only the tasks assigned to them and their required project context.
- Collaborators appear only on the tasks they are assigned; they do not appear in the team member panel.
- Both Team Members and Collaborators receive assignment notifications; Collaborators may need email delivery since they may not have the app.

## Project Management

- Add projects as bounded work that can end or close. ✓ Done.
- Add project-scoped todos. ✓ Done.
- Add project phases for lifecycle planning. ✓ Done.
- Use due dates for project planning, milestone tracking, and schedule visibility.
- Add `is_milestone` flag to todos; milestone todos render distinctly (diamond icon, delivery-event completion, countdown when near due date).
- Surface overdue milestone todos prominently on the project screen; show next-milestone countdown banner.
- Critical path: highlight todos in the active phase with due dates before the nearest upcoming milestone todo.
- Add a project health view: current phase, overdue items, next milestone countdown, blocked items — all in one screen.
- Add project closure with a summary: phases completed, todos completed vs dropped, milestones hit or missed.
- Add project schedule views after phases, milestones, dependencies, and due dates are modeled.
- Track resource constraints and risk notes through todo annotations and project planning/annotation.
- Add project lifecycle states such as active, paused, completed, and closed. ✓ Done (schema).
- Show projects as workspace tabs when a user enters or pins a project. ✓ Done.
- Decide the project rename flow; prefer project planning/settings over double-click so it works on iPhone and can include phases, milestones, status, and schedule planning.

## Calendar Integration

- Add a Personal Calendar for personal todos, assigned todos, reminders, and personal schedule context.
- Add a Team Calendar for team-visible tasks, recurring team duties, and project milestones.
- Let team leaders create recurring tasks on the Team Calendar.
- Design recurrence rules for daily, weekly, monthly, and custom schedules.
- Model reminders and project milestones before connecting calendar providers.
- Keep Outlook Calendar and Google Calendar sync optional per user.
- Make calendar sync explicit per todo or project milestone to avoid noisy calendars.
- Decide how team calendar items sync to external calendars without exposing private team data.

## Team Management

- Keep teams ongoing/perpetual.
- Design team invitation acceptance and expiration.
- Add roles and permissions beyond owner/admin/member only when needed.

## Status & Presence

- Phase 1 (done): Users set their own status text from the title bar; stored in `profiles.status`; visible only to themselves for now.
- Phase 2: Team members who opt in to sharing see each other's statuses — surface on hover/tap of a member chip in the member panel, not in the title bar.
- Future: Team leaders (owner/admin role) can push a broadcast message into the status bar area that all team members see and must acknowledge (read-receipt style). This replaces the "announcement" use-case without requiring a full chat feature. Treat acknowledgement as a lightweight team communication primitive before building full notifications.

## Communications

- Treat Communications as a future product concept for personal messaging, team chat, todo/project discussion, and notifications.
- Keep initial communication features lightweight so they support coordination without distracting from task and project management.
- Trigger an app UI notification by default when a task is assigned.
- Treat read state and acknowledgement as assignee responses to implement after basic notifications.
- Let the assigner choose later whether an assignment also requests acknowledgement or uses email/text delivery.
- Use acknowledgements to confirm that an assignee has accepted important work.
- Decide later whether discussion belongs directly on todos/projects, in team channels, or both.

## Customization

- Let users, teams, and companies customize logos, colors, and workspace appearance.
- Keep customization constrained enough to preserve usability, accessibility, and recognizable app behavior.
- Consider advanced branding as a paid feature for companies or larger teams.
- Add built-in skins/themes (e.g. light, dark, high-contrast, color accents) for users to choose from without requiring custom branding.
- Keep theme selection as a personal preference; team or company branding can override or extend it.
- Let users choose todo list density or spacing preferences for tighter or roomier task rows.
