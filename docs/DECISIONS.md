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

## 2026-06-08: Calendar Integrations Are Future Optional User Integrations

Decision: Outlook Calendar and Google Calendar integration should be planned, but not required for core todo use.

Reason: calendar sync depends on due dates, reminders, and project milestones. Those concepts should be modeled before integrating provider APIs.
