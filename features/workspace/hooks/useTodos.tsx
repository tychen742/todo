import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, TextInput, Pressable, Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
import { pickAvatarColor } from '../../../lib/avatar';
import type { Project, SortField, Todo, WorkflowLaneKey } from '../../../lib/types';
import {
  priorityRank,
  sortTodos,
  todoSelectColumns,
  workflowSortRank,
  workflowStageForTodo,
} from '../../../lib/todos';
import { profileDisplayName } from '../../../lib/display';
import { styles } from '../styles';
import type { FeedbackState } from './useFeedback';
import type { AuthState } from './useAuth';
import type { ProfileState } from './useProfile';
import type { OrganizationsState } from './useOrganizations';
import type { ProjectsState } from './useProjects';

type TodosDeps = Pick<
    FeedbackState,
    | 'setError'
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
    | 'memberById'
    | 'selectedTeamId'
    | 'teams'
  > &
  Pick<
    ProjectsState,
    | 'activeProjects'
    | 'isPersonal'
    | 'isProject'
    | 'loadMembers'
    | 'projectAvatarFor'
    | 'projectById'
    | 'projects'
    | 'selectedProject'
    | 'selectedProjectId'
    | 'workflowColumnLabels'
  >;

export function useTodos({
  setError,
  session,
  accountDisplayName,
  profile,
  memberById,
  selectedTeamId,
  teams,
  activeProjects,
  isPersonal,
  isProject,
  loadMembers,
  projectAvatarFor,
  projectById,
  projects,
  selectedProject,
  selectedProjectId,
  workflowColumnLabels,
}: TodosDeps) {
  const [columnInputs, setColumnInputs] = useState<Record<string, string>>({});
  const [columnAssignees, setColumnAssignees] = useState<Record<string, string | null>>({});
  const [backlogInputVisible, setBacklogInputVisible] = useState(false);
  const [assignedToMe, setAssignedToMe] = useState<Todo[]>([]);
  const [assignedFromMe, setAssignedFromMe] = useState<Todo[]>([]);
  const [newTodoProjectId] = useState<string | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');
  const [quickCaptureFocused, setQuickCaptureFocused] = useState(false);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [hoveredSortField, setHoveredSortField] = useState<SortField | null>(null);
  const [projectFilter, setProjectFilter] = useState<'all' | 'none' | string>('all');
  const [projectFilterPickerVisible, setProjectFilterPickerVisible] = useState(false);
  const [hoveredInboxTodoId, setHoveredInboxTodoId] = useState<string | null>(null);
  const [hoveredInboxActionId, setHoveredInboxActionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadedTodoScopes, setLoadedTodoScopes] = useState<Record<string, true>>({});
  const loadedTodoScopesRef = useRef<Record<string, true>>({});
  const [archivedTodos, setArchivedTodos] = useState<Todo[]>([]);
  const [completedPaneTab, setCompletedPaneTab] = useState<'completed' | 'deleted'>('completed');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      } else if (key === 'escape' && searchQuery) {
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);
  const projectFilterProjects = useMemo(
    () => projects
      .filter((project) => !project.archived_at)
      .filter((project) => selectedTeamId
        ? project.team_id === selectedTeamId
        : project.team_id === null && project.created_by === session?.user.id
      )
      .sort((a, b) => a.name.localeCompare(b.name)),
    [projects, selectedTeamId, session?.user.id]
  );
  const todoScopeKey = selectedProjectId
    ? `project:${selectedProjectId}`
    : selectedTeamId
      ? `team:${selectedTeamId}`
      : `personal:${session?.user.id ?? 'anonymous'}`;
  const hasLoadedCurrentTodos = loadedTodoScopes[todoScopeKey] === true;

  useEffect(() => {
    setProjectFilter('all');
    setProjectFilterPickerVisible(false);
  }, [selectedProjectId, selectedTeamId]);

  function todoKanbanStage(todo: Todo): { key: WorkflowLaneKey; label: string } | undefined {
    if (!todo.project_id && !isProject) return undefined;
    const key = workflowStageForTodo(todo);
    return { key, label: workflowColumnLabels[key] };
  }
  function todoProjectAvatar(todo: Todo): { label: string; initials: string; color: string } | undefined {
    const project = todo.project_id
      ? projects.find((item) => item.id === todo.project_id)
      : selectedProject;
    if (!project) return undefined;
    return projectAvatarFor(project);
  }
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const searching = normalizedSearchQuery.length > 0;
  const textMatchesSearch = useCallback((values: (string | null | undefined)[]) => {
    if (!normalizedSearchQuery) return true;
    return values.some((value) => value?.toLowerCase().includes(normalizedSearchQuery));
  }, [normalizedSearchQuery]);
  const searchMatchesTodo = useCallback((todo: Todo) => {
    const project = todo.project_id ? projectById.get(todo.project_id) : selectedProject;
    const assignee = todo.assigned_to ? memberById.get(todo.assigned_to) : null;
    const creator = todo.created_by ? memberById.get(todo.created_by) : null;
    const workflowKey = workflowStageForTodo(todo);
    return textMatchesSearch([
      todo.text,
      todo.note,
      todo.priority,
      todo.due_date,
      todo.estimate,
      workflowKey,
      workflowColumnLabels[workflowKey],
      project?.name,
      assignee?.email,
      assignee ? profileDisplayName(assignee) : null,
      creator?.email,
      creator ? profileDisplayName(creator) : null,
    ]);
  }, [memberById, projectById, selectedProject, textMatchesSearch, workflowColumnLabels]);
  const orderBySearchMatch = useCallback(<T,>(items: T[], matches: (item: T) => boolean) => {
    if (!searching) return items;
    const matched: T[] = [];
    const unmatched: T[] = [];
    items.forEach((item) => {
      if (matches(item)) matched.push(item);
      else unmatched.push(item);
    });
    return [...matched, ...unmatched];
  }, [searching]);
  const active = useMemo(() => {
    const items = todos.filter((todo) =>
      !todo.done && (
        projectFilter === 'all' ||
        (projectFilter === 'none' ? todo.project_id === null : todo.project_id === projectFilter)
      )
    );
    if (!sortField) return orderBySearchMatch(items, searchMatchesTodo);
    const projectNameForTodo = (todo: Todo) => {
      const project = todo.project_id
        ? projects.find((item) => item.id === todo.project_id)
        : selectedProject;
      return project?.name.toLowerCase() ?? '';
    };
    const statusForTodo = (todo: Todo): WorkflowLaneKey => {
      if (todo.done) return 'done';
      if (todo.project_id || isProject) return workflowStageForTodo(todo);
      if (todo.started_work_at) return 'doing';
      return workflowStageForTodo(todo);
    };
    const assignedByNameForTodo = (todo: Todo) => {
      if (!todo.assigned_to || !todo.created_by) return '';
      if (todo.created_by === session?.user.id) return accountDisplayName.toLowerCase();
      const creator = memberById.get(todo.created_by);
      return creator ? profileDisplayName(creator).toLowerCase() : '';
    };
    const ageTimestampForTodo = (todo: Todo) => Date.parse(todo.assigned_at ?? todo.created_at);
    const sortedItems = [...items].sort((a, b) => {
      let delta = 0;
      if (sortField === 'text') {
        const priorityDelta = priorityRank[a.priority] - priorityRank[b.priority];
        if (priorityDelta !== 0) return priorityDelta;
        delta = a.text.localeCompare(b.text);
        return sortDir === 'asc' ? delta : -delta;
      } else if (sortField === 'priority') {
        delta = priorityRank[a.priority] - priorityRank[b.priority];
      } else if (sortField === 'status') {
        delta = workflowSortRank[statusForTodo(a)] - workflowSortRank[statusForTodo(b)];
      } else if (sortField === 'project') {
        const aProjectName = projectNameForTodo(a);
        const bProjectName = projectNameForTodo(b);
        if (!aProjectName && bProjectName) delta = 1;
        else if (aProjectName && !bProjectName) delta = -1;
        else delta = aProjectName.localeCompare(bProjectName);
      } else if (sortField === 'assigned_by') {
        const aAssignedBy = assignedByNameForTodo(a);
        const bAssignedBy = assignedByNameForTodo(b);
        if (!aAssignedBy && bAssignedBy) delta = 1;
        else if (aAssignedBy && !bAssignedBy) delta = -1;
        else delta = aAssignedBy.localeCompare(bAssignedBy);
      } else if (sortField === 'age') {
        delta = ageTimestampForTodo(a) - ageTimestampForTodo(b);
      } else if (sortField === 'due_date') {
        delta =
          (a.due_date ? Date.parse(a.due_date) : Infinity) -
          (b.due_date ? Date.parse(b.due_date) : Infinity);
      } else {
        delta = Date.parse(a.created_at) - Date.parse(b.created_at);
      }
      if (delta === 0 && sortField !== 'priority') {
        delta = priorityRank[a.priority] - priorityRank[b.priority];
      }
      if (delta === 0) delta = a.text.localeCompare(b.text);
      return sortDir === 'asc' ? delta : -delta;
    });
    return orderBySearchMatch(sortedItems, searchMatchesTodo);
  }, [todos, projectFilter, sortField, sortDir, projects, selectedProject, isProject, session?.user.id, accountDisplayName, memberById, orderBySearchMatch, searchMatchesTodo]);

  const done = useMemo(
    () => orderBySearchMatch(todos.filter((t) => t.done), searchMatchesTodo),
    [orderBySearchMatch, searchMatchesTodo, todos]
  );
  const orderedArchivedTodos = useMemo(
    () => orderBySearchMatch(archivedTodos, searchMatchesTodo),
    [archivedTodos, orderBySearchMatch, searchMatchesTodo]
  );
  const completedPanelRowCount = completedPaneTab === 'completed' ? done.length : archivedTodos.length;
  const searchMatchesProject = useCallback((project: Project) => {
    const linkedTeam = project.team_id ? teams.find((team) => team.id === project.team_id) : null;
    const owner = memberById.get(project.created_by);
    return textMatchesSearch([
      project.name,
      linkedTeam?.name,
      owner?.email,
      owner ? profileDisplayName(owner) : null,
    ]);
  }, [memberById, teams, textMatchesSearch]);
  const orderedActiveProjects = useMemo(
    () => orderBySearchMatch(activeProjects, searchMatchesProject),
    [activeProjects, orderBySearchMatch, searchMatchesProject]
  );
  const orderedAssignedToMe = useMemo(
    () => orderBySearchMatch(assignedToMe, searchMatchesTodo),
    [assignedToMe, orderBySearchMatch, searchMatchesTodo]
  );
  const orderedAssignedFromMe = useMemo(
    () => orderBySearchMatch(assignedFromMe, searchMatchesTodo),
    [assignedFromMe, orderBySearchMatch, searchMatchesTodo]
  );
  const quickCaptureProjects = useMemo(
    () => activeProjects.filter((project) => {
      if (selectedTeamId) return project.team_id === selectedTeamId;
      return project.team_id === null && project.created_by === session?.user.id;
    }),
    [activeProjects, selectedTeamId, session?.user.id]
  );
  const nextMilestone = useMemo(() => {
    if (!isProject) return null;
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const candidates = todos
      .filter((t) => t.is_milestone && !t.done && t.due_date)
      .map((t) => {
        const [y, m, d] = t.due_date!.split('-').map(Number);
        const dueDate = new Date(y, m - 1, d);
        const daysLeft = Math.round((dueDate.getTime() - todayMidnight.getTime()) / 86400000);
        return { ...t, daysLeft };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
    return candidates[0] ?? null;
  }, [todos, isProject]);

  const loadTodos = useCallback(async () => {
    const shouldShowLoading = loadedTodoScopesRef.current[todoScopeKey] !== true;
    if (shouldShowLoading) setLoading(true);
    let query = supabase
      .from('todos')
      .select(todoSelectColumns)
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (selectedProjectId) {
      query = query.eq('project_id', selectedProjectId);
    } else {
      if (selectedTeamId) {
        const teamProjectIds = projects.filter((p) => p.team_id === selectedTeamId).map((p) => p.id);
        const orClauses = ['and(team_id.eq.' + selectedTeamId + ',project_id.is.null)'];
        if (teamProjectIds.length > 0) {
          orClauses.push('project_id.in.(' + teamProjectIds.join(',') + ')');
        }
        query = query.or(orClauses.join(','));
      } else if (session) {
        const personalProjectIds = projects.filter((p) => p.team_id === null && p.created_by === session.user.id).map((p) => p.id);
        const orClauses = [
          `and(team_id.is.null,created_by.eq.${session.user.id})`,
          `and(assigned_to.eq.${session.user.id},accepted_at.not.is.null)`
        ];
        if (personalProjectIds.length > 0) {
          orClauses.push('project_id.in.(' + personalProjectIds.join(',') + ')');
        }
        query = query.or(orClauses.join(','));
      }
    }

    const { data, error: loadError } = await query;

    if (loadError) {
      setError(loadError.message);
    } else {
      setTodos(sortTodos((data ?? []) as Todo[]));
      setError('');
    }
    if (loadedTodoScopesRef.current[todoScopeKey] !== true) {
      loadedTodoScopesRef.current = { ...loadedTodoScopesRef.current, [todoScopeKey]: true };
      setLoadedTodoScopes(loadedTodoScopesRef.current);
    }
    setLoading(false);
  }, [selectedTeamId, selectedProjectId, session, projects, todoScopeKey, setError]);

  const loadAssignedToMe = useCallback(async () => {
    if (!session) return;
    const { data, error: err } = await supabase
      .from('todos')
      .select(todoSelectColumns)
      .eq('assigned_to', session.user.id)
      .neq('created_by', session.user.id)
      .is('accepted_at', null)
      .is('archived_at', null)
      .eq('done', false)
      .or('team_id.not.is.null,project_id.not.is.null')
      .order('due_date', { ascending: true, nullsFirst: false });
    if (!err) setAssignedToMe((data ?? []) as Todo[]);
  }, [session]);

  const loadAssignedFromMe = useCallback(async () => {
    if (!session) return;
    const { data, error: err } = await supabase
      .from('todos')
      .select(todoSelectColumns)
      .eq('created_by', session.user.id)
      .not('assigned_to', 'is', null)
      .neq('assigned_to', session.user.id)
      .is('archived_at', null)
      .eq('done', false)
      .or('team_id.not.is.null,project_id.not.is.null')
      .order('assigned_at', { ascending: false, nullsFirst: false });
    if (!err) setAssignedFromMe((data ?? []) as Todo[]);
  }, [session]);

  const loadInboxAssignments = useCallback(() => {
    loadAssignedToMe();
    loadAssignedFromMe();
  }, [loadAssignedFromMe, loadAssignedToMe]);

  const loadArchivedTodos = useCallback(async () => {
    let query = supabase
      .from('todos')
      .select(todoSelectColumns)
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false });

    if (selectedProjectId) {
      query = query.eq('project_id', selectedProjectId);
    } else if (selectedTeamId) {
      const teamProjectIds = projects.filter((p) => p.team_id === selectedTeamId).map((p) => p.id);
      const orClauses = ['and(team_id.eq.' + selectedTeamId + ',project_id.is.null)'];
      if (teamProjectIds.length > 0) {
        orClauses.push('project_id.in.(' + teamProjectIds.join(',') + ')');
      }
      query = query.or(orClauses.join(','));
    } else if (session) {
      const personalProjectIds = projects.filter((p) => p.team_id === null && p.created_by === session.user.id).map((p) => p.id);
      const orClauses = [
        `and(team_id.is.null,created_by.eq.${session.user.id})`,
        `and(assigned_to.eq.${session.user.id})`
      ];
      if (personalProjectIds.length > 0) {
        orClauses.push('project_id.in.(' + personalProjectIds.join(',') + ')');
      }
      query = query.or(orClauses.join(','));
    }

    const { data, error: err } = await query;
    if (!err) setArchivedTodos((data ?? []) as Todo[]);
  }, [selectedTeamId, selectedProjectId, session, projects]);

  useEffect(() => {
    loadInboxAssignments();
  }, [loadInboxAssignments]);

  useEffect(() => {
    loadArchivedTodos();
  }, [loadArchivedTodos]);

  useEffect(() => {
    setColumnInputs({});
    setColumnAssignees({});
  }, [selectedProjectId]);

  useEffect(() => {
    if (!session || !isSupabaseConfigured) return;

    loadMembers();
    loadTodos();

    const todoChannelKey = selectedProjectId
      ? `todos-sync-project-${selectedProjectId}`
      : selectedTeamId ? `todos-sync-${selectedTeamId}` : `todos-sync-personal`;
    const todosFilter = selectedProjectId
      ? `project_id=eq.${selectedProjectId}`
      : selectedTeamId
        ? `team_id=eq.${selectedTeamId}`
        : `created_by=eq.${session.user.id}`;

    const todosChannel = supabase
      .channel(todoChannelKey)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos', filter: todosFilter },
        loadTodos
      )
      .subscribe();

    if (!selectedTeamId || selectedProjectId) {
      return () => {
        supabase.removeChannel(todosChannel);
      };
    }

    const membersChannel = supabase
      .channel(`team-members-sync-${selectedTeamId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_members', filter: `team_id=eq.${selectedTeamId}` },
        loadMembers
      )
      .subscribe();

    return () => {
      supabase.removeChannel(todosChannel);
      supabase.removeChannel(membersChannel);
    };
  }, [loadMembers, loadTodos, selectedTeamId, selectedProjectId, session]);

  function toggleSort(field: SortField) {
    if (sortField !== field) {
      setSortField(field);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortField(null);
    }
  }

  function sortIndicatorFor(field: SortField) {
    if (sortField !== field) return '';
    return sortDir === 'asc' ? '↑' : '↓';
  }

  function renderIconSortHeader(field: SortField, label: string, style: object) {
    const isActiveSort = sortField === field;
    const isHovered = hoveredSortField === field;
    return (
      <Pressable
        onPress={() => toggleSort(field)}
        onHoverIn={() => setHoveredSortField(field)}
        onHoverOut={() => setHoveredSortField((current) => current === field ? null : current)}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[
          style,
          styles.sortIconHeader,
          isHovered && styles.sortIconHeaderHovered,
          isActiveSort && styles.sortIconHeaderActive,
        ]}
      >
        <Text style={[styles.sortColIndicator, isActiveSort && styles.sortColLabelActive]}>
          {sortIndicatorFor(field)}
        </Text>
      </Pressable>
    );
  }

  function assigneeLabel(userId: string | null) {
    if (isPersonal) return '';
    if (!userId) return 'Unassigned';
    const member = memberById.get(userId);
    if (!member) return 'Assigned to unknown';
    if (session?.user.id === userId) return 'Assigned to me';
    return `Assigned to ${profileDisplayName(member)}`;
  }

  function getAssignerInfo(todo: Todo): { initials: string; color: string; avatarUrl: string | null; name: string } | null {
    if (!todo.assigned_to || !todo.created_by) return null;
    const isMe = todo.created_by === session?.user.id;
    const creator = memberById.get(todo.created_by);
    const name = isMe
      ? 'From: you'
      : creator
        ? `From: ${profileDisplayName(creator)}`
        : null;
    if (!name) return null;
    const email = isMe ? (profile?.email ?? '') : (creator?.email ?? todo.created_by);
    const displayName = isMe ? accountDisplayName : profileDisplayName(creator!);
    return {
      initials: (displayName[0] ?? '?').toUpperCase(),
      color: pickAvatarColor(email),
      avatarUrl: isMe ? (profile?.avatar_url ?? null) : (creator?.avatar_url ?? null),
      name,
    };
  }

  return {
    columnInputs,
    setColumnInputs,
    columnAssignees,
    setColumnAssignees,
    backlogInputVisible,
    setBacklogInputVisible,
    assignedToMe,
    setAssignedToMe,
    assignedFromMe,
    setAssignedFromMe,
    newTodoProjectId,
    todos,
    setTodos,
    input,
    setInput,
    quickCaptureFocused,
    setQuickCaptureFocused,
    sortField,
    setSortField,
    hoveredSortField,
    setHoveredSortField,
    projectFilter,
    setProjectFilter,
    projectFilterPickerVisible,
    setProjectFilterPickerVisible,
    hoveredInboxTodoId,
    setHoveredInboxTodoId,
    hoveredInboxActionId,
    setHoveredInboxActionId,
    loading,
    setLoadedTodoScopes,
    loadedTodoScopesRef,
    archivedTodos,
    setArchivedTodos,
    completedPaneTab,
    setCompletedPaneTab,
    searchQuery,
    setSearchQuery,
    searchInputRef,
    projectFilterProjects,
    hasLoadedCurrentTodos,
    todoKanbanStage,
    todoProjectAvatar,
    searching,
    searchMatchesTodo,
    active,
    done,
    orderedArchivedTodos,
    completedPanelRowCount,
    searchMatchesProject,
    orderedActiveProjects,
    orderedAssignedToMe,
    orderedAssignedFromMe,
    quickCaptureProjects,
    nextMilestone,
    loadAssignedToMe,
    loadAssignedFromMe,
    toggleSort,
    sortIndicatorFor,
    renderIconSortHeader,
    assigneeLabel,
    getAssignerInfo,
  };
}

export type TodosState = ReturnType<typeof useTodos>;
