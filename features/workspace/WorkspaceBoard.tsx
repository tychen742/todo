import { View, Text, TextInput, Pressable, ScrollView, Platform } from 'react-native';
import { DraggableList } from '../../components/DraggableList';
import { KanbanDragItem, KanbanDragProvider, KanbanDropLane } from '../../components/KanbanDrag';
import { KanbanCard } from '../../components/KanbanCard';
import { Filter, MoreHorizontal, Plus } from 'lucide-react-native';
import TodoItem from '../../components/TodoItem';
import type { WorkflowLaneKey } from '../../lib/types';
import { formatArchiveDate, formatPhaseDateRange } from '../../lib/calendar';
import { sortTodos, sortWorkflowTodos, workflowStageForTodo } from '../../lib/todos';
import { profileDisplayName } from '../../lib/display';
import { defaultVisibleTaskRows, completedDropTargetId } from './constants';
import { styles } from './styles';
import type { SignedInWorkspaceScreen } from './useWorkspaceScreen';

type WorkspaceBoardProps = Pick<
  SignedInWorkspaceScreen,
  | 'session'
  | 'phases'
  | 'projectViewMode'
  | 'workflowColumnLabels'
  | 'setAddingPhase'
  | 'columnInputs'
  | 'setColumnInputs'
  | 'backlogInputVisible'
  | 'setBacklogInputVisible'
  | 'projectsViewOpen'
  | 'teamsViewOpen'
  | 'notesViewOpen'
  | 'calendarViewOpen'
  | 'resourcesViewOpen'
  | 'dashboardViewOpen'
  | 'members'
  | 'newTodoAssignee'
  | 'setNewTodoAssignee'
  | 'todos'
  | 'input'
  | 'setInput'
  | 'quickCaptureFocused'
  | 'setQuickCaptureFocused'
  | 'sortField'
  | 'hoveredSortField'
  | 'setHoveredSortField'
  | 'projectFilter'
  | 'projectFilterPickerVisible'
  | 'setProjectFilterPickerVisible'
  | 'error'
  | 'message'
  | 'loading'
  | 'archivedTodos'
  | 'completedPaneTab'
  | 'setCompletedPaneTab'
  | 'rowPV'
  | 'rowH'
  | 'appTheme'
  | 'isProject'
  | 'isPersonal'
  | 'showInboxSidePanel'
  | 'selectedTeam'
  | 'hasLoadedCurrentTodos'
  | 'todoKanbanStage'
  | 'todoProjectAvatar'
  | 'memberById'
  | 'searching'
  | 'searchMatchesTodo'
  | 'active'
  | 'done'
  | 'orderedArchivedTodos'
  | 'completedPanelRowCount'
  | 'addTodo'
  | 'addTodoToPhase'
  | 'toggle'
  | 'openAssigneePicker'
  | 'openPriorityPicker'
  | 'openStatusPicker'
  | 'openProjectPicker'
  | 'openDueCalendar'
  | 'openEditModal'
  | 'archiveTodo'
  | 'unarchiveTodo'
  | 'handleDragEnd'
  | 'completeTodoFromDrag'
  | 'movePlanTodo'
  | 'moveWorkflowTodo'
  | 'cyclePhaseStatus'
  | 'openRenamePhase'
  | 'openRenameWorkflowLane'
  | 'toggleSort'
  | 'sortIndicatorFor'
  | 'renderIconSortHeader'
  | 'assigneeLabel'
  | 'getAssignerInfo'
  | 'renderWorkspaceInboxPanel'
>;

export function WorkspaceBoard({
  session,
  phases,
  projectViewMode,
  workflowColumnLabels,
  setAddingPhase,
  columnInputs,
  setColumnInputs,
  backlogInputVisible,
  setBacklogInputVisible,
  projectsViewOpen,
  teamsViewOpen,
  notesViewOpen,
  calendarViewOpen,
  resourcesViewOpen,
  dashboardViewOpen,
  members,
  newTodoAssignee,
  setNewTodoAssignee,
  todos,
  input,
  setInput,
  quickCaptureFocused,
  setQuickCaptureFocused,
  sortField,
  hoveredSortField,
  setHoveredSortField,
  projectFilter,
  projectFilterPickerVisible,
  setProjectFilterPickerVisible,
  error,
  message,
  loading,
  archivedTodos,
  completedPaneTab,
  setCompletedPaneTab,
  rowPV,
  rowH,
  appTheme,
  isProject,
  isPersonal,
  showInboxSidePanel,
  selectedTeam,
  hasLoadedCurrentTodos,
  todoKanbanStage,
  todoProjectAvatar,
  memberById,
  searching,
  searchMatchesTodo,
  active,
  done,
  orderedArchivedTodos,
  completedPanelRowCount,
  addTodo,
  addTodoToPhase,
  toggle,
  openAssigneePicker,
  openPriorityPicker,
  openStatusPicker,
  openProjectPicker,
  openDueCalendar,
  openEditModal,
  archiveTodo,
  unarchiveTodo,
  handleDragEnd,
  completeTodoFromDrag,
  movePlanTodo,
  moveWorkflowTodo,
  cyclePhaseStatus,
  openRenamePhase,
  openRenameWorkflowLane,
  toggleSort,
  sortIndicatorFor,
  renderIconSortHeader,
  assigneeLabel,
  getAssignerInfo,
  renderWorkspaceInboxPanel,
}: WorkspaceBoardProps) {
  return (
    <>
      {!projectsViewOpen && !teamsViewOpen && !notesViewOpen && !calendarViewOpen && !resourcesViewOpen && !dashboardViewOpen && (isProject ? (
        projectViewMode === 'plan' ? (
        <KanbanDragProvider onMove={(todoId, targetPhaseId, _targetWorkflowStatus, overTodoId) => movePlanTodo(todoId, targetPhaseId, overTodoId)}>
          {/* Backlog strip — one-line capture bar; tasks land here by default */}
          {(() => {
            const backlogTodos = todos.filter((t) => !t.phase_id);
            const backlogActive = sortTodos(backlogTodos.filter((t) => !t.done));
            return (
              <View style={styles.backlogStrip}>
                <Text style={styles.backlogLabel}>Backlog</Text>
                {backlogActive.length > 0 && (
                  <View style={styles.backlogCountBadge}>
                    <Text style={styles.backlogCountText}>{backlogActive.length}</Text>
                  </View>
                )}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.backlogItemsScroll}
                  contentContainerStyle={styles.backlogItemsContent}
                >
                  <KanbanDropLane
                    id="kanban-lane-backlog"
                    phaseId={null}
                    itemIds={backlogActive.map((todo) => todo.id)}
                    orientation="horizontal"
                  >
                    {backlogActive.map((todo) => (
                      <KanbanDragItem key={todo.id} id={todo.id} phaseId={null}>
                        <Pressable
                          onPress={() => openEditModal(todo)}
                          style={[styles.backlogChip, todo.is_milestone && styles.backlogChipMilestone]}
                        >
                          {todo.is_milestone && <Text style={styles.backlogMilestoneIcon}>◆</Text>}
                          <Text style={styles.backlogChipText} numberOfLines={1}>{todo.text}</Text>
                        </Pressable>
                      </KanbanDragItem>
                    ))}
                  </KanbanDropLane>
                </ScrollView>
                {backlogInputVisible ? (
                  <View>
                    <View style={styles.backlogInputRow}>
                      <TextInput
                        style={styles.backlogInput}
                        value={columnInputs['backlog'] ?? ''}
                        onChangeText={(v) => setColumnInputs((prev) => ({ ...prev, backlog: v }))}
                        placeholder="Task name..."
                        placeholderTextColor="#9ca3af"
                        autoFocus
                        maxLength={200}
                        returnKeyType="done"
                        onSubmitEditing={() => { addTodoToPhase(null); setBacklogInputVisible(false); }}
                      />
                      <Pressable
                        onPress={() => { addTodoToPhase(null); setBacklogInputVisible(false); }}
                        style={styles.backlogConfirmBtn}
                      >
                        <Text style={styles.backlogConfirmText}>Add</Text>
                      </Pressable>
                      <Pressable onPress={() => setBacklogInputVisible(false)} hitSlop={8}>
                        <Text style={styles.backlogCancelText}>✕</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable onPress={() => setBacklogInputVisible(true)} style={styles.backlogAddBtn}>
                    <Text style={styles.backlogAddBtnText}>+</Text>
                  </Pressable>
                )}
              </View>
            );
          })()}

          {/* Phase columns */}
          <ScrollView
            horizontal
            style={styles.kanban}
            contentContainerStyle={styles.kanbanContent}
            showsHorizontalScrollIndicator={false}
          >
            {!!error && <Text style={[styles.error, { alignSelf: 'flex-start' }]}>{error}</Text>}
            {phases.map((phase) => {
              const colActive = sortTodos(todos.filter((t) => !t.done && t.phase_id === phase.id));
              const colDone = sortTodos(todos.filter((t) => t.done && t.phase_id === phase.id));
              const dotColor = phase.status === 'active' ? '#6366f1' : phase.status === 'completed' ? '#16a34a' : '#9ca3af';
              const dateRange = formatPhaseDateRange(phase.planned_start, phase.planned_end);
              return (
                <View key={phase.id} style={styles.kanbanCol}>
                  <View style={styles.kanbanColHeader}>
                    <Pressable onPress={() => cyclePhaseStatus(phase)} hitSlop={8}>
                      <View style={[styles.kanbanStatusDot, { backgroundColor: dotColor }]} />
                    </Pressable>
                    <View style={styles.kanbanColMeta}>
                      <Text style={styles.kanbanColTitle}>{phase.name}</Text>
                      {!!dateRange && <Text style={styles.kanbanColDateRange}>{dateRange}</Text>}
                    </View>
                    {colActive.length > 0 && (
                      <View style={styles.kanbanCountBadge}>
                        <Text style={styles.kanbanCountText}>{colActive.length}</Text>
                      </View>
                    )}
                    <Pressable
                      onPress={() => openRenamePhase(phase)}
                      style={styles.kanbanColMenuButton}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`${phase.name} column settings`}
                    >
                      <MoreHorizontal size={16} color="#9ca3af" />
                    </Pressable>
                  </View>
                  <View style={styles.kanbanColInput}>
                    <TextInput
                      style={styles.kanbanInputField}
                      value={columnInputs[phase.id] ?? ''}
                      onChangeText={(v) => setColumnInputs((prev) => ({ ...prev, [phase.id]: v }))}
                      placeholder="Add a task..."
                      placeholderTextColor="#9ca3af"
                      onSubmitEditing={() => addTodoToPhase(phase.id)}
                      returnKeyType="done"
                    />
                    <Pressable onPress={() => addTodoToPhase(phase.id)} style={styles.kanbanAddBtn}>
                      <Text style={styles.kanbanAddBtnText}>+</Text>
                    </Pressable>
                  </View>
                  <ScrollView style={styles.kanbanColBody} showsVerticalScrollIndicator={false}>
                    <KanbanDropLane
                      id={`kanban-lane-${phase.id}`}
                      phaseId={phase.id}
                      itemIds={colActive.map((todo) => todo.id)}
                    >
                      {colActive.map((todo) => (
                        <KanbanDragItem key={todo.id} id={todo.id} phaseId={phase.id}>
                          <KanbanCard todo={todo}
                            assigneeEmail={members.length > 0 && todo.assigned_to ? memberById.get(todo.assigned_to)?.email ?? null : null}
                            onToggle={() => toggle(todo.id)} onDelete={() => archiveTodo(todo.id)}
                            onEdit={() => openEditModal(todo)}
                            onCycleAssignee={() => openAssigneePicker(todo)} />
                        </KanbanDragItem>
                      ))}
                    </KanbanDropLane>
                    {colDone.length > 0 && <>
                      <View style={styles.sectionDivider}>
                        <View style={styles.sectionDividerLine} />
                        <Text style={styles.sectionLabel}>Done</Text>
                        <View style={styles.sectionDividerLine} />
                      </View>
                      {colDone.map((todo) => (
                        <KanbanCard key={todo.id} todo={todo}
                          assigneeEmail={members.length > 0 && todo.assigned_to ? memberById.get(todo.assigned_to)?.email ?? null : null}
                          onToggle={() => toggle(todo.id)} onDelete={() => archiveTodo(todo.id)}
                          onEdit={() => openEditModal(todo)}
                          onCycleAssignee={() => openAssigneePicker(todo)} />
                      ))}
                    </>}
                  </ScrollView>
                </View>
              );
            })}
            <Pressable onPress={() => setAddingPhase(true)} style={styles.kanbanAddCol}>
              <Text style={styles.kanbanAddColIcon}>+</Text>
              <Text style={styles.kanbanAddColText}>Add Column</Text>
            </Pressable>
          </ScrollView>
        </KanbanDragProvider>
        ) : (
          <KanbanDragProvider onMove={(todoId, _targetPhaseId, targetWorkflowStatus, overTodoId) => {
            if (targetWorkflowStatus) moveWorkflowTodo(todoId, targetWorkflowStatus as WorkflowLaneKey, overTodoId);
          }}>
            <ScrollView
              horizontal
              style={styles.kanban}
              contentContainerStyle={styles.kanbanContent}
              showsHorizontalScrollIndicator={false}
            >
              {!!error && <Text style={[styles.error, { alignSelf: 'flex-start' }]}>{error}</Text>}
              {(() => {
                const lanes = [
                  {
                    key: 'backlog',
                    title: workflowColumnLabels.backlog,
                    phaseId: null,
                    workflowStatus: 'backlog' as WorkflowLaneKey,
                    items: sortWorkflowTodos(todos.filter((todo) =>
                      workflowStageForTodo(todo) === 'backlog'
                    )),
                  },
                  {
                    key: 'doing',
                    title: workflowColumnLabels.doing,
                    phaseId: null,
                    workflowStatus: 'doing' as WorkflowLaneKey,
                    items: sortWorkflowTodos(todos.filter((todo) => workflowStageForTodo(todo) === 'doing')),
                  },
                  {
                    key: 'review',
                    title: workflowColumnLabels.review,
                    phaseId: null,
                    workflowStatus: 'review' as WorkflowLaneKey,
                    items: sortWorkflowTodos(todos.filter((todo) => workflowStageForTodo(todo) === 'review')),
                  },
                  {
                    key: 'done',
                    title: workflowColumnLabels.done,
                    phaseId: null,
                    workflowStatus: 'done' as WorkflowLaneKey,
                    items: sortWorkflowTodos(todos.filter((todo) => workflowStageForTodo(todo) === 'done')),
                  },
                ];

                return lanes.map((lane) => (
                  <View key={lane.key} style={styles.kanbanCol}>
                    <View style={styles.kanbanColHeader}>
                      <View style={[
                        styles.kanbanStatusDot,
                        { backgroundColor: lane.key === 'done' ? '#16a34a' : lane.key === 'doing' ? '#6366f1' : lane.key === 'review' ? '#f59e0b' : '#9ca3af' },
                      ]} />
                      <View style={styles.kanbanColMeta}>
                        <Text style={styles.kanbanColTitle}>{lane.title}</Text>
                        <Text style={styles.kanbanColDateRange}>
                          {lane.key === 'backlog'
                            ? 'Ready for work'
                            : lane.key === 'done'
                              ? 'Completed'
                              : 'Workflow state'}
                        </Text>
                      </View>
                      <View style={styles.kanbanCountBadge}>
                        <Text style={styles.kanbanCountText}>{lane.items.length}</Text>
                      </View>
                      <Pressable
                        onPress={() => openRenameWorkflowLane(lane.key as WorkflowLaneKey)}
                        style={styles.kanbanColMenuButton}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Rename ${lane.title} column`}
                      >
                        <MoreHorizontal size={16} color="#9ca3af" />
                      </Pressable>
                    </View>
                    <ScrollView style={styles.kanbanColBody} showsVerticalScrollIndicator={false}>
                      <KanbanDropLane
                        id={`workflow-lane-${lane.key}`}
                        phaseId={lane.phaseId}
                        workflowStatus={lane.workflowStatus}
                        itemIds={lane.items.map((todo) => todo.id)}
                      >
                        {lane.items.map((todo) => (
                          <KanbanDragItem key={todo.id} id={todo.id} phaseId={null} workflowStatus={workflowStageForTodo(todo)}>
                            <KanbanCard todo={todo}
                              assigneeEmail={members.length > 0 && todo.assigned_to ? memberById.get(todo.assigned_to)?.email ?? null : null}
                              onToggle={() => toggle(todo.id)} onDelete={() => archiveTodo(todo.id)}
                              onEdit={() => openEditModal(todo)}
                              onCycleAssignee={() => openAssigneePicker(todo)} />
                          </KanbanDragItem>
                        ))}
                      </KanbanDropLane>
                    </ScrollView>
                  </View>
                ));
              })()}
            </ScrollView>
          </KanbanDragProvider>
        )
      ) : (
        <>
          <View style={[styles.inputBar, showInboxSidePanel && styles.inputBarWithInboxSidePanel]}>
            <View style={styles.todoInputWrap}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: appTheme.inputBackground,
                    borderColor: quickCaptureFocused ? appTheme.inputFocusBorder : appTheme.inputBorder,
                  },
                ]}
                value={input}
                onChangeText={setInput}
                placeholder="Add a todo..."
                placeholderTextColor="#9ca3af"
                onSubmitEditing={addTodo}
                onFocus={() => setQuickCaptureFocused(true)}
                onBlur={() => setQuickCaptureFocused(false)}
                returnKeyType="done"
              />

              {selectedTeam && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                  <Pressable
                    onPress={() => setNewTodoAssignee(null)}
                    style={[styles.assigneePill, newTodoAssignee === null && styles.assigneePillActive]}
                  >
                    <Text style={[styles.assigneePillText, newTodoAssignee === null && styles.assigneePillTextActive]}>
                      Unassigned
                    </Text>
                  </Pressable>
                  {members.map((member) => (
                    <Pressable
                      key={member.user_id}
                      onPress={() => setNewTodoAssignee(member.user_id)}
                      style={[styles.assigneePill, newTodoAssignee === member.user_id && styles.assigneePillActive]}
                    >
                      <Text style={[styles.assigneePillText, newTodoAssignee === member.user_id && styles.assigneePillTextActive]}>
                        {member.user_id === session.user.id ? 'Me' : profileDisplayName(member)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
            <Pressable
              onPress={addTodo}
              style={({ pressed }) => [
                styles.addBtn,
                { backgroundColor: appTheme.accent, borderColor: appTheme.accentStrong },
                pressed && styles.addBtnPressed,
              ]}
            >
              <Plus size={16} color="#fff" strokeWidth={2.6} />
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          </View>

          <View style={[styles.todoBoard, showInboxSidePanel && styles.todoBoardWithAssigned]}>
            <View style={styles.todoListPane}>
              {isPersonal && !showInboxSidePanel && (
                renderWorkspaceInboxPanel('inline')
              )}

              <View style={styles.activeTasksBox}>
                <View style={styles.sortBar}>
                  {Platform.OS === 'web' && <View style={styles.sortHandleSpacer} />}
                  <View style={styles.sortCheckboxSpacer} />
                  <Pressable
                    onPress={() => toggleSort('text')}
                    onHoverIn={() => setHoveredSortField('text')}
                    onHoverOut={() => setHoveredSortField((current) => current === 'text' ? null : current)}
                    style={[
                      styles.sortColTask,
                      styles.sortColInner,
                      hoveredSortField === 'text' && styles.sortTextHeaderHovered,
                    ]}
                  >
                    <Text style={[styles.sortColLabel, sortField === 'text' && styles.sortColLabelActive]}>TASK ({active.length})</Text>
                    {sortField === 'text' && <Text style={[styles.sortColIndicator, styles.sortColLabelActive]}>{sortIndicatorFor('text')}</Text>}
                  </Pressable>
                  <View style={styles.sortPriorityGroup}>
                    {renderIconSortHeader('priority', 'Sort by priority', styles.sortColPriority)}
                    {renderIconSortHeader('assigned_by', 'Sort by assigned by', styles.sortColAssignedBy)}
                  </View>
                  <View style={styles.sortStatusGap}>
                    <Pressable
                      onPress={() => setProjectFilterPickerVisible(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Filter by project"
                      accessibilityState={{ expanded: projectFilterPickerVisible, selected: projectFilter !== 'all' }}
                      style={[styles.sortColProject, styles.sortIconHeader, projectFilter !== 'all' && styles.sortIconHeaderActive]}
                    >
                      <Filter size={13} color={projectFilter === 'all' ? '#9ca3af' : '#4338ca'} strokeWidth={2.5} />
                    </Pressable>
                    {renderIconSortHeader('status', 'Sort by status', styles.sortColStatus)}
                  </View>
                  {renderIconSortHeader('due_date', 'Sort by due date', styles.sortColDue)}
                  {renderIconSortHeader('age', 'Sort by task age', styles.sortColAgeGap)}
                  <View style={styles.sortArchiveGap} />
                </View>

                <DraggableList
                  data={active}
                  keyExtractor={(todo) => todo.id}
                  onDragEnd={handleDragEnd}
                  onExternalDrop={(todo) => completeTodoFromDrag(todo)}
                  externalDropTargetId={completedDropTargetId}
                  draggable
                  style={[styles.activeTasksList, { maxHeight: rowH * defaultVisibleTaskRows }]}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item: todo, drag, isActive }) => {
                    const assigner = getAssignerInfo(todo);
                    const isSearchDimmed = searching && !searchMatchesTodo(todo);
                    return (
                      <TodoItem
                        text={todo.text} done={todo.done} priority={todo.priority}
                        scheduledStartAt={todo.scheduled_start_at}
                        startedWorkAt={todo.started_work_at}
                        dueDate={todo.due_date} note={todo.note} createdAt={todo.created_at}
                        assignedAt={todo.assigned_at ?? undefined}
                        assignedLabel={isPersonal ? undefined : assigneeLabel(todo.assigned_to)}
                        kanbanStage={todoKanbanStage(todo)}
                        projectAvatar={todoProjectAvatar(todo)}
                        assignerInitials={assigner?.initials} assignerColor={assigner?.color}
                        assignerAvatarUrl={assigner?.avatarUrl}
                        assignerName={assigner?.name}
                        onToggle={() => toggle(todo.id)}
                        onOpenEdit={() => openEditModal(todo)}
                        onStartWork={(event) => openStatusPicker(todo, event)}
                        onAssign={isPersonal ? undefined : () => openAssigneePicker(todo)}
                        onProject={!isProject ? () => openProjectPicker(todo) : undefined}
                        onPriority={(event) => openPriorityPicker(todo, event)} onDueDate={() => openDueCalendar(todo)}
                        onArchive={() => archiveTodo(todo.id)}
                        onDrag={drag} isDragging={isActive ?? false}
                        searchDimmed={isSearchDimmed}
                        rowPV={rowPV}
                      />
                    );
                  }}
                  ListHeaderComponent={
                    <>
                      {!!error && <Text style={styles.error}>{error}</Text>}
                      {!!message && <Text style={styles.message}>{message}</Text>}
                      {loading && !error && <Text style={styles.empty}>Loading todos...</Text>}
                      {hasLoadedCurrentTodos && active.length === 0 && done.length === 0 && (
                        <Text style={styles.empty}>No todos yet. Add one above.</Text>
                      )}
                    </>
                  }
                />
              </View>

              {(done.length > 0 || archivedTodos.length > 0) && (
                <View nativeID={completedDropTargetId} style={styles.completedBox}>
                  <View style={styles.completedBoxHeader}>
                    <Pressable
                      onPress={() => setCompletedPaneTab('completed')}
                      style={[styles.completedPaneTab, completedPaneTab === 'completed' && styles.completedPaneTabActive]}
                    >
                      <Text style={[styles.completedPaneTabText, completedPaneTab === 'completed' && styles.completedPaneTabTextActive]}>
                        Completed ({done.length})
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setCompletedPaneTab('deleted')}
                      style={[styles.completedPaneTab, completedPaneTab === 'deleted' && styles.completedPaneTabActive]}
                    >
                      <Text style={[styles.completedPaneTabText, completedPaneTab === 'deleted' && styles.completedPaneTabTextActive]}>
                        Deleted ({archivedTodos.length})
                      </Text>
                    </Pressable>
                  </View>
                  <ScrollView
                    style={[styles.completedBoxScroll, { maxHeight: rowH * 3 }]}
                    scrollEnabled={completedPanelRowCount * rowH > rowH * 3}
                  >
                    {completedPaneTab === 'completed' && done.map((todo) => {
                      const assigner = getAssignerInfo(todo);
                      const isSearchDimmed = searching && !searchMatchesTodo(todo);
                      return (
                        <TodoItem
                          key={todo.id} text={todo.text} done={todo.done} priority={todo.priority}
                          scheduledStartAt={todo.scheduled_start_at}
                          startedWorkAt={todo.started_work_at}
                          dueDate={todo.due_date} note={todo.note} createdAt={todo.created_at}
                          assignedAt={todo.assigned_at ?? undefined}
                          assignedLabel={isPersonal ? undefined : assigneeLabel(todo.assigned_to)}
                          kanbanStage={todoKanbanStage(todo)}
                          projectAvatar={todoProjectAvatar(todo)}
                          assignerInitials={assigner?.initials} assignerColor={assigner?.color}
                          assignerAvatarUrl={assigner?.avatarUrl}
                          assignerName={assigner?.name}
                          onToggle={() => toggle(todo.id)}
                          onOpenEdit={() => openEditModal(todo)}
                          onStartWork={(event) => openStatusPicker(todo, event)}
                          onAssign={isPersonal ? undefined : () => openAssigneePicker(todo)}
                          onProject={!isProject ? () => openProjectPicker(todo) : undefined}
                          onPriority={(event) => openPriorityPicker(todo, event)} onDueDate={() => openDueCalendar(todo)}
                          onArchive={() => archiveTodo(todo.id)}
                          reserveDragSpace={Platform.OS === 'web'}
                          searchDimmed={isSearchDimmed}
                          rowPaddingRight={done.length > 3 ? 0 : 2}
                          rowPV={rowPV}
                        />
                      );
                    })}
                    {completedPaneTab === 'completed' && done.length === 0 && (
                      <Text style={styles.completedPaneEmpty}>No completed todos yet.</Text>
                    )}
                    {completedPaneTab === 'deleted' && orderedArchivedTodos.map((todo) => (
                      <View
                        key={todo.id}
                        style={[styles.archivedRow, searching && !searchMatchesTodo(todo) && styles.searchResultDimmed]}
                      >
                        <Text style={styles.archivedText} numberOfLines={1}>{todo.text}</Text>
                        <Text style={styles.archivedDateText}>{formatArchiveDate(todo.archived_at)}</Text>
                        <Pressable onPress={() => unarchiveTodo(todo.id)} style={styles.unarchiveBtn}>
                          <Text style={styles.unarchiveBtnText}>Restore</Text>
                        </Pressable>
                      </View>
                    ))}
                    {completedPaneTab === 'deleted' && archivedTodos.length === 0 && (
                      <Text style={styles.completedPaneEmpty}>No deleted todos.</Text>
                    )}
                  </ScrollView>
                </View>
              )}

            </View>

            {showInboxSidePanel && (
              renderWorkspaceInboxPanel('side')
            )}
          </View>
        </>
      ))}
    </>
  );
}
