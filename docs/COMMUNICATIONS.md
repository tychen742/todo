# Communications

Communications covers everything that connects people around work: presence, notifications, task discussion, and messaging. It starts narrow (status and assignment notifications) and expands toward team chat and direct messaging as team workflows mature.

## User Status (Presence)

Every user has a short free-text status ("What are you up to?") visible to their teammates. It is set from the account dropdown in the dashboard header.

**Behavior:**

- Status is stored on the user's profile (`profiles.status`).
- It appears in the account dropdown as a click-to-edit field. Clicking it opens an inline text input; pressing Enter or clicking away saves it.
- Status is shown to other team members when viewing team member lists, assignment pickers, and eventually team pages and chat.
- It is intentionally short (80 char max) — a signal, not a message.

**Purpose:** lightweight presence awareness. Teammates can see at a glance whether someone is heads-down, in a meeting, out, or available without opening a chat thread.

**Future:** status could auto-expire after a set time (e.g., "In a meeting until 3pm"), integrate with calendar presence, or display alongside avatars throughout the UI.

## Assignment Notifications

When a todo is assigned to a team member, they receive a notification. Currently this appears as an item in their Inbox tab. The full notification pipeline (email, push, in-app badge) is planned.

See `docs/DECISIONS.md` → Task Assignment Lifecycle for the full accept/decline lifecycle.

## Planned: Task Thread (Comments)

Every task will have a comment thread (`task_comments` table, already in the schema). Comments are scoped strictly to the task — not a general chat. They support negotiation, clarification, and status updates between the assigner and assignee at any lifecycle stage, including before acceptance.

## Planned: Team Chat

Lightweight team-level chat for coordination that doesn't belong on a specific task. Not a Slack replacement — scoped to team context and kept secondary to todo and project workflows.

## Planned: Direct Messages

Personal 1:1 messaging between users within the same organization or team.

## Planned: Notification Delivery Channels

- In-app (current): Inbox tab for assignments, toast messages for actions.
- Email: for assignment notifications and declines, especially for Collaborators who may not use the app regularly.
- Push: mobile push via Expo notifications for time-sensitive signals.

## Design Principles

- Communications features are secondary to task and project workflows — they support work, not replace it.
- Task threads stay scoped to a task; team chat stays scoped to a team. Nothing is a general inbox.
- Presence (status) is a lightweight signal, not a productivity metric or surveillance tool.
- Notification volume should stay low by default. Users opt into more, not opt out of noise.
