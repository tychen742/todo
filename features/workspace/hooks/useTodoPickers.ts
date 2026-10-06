import { useMemo, useState } from 'react';
import type { Member, Priority, Todo } from '../../../lib/types';
import { buildCalendarDays } from '../../../lib/calendar';
import { priorityPopoverWidth, priorityPopoverHeight } from '../constants';
import type { PreferencesState } from './usePreferences';
import type { AuthState } from './useAuth';
import type { ProfileState } from './useProfile';
import type { OrganizationsState } from './useOrganizations';

type TodoPickersDeps = Pick<
    PreferencesState,
    | 'height'
    | 'width'
  > &
  Pick<
    AuthState,
    | 'session'
  > &
  Pick<
    ProfileState,
    | 'accountDisplayName'
    | 'profile'
  > &
  Pick<
    OrganizationsState,
    | 'members'
  >;

export function useTodoPickers({
  height,
  width,
  session,
  accountDisplayName,
  profile,
  members,
}: TodoPickersDeps) {
  const [phasePickerTodo, setPhasePickerTodo] = useState<Todo | null>(null);
  const [projectPickerTodo, setProjectPickerTodo] = useState<Todo | null>(null);
  const [editDraftPhaseId, setEditDraftPhaseId] = useState<string | null>(null);
  const [assigneeTodo, setAssigneeTodo] = useState<Todo | null>(null);
  const [assigneePickerUserId, setAssigneePickerUserId] = useState<string | null>(null);
  const [assigneePickerDueDate, setAssigneePickerDueDate] = useState<string | null>(null);
  const [assigneePickerPriority, setAssigneePickerPriority] = useState<Priority>('normal');
  const [assigneePickerMonth, setAssigneePickerMonth] = useState(() => new Date());
  const [dueTodo, setDueTodo] = useState<Todo | null>(null);
  const [priorityPicker, setPriorityPicker] = useState<{ todo: Todo; x: number; y: number } | null>(null);
  const [statusPicker, setStatusPicker] = useState<{ todo: Todo; x: number; y: number } | null>(null);
  const [editTodo, setEditTodo] = useState<Todo | null>(null);
  // True when the edit modal holds an unsaved draft (e.g. from a map node); Save inserts instead of updating.
  const [isCreatingTodo, setIsCreatingTodo] = useState(false);
  const [editDraftText, setEditDraftText] = useState('');
  const [editDraftNote, setEditDraftNote] = useState('');
  const [editDraftDueDate, setEditDraftDueDate] = useState<string | null>(null);
  const [editDraftDueDateMonth, setEditDraftDueDateMonth] = useState(() => new Date());
  const [editDraftPriority, setEditDraftPriority] = useState<Priority>('normal');
  const [editDraftEstimate, setEditDraftEstimate] = useState('');
  const [editDraftScheduledStartAt, setEditDraftScheduledStartAt] = useState('');
  const [editDraftProjectId, setEditDraftProjectId] = useState<string | null>(null);
  const [editDraftAssignedTo, setEditDraftAssignedTo] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);
  const assigneePickerCalendarDays = useMemo(() => buildCalendarDays(assigneePickerMonth), [assigneePickerMonth]);
  const editDraftCalendarDays = useMemo(() => buildCalendarDays(editDraftDueDateMonth), [editDraftDueDateMonth]);
  const priorityPopoverPosition = priorityPicker
    ? {
        left: Math.min(
          Math.max(8, priorityPicker.x - priorityPopoverWidth / 2),
          Math.max(8, width - priorityPopoverWidth - 8)
        ),
        top: Math.min(
          Math.max(8, priorityPicker.y + 10),
          Math.max(8, height - priorityPopoverHeight - 8)
        ),
      }
    : null;
  const statusPopoverPosition = statusPicker
    ? {
        left: Math.min(
          Math.max(8, statusPicker.x - priorityPopoverWidth / 2),
          Math.max(8, width - priorityPopoverWidth - 8)
        ),
        top: Math.min(
          Math.max(8, statusPicker.y + 10),
          Math.max(8, height - priorityPopoverHeight - 8)
        ),
      }
    : null;
  const editAssigneeOptions = useMemo<Member[]>(() => {
    const options = [...members];
    const isPersonalTodo = !editTodo?.team_id && !editTodo?.project_id;
    if (session && isPersonalTodo && !options.some((member) => member.user_id === session.user.id)) {
      options.unshift({
        user_id: session.user.id,
        email: profile?.email ?? session.user.email ?? '',
        display_name: profile?.display_name ?? accountDisplayName,
        avatar_url: profile?.avatar_url ?? null,
        role: 'member',
      });
    }
    return options;
  }, [accountDisplayName, editTodo?.project_id, editTodo?.team_id, members, profile, session]);

  return {
    phasePickerTodo,
    setPhasePickerTodo,
    projectPickerTodo,
    setProjectPickerTodo,
    editDraftPhaseId,
    setEditDraftPhaseId,
    assigneeTodo,
    setAssigneeTodo,
    assigneePickerUserId,
    setAssigneePickerUserId,
    assigneePickerDueDate,
    setAssigneePickerDueDate,
    assigneePickerPriority,
    setAssigneePickerPriority,
    assigneePickerMonth,
    setAssigneePickerMonth,
    dueTodo,
    setDueTodo,
    priorityPicker,
    setPriorityPicker,
    statusPicker,
    setStatusPicker,
    editTodo,
    setEditTodo,
    isCreatingTodo,
    setIsCreatingTodo,
    editDraftText,
    setEditDraftText,
    editDraftNote,
    setEditDraftNote,
    editDraftDueDate,
    setEditDraftDueDate,
    editDraftDueDateMonth,
    setEditDraftDueDateMonth,
    editDraftPriority,
    setEditDraftPriority,
    editDraftEstimate,
    setEditDraftEstimate,
    editDraftScheduledStartAt,
    setEditDraftScheduledStartAt,
    editDraftProjectId,
    setEditDraftProjectId,
    editDraftAssignedTo,
    setEditDraftAssignedTo,
    calendarMonth,
    setCalendarMonth,
    calendarDays,
    assigneePickerCalendarDays,
    editDraftCalendarDays,
    priorityPopoverPosition,
    statusPopoverPosition,
    editAssigneeOptions,
  };
}

export type TodoPickersState = ReturnType<typeof useTodoPickers>;
