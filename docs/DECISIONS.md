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

## 2026-06-16: Project Sharing Follows Parent Scope, Then Individual Selection

Decision: a project may be shared through its parent team or organization, and the project owner or manager may also select specific visible members from that shared scope.

Reason: broad sharing and targeted sharing solve different collaboration needs. Whole-team or whole-org access is useful for broad projects, while selecting specific members avoids exposing project context to everyone in the parent group. If the person is not visible through a shared team/org, the project invite falls back to a direct email invitation.

**Acceptance rules:**

- Team invitations are accepted by a team owner or admin.
- Org invitations are accepted by an org owner or admin.
- Project invitations for visible team/org members can become direct project membership.
- Project invitations for non-visible people use a direct email invite and a later accept flow.

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

## 2026-06-18: Overdue Rows Use Negative Due Labels

Decision: overdue todos render due-date pills as negative day counts, such as `-7d`, and the entire row gets a red-tinted background.

Reason: late work should read as a schedule deficit at a glance. A row-level red tint makes overdue items visible while scanning long task lists, and the negative label keeps the due column compact.

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

## 2026-06-10: Section Header Style Is Uniform Across All Panels

Decision: every section or panel header in the app — task list, completed, inbox, and any future panel — must share the same visual style.

**Canonical header style:**

- `paddingVertical: 7`, `paddingRight: 16`
- `paddingLeft` aligned to where the entry item's text begins in that panel
- `backgroundColor: '#f3f4f6'`
- `borderBottomWidth: 1`, `borderBottomColor: '#d1d5db'`
- `fontSize: 11`, `fontWeight: '700'`, `color: '#9ca3af'`, `letterSpacing: 0.3`
- No `textTransform: 'uppercase'` — sentence case only (e.g. "Completed", not "COMPLETED")
- Include item count where relevant: "Task (8)", "Completed (11)", "Inbox (4)"

Reason: visual consistency across all list panels reduces cognitive load. Headers that differ in size, weight, case, or background make the app feel like a collection of features rather than a coherent product.

## 2026-06-10: Spacing and Padding — Three-Value System

Decision: all spacing in the app uses three values. No intermediate values may be introduced.

| Token   | Value | Used for                                                                    |
|---------|-------|-----------------------------------------------------------------------------|
| `micro` | 7px   | Vertical padding on every row item and section header                       |
| `macro` | 12px  | Gap between panes, outer board breathing room                               |
| `card`  | 16px  | Internal padding for modals and floating cards; right-edge padding on rows  |

**Personal view pane rules:**

- `todoBoard`: `padding: 12` all sides, `gap: 12` between panes
- Section headers (TASK, Completed, INBOX): `paddingVertical: 7`, `paddingRight: 16`
- All row items (todo rows, completed rows, inbox rows): `paddingVertical: 7`, `paddingRight: 16`
- Row left edge: determined by column structure (drag handle + checkbox), not by a padding value
- Modals and calendar cards: `padding: 16`

**Height consistency rule:** every row in every pane — active tasks, completed, inbox — must use `paddingVertical: 7`. Using any other vertical padding on a row is a bug.

Reason: inconsistent vertical padding is the primary cause of rows feeling different heights across panes. A single micro value (7px) applied uniformly makes all rows visually equal regardless of which pane they appear in.

## 2026-06-10: Typography Scale — 5 Sizes

Decision: the app uses exactly five font sizes. No other sizes may be introduced without updating this decision.

| Token | Size | Used for                                                           |
|-------|----- |--------------------------------------------------------------------|
| `xs`  | 11px | Metadata, pills, sort headers, note previews, tooltips, phase tags |
| `sm`  | 13px | Secondary labels, tab text, button labels, inbox metadata          |
| `md`  | 15px | Primary body text, todo item text, inputs                          |
| `lg`  | 18px | Modal titles, section headings, icons                              |
| `xl`  | 22px | Large display elements (calendar nav, workspace add button)        |

**Exceptions (do not expand):**

- 9px: avatar initials inside tiny (18px) avatar circles — cannot be raised without clipping
- 26px: auth screen "Welcome back!" hero heading and animal emoji picker cells — display-only, not UI chrome

Reason: the codebase had 14 distinct font sizes (9–26px) before this decision. That many sizes make the visual hierarchy incoherent and make UI reviews slow. Five sizes cover every UI layer with clear semantic meaning. All new styles must pick from the scale; never introduce an in-between value like 14 or 16.

**Implementation note — React Native sizing:**
React Native `fontSize` values are density-independent points, not literal screen pixels. They behave like `pt` on iOS and `dp` on Android, so they automatically scale across screen densities without using `rem` or `em`. Web best-practice guidance to use `rem`/`em` does not apply here; our integer values are already device-agnostic.

However, Dynamic Type (iOS) and font scaling (Android accessibility settings) are a separate concern. React Native respects the system font scale by default (`allowFontScaling` defaults to `true`). This means our `xs` (11px) items could become unreadably small if a user has reduced their system font size, or overflow their containers if enlarged. To do: audit small-text and fixed-width containers for scaling robustness before the first public release.

## 2026-06-10: Use Lucide for UI Icons

Decision: use `lucide-react-native` as the app's default icon library.

Reason: text glyphs such as arrows, checkmarks, drag handles, and delete markers render inconsistently across web, iOS, Android, and browsers. A real icon library gives consistent stroke weight, size, alignment, and accessibility behavior.

Implementation rules:

- Prefer Lucide icons for action buttons, toolbar controls, row actions, and status indicators.
- Keep icon-only controls paired with `accessibilityLabel`; add web hover tooltips when the icon meaning is not obvious.
- Avoid introducing new Unicode glyph controls unless they are temporary placeholders.
- Install Expo-compatible native dependencies with `npx expo install`; `react-native-svg` must stay compatible with Expo SDK 54.
- Icon color, size, and stroke width should come from the app's design tokens once those tokens exist.

## 2026-06-10: Todo Rows Show Kanban Stage

Decision: normal TASK list rows should show a compact Kanban-stage icon when the task belongs to a project workflow.

Reason: accepted project tasks can appear in a user's personal todo list, so the row must reveal whether the task is in Backlog, Doing, Review, or Done without forcing the user to open the project board.

Implementation rules:

- Resolve stage from `todos.workflow_status`: Backlog, Doing, Review, Done.
- Use Lucide icons, not text glyphs, for the stage indicator.
- Keep the indicator compact enough to preserve one-line task titles.
- Provide an accessibility label and a web hover tooltip with the stage name.
- Do not derive Kanban stage from `phase_id`; Plan and Kanban are separate views over the same task.

## 2026-06-11: Project Plan and Kanban Are Separate Axes

Decision: project Plan and Kanban workflow are separate fields.

Reason: Plan answers where a task belongs in the project structure. Kanban answers what is happening to the task right now. A task can belong to the Execution phase while still being Backlog, Doing, Review, or Done.

Implementation rules:

- Plan view groups and moves tasks by `phase_id`.
- Kanban view groups and moves tasks by `workflow_status`.
- Plan ordering uses `position`; Kanban ordering uses `workflow_position`.
- Moving a task in Plan must not change `workflow_status`.
- Moving a task in Kanban must not change `phase_id`.
- The Done Kanban lane sets `done = true` and `completed_at`; moving out of Done clears completion.
- Task rows can show both concepts: phase/context and workflow-state icon.

## 2026-06-16: Project Creator Is the Visible Owner

Decision: the user who creates a project is its owner, and the project view should surface that owner name in the Plan/Kanban header area.

Reason: project-scoped task assignment works better when ownership is explicit in the UI. The owner is already the canonical default assignee candidate for project work, so the project header should make that relationship visible instead of hiding it behind avatars only.

## 2026-06-10: Icon and Avatar Size Scale

Decision: icons and avatars use a fixed size scale. New UI should choose from these sizes instead of introducing one-off dimensions.

### Icon Sizes

| Token | Size | Used for |
|-------|------|----------|
| `icon.xs` | 11 | Icons inside tiny row controls, such as Inbox move-to-todos |
| `icon.sm` | 15 | Secondary row actions, such as Archive |
| `icon.md` | 18 | Standard buttons, dense toolbar controls, status indicators |
| `icon.lg` | 22 | Primary navigation actions and larger workspace controls |
| `icon.xl` | 26 | Display-only icons, avatar picker cells, auth/onboarding emphasis |

Icon containers are separate from icon glyph size:

| Token | Size | Used for |
|-------|------|----------|
| `iconButton.xs` | 18 x 18 | Dense row controls embedded in task rows |
| `iconButton.sm` | 28 x 28 | Secondary row actions and compact panel controls |
| `iconButton.md` | 36 x 36 | Standard toolbar buttons |
| `iconButton.lg` | 44 x 44 | Touch-primary controls and mobile-friendly actions |

Rules:

- Lucide `size` uses the icon token; the `Pressable` or visual container uses the icon-button token.
- Use `strokeWidth: 2.4` for ordinary icons and `2.75` for tiny icons that need extra optical weight.
- Icon-only controls must have `accessibilityLabel`.
- If an icon is inside a colored filled circle/square, the icon should normally be white.
- Do not use text glyphs for icons unless they are temporary placeholders awaiting Lucide replacement.

### Avatar Sizes

| Token | Size | Used for |
|-------|------|----------|
| `avatar.xs` | 18 x 18 | Inline row attribution, assignee/assigner markers |
| `avatar.sm` | 28 x 28 | Compact lists, dropdown rows, member chips |
| `avatar.md` | 36 x 36 | Header/account controls and normal profile surfaces |
| `avatar.lg` | 44 x 44 | Mobile-friendly profile/account controls |
| `avatar.xl` | 64 x 64 | Onboarding/profile editing and avatar picker previews |

Avatar text sizes:

| Avatar | Initials text |
|--------|---------------|
| `avatar.xs` | 9 |
| `avatar.sm` | 11 |
| `avatar.md` | 13 |
| `avatar.lg` | 15 |
| `avatar.xl` | 22 |

Rules:

- Avatars are circular, so `borderRadius` is always half the avatar size.
- Display priority remains: profile photo > animal emoji > initials fallback.
- Initials should be one or two characters, uppercase, centered, and never wrap.
- Do not use animal emoji at `avatar.xs`; use initials or photo because emoji becomes visually noisy at row scale.
- Row avatars should not change row height; choose `avatar.xs` or adjust the whole row size through density tokens.

## 2026-06-08: Calendar Integrations Are Future Optional User Integrations

Decision: Outlook Calendar and Google Calendar integration should be planned, but not required for core todo use.

Reason: calendar sync depends on due dates, reminders, and project milestones. Those concepts should be modeled before integrating provider APIs.

## 2026-06-11: Calendar Has Day, Week, and Month Views

Decision: the in-app Calendar supports three views: Day, Week, and Month.

Reason: Month view is good for scanning load, Week view is good for near-term planning, and Day view is good for execution. Day view includes a note area because daily planning often needs context that does not belong inside a single task.

Implementation rules:

- Calendar tasks are derived from todo `due_date`; do not duplicate calendar event state on todos.
- Month view remains the broad overview and opens a day when the user selects a date.
- Week view shows seven columns for quick comparison.
- Day view shows due tasks plus a note pane.
- Calendar notes are local `AsyncStorage` data for now. Do not sync them or treat them as team-visible until the product model decides whether day notes are personal, team, project, or organization scoped.
