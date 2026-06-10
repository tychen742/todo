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

## 2026-06-09: Task Assignment Lifecycle and Communication Design

**Lifecycle states:**

- `assigned_at` set → task appears in assignee's Inbox (read-only, no mutations)
- `accepted_at` set → task moves to assignee's Todos; all fields become editable by assignee
- `declined_at` set → task removed from Inbox; assigner is notified and can reassign or modify
- `archived_at` set → task hidden from all active views; recoverable from an Archived section

**Pre-acceptance rule:** Before a task is accepted, the assignee cannot mutate any task field (priority, due date, text, phase). The only actions available are: comment, accept, or decline.

**Communication mechanism (Task Thread):** Every task has a comment thread (`task_comments` table). Comments are available to all parties at any lifecycle stage, including before acceptance. This is the channel for negotiation, clarification, and coordination. It is NOT a general chat — it is scoped strictly to the task.

**Decline is a first-class action** (not just a comment). It sets `declined_at` and `declined_by`, notifies the assigner, and removes the task from the assignee's Inbox. The assigner can then reassign or re-negotiate.

**Archive vs. Delete:** Permanent deletion is prohibited in production. Tasks are archived (`archived_at` timestamp set). Archived tasks retain their comment thread and full history. They appear in a collapsed "Archived" section and can be un-archived. This preserves project history and supports auditability.

**Archive vs. Decline vs. Complete:** These are three distinct end-states with different semantics — complete means the work was finished, decline means it was rejected before acceptance, archive means it was removed from the active list after acceptance (could be de-scoped, duplicate, or replaced).

Reason: commercial product requires an auditable, recoverable history. Permanent deletes destroy project context. Pre-acceptance immutability ensures the assigner's intent is preserved until the assignee commits. The comment thread enables async negotiation without requiring real-time presence.

## 2026-06-09: UI Column Alignment Is a Hard Rule

Decision: every column in a list view must have a fixed width that is shared exactly between the sort/header bar and the row items. Flexible or approximate widths are not acceptable.

Reason: misaligned column headers break visual scanning and make the UI feel unpolished. The rule is enforced by (a) wrapping related row elements (e.g. priority square + assigner avatar) in a fixed-width container, and (b) setting the corresponding sort column to the same width + marginLeft. When a row element is added or removed, both the container width and the sort column width must be updated together.

## 2026-06-10: Profile Photo Is Encouraged and Part of Onboarding

Decision: profile photo upload is a first-class onboarding step, not a buried settings option.

Reason: real photos make the product feel human and are the foundation for presence, assignment, and team awareness features. An app full of animal emojis reads as a prototype; an app full of real faces reads as a real tool people use for real work. The animal emoji is a fun, low-friction fallback for users who prefer not to upload a photo — but the onboarding flow should actively encourage uploading one.

**Onboarding behavior:**

- After sign-up, prompt the user to set up their profile photo. Do not skip this step silently — it should feel like a welcome, not a form.
- Offer three paths in order of preference: (1) import from LinkedIn, (2) upload a photo, (3) choose an animal emoji.
- LinkedIn import is the encouraged default — most professional users already have a good photo there and it removes the friction of finding and cropping an image. Linking LinkedIn also seeds display name and optionally job title.
- If they upload a photo, store it in Supabase Storage at `avatars/{user_id}` and write the public URL to `profiles.avatar_url`. LinkedIn photo URLs should be cached to the same storage bucket to avoid depending on LinkedIn CDN availability.
- If they choose emoji, the animal picker opens as a fun fallback.

**Display priority:** profile photo > animal emoji > initials fallback.

**Tap to change:** tapping the avatar anywhere in the app (title bar, profile screen) should open the same picker — upload a photo or choose an emoji.

## 2026-06-08: Calendar Integrations Are Future Optional User Integrations

Decision: Outlook Calendar and Google Calendar integration should be planned, but not required for core todo use.

Reason: calendar sync depends on due dates, reminders, and project milestones. Those concepts should be modeled before integrating provider APIs.
