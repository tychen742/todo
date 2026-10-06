import type { GestureResponderEvent } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { parseTodoQuickCapture } from '../../../lib/quickCapture';
import type { Todo } from '../../../lib/types';
import {
  fromDateTimeInputValue,
  parseDateValue,
  toDateTimeInputValue,
} from '../../../lib/calendar';
import { sortTodos, todoSelectColumns } from '../../../lib/todos';
import type { FeedbackState } from './useFeedback';
import type { AuthState } from './useAuth';
import type { OrganizationsState } from './useOrganizations';
import type { ProjectsState } from './useProjects';
import type { TodosState } from './useTodos';
import type { TodoPickersState } from './useTodoPickers';
import type { TodoActionsState } from './useTodoActions';

type TodoEditingDeps = Pick<
    FeedbackState,
    | 'setError'
    | 'showToast'
  > &
  Pick<
    AuthState,
    | 'session'
  > &
  Pick<
    OrganizationsState,
    | 'selectedTeamId'
    | 'setMembers'
  > &
  Pick<
    ProjectsState,
    | 'isProject'
    | 'projects'
    | 'selectedProjectId'
  > &
  Pick<
    TodosState,
    | 'loadAssignedFromMe'
    | 'loadAssignedToMe'
    | 'setArchivedTodos'
    | 'setAssignedFromMe'
    | 'setTodos'
    | 'todos'
  > &
  Pick<
    TodoPickersState,
    | 'assigneePickerDueDate'
    | 'assigneePickerPriority'
    | 'assigneePickerUserId'
    | 'assigneeTodo'
    | 'dueTodo'
    | 'editDraftAssignedTo'
    | 'editDraftDueDate'
    | 'editDraftEstimate'
    | 'editDraftNote'
    | 'editDraftPhaseId'
    | 'editDraftPriority'
    | 'editDraftProjectId'
    | 'editDraftScheduledStartAt'
    | 'editDraftText'
    | 'editTodo'
    | 'isCreatingTodo'
    | 'setAssigneePickerDueDate'
    | 'setAssigneePickerMonth'
    | 'setAssigneePickerPriority'
    | 'setAssigneePickerUserId'
    | 'setAssigneeTodo'
    | 'setCalendarMonth'
    | 'setDueTodo'
    | 'setEditDraftAssignedTo'
    | 'setEditDraftDueDate'
    | 'setEditDraftDueDateMonth'
    | 'setEditDraftEstimate'
    | 'setEditDraftNote'
    | 'setEditDraftPhaseId'
    | 'setEditDraftPriority'
    | 'setEditDraftProjectId'
    | 'setEditDraftScheduledStartAt'
    | 'setEditDraftText'
    | 'setEditTodo'
    | 'setIsCreatingTodo'
    | 'setPriorityPicker'
    | 'setProjectPickerTodo'
    | 'setStatusPicker'
  > &
  Pick<
    TodoActionsState,
    | 'setDueDate'
  >;

export function useTodoEditing({
  setError,
  showToast,
  session,
  selectedTeamId,
  setMembers,
  isProject,
  projects,
  selectedProjectId,
  loadAssignedFromMe,
  loadAssignedToMe,
  setArchivedTodos,
  setAssignedFromMe,
  setTodos,
  todos,
  assigneePickerDueDate,
  assigneePickerPriority,
  assigneePickerUserId,
  assigneeTodo,
  dueTodo,
  editDraftAssignedTo,
  editDraftDueDate,
  editDraftEstimate,
  editDraftNote,
  editDraftPhaseId,
  editDraftPriority,
  editDraftProjectId,
  editDraftScheduledStartAt,
  editDraftText,
  editTodo,
  isCreatingTodo,
  setAssigneePickerDueDate,
  setAssigneePickerMonth,
  setAssigneePickerPriority,
  setAssigneePickerUserId,
  setAssigneeTodo,
  setCalendarMonth,
  setDueTodo,
  setEditDraftAssignedTo,
  setEditDraftDueDate,
  setEditDraftDueDateMonth,
  setEditDraftEstimate,
  setEditDraftNote,
  setEditDraftPhaseId,
  setEditDraftPriority,
  setEditDraftProjectId,
  setEditDraftScheduledStartAt,
  setEditDraftText,
  setEditTodo,
  setIsCreatingTodo,
  setPriorityPicker,
  setProjectPickerTodo,
  setStatusPicker,
  setDueDate,
}: TodoEditingDeps) {
  function openAssigneePicker(todo: Todo) {
    const due = parseDateValue(todo.due_date);
    setAssigneeTodo(todo);
    setAssigneePickerUserId(todo.assigned_to);
    setAssigneePickerDueDate(todo.due_date);
    setAssigneePickerPriority(todo.priority);
    setAssigneePickerMonth(due ? new Date(due.getFullYear(), due.getMonth(), 1) : new Date());
  }

  function closeAssigneePicker() {
    setAssigneeTodo(null);
    setAssigneePickerUserId(null);
    setAssigneePickerDueDate(null);
    setAssigneePickerPriority('normal');
  }

  async function confirmAssignment() {
    if (!assigneeTodo) return;
    const assigneeChanged = assigneePickerUserId !== assigneeTodo.assigned_to;
    const assignedAt = assigneeChanged
      ? (assigneePickerUserId ? new Date().toISOString() : null)
      : assigneeTodo.assigned_at;
    const updates = {
      assigned_to: assigneePickerUserId,
      due_date: assigneePickerDueDate,
      priority: assigneePickerPriority,
      assigned_at: assignedAt,
      accepted_at: assigneeChanged
        ? (assigneePickerUserId === session?.user.id ? assignedAt : null)
        : assigneeTodo.accepted_at,
    };
    const { error: updateError } = await supabase.from('todos').update(updates).eq('id', assigneeTodo.id);
    if (updateError) { setError(updateError.message); return; }
    setTodos(prev => prev.map(t => t.id === assigneeTodo!.id ? { ...t, ...updates } : t));
    closeAssigneePicker();
    loadAssignedToMe();
    loadAssignedFromMe();
    setError('');
  }

  function openPriorityPicker(todo: Todo, event: GestureResponderEvent) {
    setPriorityPicker({
      todo,
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
    });
  }

  function openStatusPicker(todo: Todo, event: GestureResponderEvent) {
    setStatusPicker({
      todo,
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
    });
  }

  function openProjectPicker(todo: Todo) {
    if (isProject) return;
    setProjectPickerTodo(todo);
  }

  function openDueCalendar(todo: Todo) {
    const dueDate = parseDateValue(todo.due_date) ?? new Date();
    setDueTodo(todo);
    setCalendarMonth(new Date(dueDate.getFullYear(), dueDate.getMonth(), 1));
  }

  function closeDueCalendar() {
    setDueTodo(null);
  }

  function moveCalendarMonth(offset: number) {
    setCalendarMonth(
      (currentMonth) => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1)
    );
  }

  async function chooseDueDate(due_date: string | null) {
    if (!dueTodo) return;
    await setDueDate(dueTodo, due_date);
    closeDueCalendar();
  }

  async function openEditModal(todo: Todo) {
    setEditTodo(todo);
    setEditDraftText(todo.text);
    setEditDraftNote(todo.note ?? '');
    setEditDraftPhaseId(todo.phase_id ?? null);
    setEditDraftProjectId(todo.project_id ?? null);
    setEditDraftAssignedTo(todo.assigned_to ?? null);
    setEditDraftDueDate(todo.due_date);
    setEditDraftPriority(todo.priority);
    setEditDraftEstimate(todo.estimate ?? '');
    setEditDraftScheduledStartAt(toDateTimeInputValue(todo.scheduled_start_at));
    const due = parseDateValue(todo.due_date);
    setEditDraftDueDateMonth(due ? new Date(due.getFullYear(), due.getMonth(), 1) : new Date());

    // Load members for this todo's project/team if not already in that context.
    const needsProjectMembers = todo.project_id && todo.project_id !== selectedProjectId;
    const needsTeamMembers = !todo.project_id && todo.team_id && todo.team_id !== selectedTeamId;
    if (needsProjectMembers || needsTeamMembers) {
      const roleMap = new Map<string, string>();
      if (todo.project_id) {
        const { data: pmData } = await supabase
          .from('project_members').select('user_id, role').eq('project_id', todo.project_id);
        (pmData ?? []).forEach((m) => roleMap.set(m.user_id, m.role));
        const proj = projects.find((p) => p.id === todo.project_id);
        if (proj?.team_id) {
          const { data: tmData } = await supabase
            .from('team_members').select('user_id, role').eq('team_id', proj.team_id);
          (tmData ?? []).forEach((m) => { if (!roleMap.has(m.user_id)) roleMap.set(m.user_id, m.role); });
        }
      } else if (todo.team_id) {
        const { data: tmData } = await supabase
          .from('team_members').select('user_id, role').eq('team_id', todo.team_id);
        (tmData ?? []).forEach((m) => roleMap.set(m.user_id, m.role));
      }
      const ids = [...roleMap.keys()];
      if (ids.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles').select('id, email, display_name, avatar_url').in('id', ids);
        const profilesById = new Map((profileData ?? []).map((p) => [p.id, p]));
        setMembers(ids.filter((id) => profilesById.has(id)).map((id) => ({
          user_id: id,
          role: roleMap.get(id) ?? 'member',
          email: profilesById.get(id)!.email,
          display_name: profilesById.get(id)!.display_name ?? null,
          avatar_url: profilesById.get(id)!.avatar_url ?? null,
        })));
      }
    }
  }

  function closeEditModal() {
    setEditTodo(null);
    setIsCreatingTodo(false);
  }

  async function saveEditModal() {
    if (!editTodo) return;
    const parsedText = parseTodoQuickCapture(editDraftText.trim(), [], { allowProjectRouting: false });
    if (parsedText.error) {
      setError(parsedText.error);
      return;
    }
    const text = parsedText.text.trim();
    if (!text) return;

    const note = editDraftNote.trim() || null;
    const project_id = isProject ? editTodo.project_id : editDraftProjectId;
    const projectChanged = project_id !== editTodo.project_id;
    const phase_id = isProject
      ? editDraftPhaseId
      : projectChanged ? null : editTodo.phase_id;
    const estimate = editDraftEstimate.trim() || null;
    const scheduledStartAt = fromDateTimeInputValue(editDraftScheduledStartAt);
    if (scheduledStartAt === undefined) {
      setError('Scheduled start must be a valid date/time.');
      return;
    }

    const assigneeChanged = editDraftAssignedTo !== editTodo.assigned_to;
    const assigned_to = editDraftAssignedTo;
    const assigned_at = assigneeChanged
      ? (assigned_to ? new Date().toISOString() : null)
      : editTodo.assigned_at;
    const accepted_at = assigneeChanged
      ? (assigned_to === session?.user.id ? assigned_at : null)
      : editTodo.accepted_at;
    const priority = parsedText.priority ?? editDraftPriority;

    if (isCreatingTodo) {
      if (!session) return;
      const createdAssignedAt = assigned_to ? new Date().toISOString() : null;
      const { data, error: insertError } = await supabase
        .from('todos')
        .insert({
          text,
          note,
          phase_id,
          project_id,
          team_id: project_id ? null : editTodo.team_id,
          created_by: session.user.id,
          due_date: editDraftDueDate,
          priority,
          estimate,
          scheduled_start_at: scheduledStartAt,
          assigned_to,
          assigned_at: createdAssignedAt,
          accepted_at: assigned_to === session.user.id ? createdAssignedAt : null,
          workflow_status: 'backlog',
        })
        .select(todoSelectColumns)
        .single();
      if (insertError) {
        setError(insertError.message);
        return;
      }
      if (data) setTodos((prev) => sortTodos([data as Todo, ...prev]));
      loadAssignedToMe();
      loadAssignedFromMe();
      closeEditModal();
      setError('');
      showToast('Todo created from map node.');
      return;
    }

    const { error: updateError } = await supabase
      .from('todos')
      .update({ text, note, phase_id, project_id, due_date: editDraftDueDate, priority, estimate, scheduled_start_at: scheduledStartAt, assigned_to, assigned_at, accepted_at })
      .eq('id', editTodo.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setTodos((prev) =>
      prev.map((item) =>
        item.id === editTodo.id
          ? {
              ...item,
              text,
              note,
              phase_id: phase_id ?? null,
              project_id: project_id ?? null,
              due_date: editDraftDueDate,
              priority,
              estimate,
              scheduled_start_at: scheduledStartAt,
              assigned_to,
              assigned_at: assigned_at ?? null,
              accepted_at: accepted_at ?? null,
            }
          : item
      )
    );
    loadAssignedToMe();
    loadAssignedFromMe();
    closeEditModal();
    setError('');
  }

  async function archiveTodo(id: string) {
    const archived_at = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('todos')
      .update({ archived_at })
      .eq('id', id);
    if (updateError) { setError(updateError.message); return; }
    const todo = todos.find((t) => t.id === id);
    setTodos((prev) => prev.filter((t) => t.id !== id));
    setAssignedFromMe((prev) => prev.filter((t) => t.id !== id));
    if (todo) setArchivedTodos((prev) => [{ ...todo, archived_at }, ...prev]);
    if (editTodo?.id === id) closeEditModal();
    setError('');
  }

  return {
    openAssigneePicker,
    closeAssigneePicker,
    confirmAssignment,
    openPriorityPicker,
    openStatusPicker,
    openProjectPicker,
    openDueCalendar,
    closeDueCalendar,
    moveCalendarMonth,
    chooseDueDate,
    openEditModal,
    closeEditModal,
    saveEditModal,
    archiveTodo,
  };
}

export type TodoEditingState = ReturnType<typeof useTodoEditing>;
