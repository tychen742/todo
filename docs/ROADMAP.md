# Roadmap

See `TODOS.md` for working-session TODOs that have not yet become stable roadmap commitments.

## Planning Direction

The goal is a steady, modest revenue stream from a small, loyal customer base that grows slowly, not a venture-scale product. ClickUp is the strongest reference product, Asana is good but large, and Todoist is basic but strong on marketing; the rest of the category is not a planning concern. RodoFlow does not need to be simpler or more powerful than any of them. It should focus on doing its own workflows well and keeping the people who adopt it.

Primary commercial segments:

- SMEs: regular commercial, management, office, business, team, and remote work that needs task, team, project, notes, and calendar coordination.
- Consultants and freelancers: one workspace across several client organizations (see `MARKETING.md`).
- Personal users who may later need light collaboration.

The app should stay free for personal and small-team use. Paid value should come from advanced collaboration, calendar integrations, project/team administration, customization, reporting, automation, and larger-team needs.

Higher education is deferred as a primary segment. Research-group and research-data needs may be better served by a separate product (a revived research management/data site) rather than by RodoFlow.

## Commercial Release

Launch is web-only. Native iOS/Android distribution (EAS Build, App Store review, in-app purchase rules) comes after the web product has paying users.

### Code health

- [x] Split `app/index.tsx` (was about 11,900 lines) into `features/workspace/` section components, modals, auth screens, styles, and a `useWorkspaceScreen` hook.
- [x] Split `useWorkspaceScreen` into domain hooks under `features/workspace/hooks/`.
- [ ] Move the inbox and notes panel renderers out of `useWorkspaceScreen` into components.
- [ ] Break up `WorkspaceBoard` (personal workspace, project plan, and Kanban modes) and `TodoModals`.
- [ ] Build, typecheck, lint, and production web smoke checks pass as release gates.

### Billing

- [ ] Payment provider: Liner is the planned choice; evaluate Stripe as the alternative before building checkout.
- [ ] Define the first paid boundary (free personal and small-team use; paid for larger teams, more orgs, and advanced collaboration).
- [ ] Plans and subscription status stored in Supabase; feature gates read from it.
- [ ] Checkout, customer billing portal, and webhook handling for subscription changes.
- [ ] Pricing page.

### Infrastructure

- [ ] Upgrade to Supabase Pro (no idle pausing, daily backups); retire the keep-alive cron once on Pro.
- [ ] Upgrade to Vercel Pro (Hobby does not permit commercial use).
- [ ] Production custom domain and transactional email sender domain.
- [ ] Verified backup and restore procedure.

### Legal and trust

- [ ] Privacy Policy.
- [ ] Terms of Service.
- [ ] Cookie/analytics disclosure if analytics are added.
- [ ] In-app account deletion and data export.
- [ ] Data processing and subprocessor list (Supabase, Vercel, payment provider) for business customers.

### Support and operations

- [ ] Ticketing system as the first support channel, linked from the app and site.
- [ ] Error monitoring for auth failures, database errors, and client crashes.
- [ ] Uptime and deploy-status alerts.
- [ ] Status/incident communication path.

### Onboarding and growth

- [ ] Post-signup onboarding: confirm display name, explain the workspace, create the first useful todo/project.
- [ ] Marketing landing page focused on SMEs and consultants.
- [ ] Recruit an initial group of weekly active users before turning on payment.

## Now

- Keep personal todos working without team setup.
- Keep team workspaces optional.
- Tighten first-run and auth UX so a new user can understand, sign up, and reach a useful workspace without explanation.
- Treat build, typecheck, lint, and production web smoke checks as release gates.
- Keep release-critical documentation current with the app's real behavior.
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
- Team/project-scoped Maps storage beyond the current personal synced maps.
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
- Dedicated Maps tab separate from the Workspace embedded assignment inbox.
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
