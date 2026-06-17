# Roadmap

See `TODOS.md` for working-session TODOs that have not yet become stable roadmap commitments.

## Planning Direction

Use ClickUp, Asana, and Todoist as inspirations, not as products to copy feature-for-feature. The app should stay smaller and easier to adopt, with a practical path to revenue from focused segments:

- Higher education users and groups: students, faculty, labs, research groups, committees, departments, and academic project teams.
- Personal users who may later need light collaboration.
- SMEs that need task, team, project, notes, and calendar coordination without a large project-management rollout.

The app should stay free for personal and small-team use. Paid value should come from advanced collaboration, calendar integrations, project/team administration, customization, reporting, automation, and larger-team needs.

## Now

- Keep personal todos working without team setup.
- Keep team workspaces optional.
- Run `supabase/schema.sql` after schema changes.
- Stabilize priority and assignment UI on web and iPhone.
- Keep due dates optional for personal and team todos.
- Keep account navigation responsible for Profile, Settings, Organizations, Teams, and Log Out.
- Keep workspace switching tab-based for Personal now and Projects later.

## Next

- Team invitations for emails that do not yet belong to a user profile.
- Priority dropdown opened from the Add flow.
- Facebook-style relative timestamps on todo rows.
- Due-date views for overdue, due soon, today, and unscheduled work.
- Workspace Notes area under the todo list.
- Team Pages for shared notes, links, status, and lightweight widgets.
- Filters for urgent, assigned to me, created by me, completed, and active.
- Empty states for Personal and Team workspaces.
- Project workspace tabs after project creation exists.

## Later

- Projects with lifecycle states: active, paused, completed, closed.
- Project-scoped todos.
- Phase-gating: completing a phase prompts moving open todos forward or closing them.
- Milestones as todos: mark any todo as a milestone (`is_milestone` flag) to represent an external commitment; no separate table needed.
- Critical path from due dates: todos due before the nearest upcoming milestone todo are the critical path — surfaces automatically from existing data.
- Project health screen: current phase, overdue items, next milestone countdown, and blocked items in one view.
- Project closure summary: phases completed, todos completed vs dropped, milestones hit or missed.
- Due-date-based project planning and milestone tracking.
- Project/team dashboards.
- Dedicated Notes tab if workspace-level notes grow beyond the todo-list page.
- Personal calendar and team calendar views.
- Recurring (weekly/monthly/annually) personal/team tasks.
- Roles and permissions beyond owner/admin/member.
- Reminders and notification support.
- Outlook Calendar and Google Calendar integration.
- Personal messaging and team chat.
- Project invitations sent through in-app chat or direct message for people outside your shared org/team.
- Project sharing with parent team/org plus selection of specific visible members from that scope.
- Default assignment notifications, with read state and acknowledgement responses for project-management workflows.
- Custom logos, colors, and workspace appearance for users, teams, and companies.
- Activity history and audit trail.
- Paid feature boundaries that keep personal and small-team use free.

## Backlog Notes

- Organizations may eventually own teams, but teams should come first.
- Projects can close; teams usually persist.
- Invitations should be designed before external email sending is added.
- Calendar integrations should come after personal calendars, team calendars, recurrence, due dates, reminders, and project milestones are modeled.
- Communications should come after core team/project workflows unless notification needs make a narrower version useful sooner.
- Assignment notifications can be a narrower Communications feature before full chat; read state and acknowledgement can follow when project workflows need reliable handoff confirmation.
- Custom branding can become a paid feature after team/company ownership and subscription boundaries are clearer.
- Basic personal and small-team task management should stay free; paid plans should focus on advanced collaboration, integrations, automation, reporting, storage, or administration.
