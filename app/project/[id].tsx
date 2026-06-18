import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../lib/supabase';
import { DraggableList } from '../../components/DraggableList';
import TodoItem from '../../components/TodoItem';
import PhaseStrip, { type Phase } from '../../components/PhaseStrip';

type Priority = 'low' | 'normal' | 'high' | 'urgent';
type SortField = 'text' | 'priority' | 'due_date' | 'created_at';

type Project = {
  id: string;
  name: string;
  description: string | null;
  team_id: string | null;
  status: 'active' | 'paused' | 'completed' | 'closed';
  archived_at: string | null;
};

type Todo = {
  id: string;
  text: string;
  done: boolean;
  assigned_to: string | null;
  priority: Priority;
  due_date: string | null;
  note: string | null;
  created_at: string;
  assigned_at: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  archived_at: string | null;
  position: number | null;
  project_id: string | null;
  phase_id: string | null;
  is_milestone: boolean;
  estimate: string | null;
};

const priorities: Priority[] = ['low', 'normal', 'high', 'urgent'];
const MAX_PROJECT_PHASES = 5;
const projectAvatarColors = ['#e74c3c', '#e67e22', '#16a34a', '#2563eb', '#7c3aed', '#db2777', '#0891b2', '#d97706'];

const priorityRank: Record<Priority, number> = {
  urgent: 0, high: 1, normal: 2, low: 3,
};

function sortTodos(items: Todo[]) {
  return [...items].sort((a, b) => {
    if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
    if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
    if (a.position !== null && b.position !== null) return a.position - b.position;
    if (a.position !== null) return -1;
    if (b.position !== null) return 1;
    const pd = priorityRank[a.priority] - priorityRank[b.priority];
    if (pd !== 0) return pd;
    return Date.parse(b.created_at) - Date.parse(a.created_at);
  });
}

function pickProjectAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return projectAvatarColors[Math.abs(hash) % projectAvatarColors.length];
}

function projectInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateValue(value: string | null) {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function buildCalendarDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: firstDay.getDay() }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isSameDate(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [archivedTodos, setArchivedTodos] = useState<Todo[]>([]);
  const [archivedExpanded, setArchivedExpanded] = useState(false);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [input, setInput] = useState('');
  const [editTodo, setEditTodo] = useState<Todo | null>(null);
  const [editDraftText, setEditDraftText] = useState('');
  const [editDraftNote, setEditDraftNote] = useState('');
  const [editDraftPhaseId, setEditDraftPhaseId] = useState<string | null>(null);
  const [dueTodo, setDueTodo] = useState<Todo | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [phasePickerTodo, setPhasePickerTodo] = useState<Todo | null>(null);
  const [addingPhase, setAddingPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const active = useMemo(() => {
    const items = todos.filter((t) => !t.done);
    if (!sortField) return items;
    return [...items].sort((a, b) => {
      if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
      if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
      let delta = 0;
      if (sortField === 'text') delta = a.text.localeCompare(b.text);
      else if (sortField === 'priority') delta = priorityRank[a.priority] - priorityRank[b.priority];
      else if (sortField === 'due_date') {
        delta = (a.due_date ? Date.parse(a.due_date) : Infinity) - (b.due_date ? Date.parse(b.due_date) : Infinity);
      } else {
        delta = Date.parse(a.created_at) - Date.parse(b.created_at);
      }
      return sortDir === 'asc' ? delta : -delta;
    });
  }, [todos, sortField, sortDir]);

  const done = useMemo(() => todos.filter((t) => t.done), [todos]);
  const phaseById = useMemo(() => new Map(phases.map((p) => [p.id, p])), [phases]);
  const canAddPhase = phases.length < MAX_PROJECT_PHASES;

  const nextMilestone = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return todos
      .filter((t) => t.is_milestone && !t.done && t.due_date)
      .map((t) => {
        const due = parseDateValue(t.due_date);
        const daysLeft = due ? Math.round((due.getTime() - today.getTime()) / 86400000) : null;
        return { ...t, daysLeft };
      })
      .sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity))[0] ?? null;
  }, [todos]);
  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);
  const projectAvatar = useMemo(() => {
    if (!project) return undefined;
    return {
      label: project.name,
      initials: projectInitials(project.name),
      color: pickProjectAvatarColor(`project:${project.id}`),
    };
  }, [project]);

  const loadProject = useCallback(async () => {
    if (!id) return;
    const { data, error: err } = await supabase
      .from('projects')
      .select('id, name, description, team_id, status, archived_at')
      .eq('id', id)
      .single();
    if (err) { setError(err.message); return; }
    setProject(data);
  }, [id]);

  const loadPhases = useCallback(async () => {
    if (!id) return;
    const { data, error: err } = await supabase
      .from('project_phases')
      .select('id, project_id, name, order_index, status, planned_start, planned_end')
      .eq('project_id', id)
      .order('order_index', { ascending: true });
    if (!err) setPhases(data ?? []);
  }, [id]);

  const loadTodos = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error: loadErr } = await supabase
      .from('todos')
      .select('id, text, done, assigned_to, priority, due_date, note, created_at, assigned_at, accepted_at, completed_at, archived_at, position, project_id, phase_id, is_milestone, estimate')
      .eq('project_id', id)
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    if (loadErr) { setError(loadErr.message); }
    else { setTodos(sortTodos(data ?? [])); setError(''); }
    setLoading(false);
  }, [id]);

  const loadArchivedTodos = useCallback(async () => {
    if (!id) return;
    const { data, error: err } = await supabase
      .from('todos')
      .select('id, text, done, assigned_to, priority, due_date, note, created_at, assigned_at, accepted_at, completed_at, archived_at, position, project_id, phase_id, is_milestone, estimate')
      .eq('project_id', id)
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false });
    if (!err) setArchivedTodos(data ?? []);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    loadProject();
    loadPhases();
    loadTodos();
    loadArchivedTodos();

    const channel = supabase
      .channel(`project-todos-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos', filter: `project_id=eq.${id}` },
        () => { loadTodos(); loadArchivedTodos(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, loadProject, loadPhases, loadTodos, loadArchivedTodos]);

  async function addTodo() {
    const text = input.trim();
    if (!text) return;
    const { data, error: err } = await supabase
      .from('todos')
      .insert({ text, project_id: id, priority: 'normal' })
      .select('id, text, done, assigned_to, priority, due_date, note, created_at, assigned_at, accepted_at, completed_at, archived_at, position, project_id, phase_id, is_milestone, estimate')
      .single();
    if (err) { setError(err.message); return; }
    setInput('');
    setTodos((prev) => sortTodos([data as Todo, ...prev]));
    setError('');
  }

  async function toggle(todoId: string) {
    const todo = todos.find((t) => t.id === todoId);
    if (!todo) return;
    const done = !todo.done;
    const completed_at = done ? new Date().toISOString() : null;
    const { error: err } = await supabase
      .from('todos')
      .update({ done, completed_at })
      .eq('id', todoId);
    if (err) { setError(err.message); return; }
    setTodos((prev) => prev.map((t) => (t.id === todoId ? { ...t, done, completed_at } : t)));
  }

  async function archiveTodo(todoId: string) {
    const archived_at = new Date().toISOString();
    const { error: err } = await supabase
      .from('todos')
      .update({ archived_at })
      .eq('id', todoId);
    if (err) { setError(err.message); return; }
    const todo = todos.find((t) => t.id === todoId);
    setTodos((prev) => prev.filter((t) => t.id !== todoId));
    if (todo) setArchivedTodos((prev) => [{ ...todo, archived_at }, ...prev]);
    if (editTodo?.id === todoId) closeEditModal();
    setError('');
  }

  async function unarchiveTodo(todoId: string) {
    const { error: err } = await supabase
      .from('todos')
      .update({ archived_at: null })
      .eq('id', todoId);
    if (err) { setError(err.message); return; }
    const todo = archivedTodos.find((t) => t.id === todoId);
    setArchivedTodos((prev) => prev.filter((t) => t.id !== todoId));
    if (todo) setTodos((prev) => sortTodos([{ ...todo, archived_at: null }, ...prev]));
    setError('');
  }

  async function cyclePriority(todo: Todo) {
    const next = priorities[(priorities.indexOf(todo.priority) + 1) % priorities.length];
    const { error: err } = await supabase.from('todos').update({ priority: next }).eq('id', todo.id);
    if (err) { setError(err.message); return; }
    setTodos((prev) => sortTodos(prev.map((t) => (t.id === todo.id ? { ...t, priority: next } : t))));
  }

  async function toggleMilestone(todo: Todo) {
    const is_milestone = !todo.is_milestone;
    const { error: err } = await supabase.from('todos').update({ is_milestone }).eq('id', todo.id);
    if (err) { setError(err.message); return; }
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, is_milestone } : t)));
  }

  function openEditModal(todo: Todo) {
    setEditTodo(todo);
    setEditDraftText(todo.text);
    setEditDraftNote(todo.note ?? '');
    setEditDraftPhaseId(todo.phase_id);
  }

  function closeEditModal() {
    setEditTodo(null);
    setEditDraftText('');
    setEditDraftNote('');
    setEditDraftPhaseId(null);
  }

  async function saveEditModal() {
    if (!editTodo) return;
    const text = editDraftText.trim();
    if (!text) return;
    const note = editDraftNote.trim() || null;
    const phase_id = editDraftPhaseId;
    const { error: err } = await supabase
      .from('todos')
      .update({ text, note, phase_id })
      .eq('id', editTodo.id);
    if (err) { setError(err.message); return; }
    setTodos((prev) =>
      prev.map((t) => (t.id === editTodo.id ? { ...t, text, note, phase_id } : t))
    );
    closeEditModal();
  }

  function openDueCalendar(todo: Todo) {
    setDueTodo(todo);
    setCalendarMonth(parseDateValue(todo.due_date) ?? new Date());
  }

  async function chooseDueDate(value: string | null) {
    if (!dueTodo) return;
    const due_date = value;
    const { error: err } = await supabase.from('todos').update({ due_date }).eq('id', dueTodo.id);
    if (err) { setError(err.message); return; }
    setTodos((prev) => prev.map((t) => (t.id === dueTodo.id ? { ...t, due_date } : t)));
    setDueTodo(null);
  }

  async function handleDragEnd(reorderedActive: Todo[]) {
    const positionMap = new Map(reorderedActive.map((t, i) => [t.id, i]));
    setTodos((prev) =>
      sortTodos(prev.map((t) => (positionMap.has(t.id) ? { ...t, position: positionMap.get(t.id)! } : t)))
    );
    const updates = reorderedActive.map((t, i) => ({ id: t.id, position: i }));
    const { error: err } = await supabase.rpc('batch_update_todo_positions', { updates });
    if (err) setError(err.message);
  }

  async function cyclePhaseStatus(phase: Phase) {
    const next: Phase['status'] =
      phase.status === 'upcoming' ? 'active' : phase.status === 'active' ? 'completed' : 'upcoming';
    const { error: err } = await supabase
      .from('project_phases')
      .update({ status: next })
      .eq('id', phase.id);
    if (err) { setError(err.message); return; }
    setPhases((prev) => prev.map((p) => (p.id === phase.id ? { ...p, status: next } : p)));
  }

  async function addPhase() {
    const name = newPhaseName.trim();
    if (!name || !id) return;
    if (!canAddPhase) {
      setError(`Projects can have up to ${MAX_PROJECT_PHASES} phases.`);
      setAddingPhase(false);
      setNewPhaseName('');
      return;
    }
    const order_index = phases.length;
    const { data, error: err } = await supabase
      .from('project_phases')
      .insert({ project_id: id, name, order_index, status: 'upcoming' })
      .select('id, project_id, name, order_index, status, planned_start, planned_end')
      .single();
    if (err) { setError(err.message); return; }
    setPhases((prev) => [...prev, data as Phase]);
    setNewPhaseName('');
    setAddingPhase(false);
  }

  async function setTodoPhase(todoId: string, phaseId: string | null) {
    const { error: err } = await supabase
      .from('todos')
      .update({ phase_id: phaseId })
      .eq('id', todoId);
    if (err) { setError(err.message); return; }
    setTodos((prev) => prev.map((t) => (t.id === todoId ? { ...t, phase_id: phaseId } : t)));
    setPhasePickerTodo(null);
  }

  function toggleSort(field: SortField) {
    if (sortField !== field) { setSortField(field); setSortDir('asc'); }
    else if (sortDir === 'asc') { setSortDir('desc'); }
    else { setSortField(null); }
  }

  function moveCalendarMonth(delta: number) {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen options={{ title: project?.name ?? 'Project' }} />
      <StatusBar style="dark" />

      <PhaseStrip
        phases={phases}
        onCycleStatus={cyclePhaseStatus}
        onAdd={() => {
          if (!canAddPhase) {
            setError(`Projects can have up to ${MAX_PROJECT_PHASES} phases.`);
            return;
          }
          setAddingPhase(true);
        }}
        addDisabled={!canAddPhase}
        addLabel={canAddPhase ? '+ Column' : 'Max 5'}
      />

      {nextMilestone && (
        <View style={[styles.milestoneBanner, (nextMilestone.daysLeft ?? 0) < 0 && styles.milestoneBannerOverdue]}>
          <Text style={styles.milestoneBannerIcon}>◆</Text>
          <Text style={styles.milestoneBannerText} numberOfLines={1}>
            {nextMilestone.text}
          </Text>
          <Text style={[styles.milestoneBannerCountdown, (nextMilestone.daysLeft ?? 0) < 0 && styles.milestoneBannerCountdownOverdue]}>
            {nextMilestone.daysLeft === 0
              ? 'Today'
              : nextMilestone.daysLeft === 1
              ? 'Tomorrow'
              : (nextMilestone.daysLeft ?? 0) < 0
              ? `${Math.abs(nextMilestone.daysLeft ?? 0)}d overdue`
              : `${nextMilestone.daysLeft}d`}
          </Text>
        </View>
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Add a todo..."
          placeholderTextColor="#9ca3af"
          onSubmitEditing={addTodo}
          returnKeyType="done"
        />
        <Pressable
          onPress={addTodo}
          style={({ pressed }) => [styles.addBtn, pressed && styles.btnPressed]}
        >
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>

      <View style={styles.sortBar}>
        {Platform.OS === 'web' && !sortField && <View style={styles.sortHandleSpacer} />}
        <View style={styles.sortCheckboxSpacer} />
        <Pressable onPress={() => toggleSort('text')} style={[styles.sortColTask, styles.sortColInner]}>
          <Text style={[styles.sortColLabel, sortField === 'text' && styles.sortColLabelActive]}>Task</Text>
          {sortField === 'text' && <Text style={[styles.sortColIndicator, styles.sortColLabelActive]}>{sortDir === 'asc' ? '↑' : '↓'}</Text>}
        </Pressable>
        <View style={[styles.sortColPriority, { flexShrink: 0 }]} />
        <View style={styles.sortStatusGap} />
        <Pressable onPress={() => toggleSort('due_date')} style={[styles.sortColDue, styles.sortColInner]}>
          <Text style={[styles.sortColLabel, sortField === 'due_date' && styles.sortColLabelActive]}>Due</Text>
          {sortField === 'due_date' && <Text style={[styles.sortColIndicator, styles.sortColLabelActive]}>{sortDir === 'asc' ? '↑' : '↓'}</Text>}
        </Pressable>
        <View style={styles.sortColAgeGap} />
        <View style={styles.sortArchiveGap} />
      </View>

      <DraggableList
        data={active}
        keyExtractor={(todo) => todo.id}
        onDragEnd={handleDragEnd}
        draggable={!sortField}
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item: todo, drag, isActive }) => (
          <TodoItem
            text={todo.text}
            done={todo.done}
            priority={todo.priority}
            dueDate={todo.due_date}
            note={todo.note}
            createdAt={todo.created_at}
            isMilestone={todo.is_milestone}
            phaseLabel={todo.phase_id ? (phaseById.get(todo.phase_id)?.name ?? '') : undefined}
            projectAvatar={projectAvatar}
            onToggle={() => toggle(todo.id)}
            onOpenEdit={() => openEditModal(todo)}
            onPriority={() => cyclePriority(todo)}
            onDueDate={() => openDueCalendar(todo)}
            onPhase={() => setPhasePickerTodo(todo)}
            onArchive={() => archiveTodo(todo.id)}
            onDrag={drag}
            isDragging={isActive ?? false}
          />
        )}
        ListHeaderComponent={
          <>
            {!!error && <Text style={styles.error}>{error}</Text>}
            {loading && !error && <Text style={styles.empty}>Loading todos...</Text>}
            {!loading && active.length === 0 && done.length === 0 && (
              <Text style={styles.empty}>No todos yet. Add one above.</Text>
            )}
          </>
        }
        ListFooterComponent={
          <>
            {done.length > 0 && (
              <>
                <View style={styles.sectionDivider}>
                  <View style={styles.sectionDividerLine} />
                  <Text style={styles.sectionLabel}>Completed</Text>
                  <View style={styles.sectionDividerLine} />
                </View>
                {done.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    text={todo.text}
                    done={todo.done}
                    priority={todo.priority}
                    dueDate={todo.due_date}
                    note={todo.note}
                    createdAt={todo.created_at}
                    isMilestone={todo.is_milestone}
                    phaseLabel={todo.phase_id ? (phaseById.get(todo.phase_id)?.name ?? '') : undefined}
                    projectAvatar={projectAvatar}
                    onToggle={() => toggle(todo.id)}
                    onOpenEdit={() => openEditModal(todo)}
                    onPriority={() => cyclePriority(todo)}
                    onDueDate={() => openDueCalendar(todo)}
                    onPhase={() => setPhasePickerTodo(todo)}
                    onArchive={() => archiveTodo(todo.id)}
                    reserveDragSpace={Platform.OS === 'web'}
                  />
                ))}
              </>
            )}
            {archivedTodos.length > 0 && (
              <>
                <Pressable
                  onPress={() => setArchivedExpanded((v) => !v)}
                  style={styles.sectionDivider}
                >
                  <View style={styles.sectionDividerLine} />
                  <Text style={styles.sectionLabel}>
                    Deleted ({archivedTodos.length}) {archivedExpanded ? '↑' : '↓'}
                  </Text>
                  <View style={styles.sectionDividerLine} />
                </Pressable>
                {archivedExpanded && archivedTodos.map((todo) => (
                  <View key={todo.id} style={styles.archivedRow}>
                    <Text style={styles.archivedText} numberOfLines={1}>{todo.text}</Text>
                    <Pressable onPress={() => unarchiveTodo(todo.id)} style={styles.unarchiveBtn}>
                      <Text style={styles.unarchiveBtnText}>Restore</Text>
                    </Pressable>
                  </View>
                ))}
              </>
            )}
          </>
        }
      />

      {/* Phase picker */}
      <Modal
        visible={!!phasePickerTodo}
        transparent
        animationType="fade"
        onRequestClose={() => setPhasePickerTodo(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPhasePickerTodo(null)}>
          <Pressable style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Set Phase</Text>
            <Pressable
              onPress={() => phasePickerTodo && setTodoPhase(phasePickerTodo.id, null)}
              style={[
                styles.pickerRow,
                !phasePickerTodo?.phase_id && styles.pickerRowActive,
              ]}
            >
              <Text style={[styles.pickerRowText, !phasePickerTodo?.phase_id && styles.pickerRowTextActive]}>
                No phase
              </Text>
            </Pressable>
            {phases.map((phase) => (
              <Pressable
                key={phase.id}
                onPress={() => phasePickerTodo && setTodoPhase(phasePickerTodo.id, phase.id)}
                style={[
                  styles.pickerRow,
                  phasePickerTodo?.phase_id === phase.id && styles.pickerRowActive,
                ]}
              >
                <Text
                  style={[
                    styles.pickerRowText,
                    phasePickerTodo?.phase_id === phase.id && styles.pickerRowTextActive,
                  ]}
                >
                  {phase.name}
                </Text>
                <Text style={styles.pickerRowStatus}>{phase.status}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setPhasePickerTodo(null)} style={styles.pickerCancel}>
              <Text style={styles.calendarCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add column */}
      <Modal
        visible={addingPhase}
        transparent
        animationType="fade"
        onRequestClose={() => setAddingPhase(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setAddingPhase(false)}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>New Column</Text>
            <TextInput
              style={styles.editModalInput}
              value={newPhaseName}
              onChangeText={setNewPhaseName}
              placeholder="Column name"
              placeholderTextColor="#9ca3af"
              returnKeyType="done"
              autoFocus
              onSubmitEditing={addPhase}
            />
            <View style={styles.editModalActions}>
              <Pressable
                onPress={() => {
                  setAddingPhase(false);
                  setNewPhaseName('');
                }}
              >
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={addPhase}
                style={({ pressed }) => [styles.smallBtn, pressed && styles.btnPressed]}
              >
                <Text style={styles.smallBtnText}>Add</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit todo */}
      <Modal
        visible={!!editTodo}
        transparent
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeEditModal}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>Edit Todo</Text>
            <TextInput
              style={styles.editModalInput}
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
            <Text style={styles.editModalLabel}>Phase</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.phasePillRow}>
              <Pressable
                onPress={() => setEditDraftPhaseId(null)}
                style={[styles.phasePill, !editDraftPhaseId && styles.phasePillActive]}
              >
                <Text style={[styles.phasePillText, !editDraftPhaseId && styles.phasePillTextActive]}>
                  None
                </Text>
              </Pressable>
              {phases.map((phase) => (
                <Pressable
                  key={phase.id}
                  onPress={() => setEditDraftPhaseId(phase.id)}
                  style={[
                    styles.phasePill,
                    editDraftPhaseId === phase.id && styles.phasePillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.phasePillText,
                      editDraftPhaseId === phase.id && styles.phasePillTextActive,
                    ]}
                  >
                    {phase.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => editTodo && toggleMilestone(editTodo).then(closeEditModal)}
              style={[styles.milestoneToggle, editTodo?.is_milestone && styles.milestoneToggleActive]}
            >
              <Text style={[styles.milestoneToggleText, editTodo?.is_milestone && styles.milestoneToggleTextActive]}>
                ◆ {editTodo?.is_milestone ? 'Milestone — tap to unmark' : 'Mark as milestone'}
              </Text>
            </Pressable>
            <View style={styles.editModalActions}>
              <Pressable onPress={() => editTodo && archiveTodo(editTodo.id)}>
                <Text style={styles.archiveBtnText}>Delete</Text>
              </Pressable>
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

      {/* Due date calendar */}
      <Modal
        visible={!!dueTodo}
        transparent
        animationType="fade"
        onRequestClose={() => setDueTodo(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setDueTodo(null)}>
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
                <Text key={day} style={styles.weekdayText}>{day}</Text>
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
              <Pressable onPress={() => setDueTodo(null)}>
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
  list: {
    flex: 1,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#111827',
  },
  addBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  btnPressed: {
    opacity: 0.75,
  },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  sortHandleSpacer: {
    width: 32,
  },
  sortCheckboxSpacer: {
    width: 34,
  },
  sortColInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  sortColTask: {
    flex: 1,
  },
  sortColPriority: {
    width: 48,
    marginLeft: 8,
  },
  sortStatusGap: {
    width: 56,
    marginLeft: 8,
    flexShrink: 0,
  },
  prioritySortSquare: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  sortColDue: {
    width: 64,
    marginLeft: 8,
  },
  sortColAgeGap: {
    width: 56,
    marginLeft: 8,
    flexShrink: 0,
  },
  sortArchiveGap: {
    width: 28,
    marginLeft: 2,
    flexShrink: 0,
  },
  sortColAdded: {
    width: 56,
    marginLeft: 8,
  },
  sortColLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sortColLabelActive: {
    color: '#6366f1',
  },
  sortColIndicator: {
    fontSize: 10,
    color: '#9ca3af',
  },
  error: {
    margin: 12,
    color: '#b91c1c',
    fontSize: 13,
  },
  empty: {
    margin: 20,
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 14,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  sectionDividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#d1d5db',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  archivedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
    gap: 8,
  },
  archivedText: {
    flex: 1,
    fontSize: 14,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  unarchiveBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  unarchiveBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calendarNavBtn: {
    padding: 8,
  },
  calendarNavText: {
    fontSize: 22,
    color: '#6366f1',
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  weekdayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: `${100 / 7}%` as unknown as number,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
  },
  calendarDayBlank: {
    opacity: 0,
  },
  calendarDayToday: {
    borderWidth: 1.5,
    borderColor: '#6366f1',
  },
  calendarDaySelected: {
    backgroundColor: '#6366f1',
  },
  calendarDayText: {
    fontSize: 13,
    color: '#111827',
  },
  calendarDayTodayText: {
    color: '#6366f1',
    fontWeight: '700',
  },
  calendarDaySelectedText: {
    color: '#fff',
    fontWeight: '700',
  },
  calendarActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  calendarActionText: {
    color: '#6366f1',
    fontWeight: '600',
    fontSize: 14,
  },
  calendarCancelText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  editModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  editModalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 6,
    marginTop: 4,
  },
  editModalInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    marginBottom: 10,
  },
  editModalNoteInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  editModalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  editModalActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  archiveBtnText: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '600',
  },
  phasePillRow: {
    flexGrow: 0,
    marginBottom: 12,
  },
  phasePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    marginRight: 8,
  },
  phasePillActive: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  phasePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  phasePillTextActive: {
    color: '#4338ca',
  },
  smallBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  smallBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  milestoneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fefce8',
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
    gap: 8,
  },
  milestoneBannerOverdue: {
    backgroundColor: '#fff7ed',
    borderBottomColor: '#fed7aa',
  },
  milestoneBannerIcon: {
    fontSize: 10,
    color: '#d97706',
  },
  milestoneBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
  },
  milestoneBannerCountdown: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d97706',
  },
  milestoneBannerCountdownOverdue: {
    color: '#dc2626',
  },
  milestoneToggle: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
    alignItems: 'center',
  },
  milestoneToggleActive: {
    borderColor: '#d97706',
    backgroundColor: '#fefce8',
  },
  milestoneToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
  },
  milestoneToggleTextActive: {
    color: '#d97706',
  },
  pickerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  pickerRowActive: {
    backgroundColor: '#eef2ff',
  },
  pickerRowText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  pickerRowTextActive: {
    color: '#4338ca',
    fontWeight: '700',
  },
  pickerRowStatus: {
    fontSize: 11,
    color: '#9ca3af',
    textTransform: 'capitalize',
  },
  pickerCancel: {
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
});
