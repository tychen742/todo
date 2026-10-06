import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CalendarViewMode, Todo } from '../../../lib/types';
import { addDays, buildCalendarDays, buildWeekDays, formatDateValue } from '../../../lib/calendar';
import { sortTodos } from '../../../lib/todos';
import type { FeedbackState } from './useFeedback';
import type { AuthState } from './useAuth';
import type { TodosState } from './useTodos';
import type { MindmapsState } from './useMindmaps';

type CalendarViewDeps = Pick<
    FeedbackState,
    | 'setError'
  > &
  Pick<
    AuthState,
    | 'session'
  > &
  Pick<
    TodosState,
    | 'todos'
  > &
  Pick<
    MindmapsState,
    | 'setActiveMindmapId'
    | 'setMindmapTemplatePickerOpen'
    | 'setWorkspaceIdeas'
    | 'setWorkspaceMindmaps'
  >;

export function useCalendarView({
  setError,
  session,
  todos,
  setActiveMindmapId,
  setMindmapTemplatePickerOpen,
  setWorkspaceIdeas,
  setWorkspaceMindmaps,
}: CalendarViewDeps) {
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>('month');
  const [calendarViewMonth, setCalendarViewMonth] = useState(() => new Date());
  const [calendarViewSelectedDate, setCalendarViewSelectedDate] = useState(() => new Date());
  const [calendarViewNotes, setCalendarViewNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    const uid = session?.user.id;
    let cancelled = false;
    if (!uid) {
      setCalendarViewNotes({});
      setWorkspaceIdeas('');
      setWorkspaceMindmaps([]);
      setActiveMindmapId(null);
      setMindmapTemplatePickerOpen(false);
      return;
    }
    AsyncStorage.getItem(`todo:calendar-notes:${uid}`)
      .then((value) => {
        if (cancelled || !value) return;
        setCalendarViewNotes(JSON.parse(value) as Record<string, string>);
      })
      .catch(() => {
        if (!cancelled) setCalendarViewNotes({});
      });
    return () => {
      cancelled = true;
    };
  }, [session, setActiveMindmapId, setMindmapTemplatePickerOpen, setWorkspaceIdeas, setWorkspaceMindmaps]);

  function saveCalendarViewNote(value: string) {
    if (!session) return;
    const uid = session.user.id;
    const dateKey = calendarViewSelectedDateKey;
    const nextNotes = { ...calendarViewNotes, [dateKey]: value };
    if (!value.trim()) delete nextNotes[dateKey];
    setCalendarViewNotes(nextNotes);
    AsyncStorage.setItem(`todo:calendar-notes:${uid}`, JSON.stringify(nextNotes)).catch(() => {
      setError('Could not save calendar note.');
    });
  }

  function moveCalendarView(offset: number) {
    if (calendarViewMode === 'day') {
      const nextDate = addDays(calendarViewSelectedDate, offset);
      setCalendarViewSelectedDate(nextDate);
      setCalendarViewMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
      return;
    }
    if (calendarViewMode === 'week') {
      const nextDate = addDays(calendarViewSelectedDate, offset * 7);
      setCalendarViewSelectedDate(nextDate);
      setCalendarViewMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
      return;
    }
    setCalendarViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  }

  function showCalendarToday() {
    const today = new Date();
    setCalendarViewSelectedDate(today);
    setCalendarViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  }
  const calendarViewDays = useMemo(() => buildCalendarDays(calendarViewMonth), [calendarViewMonth]);
  const calendarViewWeekDays = useMemo(() => buildWeekDays(calendarViewSelectedDate), [calendarViewSelectedDate]);
  const calendarViewTodosByDate = useMemo(() => {
    const byDate = new Map<string, Todo[]>();
    todos.forEach((todo) => {
      if (!todo.due_date || todo.archived_at) return;
      const items = byDate.get(todo.due_date) ?? [];
      items.push(todo);
      byDate.set(todo.due_date, sortTodos(items));
    });
    return byDate;
  }, [todos]);
  const calendarViewSelectedDateKey = formatDateValue(calendarViewSelectedDate);
  const calendarViewSelectedDateTodos = calendarViewTodosByDate.get(calendarViewSelectedDateKey) ?? [];
  const calendarViewSelectedDateNote = calendarViewNotes[calendarViewSelectedDateKey] ?? '';

  return {
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
  };
}

export type CalendarViewState = ReturnType<typeof useCalendarView>;
