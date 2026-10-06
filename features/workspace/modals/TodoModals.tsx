import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Modal } from 'react-native';
import { pickAvatarColor } from '../../../lib/avatar';
import { formatDateValue, isSameDate, monthLabel, parseDateValue } from '../../../lib/calendar';
import {
  priorities,
  priorityColors,
  workflowStageColors,
  workflowStageForTodo,
  workflowStages,
} from '../../../lib/todos';
import { profileDisplayName } from '../../../lib/display';
import { styles } from '../styles';
import type { SignedInWorkspaceScreen } from '../useWorkspaceScreen';

type PriorityPickerModalProps = Pick<
  SignedInWorkspaceScreen,
  | 'priorityPicker'
  | 'setPriorityPicker'
  | 'priorityPopoverPosition'
  | 'setTodoPriority'
>;

export function PriorityPickerModal({
  priorityPicker,
  setPriorityPicker,
  priorityPopoverPosition,
  setTodoPriority,
}: PriorityPickerModalProps) {
  return (
    <>
      <Modal
        visible={!!priorityPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setPriorityPicker(null)}
      >
        <Pressable style={styles.popoverBackdrop} onPress={() => setPriorityPicker(null)}>
          {priorityPicker && priorityPopoverPosition && (
            <Pressable
              style={[styles.priorityPopover, priorityPopoverPosition]}
              onPress={(event) => event.stopPropagation()}
            >
              {priorities.map((priority) => {
                const isActive = priorityPicker.todo.priority === priority;
                return (
                  <Pressable
                    key={priority}
                    onPress={() => setTodoPriority(priorityPicker.todo, priority)}
                    style={[styles.priorityPopoverOption, isActive && styles.priorityPopoverOptionActive]}
                  >
                    <View style={[styles.priorityPopoverSwatch, { backgroundColor: priorityColors[priority] }]} />
                    <Text style={[styles.priorityPopoverLabel, isActive && styles.priorityPopoverLabelActive]}>
                      {priority[0].toUpperCase() + priority.slice(1)}
                    </Text>
                    {isActive && <Text style={styles.priorityPopoverCheck}>✓</Text>}
                  </Pressable>
                );
              })}
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </>
  );
}

type StatusPickerModalProps = Pick<
  SignedInWorkspaceScreen,
  | 'workflowColumnLabels'
  | 'statusPicker'
  | 'setStatusPicker'
  | 'statusPopoverPosition'
  | 'setTodoWorkflowStage'
>;

export function StatusPickerModal({
  workflowColumnLabels,
  statusPicker,
  setStatusPicker,
  statusPopoverPosition,
  setTodoWorkflowStage,
}: StatusPickerModalProps) {
  return (
    <>
      <Modal
        visible={!!statusPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusPicker(null)}
      >
        <Pressable style={styles.popoverBackdrop} onPress={() => setStatusPicker(null)}>
          {statusPicker && statusPopoverPosition && (
            <Pressable
              style={[styles.priorityPopover, statusPopoverPosition]}
              onPress={(event) => event.stopPropagation()}
            >
              {workflowStages.map((stage) => {
                const isActive = workflowStageForTodo(statusPicker.todo) === stage;
                return (
                  <Pressable
                    key={stage}
                    onPress={() => setTodoWorkflowStage(statusPicker.todo, stage)}
                    style={[styles.priorityPopoverOption, isActive && styles.priorityPopoverOptionActive]}
                  >
                    <View style={[styles.priorityPopoverSwatch, { backgroundColor: workflowStageColors[stage] }]} />
                    <Text style={[styles.priorityPopoverLabel, isActive && styles.priorityPopoverLabelActive]}>
                      {workflowColumnLabels[stage]}
                    </Text>
                    {isActive && <Text style={styles.priorityPopoverCheck}>✓</Text>}
                  </Pressable>
                );
              })}
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </>
  );
}

type ProjectFilterModalProps = Pick<
  SignedInWorkspaceScreen,
  | 'projectFilter'
  | 'setProjectFilter'
  | 'projectFilterPickerVisible'
  | 'setProjectFilterPickerVisible'
  | 'projectFilterProjects'
>;

export function ProjectFilterModal({
  projectFilter,
  setProjectFilter,
  projectFilterPickerVisible,
  setProjectFilterPickerVisible,
  projectFilterProjects,
}: ProjectFilterModalProps) {
  return (
    <>
      <Modal
        visible={projectFilterPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProjectFilterPickerVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setProjectFilterPickerVisible(false)}>
          <Pressable style={styles.projectFilterPicker} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.projectFilterTitle}>Filter by project</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {([
                ['all', 'All projects'],
                ['none', 'No project'],
              ] as const).map(([filter, label]) => {
                const isSelected = projectFilter === filter;
                return (
                  <Pressable
                    key={filter}
                    onPress={() => {
                      setProjectFilter(filter);
                      setProjectFilterPickerVisible(false);
                    }}
                    style={[styles.projectFilterOption, isSelected && styles.projectFilterOptionActive]}
                  >
                    <Text style={[styles.projectFilterOptionLabel, isSelected && styles.projectFilterOptionLabelActive]}>{label}</Text>
                    {isSelected && <Text style={styles.projectFilterCheck}>✓</Text>}
                  </Pressable>
                );
              })}
              {projectFilterProjects.map((project) => {
                const isSelected = projectFilter === project.id;
                return (
                  <Pressable
                    key={project.id}
                    onPress={() => {
                      setProjectFilter(project.id);
                      setProjectFilterPickerVisible(false);
                    }}
                    style={[styles.projectFilterOption, isSelected && styles.projectFilterOptionActive]}
                  >
                    <Text style={[styles.projectFilterOptionLabel, isSelected && styles.projectFilterOptionLabelActive]} numberOfLines={1}>
                      {project.name}
                    </Text>
                    {isSelected && <Text style={styles.projectFilterCheck}>✓</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

type AssignScheduleModalProps = Pick<
  SignedInWorkspaceScreen,
  | 'session'
  | 'assigneeTodo'
  | 'assigneePickerUserId'
  | 'setAssigneePickerUserId'
  | 'assigneePickerDueDate'
  | 'setAssigneePickerDueDate'
  | 'assigneePickerPriority'
  | 'setAssigneePickerPriority'
  | 'assigneePickerMonth'
  | 'setAssigneePickerMonth'
  | 'members'
  | 'assigneePickerCalendarDays'
  | 'closeAssigneePicker'
  | 'confirmAssignment'
>;

export function AssignScheduleModal({
  session,
  assigneeTodo,
  assigneePickerUserId,
  setAssigneePickerUserId,
  assigneePickerDueDate,
  setAssigneePickerDueDate,
  assigneePickerPriority,
  setAssigneePickerPriority,
  assigneePickerMonth,
  setAssigneePickerMonth,
  members,
  assigneePickerCalendarDays,
  closeAssigneePicker,
  confirmAssignment,
}: AssignScheduleModalProps) {
  return (
    <>
      <Modal
        visible={!!assigneeTodo}
        transparent
        animationType="fade"
        onRequestClose={closeAssigneePicker}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeAssigneePicker}>
          <Pressable style={[styles.calendarCard, { maxHeight: '85%' }]}>
            <Text style={styles.editModalTitle}>Assign & Schedule</Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Pressable
                onPress={() => setAssigneePickerUserId(null)}
                style={styles.assigneePickerRow}
              >
                <View style={[styles.assigneePickerAvatar, { backgroundColor: '#e5e7eb' }]}>
                  <Text style={styles.assigneePickerAvatarText}>—</Text>
                </View>
                <Text style={styles.assigneePickerName}>Unassigned</Text>
                {!assigneePickerUserId && (
                  <Text style={styles.assigneePickerCheck}>✓</Text>
                )}
              </Pressable>

              {members.map((m) => {
                const name = profileDisplayName(m);
                const isMe = m.user_id === session?.user.id;
                const isSelected = assigneePickerUserId === m.user_id;
                return (
                  <Pressable
                    key={m.user_id}
                    onPress={() => setAssigneePickerUserId(m.user_id)}
                    style={styles.assigneePickerRow}
                  >
                    <View style={[styles.assigneePickerAvatar, { backgroundColor: pickAvatarColor(m.email) }]}>
                      <Text style={styles.assigneePickerAvatarText}>
                        {(name[0] ?? '?').toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.assigneePickerName} numberOfLines={1}>
                      {isMe ? `${name} (me)` : name}
                    </Text>
                    {isSelected && <Text style={styles.assigneePickerCheck}>✓</Text>}
                  </Pressable>
                );
              })}

              <View style={styles.pickerSectionDivider}>
                <View style={styles.pickerSectionLine} />
                <Text style={styles.pickerSectionLabel}>Priority</Text>
                <View style={styles.pickerSectionLine} />
              </View>
              <View style={styles.priorityPickerRow}>
                {priorities.map((p) => {
                  const isActive = assigneePickerPriority === p;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => setAssigneePickerPriority(p)}
                      style={[
                        styles.priorityPickerBtn,
                        isActive
                          ? { backgroundColor: priorityColors[p], borderColor: priorityColors[p] }
                          : { backgroundColor: '#f3f4f6', borderColor: 'transparent' },
                      ]}
                    >
                      <Text style={[styles.priorityPickerLabel, { color: isActive ? '#fff' : priorityColors[p] }]}>
                        {p[0].toUpperCase() + p.slice(1)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.pickerSectionDivider}>
                <View style={styles.pickerSectionLine} />
                <Text style={styles.pickerSectionLabel}>Due Date</Text>
                <View style={styles.pickerSectionLine} />
              </View>

              <View style={styles.calendarHeader}>
                <Pressable
                  onPress={() => setAssigneePickerMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                  style={styles.calendarNavBtn}
                >
                  <Text style={styles.calendarNavText}>‹</Text>
                </Pressable>
                <Text style={styles.calendarTitle}>{monthLabel(assigneePickerMonth)}</Text>
                <Pressable
                  onPress={() => setAssigneePickerMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                  style={styles.calendarNavBtn}
                >
                  <Text style={styles.calendarNavText}>›</Text>
                </Pressable>
              </View>
              <View style={styles.weekdayRow}>
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                  <Text key={d} style={styles.weekdayText}>{d}</Text>
                ))}
              </View>
              <View style={styles.calendarGrid}>
                {assigneePickerCalendarDays.map((date, index) => {
                  const selectedDate = parseDateValue(assigneePickerDueDate);
                  const isSelected = !!date && !!selectedDate && isSameDate(date, selectedDate);
                  const todayDate = new Date(); todayDate.setHours(0,0,0,0);
                  const isCurrentDay = !!date && isSameDate(date, todayDate);
                  return (
                    <Pressable
                      key={date ? formatDateValue(date) : `blank-${index}`}
                      onPress={() => date && setAssigneePickerDueDate(
                        assigneePickerDueDate && isSameDate(date, parseDateValue(assigneePickerDueDate)!)
                          ? null
                          : formatDateValue(date)
                      )}
                      style={[
                        styles.calendarDay,
                        !date && styles.calendarDayBlank,
                        isCurrentDay && styles.calendarDayToday,
                        isSelected && styles.calendarDaySelected,
                      ]}
                    >
                      <Text style={[
                        styles.calendarDayText,
                        isCurrentDay && styles.calendarDayTodayText,
                        isSelected && styles.calendarDaySelectedText,
                      ]}>
                        {date?.getDate() ?? ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {assigneePickerDueDate && (
                <Pressable onPress={() => setAssigneePickerDueDate(null)} style={{ alignItems: 'center', paddingVertical: 6 }}>
                  <Text style={styles.calendarCancelText}>Clear date</Text>
                </Pressable>
              )}
            </ScrollView>

            <View style={[styles.editModalActions, { marginTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e7eb', paddingTop: 12 }]}>
              <Pressable onPress={closeAssigneePicker}>
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmAssignment} style={styles.pickerConfirmBtn}>
                <Text style={styles.pickerConfirmText}>Assign</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

type DueDateModalProps = Pick<
  SignedInWorkspaceScreen,
  | 'dueTodo'
  | 'calendarMonth'
  | 'calendarDays'
  | 'closeDueCalendar'
  | 'moveCalendarMonth'
  | 'chooseDueDate'
>;

export function DueDateModal({
  dueTodo,
  calendarMonth,
  calendarDays,
  closeDueCalendar,
  moveCalendarMonth,
  chooseDueDate,
}: DueDateModalProps) {
  return (
    <>
      <Modal
        visible={!!dueTodo}
        transparent
        animationType="fade"
        onRequestClose={closeDueCalendar}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeDueCalendar}>
          <Pressable style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <Pressable onPress={() => moveCalendarMonth(-1)} style={styles.calendarNavBtn}>
                <Text style={styles.calendarNavText}>‹</Text>
              </Pressable>
              <Text style={styles.calendarTitle}>{monthLabel(calendarMonth)}</Text>
              <Pressable onPress={() => moveCalendarMonth(1)} style={styles.calendarNavBtn}>
                <Text style={styles.calendarNavText}>›</Text>
              </Pressable>
            </View>

            <View style={styles.weekdayRow}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <Text key={day} style={styles.weekdayText}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarDays.map((date, index) => {
                const selectedDate = parseDateValue(dueTodo?.due_date ?? null);
                const today = new Date();
                const isSelected = !!date && !!selectedDate && isSameDate(date, selectedDate);
                const isCurrentDay = !!date && isSameDate(date, today);

                return (
                  <Pressable
                    key={date ? formatDateValue(date) : `blank-${index}`}
                    disabled={!date}
                    onPress={() => date && chooseDueDate(formatDateValue(date))}
                    style={[
                      styles.calendarDay,
                      !date && styles.calendarDayBlank,
                      isCurrentDay && styles.calendarDayToday,
                      isSelected && styles.calendarDaySelected,
                    ]}
                  >
                    {!!date && (
                      <Text
                        style={[
                          styles.calendarDayText,
                          isCurrentDay && styles.calendarDayTodayText,
                          isSelected && styles.calendarDaySelectedText,
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.calendarActions}>
              <Pressable onPress={() => chooseDueDate(formatDateValue(new Date()))}>
                <Text style={styles.calendarActionText}>Today</Text>
              </Pressable>
              <Pressable onPress={() => chooseDueDate(null)}>
                <Text style={styles.calendarActionText}>Clear</Text>
              </Pressable>
              <Pressable onPress={closeDueCalendar}>
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

type EditTodoModalProps = Pick<
  SignedInWorkspaceScreen,
  | 'height'
  | 'editTodo'
  | 'isCreatingTodo'
  | 'editDraftText'
  | 'setEditDraftText'
  | 'editDraftNote'
  | 'setEditDraftNote'
  | 'editDraftDueDate'
  | 'setEditDraftDueDate'
  | 'editDraftDueDateMonth'
  | 'setEditDraftDueDateMonth'
  | 'editDraftPriority'
  | 'setEditDraftPriority'
  | 'editDraftProjectId'
  | 'setEditDraftProjectId'
  | 'editDraftAssignedTo'
  | 'setEditDraftAssignedTo'
  | 'isProject'
  | 'activeProjects'
  | 'editDraftCalendarDays'
  | 'editAssigneeOptions'
  | 'closeEditModal'
  | 'saveEditModal'
  | 'archiveTodo'
  | 'toggleMilestone'
>;

export function EditTodoModal({
  height,
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
  isProject,
  activeProjects,
  editDraftCalendarDays,
  editAssigneeOptions,
  closeEditModal,
  saveEditModal,
  archiveTodo,
  toggleMilestone,
}: EditTodoModalProps) {
  return (
    <>
      <Modal
        visible={!!editTodo}
        transparent
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeEditModal}>
          <Pressable style={[styles.calendarCard, styles.editTodoCard]}>
            <View style={styles.editTodoHeader}>
              <Text style={styles.editModalTitle}>{isCreatingTodo ? 'New Todo' : 'Edit Todo'}</Text>
            </View>
            <ScrollView
              style={[styles.editTodoScroll, { maxHeight: Math.max(320, Math.min(560, height - 240)) }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.editTodoScrollContent}
            >
              <View style={styles.editTodoFieldGroup}>
                <TextInput
                  style={[styles.editModalInput, styles.editTodoTaskInput]}
                  value={editDraftText}
                  onChangeText={setEditDraftText}
                  placeholder="Task"
                  placeholderTextColor="#9ca3af"
                  returnKeyType="done"
                  autoFocus
                />
                <TextInput
                  style={[styles.editModalInput, styles.editModalNoteInput]}
                  value={editDraftNote}
                  onChangeText={setEditDraftNote}
                  placeholder="Add a note..."
                  placeholderTextColor="#9ca3af"
                  multiline
                />
              </View>

              <View style={styles.editTodoSection}>
                <Text style={styles.editTodoSectionLabel}>Priority</Text>
                <View style={styles.priorityPickerRow}>
                  {priorities.map((p) => {
                    const isActive = editDraftPriority === p;
                    return (
                      <Pressable
                        key={p}
                        onPress={() => setEditDraftPriority(p)}
                        style={[
                          styles.priorityPickerBtn,
                          isActive
                            ? { backgroundColor: priorityColors[p], borderColor: priorityColors[p] }
                            : { backgroundColor: '#f3f4f6', borderColor: 'transparent' },
                        ]}
                      >
                        <Text style={[styles.priorityPickerLabel, { color: isActive ? '#fff' : priorityColors[p] }]}>
                          {p[0].toUpperCase() + p.slice(1)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.editTodoSection}>
                <View style={styles.editTodoSectionHeader}>
                  <Text style={styles.editTodoSectionLabel}>Due date</Text>
                  <Pressable onPress={() => setEditDraftDueDate(null)} style={styles.clearDateInlineButton}>
                    <Text style={styles.calendarCancelText}>Clear Date</Text>
                  </Pressable>
                </View>
                <View style={styles.editTodoCalendarPanel}>
                  <View style={styles.calendarHeader}>
                    <Pressable
                      onPress={() => setEditDraftDueDateMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                      style={styles.calendarNavBtn}
                    >
                      <Text style={styles.calendarNavText}>‹</Text>
                    </Pressable>
                    <Text style={styles.calendarTitle}>{monthLabel(editDraftDueDateMonth)}</Text>
                    <Pressable
                      onPress={() => setEditDraftDueDateMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                      style={styles.calendarNavBtn}
                    >
                      <Text style={styles.calendarNavText}>›</Text>
                    </Pressable>
                  </View>
                  <View style={styles.weekdayRow}>
                    {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                      <Text key={d} style={styles.weekdayText}>{d}</Text>
                    ))}
                  </View>
                  <View style={styles.calendarGrid}>
                    {editDraftCalendarDays.map((date, index) => {
                      const selectedDate = parseDateValue(editDraftDueDate);
                      const isSelected = !!date && !!selectedDate && isSameDate(date, selectedDate);
                      const todayDate = new Date(); todayDate.setHours(0,0,0,0);
                      const isCurrentDay = !!date && isSameDate(date, todayDate);
                      return (
                        <Pressable
                          key={date ? formatDateValue(date) : `blank-${index}`}
                          onPress={() => date && setEditDraftDueDate(
                            editDraftDueDate && isSameDate(date, parseDateValue(editDraftDueDate)!)
                              ? null : formatDateValue(date)
                          )}
                          style={[
                            styles.calendarDay,
                            !date && styles.calendarDayBlank,
                            isCurrentDay && styles.calendarDayToday,
                            isSelected && styles.calendarDaySelected,
                          ]}
                        >
                          <Text style={[
                            styles.calendarDayText,
                            isCurrentDay && styles.calendarDayTodayText,
                            isSelected && styles.calendarDaySelectedText,
                          ]}>
                            {date?.getDate() ?? ''}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>

              {!isProject && activeProjects.length > 0 && (
                <View style={styles.editTodoSection}>
                  <Text style={styles.editTodoSectionLabel}>Project</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.editModalPillRow}>
                    <Pressable
                      onPress={() => setEditDraftProjectId(null)}
                      style={[styles.phasePill, !editDraftProjectId && styles.phasePillActive]}
                    >
                      <Text style={[styles.phasePillText, !editDraftProjectId && styles.phasePillTextActive]}>
                        None
                      </Text>
                    </Pressable>
                    {activeProjects.map((project) => (
                      <Pressable
                        key={project.id}
                        onPress={() => setEditDraftProjectId(project.id)}
                        style={[styles.phasePill, editDraftProjectId === project.id && styles.phasePillActive]}
                      >
                        <Text style={[styles.phasePillText, editDraftProjectId === project.id && styles.phasePillTextActive]}>
                          {project.name}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              {editAssigneeOptions.length > 0 && (
                <View style={styles.editTodoSection}>
                  <Text style={styles.editTodoSectionLabel}>Assign to</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.editModalPillRow}>
                    <Pressable
                      onPress={() => setEditDraftAssignedTo(null)}
                      style={[styles.phasePill, !editDraftAssignedTo && styles.phasePillActive]}
                    >
                      <Text style={[styles.phasePillText, !editDraftAssignedTo && styles.phasePillTextActive]}>
                        None
                      </Text>
                    </Pressable>
                    {editAssigneeOptions.map((m) => (
                      <Pressable
                        key={m.user_id}
                        onPress={() => setEditDraftAssignedTo(m.user_id)}
                        style={[styles.phasePill, editDraftAssignedTo === m.user_id && styles.phasePillActive]}
                      >
                        <Text style={[styles.phasePillText, editDraftAssignedTo === m.user_id && styles.phasePillTextActive]}>
                          {profileDisplayName(m)}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
              {isProject && !isCreatingTodo && (
                <Pressable
                  onPress={() => editTodo && toggleMilestone(editTodo).then(closeEditModal)}
                  style={[styles.milestoneToggle, editTodo?.is_milestone && styles.milestoneToggleActive]}
                >
                  <Text style={[styles.milestoneToggleText, editTodo?.is_milestone && styles.milestoneToggleTextActive]}>
                    {editTodo?.is_milestone ? '◆ Milestone' : '◇ Mark as milestone'}
                  </Text>
                </Pressable>
              )}
            </ScrollView>

            <View style={[styles.editModalActions, styles.editTodoFooter]}>
              {isCreatingTodo ? <View /> : (
                <Pressable onPress={() => editTodo && archiveTodo(editTodo.id)}>
                  <Text style={styles.archiveBtnText}>Delete</Text>
                </Pressable>
              )}
              <View style={styles.editModalActionsRight}>
                <Pressable onPress={closeEditModal}>
                  <Text style={styles.calendarCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={saveEditModal}
                  style={({ pressed }) => [styles.smallBtn, pressed && styles.btnPressed]}
                >
                  <Text style={styles.smallBtnText}>Save</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

type ProjectPickerModalProps = Pick<
  SignedInWorkspaceScreen,
  | 'projectPickerTodo'
  | 'setProjectPickerTodo'
  | 'projectAvatarFor'
  | 'activeProjects'
  | 'setTodoProject'
>;

export function ProjectPickerModal({
  projectPickerTodo,
  setProjectPickerTodo,
  projectAvatarFor,
  activeProjects,
  setTodoProject,
}: ProjectPickerModalProps) {
  return (
    <>
      <Modal
        visible={!!projectPickerTodo}
        transparent
        animationType="fade"
        onRequestClose={() => setProjectPickerTodo(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setProjectPickerTodo(null)}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>Assign Project</Text>
            <Pressable
              onPress={() => projectPickerTodo && setTodoProject(projectPickerTodo, null)}
              style={[
                styles.projectPickerRow,
                !projectPickerTodo?.project_id && styles.projectPickerRowActive,
              ]}
            >
              <View style={styles.projectPickerEmptyAvatar}>
                <Text style={styles.projectPickerEmptyAvatarText}>+</Text>
              </View>
              <Text
                style={[
                  styles.projectPickerRowText,
                  !projectPickerTodo?.project_id && styles.projectPickerRowTextActive,
                ]}
              >
                No project
              </Text>
              {!projectPickerTodo?.project_id && <Text style={styles.assigneePickerCheck}>✓</Text>}
            </Pressable>
            {activeProjects.map((project) => {
              const avatar = projectAvatarFor(project);
              const selected = projectPickerTodo?.project_id === project.id;
              return (
                <Pressable
                  key={project.id}
                  onPress={() => projectPickerTodo && setTodoProject(projectPickerTodo, project.id)}
                  style={[styles.projectPickerRow, selected && styles.projectPickerRowActive]}
                >
                  <View style={[styles.projectPickerAvatar, { backgroundColor: avatar.color }]}>
                    <Text style={styles.projectPickerAvatarText}>{avatar.initials}</Text>
                  </View>
                  <Text
                    style={[styles.projectPickerRowText, selected && styles.projectPickerRowTextActive]}
                    numberOfLines={1}
                  >
                    {project.name}
                  </Text>
                  {selected && <Text style={styles.assigneePickerCheck}>✓</Text>}
                </Pressable>
              );
            })}
            <View style={styles.editModalActions}>
              <Pressable onPress={() => setProjectPickerTodo(null)}>
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

type PhasePickerModalProps = Pick<
  SignedInWorkspaceScreen,
  | 'phases'
  | 'phasePickerTodo'
  | 'setPhasePickerTodo'
  | 'setTodoPhase'
>;

export function PhasePickerModal({
  phases,
  phasePickerTodo,
  setPhasePickerTodo,
  setTodoPhase,
}: PhasePickerModalProps) {
  return (
    <>
      <Modal
        visible={!!phasePickerTodo}
        transparent
        animationType="fade"
        onRequestClose={() => setPhasePickerTodo(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPhasePickerTodo(null)}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>Assign Phase</Text>
            <Pressable
              onPress={() => phasePickerTodo && setTodoPhase(phasePickerTodo, null)}
              style={[styles.phasePill, !phasePickerTodo?.phase_id && styles.phasePillActive]}
            >
              <Text style={[styles.phasePillText, !phasePickerTodo?.phase_id && styles.phasePillTextActive]}>
                No phase
              </Text>
            </Pressable>
            {phases.map((phase) => (
              <Pressable
                key={phase.id}
                onPress={() => phasePickerTodo && setTodoPhase(phasePickerTodo, phase.id)}
                style={[styles.phasePill, phasePickerTodo?.phase_id === phase.id && styles.phasePillActive]}
              >
                <Text style={[styles.phasePillText, phasePickerTodo?.phase_id === phase.id && styles.phasePillTextActive]}>
                  {phase.name}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
