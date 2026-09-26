import type { Priority, Todo, WorkflowLaneKey } from './types';

export const priorities: Priority[] = ['low', 'normal', 'high', 'urgent'];

export const priorityRank: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export const workflowSortRank: Record<WorkflowLaneKey, number> = {
  doing: 0,
  review: 1,
  backlog: 2,
  done: 3,
};

export const workflowStages: WorkflowLaneKey[] = ['backlog', 'doing', 'review', 'done'];

export const workflowStageColors: Record<WorkflowLaneKey, string> = {
  backlog: '#9ca3af',
  doing: '#6366f1',
  review: '#f59e0b',
  done: '#16a34a',
};

export const priorityColors: Record<Priority, string> = {
  low: '#9ca3af',
  normal: '#60a5fa',
  high: '#f59e0b',
  urgent: '#ef4444',
};

export const defaultWorkflowColumnLabels: Record<WorkflowLaneKey, string> = {
  backlog: 'Backlog',
  doing: 'Doing',
  review: 'Review',
  done: 'Done',
};

export const todoSelectColumns = 'id, text, done, scheduled_start_at, started_work_at, assigned_to, created_by, priority, due_date, note, created_at, assigned_at, accepted_at, completed_at, archived_at, position, workflow_position, is_milestone, project_id, phase_id, workflow_status, team_id, estimate';

export function workflowStageForTodo(todo: Pick<Todo, 'done' | 'workflow_status'>): WorkflowLaneKey {
  if (todo.done) return 'done';
  return todo.workflow_status;
}

export function sortTodos(items: Todo[]) {
  return [...items].sort((a, b) => {
    if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
    if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
    if (a.position !== null && b.position !== null) return a.position - b.position;
    if (a.position !== null) return -1;
    if (b.position !== null) return 1;
    const priorityDelta = priorityRank[a.priority] - priorityRank[b.priority];
    if (priorityDelta !== 0) return priorityDelta;
    return Date.parse(b.created_at) - Date.parse(a.created_at);
  });
}

export function sortWorkflowTodos(items: Todo[]) {
  return [...items].sort((a, b) => {
    if (a.workflow_position !== null && b.workflow_position !== null) return a.workflow_position - b.workflow_position;
    if (a.workflow_position !== null) return -1;
    if (b.workflow_position !== null) return 1;
    return sortTodos([a, b])[0].id === a.id ? -1 : 1;
  });
}

export function positionScopeKey(todo: Todo) {
  if (todo.project_id) return `project:${todo.project_id}:phase:${todo.phase_id ?? 'backlog'}`;
  if (todo.team_id) return `team:${todo.team_id}`;
  return `personal:${todo.created_by ?? 'unknown'}`;
}

export function scopedPositionUpdates(orderedTodos: Todo[]) {
  const nextPositionById = new Map<string, number>();
  const nextIndexByScope = new Map<string, number>();

  for (const todo of orderedTodos) {
    const scopeKey = positionScopeKey(todo);
    const nextPosition = nextIndexByScope.get(scopeKey) ?? 0;
    nextPositionById.set(todo.id, nextPosition);
    nextIndexByScope.set(scopeKey, nextPosition + 1);
  }

  return nextPositionById;
}
