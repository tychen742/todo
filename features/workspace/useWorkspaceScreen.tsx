import { useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { ArrowLeft, Plus, Trash2, X } from 'lucide-react-native';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { pickAvatarColor } from '../../lib/avatar';
import type { MindmapLayoutMode, Todo } from '../../lib/types';
import { parseDateValue } from '../../lib/calendar';
import { priorityColors } from '../../lib/todos';
import { profileDisplayName } from '../../lib/display';
import {
  promoteLocalSessionToProduction,
  redirectNonCanonicalWebHost,
  resolveInitialAuthSession,
} from '../../lib/authSession';
import { mindmapTemplateFor, mindmapTemplates } from '../../lib/mindmaps';
import { InboxAssignerAvatar } from './InboxAssignerAvatar';
import { WorkspaceMindmapPreview, EditableWorkspaceMindmap } from './WorkspaceMindmap';
import { styles } from './styles';
import { usePreferences } from './hooks/usePreferences';
import { useFeedback } from './hooks/useFeedback';
import { useWorkspaceViews } from './hooks/useWorkspaceViews';
import { useAuth } from './hooks/useAuth';
import { usePresence } from './hooks/usePresence';
import { useProfile } from './hooks/useProfile';
import { useAccountData } from './hooks/useAccountData';
import { useOrganizations } from './hooks/useOrganizations';
import { useProjects } from './hooks/useProjects';
import { useWorkspaceTabs } from './hooks/useWorkspaceTabs';
import { useTodos } from './hooks/useTodos';
import { useTodoPickers } from './hooks/useTodoPickers';
import { useTodoActions } from './hooks/useTodoActions';
import { useTodoEditing } from './hooks/useTodoEditing';
import { useMindmaps } from './hooks/useMindmaps';
import { useCalendarView } from './hooks/useCalendarView';

export function useWorkspaceScreen() {
  const {
    width,
    height,
    aboutVisible,
    setAboutVisible,
    density,
    setDensity,
    themeKey,
    setThemeKey,
    settingsExpanded,
    setSettingsExpanded,
    rowPV,
    rowH,
    appTheme,
  } = usePreferences();

  const {
    error,
    setError,
    message,
    setMessage,
    toast,
    setToast,
    mindmapNodeUndo,
    setMindmapNodeUndo,
    showToast,
  } = useFeedback();

  const {
    createTarget,
    setCreateTarget,
    projectsViewOpen,
    setProjectsViewOpen,
    teamsViewOpen,
    setTeamsViewOpen,
    notesViewOpen,
    setNotesViewOpen,
    calendarViewOpen,
    setCalendarViewOpen,
    resourcesViewOpen,
    setResourcesViewOpen,
    dashboardViewOpen,
    setDashboardViewOpen,
    openCreateTarget,
  } = useWorkspaceViews();

  const {
    session,
    setSession,
    authInitialized,
    setAuthInitialized,
    authLoading,
    setAuthLoading,
    authMode,
    setAuthMode,
    displayName,
    setDisplayName,
    email,
    setEmail,
    password,
    setPassword,
    passwordRecovery,
    setPasswordRecovery,
    recoveryPassword,
    setRecoveryPassword,
    showPassword,
    setShowPassword,
    authErrorField,
    setAuthErrorField,
    sessionUserIdRef,
    submitAuth,
    sendPasswordReset,
    signInWithOAuth,
    saveRecoveryPassword,
  } = useAuth({
    setError,
    setMessage,
  });

  const {
    now,
    browserActive,
    browserShown,
    setWorkspaceActiveSeconds,
    workspaceActiveLabel,
    workspaceActiveProgress,
  } = usePresence();

  const {
    navExpanded,
    setNavExpanded,
    statusEditing,
    setStatusEditing,
    profile,
    setProfile,
    animalPickerVisible,
    setAnimalPickerVisible,
    customAnimal,
    setCustomAnimal,
    statusDraft,
    setStatusDraft,
    editingDisplayName,
    setEditingDisplayName,
    editDisplayNameValue,
    setEditDisplayNameValue,
    accountDisplayName,
    ensureProfile,
    uploadProfilePhoto,
    saveStatus,
    saveDisplayName,
  } = useProfile({
    setError,
    setMessage,
    showToast,
    session,
  });

  const { deleteAccountVisible, setDeleteAccountVisible, exportingData, exportMyData } = useAccountData({
    setError,
    showToast,
    session,
  });

  const {
    organizations,
    setOrganizations,
    teams,
    setTeams,
    selectedTeamId,
    setSelectedTeamId,
    orgName,
    setOrgName,
    teamName,
    setTeamName,
    newTeamOrgId,
    setNewTeamOrgId,
    orgModalId,
    setOrgModalId,
    orgModalMembers,
    orgMemberEmail,
    setOrgMemberEmail,
    orgManageMember,
    setOrgManageMember,
    memberEmail,
    setMemberEmail,
    members,
    setMembers,
    renamingTeam,
    setRenamingTeam,
    renameTeamName,
    setRenameTeamName,
    renamingOrg,
    setRenamingOrg,
    renameOrgName,
    setRenameOrgName,
    memberById,
    currentOrgRole,
    currentTeamRole,
    loadTeams,
    loadOrganizations,
    renameTeam,
    renameOrg,
    openCreateTeam,
    createTeam,
    createOrganization,
    selectTeamFromAccountMenu,
    openOrgModal,
    addOrgMember,
    transferOrgOwnership,
    updateOrgMemberRole,
    removeOrgMember,
  } = useOrganizations({
    setError,
    setMessage,
    openCreateTarget,
    setCreateTarget,
    session,
  });

  const {
    projectName,
    setProjectName,
    newProjectTeamId,
    setNewProjectTeamId,
    linkingProjectTeam,
    projects,
    setProjects,
    selectedProjectId,
    setSelectedProjectId,
    lastSelectedProjectId,
    setLastSelectedProjectId,
    phases,
    setPhases,
    projectViewMode,
    setProjectViewMode,
    workflowColumnLabels,
    projectAccessQuery,
    setProjectAccessQuery,
    projectAccessSearchLoading,
    projectAccessBusy,
    addingPhase,
    setAddingPhase,
    newPhaseName,
    setNewPhaseName,
    renamingPhase,
    renamePhaseName,
    setRenamePhaseName,
    phaseDeleteConfirming,
    setPhaseDeleteConfirming,
    renamingWorkflowLane,
    renameWorkflowLaneName,
    setRenameWorkflowLaneName,
    newTodoAssignee,
    setNewTodoAssignee,
    renamingProject,
    setRenamingProject,
    renameProjectName,
    setRenameProjectName,
    isProject,
    isPersonal,
    selectedProject,
    selectedTeam,
    projectById,
    projectAvatarFor,
    selectedProjectOwner,
    projectMemberAvatars,
    projectAccessTeams,
    projectAccessPeopleVisible,
    activeProjects,
    projectAccessInviteEmail,
    loadMembers,
    renameProject,
    createProject,
    linkProjectTeam,
    openProjectAccessModal,
    closeProjectAccessModal,
    addProjectMemberByProfile,
    inviteProjectMemberByEmail,
    addMember,
    cyclePhaseStatus,
    addPhase,
    openRenamePhase,
    closeRenamePhase,
    saveRenamePhase,
    openRenameWorkflowLane,
    closeRenameWorkflowLane,
    saveRenameWorkflowLane,
  } = useProjects({
    setError,
    setMessage,
    showToast,
    calendarViewOpen,
    dashboardViewOpen,
    notesViewOpen,
    projectsViewOpen,
    resourcesViewOpen,
    setCreateTarget,
    teamsViewOpen,
    session,
    ensureProfile,
    profile,
    loadOrganizations,
    loadTeams,
    memberById,
    memberEmail,
    members,
    selectedTeamId,
    setMemberEmail,
    setMembers,
    setSelectedTeamId,
    teams,
  });

  const {
    workspaceTabActive,
    projectsTabActive,
    notesTabActive,
    calendarTabActive,
    resourcesTabActive,
    dashboardTabActive,
    peopleTabActive,
    showHeaderMessageBoard,
    renderWorkspaceTabDivider,
    showInboxSidePanel,
  } = useWorkspaceTabs({
    width,
    calendarViewOpen,
    dashboardViewOpen,
    notesViewOpen,
    projectsViewOpen,
    resourcesViewOpen,
    teamsViewOpen,
    session,
    browserShown,
    setWorkspaceActiveSeconds,
    isPersonal,
    isProject,
  });

  const {
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
  } = useTodos({
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
  });

  const {
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
  } = useTodoPickers({
    height,
    width,
    session,
    accountDisplayName,
    profile,
    members,
  });

  const {
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
  } = useTodoActions({
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
  });

  const {
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
  } = useTodoEditing({
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
  });

  const {
    setWorkspaceIdeas,
    workspaceMindmaps,
    setWorkspaceMindmaps,
    activeMindmapId,
    setActiveMindmapId,
    mindmapTemplatePickerOpen,
    setMindmapTemplatePickerOpen,
    createWorkspaceMindmap,
    deleteWorkspaceMindmap,
    updateWorkspaceMindmap,
    addWorkspaceMindmapNode,
    updateWorkspaceMindmapSettings,
    updateWorkspaceMindmapNodeLabel,
    deleteWorkspaceMindmapNode,
    undoMindmapNodeDelete,
    updateWorkspaceMindmapRootPosition,
    updateWorkspaceMindmapNodePosition,
    reparentWorkspaceMindmapNode,
    createTodoFromMindmapNode,
  } = useMindmaps({
    mindmapNodeUndo,
    setError,
    setMindmapNodeUndo,
    setToast,
    showToast,
    session,
    selectedTeamId,
    isProject,
    newTodoAssignee,
    selectedProjectId,
    newTodoProjectId,
    setIsCreatingTodo,
    openEditModal,
  });

  const {
    calendarViewMode,
    setCalendarViewMode,
    calendarViewMonth,
    setCalendarViewMonth,
    calendarViewSelectedDate,
    setCalendarViewSelectedDate,
    saveCalendarViewNote,
    moveCalendarView,
    showCalendarToday,
    calendarViewDays,
    calendarViewWeekDays,
    calendarViewTodosByDate,
    calendarViewSelectedDateKey,
    calendarViewSelectedDateTodos,
    calendarViewSelectedDateNote,
  } = useCalendarView({
    setError,
    session,
    todos,
    setActiveMindmapId,
    setMindmapTemplatePickerOpen,
    setWorkspaceIdeas,
    setWorkspaceMindmaps,
  });

  useEffect(() => {
    if (redirectNonCanonicalWebHost()) return;

    if (!isSupabaseConfigured) {
      setAuthInitialized(true);
      setAuthLoading(false);
      setError('Add Supabase env vars to sync todos.');
      return;
    }

    resolveInitialAuthSession()
      .then((currentSession) => {
        if (promoteLocalSessionToProduction(currentSession)) return;
        sessionUserIdRef.current = currentSession?.user.id ?? null;
        setSession(currentSession);
      })
      .catch((sessionError: unknown) => {
        setError(sessionError instanceof Error ? sessionError.message : 'Unable to restore your session.');
      })
      .finally(() => {
        setAuthInitialized(true);
        setAuthLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
        setMessage('');
        setError('');
      }
      if (promoteLocalSessionToProduction(currentSession)) return;
      const previousUserId = sessionUserIdRef.current;
      const nextUserId = currentSession?.user.id ?? null;
      const userChanged = previousUserId !== nextUserId;
      sessionUserIdRef.current = nextUserId;
      setSession(currentSession);
      if (userChanged) {
        setOrganizations([]);
        setTeams([]);
        setProjects([]);
        setSelectedTeamId(null);
        setSelectedProjectId(null);
        setLastSelectedProjectId(null);
        setPhases([]);
        setMembers([]);
        setTodos([]);
        loadedTodoScopesRef.current = {};
        setLoadedTodoScopes({});
      }
      setError('');
      setMessage('');
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadedTodoScopesRef, sessionUserIdRef, setAuthInitialized, setAuthLoading, setError, setLastSelectedProjectId, setLoadedTodoScopes, setMembers, setMessage, setOrganizations, setPasswordRecovery, setPhases, setProjects, setSelectedProjectId, setSelectedTeamId, setSession, setTeams, setTodos]);

  async function signOut() {
    setProfile(null);
    await supabase.auth.signOut();
    setInput('');
  }

  async function deletePhase() {
    if (!renamingPhase) return;
    if (phases.length <= 1) {
      setError('Projects must keep at least one column.');
      setPhaseDeleteConfirming(false);
      return;
    }

    const phase = renamingPhase;
    const remainingPhases = phases
      .filter((item) => item.id !== phase.id)
      .sort((a, b) => a.order_index - b.order_index)
      .map((item, index) => ({ ...item, order_index: index }));

    const { error: deleteError } = await supabase
      .from('project_phases')
      .delete()
      .eq('id', phase.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setPhases(remainingPhases);
    setTodos((prev) => prev.map((todo) => (
      todo.phase_id === phase.id ? { ...todo, phase_id: null } : todo
    )));
    setColumnInputs((prev) => {
      const next = { ...prev };
      delete next[phase.id];
      return next;
    });
    closeRenamePhase();
    setError('');

    const reindexResults = await Promise.all(
      remainingPhases.map((item) =>
        supabase
          .from('project_phases')
          .update({ order_index: item.order_index })
          .eq('id', item.id)
      )
    );
    const reindexError = reindexResults.find((result) => result.error)?.error;
    if (reindexError) {
      setError(reindexError.message);
    }
  }

  function renderAssignedToMeTodo(todo: Todo) {
    const project = projects.find((item) => item.id === todo.project_id);
    const contextLabel = project?.name ?? 'Team task';
    const due = parseDateValue(todo.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = due ? due < today : false;
    const creatorMember = todo.created_by ? memberById.get(todo.created_by) : null;
    const isCreatorMe = todo.created_by === session?.user.id;
    const creatorName = isCreatorMe
      ? accountDisplayName
      : creatorMember
        ? profileDisplayName(creatorMember)
        : null;
    const creatorEmail = isCreatorMe ? (profile?.email ?? '') : (creatorMember?.email ?? todo.created_by ?? '');
    const creatorInitials = creatorName ? (creatorName[0] ?? '?').toUpperCase() : '?';
    const creatorColor = pickAvatarColor(creatorEmail);
    const creatorAvatarUrl = isCreatorMe ? (profile?.avatar_url ?? null) : (creatorMember?.avatar_url ?? null);
    const creatorTooltip = creatorName ? `From: ${creatorName}` : `From: ${contextLabel}`;
    const isRowHovered = Platform.OS === 'web' && hoveredInboxTodoId === todo.id;
    const isActionHovered = Platform.OS === 'web' && hoveredInboxActionId === todo.id;
    const isSearchDimmed = searching && !searchMatchesTodo(todo);
    return (
      <View key={todo.id} style={[styles.assignedToMeRowOuter, isSearchDimmed && styles.searchResultDimmed, isRowHovered && styles.assignedToMeRowHovered]}>
        <Pressable
          onHoverIn={() => setHoveredInboxTodoId(todo.id)}
          onHoverOut={() => setHoveredInboxTodoId(null)}
          style={[styles.assignedToMeRow, { paddingVertical: rowPV }]}
        >
          <Pressable
            onPress={() => moveInboxTodoToTodos(todo.id)}
            onHoverIn={() => setHoveredInboxActionId(todo.id)}
            onHoverOut={() => setHoveredInboxActionId(null)}
            style={[
              styles.incomingAcceptIcon,
              { backgroundColor: priorityColors[todo.priority], borderColor: priorityColors[todo.priority] },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Move to Todos"
          >
            <ArrowLeft size={11} strokeWidth={2.75} color="#fff" />
            {isActionHovered && (
              <View style={styles.incomingAcceptTooltip}>
                <Text style={styles.incomingAcceptTooltipText} numberOfLines={1}>
                  Move to Todos - {todo.priority[0].toUpperCase() + todo.priority.slice(1)}
                </Text>
              </View>
            )}
          </Pressable>
          <Text style={styles.assignedToMeText} numberOfLines={1}>{todo.text}</Text>
          {!!contextLabel && <Text style={styles.assignedToMeContext} numberOfLines={1}>{contextLabel}</Text>}
          {todo.due_date && (
            <Text style={[styles.assignedToMeDue, isOverdue && styles.assignedToMeDueOverdue]} numberOfLines={1}>
              {isOverdue ? 'Overdue' : todo.due_date}
            </Text>
          )}
          <InboxAssignerAvatar
            initials={creatorInitials}
            color={creatorColor}
            avatarUrl={creatorAvatarUrl}
            tooltip={creatorTooltip}
          />
          {isRowHovered && !isActionHovered && (
            <View style={styles.assignedToMeTooltip}>
              <Text style={styles.assignedToMeTooltipText}>{todo.text}</Text>
              {!!todo.note && <Text style={styles.assignedToMeTooltipNote}>{todo.note}</Text>}
            </View>
          )}
        </Pressable>
        <View style={styles.assignedToMeSeparator} />
      </View>
    );
  }

  function renderAssignedFromMeTodo(todo: Todo) {
    const project = projects.find((item) => item.id === todo.project_id);
    const contextLabel = project?.name ?? 'Team task';
    const due = parseDateValue(todo.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = due ? due < today : false;
    const assigneeMember = todo.assigned_to ? memberById.get(todo.assigned_to) : null;
    const assigneeName = assigneeMember ? profileDisplayName(assigneeMember) : 'Assigned user';
    const assigneeEmail = assigneeMember?.email ?? todo.assigned_to ?? '';
    const assigneeInitials = (assigneeName[0] ?? '?').toUpperCase();
    const assigneeColor = pickAvatarColor(assigneeEmail);
    const isRowHovered = Platform.OS === 'web' && hoveredInboxTodoId === todo.id;
    const assignmentState = todo.accepted_at ? 'Accepted' : 'Waiting';
    const isSearchDimmed = searching && !searchMatchesTodo(todo);

    return (
      <View key={todo.id} style={[styles.assignedToMeRowOuter, isSearchDimmed && styles.searchResultDimmed, isRowHovered && styles.assignedToMeRowHovered]}>
        <Pressable
          onHoverIn={() => setHoveredInboxTodoId(todo.id)}
          onHoverOut={() => setHoveredInboxTodoId(null)}
          style={[styles.assignedToMeRow, { paddingVertical: rowPV }]}
        >
          <View style={[styles.inboxSentStatePill, todo.accepted_at && styles.inboxSentStatePillAccepted]}>
            <Text style={[styles.inboxSentStateText, todo.accepted_at && styles.inboxSentStateTextAccepted]}>
              {todo.accepted_at ? '✓' : '…'}
            </Text>
          </View>
          <Text style={styles.assignedToMeText} numberOfLines={1}>{todo.text}</Text>
          <Text style={styles.assignedToMeContext} numberOfLines={1}>{assignmentState}</Text>
          {!!contextLabel && <Text style={styles.assignedToMeContext} numberOfLines={1}>{contextLabel}</Text>}
          {todo.due_date && (
            <Text style={[styles.assignedToMeDue, isOverdue && styles.assignedToMeDueOverdue]} numberOfLines={1}>
              {isOverdue ? 'Overdue' : todo.due_date}
            </Text>
          )}
          <InboxAssignerAvatar
            initials={assigneeInitials}
            color={assigneeColor}
            avatarUrl={assigneeMember?.avatar_url ?? null}
            tooltip={`To: ${assigneeName}`}
          />
          {isRowHovered && (
            <View style={styles.assignedToMeTooltip}>
              <Text style={styles.assignedToMeTooltipText}>{todo.text}</Text>
              <Text style={styles.assignedToMeTooltipNote}>To: {assigneeName}</Text>
              {!!todo.note && <Text style={styles.assignedToMeTooltipNote}>{todo.note}</Text>}
            </View>
          )}
        </Pressable>
        <View style={styles.assignedToMeSeparator} />
      </View>
    );
  }

  function renderWorkspaceInboxPanel(variant: 'side' | 'inline') {
    const totalInboxCount = assignedToMe.length + assignedFromMe.length;
    const inboxSections = (
      <>
        <View style={styles.inboxSectionHeader}>
          <Text style={styles.inboxSectionTitle}>To you ({assignedToMe.length})</Text>
        </View>
        {assignedToMe.length === 0 ? (
          <Text style={styles.inboxViewEmpty}>No assigned tasks for you right now.</Text>
        ) : (
          orderedAssignedToMe.map(renderAssignedToMeTodo)
        )}

        <View style={styles.inboxSectionHeader}>
          <Text style={styles.inboxSectionTitle}>From you ({assignedFromMe.length})</Text>
        </View>
        {assignedFromMe.length === 0 ? (
          <Text style={styles.inboxViewEmpty}>No active assignments from you.</Text>
        ) : (
          orderedAssignedFromMe.map(renderAssignedFromMeTodo)
        )}
      </>
    );

    return (
      <View style={[
        variant === 'side' && styles.assignedToMePanel,
        variant === 'inline' && styles.assignedToMeInlinePanel,
      ]}>
        <Text style={styles.assignedToMePanelTitle}>INBOX ({totalInboxCount})</Text>
        <ScrollView style={styles.assignedToMePanelList} showsVerticalScrollIndicator={false}>
          {inboxSections}
        </ScrollView>
      </View>
    );
  }

  function renderWorkspaceNotesPanel(variant: 'side' | 'inline' | 'full') {
    const isSide = variant === 'side';
    const activeMindmap = activeMindmapId
      ? workspaceMindmaps.find((mindmap) => mindmap.id === activeMindmapId) ?? null
      : null;
    const activeMindmapTemplate = activeMindmap ? mindmapTemplateFor(activeMindmap.template) : null;
    return (
      <View style={[
        variant === 'side' && styles.assignedToMePanel,
        variant === 'inline' && styles.assignedToMeInlinePanel,
        variant === 'full' && styles.inboxViewPanel,
      ]}>
        <Text style={styles.assignedToMePanelTitle}>MAPS</Text>
        <ScrollView
          style={isSide ? styles.notesPanelScroll : undefined}
          contentContainerStyle={[
            styles.notesPanelContent,
            variant === 'full' && styles.notesPanelContentFull,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.notesWorkspace}>
            <View style={styles.notesMindmapPane}>
              <View style={styles.notesMindmapHeader}>
                <View style={styles.notesMindmapHeading}>
                  <Text style={styles.notesFieldLabel}>Maps</Text>
                  <Text style={styles.notesAutosaveText}>Saved automatically. Use tabs to switch maps.</Text>
                </View>
                <Pressable
                  onPress={() => setMindmapTemplatePickerOpen((open) => !open)}
                  style={styles.notesCreateButton}
                  accessibilityRole="button"
                  accessibilityLabel="New map"
                >
                  <Plus size={14} color="#ffffff" strokeWidth={2.8} />
                  <Text style={styles.notesCreateButtonText}>New Map</Text>
                </Pressable>
              </View>
              {mindmapTemplatePickerOpen && (
                <View style={styles.notesTemplatePicker}>
                  <Text style={styles.notesTemplatePickerTitle}>Choose a map template</Text>
                  <View style={styles.notesTemplateGrid}>
                    {mindmapTemplates.map((template) => (
                      <Pressable
                        key={template.key}
                        onPress={() => createWorkspaceMindmap(template.key)}
                        style={({ pressed }) => [
                          styles.notesTemplateCard,
                          pressed && styles.notesTemplateCardPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Create ${template.name} mindmap`}
                      >
                        <WorkspaceMindmapPreview template={template} compact={isSide || width < 980} />
                        <Text style={styles.notesTemplateName}>{template.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
              <View style={styles.notesMindmapTabs}>
                {workspaceMindmaps.length === 0 ? (
                  <Text style={styles.notesMindmapEmpty}>Create a map to see it here. Maps save automatically.</Text>
                ) : (
                  workspaceMindmaps.map((mindmap) => {
                    const isActive = activeMindmap?.id === mindmap.id;
                    return (
                      <Pressable
                        key={mindmap.id}
                        onPress={() => setActiveMindmapId(mindmap.id)}
                        style={({ pressed }) => [
                          styles.notesMindmapTab,
                          isActive && styles.notesMindmapTabActive,
                          pressed && styles.notesMindmapTabPressed,
                        ]}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: isActive }}
                        accessibilityLabel={`Open map ${mindmap.title}`}
                      >
                        <Text style={[styles.notesMindmapTabText, isActive && styles.notesMindmapTabTextActive]} numberOfLines={1}>
                          {mindmap.title || 'Untitled map'}
                        </Text>
                      </Pressable>
                    );
                  })
                )}
              </View>
              {activeMindmap && activeMindmapTemplate ? (
                <View style={styles.notesMindmapCard}>
                  <View style={styles.notesMindmapCardHeader}>
                    <View style={styles.notesMindmapTitleGroup}>
                      <Text style={styles.notesMindmapTitle} numberOfLines={1}>{activeMindmap.title || activeMindmapTemplate.name}</Text>
                      <Text style={styles.notesMindmapMeta} numberOfLines={1}>{activeMindmapTemplate.name} - Auto-saved</Text>
                    </View>
                    <View style={styles.notesMindmapCardActions}>
                      <Pressable
                        onPress={() => setActiveMindmapId(null)}
                        style={styles.notesMindmapHeaderAction}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Close map ${activeMindmap.title}`}
                      >
                        <X size={14} color="#64748b" strokeWidth={2.4} />
                        <Text style={styles.notesMindmapHeaderActionText}>Close</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => deleteWorkspaceMindmap(activeMindmap.id)}
                        style={[styles.notesMindmapHeaderAction, styles.notesMindmapDangerAction]}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete map ${activeMindmap.title}`}
                      >
                        <Trash2 size={13} color="#be123c" strokeWidth={2.4} />
                        <Text style={[styles.notesMindmapHeaderActionText, styles.notesMindmapDangerActionText]}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                  <View style={styles.notesMindmapInspector}>
                    <View style={styles.notesMindmapInspectorGroup}>
                      <Text style={styles.notesMindmapInspectorLabel}>Layout</Text>
                      <View style={styles.notesMindmapSegmentedControl}>
                        {([
                          ['balanced', 'Balanced'],
                          ['right', 'Right'],
                        ] as [MindmapLayoutMode, string][]).map(([layout, label]) => {
                          const isActiveLayout = activeMindmap.settings.layout === layout;
                          return (
                            <Pressable
                              key={layout}
                              onPress={() => updateWorkspaceMindmapSettings(activeMindmap.id, { layout })}
                              style={[
                                styles.notesMindmapSegment,
                                isActiveLayout && styles.notesMindmapSegmentActive,
                              ]}
                              accessibilityRole="button"
                              accessibilityState={{ selected: isActiveLayout }}
                              accessibilityLabel={`Use ${label} map layout`}
                            >
                              <Text style={[
                                styles.notesMindmapSegmentText,
                                isActiveLayout && styles.notesMindmapSegmentTextActive,
                              ]}>{label}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                    <Pressable
                      onPress={() => addWorkspaceMindmapNode(activeMindmap.id, null)}
                      style={styles.notesMindmapAddTopic}
                      accessibilityRole="button"
                      accessibilityLabel="Add top-level mindmap node"
                    >
                      <Plus size={12} color="#ffffff" strokeWidth={2.8} />
                      <Text style={styles.notesMindmapAddTopicText}>Add topic</Text>
                    </Pressable>
                    <View style={styles.notesMindmapInspectorToggles}>
                      <Pressable
                        onPress={() => updateWorkspaceMindmapSettings(activeMindmap.id, {
                          coloredBranches: !activeMindmap.settings.coloredBranches,
                        })}
                        style={[
                          styles.notesMindmapToggle,
                          activeMindmap.settings.coloredBranches && styles.notesMindmapToggleActive,
                        ]}
                        accessibilityRole="switch"
                        accessibilityState={{ checked: activeMindmap.settings.coloredBranches }}
                        accessibilityLabel="Colored branches"
                      >
                        <View style={[
                          styles.notesMindmapToggleDot,
                          activeMindmap.settings.coloredBranches && styles.notesMindmapToggleDotActive,
                        ]} />
                        <Text style={[
                          styles.notesMindmapToggleText,
                          activeMindmap.settings.coloredBranches && styles.notesMindmapToggleTextActive,
                        ]}>Colored branches</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => updateWorkspaceMindmapSettings(activeMindmap.id, {
                          compactSpacing: !activeMindmap.settings.compactSpacing,
                        })}
                        style={[
                          styles.notesMindmapToggle,
                          activeMindmap.settings.compactSpacing && styles.notesMindmapToggleActive,
                        ]}
                        accessibilityRole="switch"
                        accessibilityState={{ checked: activeMindmap.settings.compactSpacing }}
                        accessibilityLabel="Compact spacing"
                      >
                        <View style={[
                          styles.notesMindmapToggleDot,
                          activeMindmap.settings.compactSpacing && styles.notesMindmapToggleDotActive,
                        ]} />
                        <Text style={[
                          styles.notesMindmapToggleText,
                          activeMindmap.settings.compactSpacing && styles.notesMindmapToggleTextActive,
                        ]}>Compact spacing</Text>
                      </Pressable>
                    </View>
                  </View>
                  <EditableWorkspaceMindmap
                    mindmap={activeMindmap}
                    template={activeMindmapTemplate}
                    compact={isSide || width < 980}
                    onTitleChange={(value) => updateWorkspaceMindmap(activeMindmap.id, { title: value })}
                    onNodeAdd={(parentNodeId) => addWorkspaceMindmapNode(activeMindmap.id, parentNodeId)}
                    onNodeChange={(nodeId, value) => updateWorkspaceMindmapNodeLabel(activeMindmap.id, nodeId, value)}
                    onNodeDelete={(nodeId) => deleteWorkspaceMindmapNode(activeMindmap.id, nodeId)}
                    onNodeCreateTodo={createTodoFromMindmapNode}
                    onRootPositionChange={(point) => updateWorkspaceMindmapRootPosition(activeMindmap.id, point)}
                    onNodeMove={(nodeId, point) => updateWorkspaceMindmapNodePosition(activeMindmap.id, nodeId, point)}
                    onNodeReparent={(nodeId, parentNodeId) => reparentWorkspaceMindmapNode(activeMindmap.id, nodeId, parentNodeId)}
                  />
                </View>
              ) : workspaceMindmaps.length > 0 ? (
                <Text style={styles.notesMindmapEmpty}>Select a map tab to open it.</Text>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return {
    width,
    height,
    session,
    authInitialized,
    authLoading,
    authMode,
    setAuthMode,
    now,
    browserActive,
    navExpanded,
    setNavExpanded,
    statusEditing,
    setStatusEditing,
    profile,
    displayName,
    setDisplayName,
    email,
    setEmail,
    password,
    setPassword,
    passwordRecovery,
    recoveryPassword,
    setRecoveryPassword,
    organizations,
    teams,
    selectedTeamId,
    setSelectedTeamId,
    createTarget,
    setCreateTarget,
    orgName,
    setOrgName,
    teamName,
    setTeamName,
    newTeamOrgId,
    setNewTeamOrgId,
    projectName,
    setProjectName,
    newProjectTeamId,
    setNewProjectTeamId,
    linkingProjectTeam,
    projects,
    selectedProjectId,
    setSelectedProjectId,
    lastSelectedProjectId,
    setLastSelectedProjectId,
    phases,
    projectViewMode,
    setProjectViewMode,
    workflowColumnLabels,
    projectAccessQuery,
    setProjectAccessQuery,
    projectAccessSearchLoading,
    projectAccessBusy,
    phasePickerTodo,
    setPhasePickerTodo,
    projectPickerTodo,
    setProjectPickerTodo,
    addingPhase,
    setAddingPhase,
    newPhaseName,
    setNewPhaseName,
    renamingPhase,
    renamePhaseName,
    setRenamePhaseName,
    phaseDeleteConfirming,
    setPhaseDeleteConfirming,
    renamingWorkflowLane,
    renameWorkflowLaneName,
    setRenameWorkflowLaneName,
    columnInputs,
    setColumnInputs,
    backlogInputVisible,
    setBacklogInputVisible,
    aboutVisible,
    setAboutVisible,
    projectsViewOpen,
    setProjectsViewOpen,
    teamsViewOpen,
    setTeamsViewOpen,
    notesViewOpen,
    setNotesViewOpen,
    calendarViewOpen,
    setCalendarViewOpen,
    resourcesViewOpen,
    setResourcesViewOpen,
    dashboardViewOpen,
    setDashboardViewOpen,
    calendarViewMode,
    setCalendarViewMode,
    calendarViewMonth,
    setCalendarViewMonth,
    calendarViewSelectedDate,
    setCalendarViewSelectedDate,
    animalPickerVisible,
    setAnimalPickerVisible,
    customAnimal,
    setCustomAnimal,
    statusDraft,
    setStatusDraft,
    orgModalId,
    setOrgModalId,
    orgModalMembers,
    orgMemberEmail,
    setOrgMemberEmail,
    orgManageMember,
    setOrgManageMember,
    assigneeTodo,
    assigneePickerUserId,
    setAssigneePickerUserId,
    assigneePickerDueDate,
    setAssigneePickerDueDate,
    assigneePickerPriority,
    setAssigneePickerPriority,
    assigneePickerMonth,
    setAssigneePickerMonth,
    assignedToMe,
    memberEmail,
    setMemberEmail,
    members,
    newTodoAssignee,
    setNewTodoAssignee,
    todos,
    input,
    setInput,
    quickCaptureFocused,
    setQuickCaptureFocused,
    dueTodo,
    priorityPicker,
    setPriorityPicker,
    statusPicker,
    setStatusPicker,
    editTodo,
    isCreatingTodo,
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
    editDraftProjectId,
    setEditDraftProjectId,
    editDraftAssignedTo,
    setEditDraftAssignedTo,
    showPassword,
    setShowPassword,
    sortField,
    hoveredSortField,
    setHoveredSortField,
    projectFilter,
    setProjectFilter,
    projectFilterPickerVisible,
    setProjectFilterPickerVisible,
    calendarMonth,
    error,
    setError,
    authErrorField,
    setAuthErrorField,
    message,
    setMessage,
    toast,
    mindmapNodeUndo,
    loading,
    archivedTodos,
    completedPaneTab,
    setCompletedPaneTab,
    density,
    setDensity,
    themeKey,
    setThemeKey,
    settingsExpanded,
    setSettingsExpanded,
    renamingTeam,
    setRenamingTeam,
    renameTeamName,
    setRenameTeamName,
    renamingOrg,
    setRenamingOrg,
    renameOrgName,
    setRenameOrgName,
    renamingProject,
    setRenamingProject,
    renameProjectName,
    setRenameProjectName,
    editingDisplayName,
    setEditingDisplayName,
    editDisplayNameValue,
    setEditDisplayNameValue,
    searchQuery,
    setSearchQuery,
    searchInputRef,
    rowPV,
    rowH,
    appTheme,
    isProject,
    isPersonal,
    workspaceTabActive,
    projectsTabActive,
    notesTabActive,
    calendarTabActive,
    resourcesTabActive,
    dashboardTabActive,
    peopleTabActive,
    showHeaderMessageBoard,
    workspaceActiveLabel,
    workspaceActiveProgress,
    renderWorkspaceTabDivider,
    showInboxSidePanel,
    selectedProject,
    selectedTeam,
    projectFilterProjects,
    accountDisplayName,
    hasLoadedCurrentTodos,
    projectAvatarFor,
    todoKanbanStage,
    todoProjectAvatar,
    memberById,
    searching,
    searchMatchesTodo,
    active,
    done,
    orderedArchivedTodos,
    completedPanelRowCount,
    selectedProjectOwner,
    projectMemberAvatars,
    projectAccessTeams,
    projectAccessPeopleVisible,
    activeProjects,
    searchMatchesProject,
    orderedActiveProjects,
    projectAccessInviteEmail,
    saveCalendarViewNote,
    undoMindmapNodeDelete,
    moveCalendarView,
    showCalendarToday,
    nextMilestone,
    calendarDays,
    calendarViewDays,
    calendarViewWeekDays,
    calendarViewTodosByDate,
    calendarViewSelectedDateKey,
    calendarViewSelectedDateTodos,
    calendarViewSelectedDateNote,
    assigneePickerCalendarDays,
    editDraftCalendarDays,
    priorityPopoverPosition,
    statusPopoverPosition,
    editAssigneeOptions,
    currentOrgRole,
    currentTeamRole,
    uploadProfilePhoto,
    submitAuth,
    sendPasswordReset,
    signInWithOAuth,
    saveRecoveryPassword,
    signOut,
    deleteAccountVisible,
    setDeleteAccountVisible,
    exportingData,
    exportMyData,
    saveStatus,
    saveDisplayName,
    renameTeam,
    renameOrg,
    renameProject,
    openCreateTeam,
    createTeam,
    createOrganization,
    createProject,
    linkProjectTeam,
    openProjectAccessModal,
    closeProjectAccessModal,
    addProjectMemberByProfile,
    inviteProjectMemberByEmail,
    openCreateTarget,
    selectTeamFromAccountMenu,
    addMember,
    openOrgModal,
    addOrgMember,
    transferOrgOwnership,
    updateOrgMemberRole,
    removeOrgMember,
    addTodo,
    addTodoToPhase,
    toggle,
    openAssigneePicker,
    closeAssigneePicker,
    confirmAssignment,
    openPriorityPicker,
    setTodoPriority,
    openStatusPicker,
    setTodoWorkflowStage,
    openProjectPicker,
    setTodoProject,
    openDueCalendar,
    closeDueCalendar,
    moveCalendarMonth,
    chooseDueDate,
    openEditModal,
    closeEditModal,
    saveEditModal,
    archiveTodo,
    unarchiveTodo,
    handleDragEnd,
    completeTodoFromDrag,
    movePlanTodo,
    moveWorkflowTodo,
    toggleMilestone,
    cyclePhaseStatus,
    addPhase,
    openRenamePhase,
    closeRenamePhase,
    saveRenamePhase,
    deletePhase,
    openRenameWorkflowLane,
    closeRenameWorkflowLane,
    saveRenameWorkflowLane,
    setTodoPhase,
    toggleSort,
    sortIndicatorFor,
    renderIconSortHeader,
    assigneeLabel,
    getAssignerInfo,
    renderWorkspaceInboxPanel,
    renderWorkspaceNotesPanel,
  };
}

export type WorkspaceScreen = ReturnType<typeof useWorkspaceScreen>;

// Sections rendered after the auth gate receive a non-null session.
export type SignedInWorkspaceScreen = Omit<WorkspaceScreen, 'session'> & { session: Session };
