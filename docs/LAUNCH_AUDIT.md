# Launch Audit Plan

This plan keeps the path to market moving day by day. It has three parts: a short daily audit, a weekly review, and a dated six-week schedule that turns the Commercial Release checklist in `ROADMAP.md` into daily work. Record each audit in the log at the bottom (or in `TODOS.md`) so progress and slips are visible.

The schedule assumes part-time work. When a day slips, move the item to the next open day instead of doubling up, and note the slip in the log. Owner "You" means a decision, account, payment, or legal step only the founder can take; "Claude" means implementation work that can be delegated.

## Daily Audit (15 minutes, every workday)

Run these checks in order. A failed check becomes the first task of the day.

| # | Check | How | Pass when |
| --- | --- | --- | --- |
| 1 | Production is up | Open the production site and sign in with the test account. | The workspace loads and a todo can be added and completed. |
| 2 | Last deploy is healthy | Vercel dashboard, latest production deployment. | Status is Ready and it matches the latest `main` commit. |
| 3 | No new errors | Error monitoring (after Week 1); until then, Vercel function logs and Supabase logs. | No new unresolved errors since the last audit. |
| 4 | Database is healthy | Supabase dashboard: database health, auth logs, backups. | No auth failure spikes, last backup succeeded, usage within plan limits. |
| 5 | Support is answered | Support queue (after Week 3); until then, the support inbox. | No ticket older than one business day without a reply. |
| 6 | Users | Supabase: new signups and active users since the last audit. | Numbers recorded in the log. |
| 7 | Plan progress | This document's schedule. | Yesterday's items are done, or each slip has a new date and a reason. |

## Weekly Review (Fridays, 30 to 45 minutes)

1. **Release gates:** `npm run typecheck`, `npm run lint`, `npm run build`, and the smoke tests all pass on `main`.
2. **Checklist progress:** update the Commercial Release checkboxes in `ROADMAP.md` to match reality.
3. **Security:** review any schema or RLS changes made that week; run `npm audit` and decide on any high-severity findings.
4. **Costs:** check Supabase, Vercel, domain, and tool bills against the budget.
5. **Users:** list the week's feedback themes and decide which, if any, change next week's plan.
6. **Next week:** confirm the next week's schedule, adjust dates, and record decisions in `DECISIONS.md`.

## Six-Week Schedule

### Week 1 (Oct 5 to Oct 9): Stabilize production

| Day | Task | Owner | Done when |
| --- | --- | --- | --- |
| Mon Oct 5 | Verify production after the workspace refactor: sign in, try views, dialogs, maps, calendar, drag and drop. | You | No regressions found, or each one is logged. |
| Mon Oct 5 | Apply the schema (`npm run db:apply`) for account export and deletion; test both with a throwaway account. | You + Claude | Export downloads a JSON file; deleting the throwaway account works. |
| Tue Oct 6 | Create a dedicated test account and record it in the project's local env or seed notes (never in chat). | You | Account exists and is documented for smoke tests. |
| Tue Oct 6 | Add automated browser smoke tests (sign in, add/edit/complete a todo, open a project, open a map). | Claude | `npm run test:smoke` passes locally against the dev server. |
| Wed Oct 7 | Upgrade Supabase to Pro and Vercel to Pro. | You | Both dashboards show Pro. |
| Wed Oct 7 | Retire the keep-alive cron once Supabase Pro is active. | Claude | Cron removed from `vercel.json`; docs updated. |
| Thu Oct 8 | Set up error monitoring (for example, Sentry) and connect alerts to email. | You + Claude | A test error appears in the dashboard and triggers an email. |
| Fri Oct 9 | Weekly review. | You | Review notes recorded. |

### Week 2 (Oct 12 to Oct 16): Legal and trust

| Day | Task | Owner | Done when |
| --- | --- | --- | --- |
| Mon Oct 12 | Decide the legal entity (individual or LLC) and business address; register the LLC if chosen. | You | Decision recorded in `DECISIONS.md`. |
| Tue Oct 13 | Buy the production domain; set up support, privacy, and legal email addresses. | You | Mail to each address arrives. |
| Tue Oct 13 | Point the domain at Vercel and update Supabase auth redirect URLs. | Claude | Sign-in and Google sign-in work on the new domain. |
| Wed Oct 14 | Fill every placeholder in `legal/privacy-policy.md` and `legal/terms-of-service.md`. | You | No `[BRACKETED]` text remains. |
| Wed Oct 14 | Book an attorney review of both documents. | You | Review date confirmed. |
| Thu Oct 15 | Publish `/privacy` and `/terms` pages and link them from the sign-in footer. | Claude | Links work on web and mobile widths. |
| Thu Oct 15 | Test a backup restore into a scratch Supabase project. | You + Claude | Restored data matches production row counts. |
| Fri Oct 16 | Weekly review. | You | Review notes recorded. |

### Week 3 (Oct 19 to Oct 23): Support and onboarding

| Day | Task | Owner | Done when |
| --- | --- | --- | --- |
| Mon Oct 19 | Choose the ticketing approach (in-app form saved to Supabase with email notice, or a help-desk tool). | You | Decision recorded. |
| Tue Oct 20 | Build the support form or integrate the help-desk tool; link it from the account menu. | Claude | A test ticket reaches the queue and sends an email. |
| Wed Oct 21 | Set up uptime monitoring for the site and the API, with alerts. | You + Claude | A simulated outage triggers an alert. |
| Thu Oct 22 | Build first-run onboarding: confirm display name, explain the workspace, create a first todo or project. | Claude | A new account reaches a useful workspace without help. |
| Fri Oct 23 | Weekly review; apply attorney feedback to the legal pages if received. | You | Review notes recorded. |

### Week 4 (Oct 26 to Oct 30): Offer, pricing, and landing page

| Day | Task | Owner | Done when |
| --- | --- | --- | --- |
| Mon Oct 26 | Define the limited version (free for the first year) and the paid plan: limits, price, and what happens after year one. | You | Plan table recorded in `DECISIONS.md`. |
| Tue Oct 27 | Write landing page copy for SMEs and consultants from `MARKETING.md`. | You + Claude | Copy approved. |
| Wed Oct 28 | Build the landing page and pricing page. | Claude | Pages live on the production domain. |
| Thu Oct 29 | List 30 candidate first users (consultants and small businesses you know); draft the invitation message. | You | List and message ready. |
| Fri Oct 30 | Weekly review. | You | Review notes recorded. |

### Week 5 (Nov 2 to Nov 6): Billing

| Day | Task | Owner | Done when |
| --- | --- | --- | --- |
| Mon Nov 2 | Open the Liner account, complete business verification, and share the API documentation. | You | Test-mode keys available. |
| Tue Nov 3 | Store plans and subscription status in Supabase; enforce plan limits in the app and database. | Claude | Limits apply per plan in local tests. |
| Wed Nov 4 | Checkout, billing portal, and webhook handling in test mode. | Claude | A test subscription starts, renews, and cancels correctly. |
| Thu Nov 5 | Implement the first-year-free offer for new accounts. | Claude | New accounts show the offer and its end date. |
| Fri Nov 6 | Weekly review; update the Terms paid-plan section to match the final billing setup. | You | Review notes recorded. |

### Week 6 (Nov 9 to Nov 13): First users and launch decision

| Day | Task | Owner | Done when |
| --- | --- | --- | --- |
| Mon Nov 9 | Send invitations to the first 10 users from the candidate list. | You | Invitations sent. |
| Tue Nov 10 to Thu Nov 12 | Onboard users, answer support within one business day, and log every piece of feedback. | You | Feedback log updated daily. |
| Fri Nov 13 | Launch readiness review (below) and go/no-go decision for public launch. | You | Decision recorded in `DECISIONS.md`. |

## Launch Readiness Criteria

Public launch goes ahead only when every item is true:

- Release gates and smoke tests pass on `main`, and the last 10 production days had no unresolved critical errors.
- Supabase and Vercel are on paid plans, backups are verified by a test restore, and uptime and error alerts reach you.
- The Privacy Policy and Terms are complete, reviewed by an attorney, and linked from the app.
- Account export and deletion work in production.
- The support channel works and every ticket so far was answered within one business day.
- Billing works end to end in test mode, and live mode is configured.
- At least five of the first users used the app in at least three separate weeks.

## Audit Log

Copy this block for each workday, newest first.

```
### YYYY-MM-DD
Checks: up [ ] deploy [ ] errors [ ] database [ ] support [ ]  users: +__ signups, __ active
Done today:
Slipped (new date, reason):
Blockers:
Next:
```
