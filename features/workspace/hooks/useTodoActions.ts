import { supabase } from '../../../lib/supabase';
import { parseTodoQuickCapture } from '../../../lib/quickCapture';
import type { Priority, Todo, WorkflowLaneKey } from '../../../lib/types';
import {
  scopedPositionUpdates,
  sortTodos,
  sortWorkflowTodos,
  todoSelectColumns,
  workflowStageForTodo,
} from '../../../lib/todos';
import type { FeedbackState } from './useFeedback';
import type { AuthState } from './useAuth';
import type { OrganizationsState } from './useOrganizations';
import type { ProjectsState } from './useProjects';
import type { TodosState } from './useTodos';
import type { TodoPickersState } from './useTodoPickers';

type TodoActionsDeps = Pick<
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
  > &
  Pick<
    ProjectsState,
    | 'isProject'
    | 'newTodoAssignee'
    | 'selectedProjectId'
  > &
  Pick<
    TodosState,
    | 'archivedTodos'
    | 'assignedToMe'
    | 'columnAssignees'
    | 'columnInputs'
    | 'input'
    | 'loadAssignedFromMe'
    | 'loadAssignedToMe'
    | 'newTodoProjectId'
    | 'quickCaptureProjects'
    | 'setArchivedTodos'
    | 'setAssignedFromMe'
    | 'setAssignedToMe'
    | 'setColumnAssignees'
    | 'setColumnInputs'
    | 'setCompletedPaneTab'
    | 'setInput'
    | 'setSortField'
    | 'setTodos'
    | 'sortField'
    | 'todos'
  > &
  Pick<
    TodoPickersState,
    | 'setAssigneeTodo'
    | 'setPhasePickerTodo'
    | 'setPriorityPicker'
    | 'setProjectPickerTodo'
    | 'setStatusPicker'
  >;

export function useTodoActions({
  setError,
  showToast,
  session,
  selectedTeamId,
  isProject,
  newTodoAssignee,
  selectedProjectId,
  archivedTodos,
  assignedToMe,
  columnAssignees,
  columnInputs,
  input,
  loadAssignedFromMe,
  loadAssignedToMe,
  newTodoProjectId,
  quickCaptureProjects,
  setArchivedTodos,
  setAssignedFromMe,
  setAssignedToMe,
  setColumnAssignees,
  setColumnInputs,
  setCompletedPaneTab,
  setInput,
  setSortField,
  setTodos,
  sortField,
  todos,
  setAssigneeTodo,
  setPhasePickerTodo,
  setPriorityPicker,
  setProjectPickerTodo,
  setStatusPicker,
}: TodoActionsDeps) {
  async function createTodoFromText(rawText: string) {
    const text = rawText.trim();
    if (!text || !session) return null;
    const quickCapture = parseTodoQuickCapture(text, quickCaptureProjects, { allowProjectRouting: !isProject });
    if (quickCapture.error) {
      setError(quickCapture.error);
      return null;
    }
    const targetProjectId = isProject ? selectedProjectId : quickCapture.project?.id ?? newTodoProjectId;
    const assignedTo = selectedTeamId && !isProject ? newTodoAssignee : null;
    const assignedAt = assignedTo ? new Date().toISOString() : null;

    const { data, error: insertError } = await supabase
      .from('todos')
      .insert({
        text: quickCapture.text,
        team_id: targetProjectId ? null : isProject ? null : selectedTeamId,
        project_id: targetProjectId,
        created_by: session.user.id,
        assigned_to: assignedTo,
        assigned_at: assignedAt,
        accepted_at: assignedTo === session.user.id ? assignedAt : null,
        priority: quickCapture.priority ?? 'normal',
        workflow_status: 'backlog',
      })
      .select(todoSelectColumns)
      .single();

    if (insertError) {
      setError(insertError.message);
      return null;
    }

    if (data) {
      setTodos((prev) => sortTodos([data as Todo, ...prev]));
    }
    loadAssignedFromMe();
    setError('');
    return data as Todo | null;
  }

  async function addTodo() {
    const createdTodo = await createTodoFromText(input);
    if (!createdTodo) return;
    setInput('');
  }

  async function addTodoToPhase(phaseId: string | null) {
    const key = phaseId ?? 'backlog';
    const text = (columnInputs[key] ?? '').trim();
    if (!text || !session || !selectedProjectId) return;
    const quickCapture = parseTodoQuickCapture(text, [], { allowProjectRouting: false });
    if (quickCapture.error) {
      setError(quickCapture.error);
      return;
    }

    const assigned_to = columnAssignees[key] ?? null;
    const assigned_at = assigned_to ? new Date().toISOString() : null;
    const accepted_at = assigned_to === session.user.id ? assigned_at : null;

    const { data, error: insertError } = await supabase
      .from('todos')
      .insert({
        text: quickCapture.text,
        project_id: selectedProjectId,
        phase_id: phaseId,
        created_by: session.user.id,
        assigned_to,
        assigned_at,
        accepted_at,
        priority: quickCapture.priority ?? 'normal',
        workflow_status: 'backlog',
      })
      .select(todoSelectColumns)
      .single();

    if (insertError) { setError(insertError.message); return; }
    if (data) setTodos((prev) => [data as Todo, ...prev]);
    loadAssignedFromMe();
    setColumnInputs((prev) => ({ ...prev, [key]: '' }));
    setColumnAssignees((prev) => ({ ...prev, [key]: null }));
    setError('');
  }

  async function toggle(id: string) {
    const todo = todos.find((item) => item.id === id);
    if (!todo) return;
    const done = !todo.done;
    const completed_at = done ? new Date().toISOString() : null;
    const workflow_status: WorkflowLaneKey = done
      ? 'done'
      : todo.workflow_status === 'done'
        ? 'backlog'
        : todo.workflow_status;

    const { error: updateError } = await supabase
      .from('todos')
      .update({ done, completed_at, workflow_status })
      .eq('id', id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setTodos((prev) => prev.map((item) => (item.id === id ? { ...item, done, completed_at, workflow_status } : item)));
    setAssignedFromMe((prev) => (done ? prev.filter((item) => item.id !== id) : prev));
    setError('');
  }

  async function moveInboxTodoToTodos(id: string) {
    const todo = assignedToMe.find((item) => item.id === id);
    if (!todo) return;
    const accepted_at = new Date().toISOString();
    const started_work_at = accepted_at;

    const { error: updateError } = await supabase
      .from('todos')
      .update({ accepted_at, started_work_at })
      .eq('id', id);
    if (updateError) { setError(updateError.message); return; }
    const acceptedTodo = { ...todo, accepted_at, started_work_at };
    setAssignedToMe((prev) => prev.filter((item) => item.id !== id));
    setTodos((prev) => sortTodos([acceptedTodo, ...prev.filter((item) => item.id !== id)]));
    showToast('Moved from Inbox to Todos');
    setError('');
  }

  async function setAssignee(todo: Todo, userId: string | null) {
    const assignedAt = userId ? new Date().toISOString() : null;
    const updates = {
      assigned_to: userId,
      assigned_at: assignedAt,
      accepted_at: userId === session?.user.id ? assignedAt : null,
    };
    const { error: updateError } = await supabase
      .from('todos')
      .update(updates)
      .eq('id', todo.id);

    if (updateError) { setError(updateError.message); return; }

    setTodos((prev) =>
      prev.map((item) => (item.id === todo.id ? { ...item, ...updates } : item))
    );
    loadAssignedToMe();
    loadAssignedFromMe();
    setAssigneeTodo(null);
    setError('');
  }

  async function setTodoPriority(todo: Todo, priority: Priority) {
    if (todo.priority === priority) {
      setPriorityPicker(null);
      return;
    }

    const { error: updateError } = await supabase
      .from('todos')
      .update({ priority })
      .eq('id', todo.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setTodos((prev) =>
      sortTodos(prev.map((item) => (item.id === todo.id ? { ...item, priority } : item)))
    );
    setAssignedToMe((prev) =>
      prev.map((item) => (item.id === todo.id ? { ...item, priority } : item))
    );
    setAssignedFromMe((prev) =>
      prev.map((item) => (item.id === todo.id ? { ...item, priority } : item))
    );
    setPriorityPicker(null);
    setError('');
  }

  async function setTodoWorkflowStage(todo: Todo, workflow_status: WorkflowLaneKey) {
    const currentStatus = workflowStageForTodo(todo);
    if (currentStatus === workflow_status) {
      setStatusPicker(null);
      return;
    }

    const done = workflow_status === 'done';
    const completed_at = done ? (todo.completed_at ?? new Date().toISOString()) : null;
    const started_work_at =
      workflow_status === 'doing' && !todo.started_work_at
        ? new Date().toISOString()
        : todo.started_work_at;
    const accepted_at =
      workflow_status === 'doing'
        ? (todo.accepted_at ?? started_work_at)
        : todo.accepted_at;
    const updates = {
      workflow_status,
      done,
      completed_at,
      started_work_at,
      accepted_at,
      workflow_position: null,
    };

    const { error: updateError } = await supabase
      .from('todos')
      .update(updates)
      .eq('id', todo.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setTodos((prev) =>
      sortTodos(prev.map((item) => (item.id === todo.id ? { ...item, ...updates } : item)))
    );
    setAssignedToMe((prev) =>
      prev.map((item) => (item.id === todo.id ? { ...item, ...updates } : item))
    );
    setAssignedFromMe((prev) =>
      done
        ? prev.filter((item) => item.id !== todo.id)
        : prev.map((item) => (item.id === todo.id ? { ...item, ...updates } : item))
    );
    setStatusPicker(null);
    setError('');
  }

  async function setDueDate(todo: Todo, due_date: string | null) {
    const { error: updateError } = await supabase
      .from('todos')
      .update({ due_date })
      .eq('id', todo.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setTodos((prev) =>
      prev.map((item) => (item.id === todo.id ? { ...item, due_date } : item))
    );
    setError('');
  }

  async function setTodoProject(todo: Todo, project_id: string | null) {
    const updates = {
      project_id,
      phase_id: null,
      workflow_status: 'backlog' as WorkflowLaneKey,
      workflow_position: null,
    };
    const { error: updateError } = await supabase
      .from('todos')
      .update(updates)
      .eq('id', todo.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setTodos((prev) =>
      sortTodos(prev.map((item) => (item.id === todo.id ? { ...item, ...updates } : item)))
    );
    setProjectPickerTodo(null);
    setError('');
  }

  async function editTodoText(id: string, text: string) {
    const { error: updateError } = await supabase
      .from('todos')
      .update({ text })
      .eq('id', id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setTodos((prev) => prev.map((item) => (item.id === id ? { ...item, text } : item)));
    setError('');
  }

  async function unarchiveTodo(id: string) {
    const { error: updateError } = await supabase
      .from('todos')
      .update({ archived_at: null })
      .eq('id', id);
    if (updateError) { setError(updateError.message); return; }
    const todo = archivedTodos.find((t) => t.id === id);
    setArchivedTodos((prev) => prev.filter((t) => t.id !== id));
    if (todo) setTodos((prev) => sortTodos([{ ...todo, archived_at: null }, ...prev]));
    setError('');
  }

  async function handleDragEnd(reorderedActive: Todo[]) {
    if (sortField) {
      setSortField(null);
    }
    const positionMap = scopedPositionUpdates(reorderedActive);

    setTodos((prev) =>
      sortTodos(
        prev.map((todo) =>
          positionMap.has(todo.id) ? { ...todo, position: positionMap.get(todo.id)! } : todo
        )
      )
    );

    const updates = Array.from(positionMap, ([id, position]) => ({ id, position }));
    const { error: batchError } = await supabase.rpc('batch_update_todo_positions', {
      updates,
    });

    if (batchError) {
      setError(batchError.message);
    }
  }

  async function completeTodoFromDrag(todo: Todo) {
    if (todo.done) return;
    const completed_at = new Date().toISOString();
    const workflow_status: WorkflowLaneKey = 'done';

    setTodos((prev) =>
      sortTodos(prev.map((item) =>
        item.id === todo.id ? { ...item, done: true, completed_at, workflow_status } : item
      ))
    );
    setCompletedPaneTab('completed');

    const { error: updateError } = await supabase
      .from('todos')
      .update({ done: true, completed_at, workflow_status })
      .eq('id', todo.id);

    if (updateError) {
      setError(updateError.message);
      setTodos((prev) => sortTodos(prev.map((item) => (item.id === todo.id ? todo : item))));
      return;
    }

    setError('');
  }

  async function movePlanTodo(todoId: string, targetPhaseId: string | null, overTodoId: string | null) {
    const movingTodo = todos.find((todo) => todo.id === todoId);
    if (!movingTodo || movingTodo.phase_id === targetPhaseId && overTodoId === todoId) return;

    const targetLaneKey = targetPhaseId ?? 'backlog';
    const sourceLaneKey = movingTodo.phase_id ?? 'backlog';
    const affectedLaneKeys = new Set([sourceLaneKey, targetLaneKey]);
    const nextTodos = todos.map((todo) =>
      todo.id === todoId ? { ...todo, phase_id: targetPhaseId } : todo
    );

    const targetItems = sortTodos(
      nextTodos.filter((todo) => todo.id !== todoId && !todo.done && todo.phase_id === targetPhaseId)
    );
    const movingNext = nextTodos.find((todo) => todo.id === todoId)!;
    const overIndex = overTodoId ? targetItems.findIndex((todo) => todo.id === overTodoId) : -1;
    const insertIndex = overIndex >= 0 ? overIndex : targetItems.length;
    targetItems.splice(insertIndex, 0, movingNext);

    const orderedByLane = new Map<string, Todo[]>();
    orderedByLane.set(targetLaneKey, targetItems);
    if (sourceLaneKey !== targetLaneKey) {
      orderedByLane.set(
        sourceLaneKey,
        sortTodos(nextTodos.filter((todo) => todo.id !== todoId && !todo.done && todo.phase_id === movingTodo.phase_id))
      );
    }

    const nextPositionById = new Map<string, number>();
    for (const items of orderedByLane.values()) {
      items.forEach((todo, index) => nextPositionById.set(todo.id, index));
    }

    setTodos((prev) =>
      sortTodos(
        prev.map((todo) => {
          if (todo.id === todoId) {
            return {
              ...todo,
              phase_id: targetPhaseId,
              position: nextPositionById.get(todo.id) ?? 0,
            };
          }
          const laneKey = todo.phase_id ?? 'backlog';
          if (affectedLaneKeys.has(laneKey) && nextPositionById.has(todo.id)) {
            return { ...todo, position: nextPositionById.get(todo.id)! };
          }
          return todo;
        })
      )
    );

    const positionUpdates = Array.from(nextPositionById, ([id, position]) => ({ id, position }));
    const { error: updateError } = await supabase
      .from('todos')
      .update({
        phase_id: targetPhaseId,
        position: null,
      })
      .eq('id', todoId);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    const { error: batchError } = await supabase.rpc('batch_update_todo_positions', {
      updates: positionUpdates,
    });
    if (batchError) setError(batchError.message);
    else setError('');
  }

  async function moveWorkflowTodo(todoId: string, targetWorkflowStatus: WorkflowLaneKey, overTodoId: string | null) {
    const movingTodo = todos.find((todo) => todo.id === todoId);
    if (!movingTodo || movingTodo.workflow_status === targetWorkflowStatus && overTodoId === todoId) return;

    const done = targetWorkflowStatus === 'done';
    const completed_at = done ? (movingTodo.completed_at ?? new Date().toISOString()) : null;
    const sourceLaneKey = workflowStageForTodo(movingTodo);
    const targetLaneKey = targetWorkflowStatus;
    const affectedLaneKeys = new Set([sourceLaneKey, targetLaneKey]);
    const nextTodos = todos.map((todo) =>
      todo.id === todoId ? { ...todo, workflow_status: targetWorkflowStatus, done, completed_at } : todo
    );

    const targetItems = sortWorkflowTodos(
      nextTodos.filter((todo) =>
        todo.id !== todoId && workflowStageForTodo(todo) === targetWorkflowStatus
      )
    );
    const movingNext = nextTodos.find((todo) => todo.id === todoId)!;
    const overIndex = overTodoId ? targetItems.findIndex((todo) => todo.id === overTodoId) : -1;
    const insertIndex = overIndex >= 0 ? overIndex : targetItems.length;
    targetItems.splice(insertIndex, 0, movingNext);

    const orderedByLane = new Map<string, Todo[]>();
    orderedByLane.set(targetLaneKey, targetItems);
    if (sourceLaneKey !== targetLaneKey) {
      orderedByLane.set(
        sourceLaneKey,
        sortWorkflowTodos(nextTodos.filter((todo) =>
          todo.id !== todoId && workflowStageForTodo(todo) === sourceLaneKey
        ))
      );
    }

    const nextWorkflowPositionById = new Map<string, number>();
    for (const items of orderedByLane.values()) {
      items.forEach((todo, index) => nextWorkflowPositionById.set(todo.id, index));
    }

    setTodos((prev) =>
      sortTodos(
        prev.map((todo) => {
          if (todo.id === todoId) {
            return {
              ...todo,
              workflow_status: targetWorkflowStatus,
              done,
              completed_at,
              workflow_position: nextWorkflowPositionById.get(todo.id) ?? 0,
            };
          }
          const laneKey = workflowStageForTodo(todo);
          if (affectedLaneKeys.has(laneKey) && nextWorkflowPositionById.has(todo.id)) {
            return { ...todo, workflow_position: nextWorkflowPositionById.get(todo.id)! };
          }
          return todo;
        })
      )
    );

    const positionUpdates = Array.from(nextWorkflowPositionById, ([id, position]) => ({ id, position }));
    const { error: updateError } = await supabase
      .from('todos')
      .update({
        workflow_status: targetWorkflowStatus,
        done,
        completed_at,
        workflow_position: null,
      })
      .eq('id', todoId);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    const { error: batchError } = await supabase.rpc('batch_update_todo_workflow_positions', {
      updates: positionUpdates,
    });
    if (batchError) setError(batchError.message);
    else setError('');
  }

  async function toggleMilestone(todo: Todo) {
    const is_milestone = !todo.is_milestone;
    const { error: updateError } = await supabase
      .from('todos')
      .update({ is_milestone })
      .eq('id', todo.id);
    if (updateError) { setError(updateError.message); return; }
    setTodos((prev) => prev.map((item) => (item.id === todo.id ? { ...item, is_milestone } : item)));
  }

  async function setTodoPhase(todo: Todo, phase_id: string | null) {
    const { error: updateError } = await supabase
      .from('todos')
      .update({ phase_id })
      .eq('id', todo.id);
    if (updateError) { setError(updateError.message); return; }
    setTodos((prev) => prev.map((item) => (item.id === todo.id ? { ...item, phase_id } : item)));
    setPhasePickerTodo(null);
  }

  return {
    addTodo,
    addTodoToPhase,
    toggle,
    moveInboxTodoToTodos,
    setTodoPriority,
    setTodoWorkflowStage,
    setDueDate,
    setTodoProject,
    unarchiveTodo,
    handleDragEnd,
    completeTodoFromDrag,
    movePlanTodo,
    moveWorkflowTodo,
    toggleMilestone,
    setTodoPhase,
  };
}

export type TodoActionsState = ReturnType<typeof useTodoActions>;
