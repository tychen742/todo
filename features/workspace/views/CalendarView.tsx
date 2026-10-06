import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import type { CalendarViewMode } from '../../../lib/types';
import { calendarViewTitle, formatDateValue, isSameDate } from '../../../lib/calendar';
import { priorityColors } from '../../../lib/todos';
import { styles } from '../styles';
import type { SignedInWorkspaceScreen } from '../useWorkspaceScreen';

type CalendarViewProps = Pick<
  SignedInWorkspaceScreen,
  | 'width'
  | 'now'
  | 'calendarViewOpen'
  | 'calendarViewMode'
  | 'setCalendarViewMode'
  | 'calendarViewMonth'
  | 'setCalendarViewMonth'
  | 'calendarViewSelectedDate'
  | 'setCalendarViewSelectedDate'
  | 'saveCalendarViewNote'
  | 'moveCalendarView'
  | 'showCalendarToday'
  | 'calendarViewDays'
  | 'calendarViewWeekDays'
  | 'calendarViewTodosByDate'
  | 'calendarViewSelectedDateKey'
  | 'calendarViewSelectedDateTodos'
  | 'calendarViewSelectedDateNote'
  | 'openEditModal'
>;

export function CalendarView({
  width,
  now,
  calendarViewOpen,
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
  openEditModal,
}: CalendarViewProps) {
  return (
    <>
      {calendarViewOpen && (
        <ScrollView style={styles.calendarView} contentContainerStyle={styles.calendarViewContent}>
          <View style={styles.calendarViewPanel}>
            <View style={styles.calendarViewHeader}>
              <View>
                <Text style={styles.calendarViewEyebrow}>Calendar</Text>
                <Text style={styles.calendarViewTitle}>{calendarViewTitle(calendarViewMode, calendarViewMode === 'month' ? calendarViewMonth : calendarViewSelectedDate)}</Text>
              </View>
              <View style={styles.calendarViewActions}>
                <Pressable
                  onPress={() => moveCalendarView(-1)}
                  style={styles.calendarViewNavButton}
                  accessibilityRole="button"
                  accessibilityLabel={`Previous ${calendarViewMode}`}
                >
                  <Text style={styles.calendarViewNavText}>{"<"}</Text>
                </Pressable>
                <Pressable
                  onPress={showCalendarToday}
                  style={styles.calendarViewTodayButton}
                  accessibilityRole="button"
                  accessibilityLabel="Show today"
                >
                  <Text style={styles.calendarViewTodayText}>Today</Text>
                </Pressable>
                <Pressable
                  onPress={() => moveCalendarView(1)}
                  style={styles.calendarViewNavButton}
                  accessibilityRole="button"
                  accessibilityLabel={`Next ${calendarViewMode}`}
                >
                  <Text style={styles.calendarViewNavText}>{">"}</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.calendarViewModeBar}>
              {(['day', 'week', 'month'] as CalendarViewMode[]).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => {
                    setCalendarViewMode(mode);
                    if (mode === 'month') {
                      setCalendarViewMonth(new Date(calendarViewSelectedDate.getFullYear(), calendarViewSelectedDate.getMonth(), 1));
                    }
                  }}
                  style={[
                    styles.calendarViewModeButton,
                    calendarViewMode === mode && styles.calendarViewModeButtonActive,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Show ${mode} calendar view`}
                >
                  <Text
                    style={[
                      styles.calendarViewModeButtonText,
                      calendarViewMode === mode && styles.calendarViewModeButtonTextActive,
                    ]}
                  >
                    {mode[0].toUpperCase() + mode.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {calendarViewMode === 'day' && (
              <View style={[styles.calendarDayView, width < 900 && styles.calendarDayViewStacked]}>
                <View style={styles.calendarDayAgenda}>
                  <View style={styles.calendarDayAgendaHeader}>
                    <Text style={styles.calendarDayAgendaTitle}>Tasks ({calendarViewSelectedDateTodos.length})</Text>
                    <Text style={styles.calendarDayAgendaDate}>{calendarViewSelectedDateKey}</Text>
                  </View>
                  {calendarViewSelectedDateTodos.length === 0 ? (
                    <Text style={styles.calendarViewEmpty}>No tasks due today.</Text>
                  ) : (
                    calendarViewSelectedDateTodos.map((todo) => (
                      <Pressable
                        key={todo.id}
                        onPress={() => openEditModal(todo)}
                        style={styles.calendarDayTask}
                        accessibilityRole="button"
                        accessibilityLabel={`Open task ${todo.text}`}
                      >
                        <View style={[styles.calendarViewPriorityDot, { backgroundColor: priorityColors[todo.priority] }]} />
                        <View style={styles.calendarDayTaskBody}>
                          <Text
                            style={[styles.calendarDayTaskTitle, todo.done && styles.calendarViewTaskDoneText]}
                            numberOfLines={1}
                          >
                            {todo.text}
                          </Text>
                          {!!todo.note && (
                            <Text style={styles.calendarDayTaskNote} numberOfLines={1}>{todo.note}</Text>
                          )}
                        </View>
                      </Pressable>
                    ))
                  )}
                </View>
                <View style={[styles.calendarDayNotes, width < 900 && styles.calendarDayNotesStacked]}>
                  <Text style={styles.calendarDayNotesTitle}>Notes</Text>
                  <TextInput
                    value={calendarViewSelectedDateNote}
                    onChangeText={saveCalendarViewNote}
                    style={styles.calendarDayNotesInput}
                    placeholder="Notes for this day..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </View>
            )}

            {calendarViewMode === 'week' && (
              <>
                <View style={styles.calendarViewWeekdays}>
                  {calendarViewWeekDays.map((day) => {
                    const dateKey = formatDateValue(day);
                    const isSelected = isSameDate(day, calendarViewSelectedDate);
                    return (
                      <Pressable
                        key={dateKey}
                        onPress={() => setCalendarViewSelectedDate(day)}
                        style={[styles.calendarWeekHeaderDay, isSelected && styles.calendarWeekHeaderDaySelected]}
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${dateKey}`}
                      >
                        <Text style={[styles.calendarWeekHeaderText, isSelected && styles.calendarWeekHeaderTextSelected]}>
                          {day.toLocaleDateString(undefined, { weekday: 'short' })}
                        </Text>
                        <Text style={[styles.calendarWeekHeaderNumber, isSelected && styles.calendarWeekHeaderTextSelected]}>
                          {day.getDate()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.calendarWeekGrid}>
                  {calendarViewWeekDays.map((day) => {
                    const dateKey = formatDateValue(day);
                    const dayTodos = calendarViewTodosByDate.get(dateKey) ?? [];
                    return (
                      <View key={dateKey} style={[styles.calendarWeekDayColumn, isSameDate(day, now) && styles.calendarViewDayToday]}>
                        {dayTodos.length === 0 ? (
                          <Text style={styles.calendarWeekEmpty}>No tasks</Text>
                        ) : (
                          dayTodos.map((todo) => (
                            <Pressable
                              key={todo.id}
                              onPress={() => openEditModal(todo)}
                              style={styles.calendarViewTask}
                              accessibilityRole="button"
                              accessibilityLabel={`Open task ${todo.text}`}
                            >
                              <View style={[styles.calendarViewPriorityDot, { backgroundColor: priorityColors[todo.priority] }]} />
                              <Text
                                style={[styles.calendarViewTaskText, todo.done && styles.calendarViewTaskDoneText]}
                                numberOfLines={1}
                              >
                                {todo.text}
                              </Text>
                            </Pressable>
                          ))
                        )}
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {calendarViewMode === 'month' && (
              <>
                <View style={styles.calendarViewWeekdays}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <Text key={day} style={styles.calendarViewWeekday}>{day}</Text>
                  ))}
                </View>
                <View style={styles.calendarViewGrid}>
                  {calendarViewDays.map((day, index) => {
                    if (!day) {
                      return <View key={`blank-${index}`} style={[styles.calendarViewDayCell, styles.calendarViewDayBlank]} />;
                    }
                    const dateKey = formatDateValue(day);
                    const dayTodos = calendarViewTodosByDate.get(dateKey) ?? [];
                    const visibleTodos = dayTodos.slice(0, 3);
                    const hiddenCount = dayTodos.length - visibleTodos.length;
                    const isToday = isSameDate(day, now);
                    const isSelected = isSameDate(day, calendarViewSelectedDate);
                    return (
                      <View
                        key={dateKey}
                        style={[
                          styles.calendarViewDayCell,
                          isToday && styles.calendarViewDayToday,
                          isSelected && styles.calendarViewDaySelected,
                        ]}
                      >
                        <Pressable
                          onPress={() => {
                            setCalendarViewSelectedDate(day);
                            setCalendarViewMode('day');
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Open day view for ${dateKey}`}
                        >
                          <Text style={[styles.calendarViewDayNumber, isToday && styles.calendarViewDayNumberToday]}>
                            {day.getDate()}
                          </Text>
                        </Pressable>
                        <View style={styles.calendarViewItems}>
                          {visibleTodos.map((todo) => (
                            <Pressable
                              key={todo.id}
                              onPress={() => openEditModal(todo)}
                              style={styles.calendarViewTask}
                              accessibilityRole="button"
                              accessibilityLabel={`Open task ${todo.text}`}
                            >
                              <View style={[styles.calendarViewPriorityDot, { backgroundColor: priorityColors[todo.priority] }]} />
                              <Text
                                style={[styles.calendarViewTaskText, todo.done && styles.calendarViewTaskDoneText]}
                                numberOfLines={1}
                              >
                                {todo.text}
                              </Text>
                            </Pressable>
                          ))}
                          {hiddenCount > 0 && (
                            <Pressable
                              onPress={() => {
                                setCalendarViewSelectedDate(day);
                                setCalendarViewMode('day');
                              }}
                              accessibilityRole="button"
                              accessibilityLabel={`Show ${hiddenCount} more tasks for ${dateKey}`}
                            >
                              <Text style={styles.calendarViewMoreText}>+{hiddenCount} more</Text>
                            </Pressable>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        </ScrollView>
      )}
    </>
  );
}
