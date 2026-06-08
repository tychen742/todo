# Decisions

## 2026-06-08: Use Expo SDK 54 for iPhone Expo Go

Decision: keep the project on Expo SDK 54 for now.

Reason: the current iPhone workflow uses the App Store version of Expo Go, and SDK 54 is compatible with that flow.

## 2026-06-08: Teams Are Ongoing, Projects Can Close

Decision: teams are ongoing workspaces; projects are bounded efforts with lifecycle states.

Reason: teams represent groups of people that persist across many efforts. Projects represent efforts that can end, complete, pause, or close.

## 2026-06-08: Personal Todos Do Not Require a Team

Decision: the Personal workspace is the default and does not require team creation.

Reason: individual task capture should stay low-friction. Team features are collaboration features, not prerequisites.

## 2026-06-08: Team Invitations Belong to Team Management

Decision: team invitations are part of Team Management, with dependency on User Management.

Reason: the invitation targets a team membership, but acceptance is resolved through user identity and email.

## 2026-06-08: Supabase RLS Is the Primary Access Boundary

Decision: access rules are enforced in Supabase Row Level Security.

Reason: both web and iPhone clients talk directly to Supabase, so database policies must protect personal and team data.

## 2026-06-08: Calendar Integrations Are Future Optional User Integrations

Decision: Outlook Calendar and Google Calendar integration should be planned, but not required for core todo use.

Reason: calendar sync depends on due dates, reminders, and project milestones. Those concepts should be modeled before integrating provider APIs.
