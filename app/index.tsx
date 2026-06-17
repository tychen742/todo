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
  useWindowDimensions,
} from 'react-native';
import { DraggableList } from '../components/DraggableList';
import { KanbanDragItem, KanbanDragProvider, KanbanDropLane } from '../components/KanbanDrag';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { ArrowLeft, MoreHorizontal } from 'lucide-react-native';
import TodoItem from '../components/TodoItem';
import { type Phase } from '../components/PhaseStrip';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

type Todo = {
  id: string;
  text: string;
  done: boolean;
  scheduled_start_at: string | null;
  started_work_at: string | null;
  assigned_to: string | null;
  created_by: string | null;
  priority: Priority;
  due_date: string | null;
  note: string | null;
  created_at: string;
  assigned_at: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  archived_at: string | null;
  position: number | null;
  workflow_position: number | null;
  is_milestone: boolean;
  project_id: string | null;
  phase_id: string | null;
  workflow_status: WorkflowLaneKey;
  team_id: string | null;
  estimate: string | null;
};

type Organization = {
  id: string;
  name: string;
  member_count?: number;
};

type Team = {
  id: string;
  name: string;
  org_id: string | null;
  member_count?: number;
};

type Project = {
  id: string;
  name: string;
  team_id: string | null;
  created_by: string;
  archived_at: string | null;
};

type Member = {
  user_id: string;
  email: string;
  display_name: string | null;
  role: string;
};

type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  status: string | null;
};

type Priority = 'low' | 'normal' | 'high' | 'urgent';
type SortField = 'text' | 'priority' | 'due_date' | 'created_at';
type CreateTarget = 'team' | 'organization' | 'project';
type ProjectViewMode = 'plan' | 'kanban';
type WorkflowLaneKey = 'backlog' | 'doing' | 'review' | 'done';
type CalendarViewMode = 'day' | 'week' | 'month';

const priorities: Priority[] = ['low', 'normal', 'high', 'urgent'];
const defaultVisibleTaskRows = 5;
const todoRowHeight = 70;
type Density = 'compact' | 'cozy' | 'roomy';
const densityPV: Record<Density, number> = { compact: 4, cozy: 7, roomy: 12 };
const densityRowH: Record<Density, number> = { compact: 56, cozy: 70, roomy: 88 };
const incomingRowHeight = 106;
const taskHeaderHeight = 42;
const taskBoxMaxHeight = taskHeaderHeight + todoRowHeight * defaultVisibleTaskRows;
const incomingBoxMaxHeight = taskHeaderHeight + incomingRowHeight * defaultVisibleTaskRows;

const priorityRank: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const priorityColors: Record<Priority, string> = {
  low: '#9ca3af',
  normal: '#60a5fa',
  high: '#f59e0b',
  urgent: '#ef4444',
};

const defaultWorkflowColumnLabels: Record<WorkflowLaneKey, string> = {
  backlog: 'Backlog',
  doing: 'Doing',
  review: 'Review',
  done: 'Done',
};

const todoSelectColumns = 'id, text, done, scheduled_start_at, started_work_at, assigned_to, created_by, priority, due_date, note, created_at, assigned_at, accepted_at, completed_at, archived_at, position, workflow_position, is_milestone, project_id, phase_id, workflow_status, team_id, estimate';

function workflowStageForTodo(todo: Pick<Todo, 'done' | 'workflow_status'>): WorkflowLaneKey {
  if (todo.done) return 'done';
  return todo.workflow_status;
}

function sortTodos(items: Todo[]) {
  return [...items].sort((a, b) => {
    // Urgent always floats above everything else.
    if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
    if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
    // Within same urgency tier, respect manual drag position.
    if (a.position !== null && b.position !== null) return a.position - b.position;
    if (a.position !== null) return -1;
    if (b.position !== null) return 1;
    // No positions yet: fall back to priority rank then recency.
    const priorityDelta = priorityRank[a.priority] - priorityRank[b.priority];
    if (priorityDelta !== 0) return priorityDelta;
    return Date.parse(b.created_at) - Date.parse(a.created_at);
  });
}

function sortWorkflowTodos(items: Todo[]) {
  return [...items].sort((a, b) => {
    if (a.workflow_position !== null && b.workflow_position !== null) return a.workflow_position - b.workflow_position;
    if (a.workflow_position !== null) return -1;
    if (b.workflow_position !== null) return 1;
    return sortTodos([a, b])[0].id === a.id ? -1 : 1;
  });
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateValue(value: string | null) {
  if (!value) return null;

  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function toDateTimeInputValue(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function fromDateTimeInputValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function monthLabel(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

function buildCalendarDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: firstDay.getDay() }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function startOfWeek(date: Date) {
  return addDays(date, -date.getDay());
}

function buildWeekDays(date: Date) {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function calendarViewTitle(mode: CalendarViewMode, date: Date) {
  if (mode === 'day') {
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  }
  if (mode === 'week') {
    const start = startOfWeek(date);
    const end = addDays(start, 6);
    const sameMonth = start.getMonth() === end.getMonth();
    const startLabel = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const endLabel = end.toLocaleDateString(undefined, {
      month: sameMonth ? undefined : 'short',
      day: 'numeric',
      year: start.getFullYear() === end.getFullYear() ? undefined : 'numeric',
    });
    return `${startLabel} - ${endLabel}`;
  }
  return monthLabel(date);
}

function isSameDate(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function emailDisplayName(email: string | null | undefined) {
  if (!email) return 'User';
  return email.split('@')[0] || email;
}

function profileDisplayName(profile: Pick<Profile, 'email' | 'display_name'>) {
  return profile.display_name?.trim() || emailDisplayName(profile.email);
}

function authRedirectUrl() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return undefined;
  }

  return window.location.origin;
}

function kanbanDueLabel(value: string): string {
  const [y, m, d] = value.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const delta = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (delta === 0) return 'Today';
  if (delta === 1) return 'Tomorrow';
  if (delta === -1) return 'Yesterday';
  if (delta < 0) return `${-delta}d overdue`;
  if (delta <= 7) return `${delta}d`;
  return due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatPhaseDateRange(start: string | null, end: string | null): string {
  function fmt(d: string) {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  if (end) return `Until ${fmt(end)}`;
  return '';
}

type KanbanCardTodo = {
  id: string; text: string; done: boolean; priority: Priority;
  due_date: string | null; note: string | null; is_milestone: boolean;
  assigned_to: string | null;
};
function KanbanCard({ todo, assigneeEmail, onToggle, onDelete, onEdit, onCycleAssignee }: {
  todo: KanbanCardTodo;
  assigneeEmail: string | null;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onCycleAssignee: () => void;
}) {
  const priorityStyle =
    todo.priority === 'urgent' ? kcs.priority_urgent :
    todo.priority === 'high'   ? kcs.priority_high :
    todo.priority === 'low'    ? kcs.priority_low : undefined;
  const dueLabel = todo.due_date ? kanbanDueLabel(todo.due_date) : null;
  const overdue = dueLabel?.includes('overdue') ?? false;
  const hasAssignee = !!todo.assigned_to;
  const avatarColor = assigneeEmail ? pickAvatarColor(assigneeEmail) : undefined;
  const initials = assigneeEmail
    ? assigneeEmail.split('@')[0].split(/[._-]/).filter(p => p).map(p => p[0]).join('').toUpperCase().slice(0, 2) || '?'
    : '?';
  return (
    <View style={[kcs.card, todo.is_milestone && kcs.cardMilestone]}>
      <Pressable onPress={onToggle} hitSlop={8} style={kcs.checkbox}>
        <View style={[kcs.box, todo.done && kcs.boxDone]}>
          {todo.done && <Text style={kcs.checkmark}>✓</Text>}
        </View>
      </Pressable>
      <Pressable onPress={onEdit} style={kcs.body}>
        <View style={kcs.titleRow}>
          {todo.is_milestone && <Text style={kcs.milestoneIcon}>◆</Text>}
          <Text style={[kcs.text, todo.done && kcs.textDone]} numberOfLines={2}>{todo.text}</Text>
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); onCycleAssignee(); }}
            hitSlop={6}
            style={kcs.assigneeInline}
          >
            {hasAssignee && avatarColor ? (
              <View style={[kcs.assigneeAvatar, { backgroundColor: avatarColor }]}>
                <Text style={kcs.assigneeAvatarText}>{initials}</Text>
              </View>
            ) : (
              <Text style={kcs.assigneePlaceholder}>+</Text>
            )}
          </Pressable>
        </View>
        {(priorityStyle || dueLabel) && (
          <View style={kcs.meta}>
            {priorityStyle && <Text style={[kcs.badge, priorityStyle]}>{todo.priority}</Text>}
            {dueLabel && <Text style={[kcs.due, overdue && kcs.dueOverdue]}>{dueLabel}</Text>}
          </View>
        )}
      </Pressable>
      <Pressable onPress={onDelete} hitSlop={8}><Text style={kcs.del}>✕</Text></Pressable>
    </View>
  );
}
const kcs = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', padding: 10, marginHorizontal: 8, marginBottom: 6, gap: 8 },
  cardMilestone: { backgroundColor: '#fefce8', borderColor: '#fde68a' },
  checkbox: { paddingTop: 1 },
  box: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  boxDone: { backgroundColor: '#9ca3af', borderColor: '#9ca3af' },
  checkmark: { color: '#fff', fontSize: 11, fontWeight: '700' },
  body: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  milestoneIcon: { fontSize: 9, color: '#d97706', flexShrink: 0 },
  text: { flex: 1, fontSize: 13, color: '#111827', lineHeight: 18 },
  assigneeInline: { flexShrink: 0 },
  textDone: { textDecorationLine: 'line-through', color: '#9ca3af' },
  meta: { flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' },
  badge: { fontSize: 11, borderRadius: 4, overflow: 'hidden', paddingHorizontal: 5, paddingVertical: 2, fontWeight: '600' },
  priority_low: { color: '#4b5563', backgroundColor: '#f3f4f6' },
  priority_high: { color: '#92400e', backgroundColor: '#fef3c7' },
  priority_urgent: { color: '#b91c1c', backgroundColor: '#fee2e2' },
  due: { fontSize: 11, color: '#4338ca', fontWeight: '600' },
  dueOverdue: { color: '#b91c1c' },
  del: { fontSize: 11, color: '#d1d5db', paddingLeft: 4 },
  assigneeAvatar: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  assigneeAvatarText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  assigneePlaceholder: { fontSize: 16, color: '#d1d5db', fontWeight: '600' },
});

const AVATAR_COLORS = ['#e74c3c', '#e67e22', '#16a34a', '#2563eb', '#7c3aed', '#db2777', '#0891b2', '#d97706'];
const AVATAR_ANIMALS = [
  '🐶','🐱','🦊','🐻','🐼','🐨','🐯','🦁',
  '🐸','🐵','🐧','🦆','🦉','🦋','🐢','🐬',
  '🐙','🦈','🦝','🐺','🦦','🦥','🦔','🐿',
  '🦄','🦜','🦩','🐉','🦋','🐡',
];
function pickAvatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function pickAvatarAnimal(seed: string): string {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) + h);
  return AVATAR_ANIMALS[Math.abs(h) % AVATAR_ANIMALS.length];
}

const priorityLabels: Record<string, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

function InboxAssignerAvatar({ initials, color, tooltip }: { initials: string; color: string; tooltip: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={ias.wrap}
      hitSlop={4}
    >
      <View style={[ias.avatar, { backgroundColor: color }]}>
        <Text style={ias.initials}>{initials}</Text>
      </View>
      {hovered && Platform.OS === 'web' && (
        <View style={ias.tooltip}>
          <Text style={ias.tooltipText}>{tooltip}</Text>
        </View>
      )}
    </Pressable>
  );
}
const ias = StyleSheet.create({
  wrap: { position: 'relative' },
  avatar: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 9, fontWeight: '700', color: '#fff' },
  tooltip: {
    position: 'absolute', bottom: 26, right: 0, backgroundColor: '#111827',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, zIndex: 100, minWidth: 80,
  },
  tooltipText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>('signIn');
  const [now, setNow] = useState(() => new Date());
  const [navExpanded, setNavExpanded] = useState(false);
  const [statusEditing, setStatusEditing] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [createTarget, setCreateTarget] = useState<CreateTarget | null>(null);
  const [orgName, setOrgName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [newTeamOrgId, setNewTeamOrgId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [newProjectTeamId, setNewProjectTeamId] = useState<string | null>(null);
  const [linkingProjectTeam, setLinkingProjectTeam] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [projectViewMode, setProjectViewMode] = useState<ProjectViewMode>('plan');
  const [workflowColumnLabels, setWorkflowColumnLabels] = useState(defaultWorkflowColumnLabels);
  const [phasePickerTodo, setPhasePickerTodo] = useState<Todo | null>(null);
  const [addingPhase, setAddingPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');
  const [renamingPhase, setRenamingPhase] = useState<Phase | null>(null);
  const [renamePhaseName, setRenamePhaseName] = useState('');
  const [renamingWorkflowLane, setRenamingWorkflowLane] = useState<WorkflowLaneKey | null>(null);
  const [renameWorkflowLaneName, setRenameWorkflowLaneName] = useState('');
  const [editDraftPhaseId, setEditDraftPhaseId] = useState<string | null>(null);
  const [columnInputs, setColumnInputs] = useState<Record<string, string>>({});
  const [columnAssignees, setColumnAssignees] = useState<Record<string, string | null>>({});
  const [backlogInputVisible, setBacklogInputVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [projectsViewOpen, setProjectsViewOpen] = useState(false);
  const [teamsViewOpen, setTeamsViewOpen] = useState(false);
  const [calendarViewOpen, setCalendarViewOpen] = useState(false);
  const [resourcesViewOpen, setResourcesViewOpen] = useState(false);
  const [dashboardViewOpen, setDashboardViewOpen] = useState(false);
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>('month');
  const [calendarViewMonth, setCalendarViewMonth] = useState(() => new Date());
  const [calendarViewSelectedDate, setCalendarViewSelectedDate] = useState(() => new Date());
  const [calendarViewNotes, setCalendarViewNotes] = useState<Record<string, string>>({});
  const [animalPickerVisible, setAnimalPickerVisible] = useState(false);
  const [customAnimal, setCustomAnimal] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState('');
  const [orgModalId, setOrgModalId] = useState<string | null>(null);
  const [orgModalMembers, setOrgModalMembers] = useState<Member[]>([]);
  const [orgMemberEmail, setOrgMemberEmail] = useState('');
  const [orgManageMember, setOrgManageMember] = useState<Member | null>(null);
  const [assigneeTodo, setAssigneeTodo] = useState<Todo | null>(null);
  const [assigneePickerUserId, setAssigneePickerUserId] = useState<string | null>(null);
  const [assigneePickerDueDate, setAssigneePickerDueDate] = useState<string | null>(null);
  const [assigneePickerPriority, setAssigneePickerPriority] = useState<Priority>('normal');
  const [assigneePickerMonth, setAssigneePickerMonth] = useState(() => new Date());
  const [assignedToMe, setAssignedToMe] = useState<Todo[]>([]);
  const [memberEmail, setMemberEmail] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [newTodoAssignee, setNewTodoAssignee] = useState<string | null>(null);
  const [newTodoProjectId, setNewTodoProjectId] = useState<string | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');
  const [dueTodo, setDueTodo] = useState<Todo | null>(null);
  const [editTodo, setEditTodo] = useState<Todo | null>(null);
  const [editDraftText, setEditDraftText] = useState('');
  const [editDraftNote, setEditDraftNote] = useState('');
  const [editDraftDueDate, setEditDraftDueDate] = useState<string | null>(null);
  const [editDraftDueDateMonth, setEditDraftDueDateMonth] = useState(() => new Date());
  const [editDraftPriority, setEditDraftPriority] = useState<Priority>('normal');
  const [editDraftEstimate, setEditDraftEstimate] = useState('');
  const [editDraftScheduledStartAt, setEditDraftScheduledStartAt] = useState('');
  const [editDraftProjectId, setEditDraftProjectId] = useState<string | null>(null);
  const [editDraftAssignedTo, setEditDraftAssignedTo] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState('');
  const [hoveredInboxId, setHoveredInboxId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [archivedTodos, setArchivedTodos] = useState<Todo[]>([]);
  const [archivedExpanded, setArchivedExpanded] = useState(false);
  const [density, setDensity] = useState<Density>('cozy');
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [renamingTeam, setRenamingTeam] = useState<Team | null>(null);
  const [renameTeamName, setRenameTeamName] = useState('');
  const [renamingOrg, setRenamingOrg] = useState<Organization | null>(null);
  const [renameOrgName, setRenameOrgName] = useState('');
  const [renamingProject, setRenamingProject] = useState<Project | null>(null);
  const [renameProjectName, setRenameProjectName] = useState('');
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [editDisplayNameValue, setEditDisplayNameValue] = useState('');

  const rowPV = densityPV[density];
  const rowH = densityRowH[density];

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const uid = session?.user.id;
    let cancelled = false;
    const storageKey = uid && selectedProjectId
      ? `todo:workflow-column-labels:${uid}:${selectedProjectId}`
      : null;

    (storageKey ? AsyncStorage.getItem(storageKey) : Promise.resolve(null))
      .then((value) => {
        if (cancelled) return;
        if (!value) {
          setWorkflowColumnLabels(defaultWorkflowColumnLabels);
          return;
        }
        const labels = JSON.parse(value) as Partial<Record<WorkflowLaneKey, string>>;
        setWorkflowColumnLabels({ ...defaultWorkflowColumnLabels, ...labels });
      })
      .catch(() => {
        if (!cancelled) setWorkflowColumnLabels(defaultWorkflowColumnLabels);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId, session]);

  useEffect(() => {
    const uid = session?.user.id;
    let cancelled = false;
    if (!uid) {
      setCalendarViewNotes({});
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
  }, [session]);

  const isProject = selectedProjectId !== null;
  const isPersonal = selectedTeamId === null && !isProject && !projectsViewOpen && !teamsViewOpen && !calendarViewOpen && !resourcesViewOpen && !dashboardViewOpen;
  const showInboxSidePanel = Platform.OS === 'web' && width >= 900 && isPersonal && assignedToMe.length > 0;
  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;
  const selectedTeam = isProject ? null : (teams.find((team) => team.id === selectedTeamId) ?? null);

  function todoKanbanStage(todo: Todo): { key: WorkflowLaneKey; label: string } | undefined {
    if (!todo.project_id && !isProject) return undefined;
    const key = workflowStageForTodo(todo);
    return { key, label: workflowColumnLabels[key] };
  }
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
        delta =
          (a.due_date ? Date.parse(a.due_date) : Infinity) -
          (b.due_date ? Date.parse(b.due_date) : Infinity);
      } else {
        delta = Date.parse(a.created_at) - Date.parse(b.created_at);
      }
      return sortDir === 'asc' ? delta : -delta;
    });
  }, [todos, sortField, sortDir]);

  const done = useMemo(() => todos.filter((t) => t.done), [todos]);
  const memberById = useMemo(
    () => new Map(members.map((member) => [member.user_id, member])),
    [members]
  );
  const selectedProjectOwner = useMemo(() => {
    if (!selectedProject?.created_by) return null;
    return memberById.get(selectedProject.created_by) ?? null;
  }, [memberById, selectedProject?.created_by]);
  const projectMemberAvatars = useMemo(() => {
    if (!selectedProject?.created_by) return members;
    return members.filter((member) => member.user_id !== selectedProject.created_by);
  }, [members, selectedProject?.created_by]);

  function showToast(text: string) {
    setToast(text);
  }

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

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(timeout);
  }, [toast]);
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
  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);
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
  const assigneePickerCalendarDays = useMemo(() => buildCalendarDays(assigneePickerMonth), [assigneePickerMonth]);
  const editDraftCalendarDays = useMemo(() => buildCalendarDays(editDraftDueDateMonth), [editDraftDueDateMonth]);
  const accountDisplayName = profile
    ? profileDisplayName(profile)
    : emailDisplayName(session?.user.email);
  const currentOrgRole = orgModalId
    ? (orgModalMembers.find((m) => m.user_id === session?.user.id)?.role ?? null)
    : null;
  const currentTeamRole = selectedTeamId
    ? (members.find((m) => m.user_id === session?.user.id)?.role ?? null)
    : null;

  const ensureProfile = useCallback(async (currentSession: Session) => {
    const profileEmail = currentSession.user.email?.toLowerCase();
    if (!profileEmail) return;

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: currentSession.user.id,
        email: profileEmail,
      })
      .select('id, email, display_name, status')
      .single();

    if (profileError) {
      setError(profileError.message);
      return;
    }

    setProfile(profileData);
    setStatusDraft(profileData.status ?? '');
  }, []);

  const loadTeams = useCallback(async () => {
    if (!session) return;

    const { data, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, org_id, team_members(count)')
      .order('created_at', { ascending: true });

    if (teamsError) {
      setError(teamsError.message);
      return;
    }

    const nextTeams = (data ?? []).map((t: any) => ({
      id: t.id,
      name: t.name,
      org_id: t.org_id ?? null,
      member_count: t.team_members?.[0]?.count ?? 0,
    }));
    setTeams(nextTeams);
    setSelectedTeamId((current) => {
      if (current && nextTeams.some((team) => team.id === current)) {
        return current;
      }
      return null;
    });
    setError('');
  }, [session]);

  const loadOrganizations = useCallback(async () => {
    if (!session) return;
    const { data, error: err } = await supabase
      .from('organizations')
      .select('id, name, org_members(count)')
      .order('created_at', { ascending: true });
    if (err) { setError(err.message); return; }
    setOrganizations(
      (data ?? []).map((o: any) => ({
        id: o.id,
        name: o.name,
        member_count: o.org_members?.[0]?.count ?? 0,
      }))
    );
  }, [session]);

  const loadProjects = useCallback(async () => {
    if (!session) return;
    const { data, error: err } = await supabase
      .from('projects')
      .select('id, name, team_id, created_by, archived_at')
      .is('archived_at', null)
      .order('created_at', { ascending: true });
    if (err) return;

    if ((data ?? []).length === 0) {
      const { data: seeded } = await supabase
        .from('projects')
        .insert({ name: 'Individual' })
        .select('id, name, team_id, created_by, archived_at')
        .single();
      setProjects(seeded ? [seeded as Project] : []);
    } else {
      setProjects(data as Project[]);
    }
  }, [session]);

  const loadPhases = useCallback(async () => {
    if (!selectedProjectId) {
      setPhases([]);
      return;
    }
    const { data, error: err } = await supabase
      .from('project_phases')
      .select('id, project_id, name, order_index, status, planned_start, planned_end')
      .eq('project_id', selectedProjectId)
      .order('order_index', { ascending: true });
    if (!err) setPhases(data ?? []);
  }, [selectedProjectId]);

  const loadMembers = useCallback(async () => {
    if (selectedProjectId) {
      // Load explicit project members.
      const { data: pmData, error: pmError } = await supabase
        .from('project_members')
        .select('user_id, role')
        .eq('project_id', selectedProjectId);
      if (pmError) { setError(pmError.message); return; }

      // Also union team members if the project is linked to a team.
      const project = projects.find((p) => p.id === selectedProjectId);
      const teamId = project?.team_id ?? null;
      let teamMemberships: { user_id: string; role: string }[] = [];
      if (teamId) {
        const { data: tmData } = await supabase
          .from('team_members')
          .select('user_id, role')
          .eq('team_id', teamId);
        teamMemberships = tmData ?? [];
      }

      // Deduplicate; project_members role takes precedence.
      const roleMap = new Map<string, string>();
      teamMemberships.forEach((m) => roleMap.set(m.user_id, m.role));
      (pmData ?? []).forEach((m) => roleMap.set(m.user_id, m.role));
      const ownerId = selectedProject?.created_by ?? null;
      if (ownerId) {
        roleMap.set(ownerId, 'owner');
      }

      const ids = [...roleMap.keys()];
      if (ids.length === 0) { setMembers([]); setNewTodoAssignee(null); return; }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, display_name')
        .in('id', ids);
      if (profileError) { setError(profileError.message); return; }

      const profilesById = new Map((profileData ?? []).map((p) => [p.id, p]));
      const nextMembers: Member[] = ids
        .filter((id) => profilesById.has(id))
        .map((id) => ({
          user_id: id,
          role: roleMap.get(id) ?? 'member',
          email: profilesById.get(id)!.email,
          display_name: profilesById.get(id)!.display_name ?? null,
        }));

      setMembers(nextMembers);
      setNewTodoAssignee((current) => {
        if (current && nextMembers.some((m) => m.user_id === current)) return current;
        return session?.user.id ?? nextMembers[0]?.user_id ?? null;
      });
      setError('');
      return;
    }

    // Team-only context (no project selected).
    const teamId = selectedTeamId;
    if (!teamId) { setMembers([]); setNewTodoAssignee(null); return; }

    const { data: membershipData, error: membershipError } = await supabase
      .from('team_members')
      .select('user_id, role')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true });
    if (membershipError) { setError(membershipError.message); return; }

    const memberships = membershipData ?? [];
    const ids = memberships.map((member) => member.user_id);
    if (ids.length === 0) { setMembers([]); setNewTodoAssignee(null); return; }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, display_name')
      .in('id', ids);
    if (profileError) { setError(profileError.message); return; }

    const profilesById = new Map((profileData ?? []).map((profile) => [profile.id, profile]));
    const nextMembers = memberships.map((member) => ({
      user_id: member.user_id,
      role: member.role,
      email: profilesById.get(member.user_id)?.email ?? 'unknown@example.com',
      display_name: profilesById.get(member.user_id)?.display_name ?? null,
    }));

    setMembers(nextMembers);
    setNewTodoAssignee((current) => {
      if (current && nextMembers.some((member) => member.user_id === current)) return current;
      return session?.user.id ?? nextMembers[0]?.user_id ?? null;
    });
    setError('');
  }, [selectedTeamId, selectedProjectId, selectedProject?.created_by, projects, session]);

  const loadTodos = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('todos')
      .select(todoSelectColumns)
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (selectedProjectId) {
      query = query.eq('project_id', selectedProjectId);
    } else {
      if (selectedTeamId) {
        query = query.eq('team_id', selectedTeamId).is('project_id', null);
      } else if (session) {
        query = query.or(
          `and(team_id.is.null,project_id.is.null,created_by.eq.${session.user.id}),and(assigned_to.eq.${session.user.id},accepted_at.not.is.null)`
        );
      }
    }

    const { data, error: loadError } = await query;

    if (loadError) {
      setError(loadError.message);
    } else {
      setTodos(sortTodos((data ?? []) as Todo[]));
      setError('');
    }
    setLoading(false);
  }, [selectedTeamId, selectedProjectId, session]);

  const loadAssignedToMe = useCallback(async () => {
    if (!session) return;
    const { data, error: err } = await supabase
      .from('todos')
      .select(todoSelectColumns)
      .eq('assigned_to', session.user.id)
      .is('accepted_at', null)
      .is('archived_at', null)
      .eq('done', false)
      .or('team_id.not.is.null,project_id.not.is.null')
      .order('due_date', { ascending: true, nullsFirst: false });
    if (!err) setAssignedToMe((data ?? []) as Todo[]);
  }, [session]);

  const loadArchivedTodos = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('todos')
      .select(todoSelectColumns)
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false });

    if (selectedProjectId) {
      query = query.eq('project_id', selectedProjectId);
    } else if (selectedTeamId) {
      query = query.eq('team_id', selectedTeamId).is('project_id', null);
    } else if (session) {
      query = query.or(
        `and(team_id.is.null,project_id.is.null,created_by.eq.${session.user.id}),and(assigned_to.eq.${session.user.id})`
      );
    }

    const { data, error: err } = await query;
    if (!err) setArchivedTodos((data ?? []) as Todo[]);
    setLoading(false);
  }, [selectedTeamId, selectedProjectId, session]);

  useEffect(() => {
    loadAssignedToMe();
  }, [loadAssignedToMe]);

  useEffect(() => {
    loadArchivedTodos();
  }, [loadArchivedTodos]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthLoading(false);
      setError('Add Supabase env vars to sync todos.');
      return;
    }

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
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
      setSession(currentSession);
      setOrganizations([]);
      setTeams([]);
      setProjects([]);
      setSelectedTeamId(null);
      setSelectedProjectId(null);
      setPhases([]);
      setMembers([]);
      setTodos([]);
      setError('');
      setMessage('');
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;

    ensureProfile(session).then(() => {
      loadOrganizations();
      loadTeams();
      loadProjects();
    });
  }, [ensureProfile, loadOrganizations, loadTeams, loadProjects, session]);

  useEffect(() => {
    if (!session) return;
    loadPhases();
  }, [loadPhases, session]);

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

  async function submitAuth() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (authMode === 'signUp' && password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!isSupabaseConfigured) {
      setError('Add Supabase env vars to sync todos.');
      return;
    }

    setAuthLoading(true);
    setError('');
    setMessage('');

    const result =
      authMode === 'signIn'
        ? await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
        : await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
              emailRedirectTo: authRedirectUrl(),
              data: { display_name: displayNameInput.trim() || null },
            },
          });

    setAuthLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (authMode === 'signUp' && !result.data.session) {
      setMessage('Account created! Check your email to confirm, then sign in.');
      return;
    }

    // On sign-up with immediate session (email confirm disabled), save display name
    if (authMode === 'signUp' && result.data.session && displayNameInput.trim()) {
      await supabase.from('profiles').update({ display_name: displayNameInput.trim() }).eq('id', result.data.session.user.id);
    }
  }

  async function sendPasswordReset() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Enter your email first.');
      return;
    }
    if (!isSupabaseConfigured) {
      setError('Add Supabase env vars to sync todos.');
      return;
    }

    setAuthLoading(true);
    setError('');
    setMessage('');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: authRedirectUrl(),
    });

    setAuthLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage('Check your email for a password reset link.');
  }

  async function saveRecoveryPassword() {
    const nextPassword = recoveryPassword.trim();
    if (nextPassword.length < 6) {
      setError('Enter a password with at least 6 characters.');
      return;
    }

    setAuthLoading(true);
    setError('');
    setMessage('');

    const { error: updateError } = await supabase.auth.updateUser({ password: nextPassword });

    setAuthLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setPasswordRecovery(false);
    setRecoveryPassword('');
    setMessage('Password updated.');
  }

  async function signOut() {
    setProfile(null);
    await supabase.auth.signOut();
    setInput('');
  }

  async function saveStatus() {
    setStatusEditing(false);
    if (!session) return;
    const status = statusDraft.trim() || null;
    await supabase.from('profiles').update({ status }).eq('id', session.user.id);
    setProfile((prev) => prev ? { ...prev, status } : prev);
  }

  async function saveDisplayName() {
    if (!session) return;
    const name = editDisplayNameValue.trim();
    const { error: err } = await supabase.from('profiles').update({ display_name: name || null }).eq('id', session.user.id);
    if (err) { setError(err.message); return; }
    setProfile((prev) => prev ? { ...prev, display_name: name || null } : prev);
    setEditingDisplayName(false);
    setError('');
  }

  async function renameTeam() {
    if (!renamingTeam) return;
    const name = renameTeamName.trim();
    if (!name) return;
    const { error: err } = await supabase.from('teams').update({ name }).eq('id', renamingTeam.id);
    if (err) { setError(err.message); return; }
    setTeams((prev) => prev.map((t) => t.id === renamingTeam.id ? { ...t, name } : t));
    setRenamingTeam(null);
    setRenameTeamName('');
    setError('');
  }

  async function renameOrg() {
    if (!renamingOrg) return;
    const name = renameOrgName.trim();
    if (!name) return;
    const { error: err } = await supabase.from('organizations').update({ name }).eq('id', renamingOrg.id);
    if (err) { setError(err.message); return; }
    setOrganizations((prev) => prev.map((o) => o.id === renamingOrg.id ? { ...o, name } : o));
    setRenamingOrg(null);
    setRenameOrgName('');
    setError('');
  }

  async function renameProject() {
    if (!renamingProject) return;
    const name = renameProjectName.trim();
    if (!name) return;
    const { error: err } = await supabase.from('projects').update({ name }).eq('id', renamingProject.id);
    if (err) { setError(err.message); return; }
    setProjects((prev) => prev.map((p) => p.id === renamingProject.id ? { ...p, name } : p));
    setRenamingProject(null);
    setRenameProjectName('');
    setError('');
  }

  function choosePlannedUserFeature(label: string) {
    setMessage(`${label} is planned.`);
    setError('');
  }

  function openCreateTeam(orgId: string | null = null) {
    setNewTeamOrgId(orgId);
    openCreateTarget('team');
  }

  async function createTeam() {
    if (!session) return;

    const name = teamName.trim();
    if (!name) return;

    const { data, error: teamError } = await supabase
      .rpc('create_team_with_owner', { p_name: name, p_org_id: newTeamOrgId });

    if (teamError) {
      setError(teamError.message);
      return;
    }

    const team = (data as Array<{ id: string; name: string; org_id: string | null }>)?.[0];
    if (!team) {
      setError('Failed to create team.');
      return;
    }

    setTeamName('');
    setNewTeamOrgId(null);
    setTeams((prev) => [...prev, team]);
    setSelectedTeamId(team.id);
    setCreateTarget(null);
    setMessage(`Created ${team.name}.`);
    setError('');
  }

  async function createOrganization() {
    if (!session) return;
    const name = orgName.trim();
    if (!name) return;

    const { data, error: orgError } = await supabase
      .rpc('create_org_with_owner', { p_name: name });

    if (orgError) { setError(orgError.message); return; }

    const org = (data as Array<{ id: string; name: string }>)?.[0];
    if (!org) { setError('Failed to create organization.'); return; }

    setOrgName('');
    setOrganizations((prev) => [...prev, { ...org, member_count: 1 }]);
    setCreateTarget(null);
    setMessage(`Created ${org.name}.`);
    setError('');
  }

  async function createProject() {
    if (!session) return;
    const name = projectName.trim();
    if (!name) return;

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({ name, created_by: session.user.id, team_id: newProjectTeamId })
      .select('id, name, team_id, created_by, archived_at')
      .single();

    if (projectError) {
      setError(projectError.message);
      return;
    }

    const defaultPhases = ['Planning', 'Execution', 'Review'];
    const createdPhases = await Promise.all(
      defaultPhases.map((phaseName, i) =>
        supabase
          .from('project_phases')
          .insert({
            project_id: project.id,
            name: phaseName,
            order_index: i,
            status: i === 0 ? 'active' : 'upcoming',
          })
          .select('id, project_id, name, order_index, status, planned_start, planned_end')
          .single()
      )
    );
    const nextPhases = createdPhases
      .map((result) => result.data)
      .filter((phase): phase is Phase => !!phase);

    // Auto-add the creator to the linked team so they can assign tasks.
    if (newProjectTeamId) {
      await supabase
        .from('team_members')
        .insert({ team_id: newProjectTeamId, user_id: session.user.id, role: 'member' })
        .select();
    }

    setProjectName('');
    setNewProjectTeamId(null);
    setProjects((prev) => [...prev, project]);
    setPhases(nextPhases);
    setSelectedProjectId(project.id);
    setSelectedTeamId(null);
    setCreateTarget(null);
    setMessage('');
    setError('');
  }

  async function linkProjectTeam(teamId: string | null) {
    if (!selectedProjectId || !session) return;
    const { error } = await supabase
      .from('projects')
      .update({ team_id: teamId })
      .eq('id', selectedProjectId);
    if (error) { setError(error.message); return; }

    // Auto-add the project owner to the linked team so they can assign tasks.
    if (teamId) {
      await supabase
        .from('team_members')
        .insert({ team_id: teamId, user_id: session.user.id, role: 'member' })
        .select();
    }

    setProjects((prev) =>
      prev.map((p) => p.id === selectedProjectId ? { ...p, team_id: teamId } : p)
    );
    setLinkingProjectTeam(false);
    loadMembers();
  }

  function openCreateTarget(target: CreateTarget) {
    if (target === 'team') {
      setCreateTarget('team');
      return;
    }

    if (target === 'project') {
      setCreateTarget('project');
      return;
    }

    setCreateTarget('organization');
  }

  function selectTeamFromAccountMenu(teamId: string) {
    setSelectedTeamId(teamId);
  }

  async function addMember() {
    if (!selectedTeamId) return;

    const normalizedEmail = memberEmail.trim().toLowerCase();
    if (!normalizedEmail) return;

    const { data: rows, error: profileError } = await supabase
      .rpc('find_profile_by_email', { p_email: normalizedEmail });

    if (profileError) {
      setError(profileError.message);
      return;
    }

    const profile = rows?.[0] ?? null;
    if (!profile) {
      setError('No account found for that email. They must sign in at least once before you can add them.');
      return;
    }

    const { error: memberError } = await supabase.from('team_members').upsert({
      team_id: selectedTeamId,
      user_id: profile.id,
      role: 'member',
    });

    if (memberError) {
      setError(memberError.message);
      return;
    }

    setMemberEmail('');
    setMessage(`Added ${profile.email}.`);
    setError('');
    loadMembers();
  }

  async function loadOrgMembers(orgId: string) {
    const { data: membershipData, error: membershipError } = await supabase
      .from('org_members')
      .select('user_id, role')
      .eq('org_id', orgId)
      .order('created_at', { ascending: true });

    if (membershipError) { setError(membershipError.message); return; }

    const ids = (membershipData ?? []).map((m) => m.user_id);
    if (ids.length === 0) { setOrgModalMembers([]); return; }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, display_name')
      .in('id', ids);

    if (profileError) { setError(profileError.message); return; }

    const profilesById = new Map((profileData ?? []).map((p) => [p.id, p]));
    setOrgModalMembers(
      (membershipData ?? []).map((m) => ({
        user_id: m.user_id,
        role: m.role,
        email: profilesById.get(m.user_id)?.email ?? 'unknown@example.com',
        display_name: profilesById.get(m.user_id)?.display_name ?? null,
      }))
    );
  }

  async function openOrgModal(orgId: string) {
    setOrgModalId(orgId);
    setOrgMemberEmail('');
    setError('');
    await loadOrgMembers(orgId);
  }

  async function addOrgMember() {
    if (!orgModalId) return;
    const normalizedEmail = orgMemberEmail.trim().toLowerCase();
    if (!normalizedEmail) return;

    const { data: rows, error: profileError } = await supabase
      .rpc('find_profile_by_email', { p_email: normalizedEmail });

    if (profileError) { setError(profileError.message); return; }

    const profile = rows?.[0] ?? null;
    if (!profile) {
      setError('No account found for that email. They must sign in at least once before you can add them.');
      return;
    }

    const { error: memberError } = await supabase.from('org_members').upsert({
      org_id: orgModalId,
      user_id: profile.id,
      role: 'member',
    });

    if (memberError) { setError(memberError.message); return; }

    setOrgMemberEmail('');
    setError('');
    setOrganizations((prev) =>
      prev.map((o) =>
        o.id === orgModalId ? { ...o, member_count: (o.member_count ?? 0) + 1 } : o
      )
    );
    loadOrgMembers(orgModalId);
  }

  async function transferOrgOwnership(memberId: string) {
    if (!orgModalId) return;
    const { error } = await supabase.rpc('transfer_org_ownership', {
      p_org_id: orgModalId,
      p_new_owner_id: memberId,
    });
    if (error) { setError(error.message); return; }
    setOrgManageMember(null);
    setError('');
    loadOrgMembers(orgModalId);
  }

  async function updateOrgMemberRole(memberId: string, role: 'admin' | 'member') {
    if (!orgModalId) return;
    const { error } = await supabase
      .from('org_members')
      .update({ role })
      .eq('org_id', orgModalId)
      .eq('user_id', memberId);
    if (error) { setError(error.message); return; }
    setOrgManageMember(null);
    setError('');
    loadOrgMembers(orgModalId);
  }

  async function removeOrgMember(memberId: string) {
    if (!orgModalId) return;
    const { error } = await supabase
      .from('org_members')
      .delete()
      .eq('org_id', orgModalId)
      .eq('user_id', memberId);
    if (error) { setError(error.message); return; }
    setOrgManageMember(null);
    setError('');
    setOrganizations((prev) =>
      prev.map((o) =>
        o.id === orgModalId ? { ...o, member_count: Math.max(0, (o.member_count ?? 1) - 1) } : o
      )
    );
    loadOrgMembers(orgModalId);
  }

  async function addTodo() {
    const text = input.trim();
    if (!text || !session) return;
    const assignedTo = selectedTeamId && !isProject ? newTodoAssignee : null;

    const { data, error: insertError } = await supabase
      .from('todos')
      .insert({
        text,
        team_id: isProject ? null : selectedTeamId,
        project_id: selectedProjectId,
        created_by: session.user.id,
        assigned_to: assignedTo,
        assigned_at: assignedTo ? new Date().toISOString() : null,
        priority: 'normal',
        workflow_status: 'backlog',
      })
      .select(todoSelectColumns)
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }

    if (data) {
      setTodos((prev) => sortTodos([data as Todo, ...prev]));
    }
    setInput('');
    setError('');
  }

  async function addTodoToPhase(phaseId: string | null) {
    const key = phaseId ?? 'backlog';
    const text = (columnInputs[key] ?? '').trim();
    if (!text || !session || !selectedProjectId) return;

    const assigned_to = columnAssignees[key] ?? null;
    const assigned_at = assigned_to ? new Date().toISOString() : null;

    const { data, error: insertError } = await supabase
      .from('todos')
      .insert({
        text,
        project_id: selectedProjectId,
        phase_id: phaseId,
        created_by: session.user.id,
        assigned_to,
        assigned_at,
        priority: 'normal',
        workflow_status: 'backlog',
      })
      .select(todoSelectColumns)
      .single();

    if (insertError) { setError(insertError.message); return; }
    if (data) setTodos((prev) => [data as Todo, ...prev]);
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
    setAssignedToMe(prev => prev.filter(t => t.id !== id));
    setTodos((prev) => sortTodos([acceptedTodo, ...prev.filter((item) => item.id !== id)]));
    showToast('Moved from Inbox to Todos');
    setError('');
  }

  async function setAssignee(todo: Todo, userId: string | null) {
    const updates = {
      assigned_to: userId,
      assigned_at: userId ? new Date().toISOString() : null,
      accepted_at: null,
    };
    const { error: updateError } = await supabase
      .from('todos')
      .update(updates)
      .eq('id', todo.id);

    if (updateError) { setError(updateError.message); return; }

    setTodos((prev) =>
      prev.map((item) => (item.id === todo.id ? { ...item, ...updates } : item))
    );
    setAssigneeTodo(null);
    setError('');
  }

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
    const updates = {
      assigned_to: assigneePickerUserId,
      due_date: assigneePickerDueDate,
      priority: assigneePickerPriority,
      assigned_at: assigneeChanged ? (assigneePickerUserId ? new Date().toISOString() : null) : assigneeTodo.assigned_at,
      accepted_at: assigneeChanged ? null : assigneeTodo.accepted_at,
    };
    const { error: updateError } = await supabase.from('todos').update(updates).eq('id', assigneeTodo.id);
    if (updateError) { setError(updateError.message); return; }
    setTodos(prev => prev.map(t => t.id === assigneeTodo!.id ? { ...t, ...updates } : t));
    closeAssigneePicker();
    loadAssignedToMe();
    setError('');
  }

  async function cyclePriority(todo: Todo) {
    const currentIndex = priorities.indexOf(todo.priority);
    const priority = priorities[(currentIndex + 1) % priorities.length];

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
          .from('profiles').select('id, email, display_name').in('id', ids);
        const profilesById = new Map((profileData ?? []).map((p) => [p.id, p]));
        setMembers(ids.filter((id) => profilesById.has(id)).map((id) => ({
          user_id: id,
          role: roleMap.get(id) ?? 'member',
          email: profilesById.get(id)!.email,
          display_name: profilesById.get(id)!.display_name ?? null,
        })));
      }
    }
  }

  function closeEditModal() {
    setEditTodo(null);
  }

  async function saveEditModal() {
    if (!editTodo) return;
    const text = editDraftText.trim();
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
    const accepted_at = assigneeChanged ? null : editTodo.accepted_at;

    const { error: updateError } = await supabase
      .from('todos')
      .update({ text, note, phase_id, project_id, due_date: editDraftDueDate, priority: editDraftPriority, estimate, scheduled_start_at: scheduledStartAt, assigned_to, assigned_at, accepted_at })
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
              priority: editDraftPriority,
              estimate,
              scheduled_start_at: scheduledStartAt,
              assigned_to,
              assigned_at: assigned_at ?? null,
              accepted_at: accepted_at ?? null,
            }
          : item
      )
    );
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
    if (todo) setArchivedTodos((prev) => [{ ...todo, archived_at }, ...prev]);
    if (editTodo?.id === id) closeEditModal();
    setError('');
  }

  async function startWorkOnTodo(todo: Todo) {
    if (todo.started_work_at) return;
    const nowIso = new Date().toISOString();
    const shouldMoveToDoing = !!todo.project_id && todo.workflow_status === 'backlog' && !todo.done;
    const updates = {
      started_work_at: nowIso,
      accepted_at: todo.accepted_at ?? nowIso,
      workflow_status: shouldMoveToDoing ? ('doing' as WorkflowLaneKey) : todo.workflow_status,
      workflow_position: shouldMoveToDoing ? null : todo.workflow_position,
    };
    const { error: updateError } = await supabase
      .from('todos')
      .update(updates)
      .eq('id', todo.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setTodos((prev) => prev.map((item) => (item.id === todo.id ? { ...item, ...updates } : item)));
    setError('');
    showToast(shouldMoveToDoing ? 'Work started · moved to Doing' : 'Work started');
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

  async function archiveProject(id: string) {
    const archived_at = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('projects')
      .update({ archived_at })
      .eq('id', id);
    if (updateError) { setError(updateError.message); return; }
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (selectedProjectId === id) setSelectedProjectId(null);
    setError('');
  }

  async function handleDragEnd(reorderedActive: Todo[]) {
    const positionMap = new Map(reorderedActive.map((todo, index) => [todo.id, index]));

    setTodos((prev) =>
      sortTodos(
        prev.map((todo) =>
          positionMap.has(todo.id) ? { ...todo, position: positionMap.get(todo.id)! } : todo
        )
      )
    );

    const updates = reorderedActive.map((todo, index) => ({ id: todo.id, position: index }));
    const { error: batchError } = await supabase.rpc('batch_update_todo_positions', {
      updates,
    });

    if (batchError) {
      setError(batchError.message);
    }
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
        position: nextPositionById.get(todoId) ?? 0,
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
        workflow_position: nextWorkflowPositionById.get(todoId) ?? 0,
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

  async function cyclePhaseStatus(phase: Phase) {
    const order: Phase['status'][] = ['upcoming', 'active', 'completed'];
    const next = order[(order.indexOf(phase.status) + 1) % order.length];
    const { error: updateError } = await supabase
      .from('project_phases')
      .update({ status: next })
      .eq('id', phase.id);
    if (updateError) { setError(updateError.message); return; }
    setPhases((prev) => prev.map((p) => (p.id === phase.id ? { ...p, status: next } : p)));
  }

  async function addPhase() {
    if (!selectedProjectId) return;
    const name = newPhaseName.trim();
    if (!name) return;
    const { data, error: err } = await supabase
      .from('project_phases')
      .insert({ project_id: selectedProjectId, name, order_index: phases.length, status: 'upcoming' })
      .select('id, project_id, name, order_index, status, planned_start, planned_end')
      .single();
    if (err) { setError(err.message); return; }
    if (data) {
      setPhases((prev) => [...prev, data as Phase]);
    }
    setNewPhaseName('');
    setAddingPhase(false);
  }

  function openRenamePhase(phase: Phase) {
    setRenamingPhase(phase);
    setRenamePhaseName(phase.name);
  }

  function closeRenamePhase() {
    setRenamingPhase(null);
    setRenamePhaseName('');
  }

  async function saveRenamePhase() {
    if (!renamingPhase) return;
    const name = renamePhaseName.trim();
    if (!name) return;

    const { error: updateError } = await supabase
      .from('project_phases')
      .update({ name })
      .eq('id', renamingPhase.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setPhases((prev) => prev.map((phase) => (
      phase.id === renamingPhase.id ? { ...phase, name } : phase
    )));
    closeRenamePhase();
    setError('');
  }

  function openRenameWorkflowLane(lane: WorkflowLaneKey) {
    setRenamingWorkflowLane(lane);
    setRenameWorkflowLaneName(workflowColumnLabels[lane]);
  }

  function closeRenameWorkflowLane() {
    setRenamingWorkflowLane(null);
    setRenameWorkflowLaneName('');
  }

  async function saveRenameWorkflowLane() {
    if (!selectedProjectId || !renamingWorkflowLane) return;
    const name = renameWorkflowLaneName.trim();
    if (!name) return;

    const labels = {
      ...workflowColumnLabels,
      [renamingWorkflowLane]: name,
    };
    setWorkflowColumnLabels(labels);
    const uid = session?.user.id;
    if (uid) {
      await AsyncStorage.setItem(
        `todo:workflow-column-labels:${uid}:${selectedProjectId}`,
        JSON.stringify(labels)
      );
    }
    closeRenameWorkflowLane();
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

  function assigneeLabel(userId: string | null) {
    if (isPersonal) return '';
    if (!userId) return 'Unassigned';
    const member = memberById.get(userId);
    if (!member) return 'Assigned to unknown';
    if (session?.user.id === userId) return 'Assigned to me';
    return `Assigned to ${profileDisplayName(member)}`;
  }

  function getAssignerInfo(todo: Todo): { initials: string; color: string; name: string } | null {
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
      name,
    };
  }

  function renderAssignedToMeTodo(todo: Todo) {
    const project = projects.find(p => p.id === todo.project_id);
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
    const creatorTooltip = creatorName ? `From: ${creatorName}` : `From: ${contextLabel}`;
    return (
      <View key={todo.id} style={[styles.assignedToMeRow, { paddingVertical: rowPV }]}>
        <Pressable
          onPress={() => moveInboxTodoToTodos(todo.id)}
          onHoverIn={() => setHoveredInboxId(todo.id)}
          onHoverOut={() => setHoveredInboxId(null)}
          style={[
            styles.incomingAcceptIcon,
            { backgroundColor: priorityColors[todo.priority], borderColor: priorityColors[todo.priority] },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Move to Todos"
        >
          <ArrowLeft size={11} strokeWidth={2.75} color="#fff" />
          {Platform.OS === 'web' && hoveredInboxId === todo.id && (
            <View style={styles.incomingAcceptTooltip}>
              <Text style={styles.incomingAcceptTooltipText} numberOfLines={1}>Move to Todos · {priorityLabels[todo.priority]}</Text>
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
        <InboxAssignerAvatar initials={creatorInitials} color={creatorColor} tooltip={creatorTooltip} />
      </View>
    );
  }

  if (passwordRecovery) {
    return (
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style="dark" />
        <ScrollView
          contentContainerStyle={styles.authScroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.authPanel}>
            <View style={styles.authBrand}>
              <View style={styles.authLogo}>
                <Text style={styles.authLogoText}>✓</Text>
              </View>
              <Text style={styles.authBrandName}>Todo</Text>
            </View>
            <Text style={styles.authTitle}>Set a new password</Text>
            <Text style={styles.authTitleSub}>
              Enter a new password for your account.
            </Text>

            {!!error && (
              <Text style={styles.authFieldError}>{error}</Text>
            )}

            <Text style={styles.authLabel}>New password</Text>
            <View style={styles.authPasswordWrap}>
              <TextInput
                style={styles.authPasswordInput}
                value={recoveryPassword}
                onChangeText={setRecoveryPassword}
                placeholder="At least 8 characters"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                textContentType="newPassword"
                autoComplete="new-password"
                onSubmitEditing={saveRecoveryPassword}
              />
              <Pressable onPress={() => setShowPassword((p) => !p)} hitSlop={8}>
                <Text style={styles.passwordToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={saveRecoveryPassword}
              disabled={authLoading}
              style={({ pressed }) => [
                styles.authSubmitBtn,
                (!recoveryPassword.trim() || authLoading) && styles.authSubmitBtnMuted,
                pressed && styles.btnPressed,
              ]}
            >
              <Text style={styles.authSubmitBtnText}>
                {authLoading ? 'Please wait…' : 'Update Password'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (!session) {
    const isSignIn = authMode === 'signIn';
    return (
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style="dark" />
        <ScrollView
          contentContainerStyle={styles.authScroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.authPanel}>
            {/* Brand */}
            <View style={styles.authBrand}>
              <View style={styles.authLogo}>
                <Text style={styles.authLogoText}>✓</Text>
              </View>
              <Text style={styles.authBrandName}>Todo</Text>
            </View>

            <Text style={styles.authTitle}>
              {isSignIn ? 'Welcome back' : 'Create your account'}
            </Text>
            <Text style={styles.authTitleSub}>
              {isSignIn ? 'Sign in to continue' : 'Get started — it\'s free'}
            </Text>

            {/* Email */}
            <Text style={styles.authLabel}>Email</Text>
            <TextInput
              style={[styles.authInput, !!error && styles.authInputError]}
              value={email}
              onChangeText={(v) => { setEmail(v); if (error) setError(''); }}
              placeholder="you@example.com"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
            />

            {/* Display name — sign-up only */}
            {!isSignIn && (
              <>
                <Text style={styles.authLabel}>Your name</Text>
                <TextInput
                  style={styles.authInput}
                  value={displayNameInput}
                  onChangeText={setDisplayNameInput}
                  placeholder="How should we call you?"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="words"
                  textContentType="name"
                  autoComplete="name"
                />
              </>
            )}

            {/* Password */}
            <View style={styles.authPasswordHeader}>
              <Text style={styles.authLabel}>Password</Text>
              {isSignIn && (
                <Pressable onPress={sendPasswordReset} disabled={authLoading}>
                  <Text style={styles.forgotBtnText}>Forgot password?</Text>
                </Pressable>
              )}
            </View>
            <View style={[styles.authPasswordWrap, !!error && styles.authInputError]}>
              <TextInput
                style={styles.authPasswordInput}
                value={password}
                onChangeText={setPassword}
                placeholder={isSignIn ? '••••••••' : 'At least 8 characters'}
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                textContentType={isSignIn ? 'password' : 'newPassword'}
                autoComplete={isSignIn ? 'current-password' : 'new-password'}
                onSubmitEditing={submitAuth}
              />
              <Pressable onPress={() => setShowPassword((p) => !p)} hitSlop={8}>
                <Text style={styles.passwordToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>

            {!!error && <Text style={styles.authFieldError}>{error}</Text>}

            {!!message ? (
              <View style={styles.authSuccessBox}>
                <Text style={styles.authSuccessText}>{message}</Text>
              </View>
            ) : (
              <Pressable
                onPress={submitAuth}
                disabled={authLoading || !isSupabaseConfigured || !email.trim() || !password}
                style={({ pressed }) => [
                  styles.authSubmitBtn,
                  (authLoading || !isSupabaseConfigured || !email.trim() || !password) && styles.authSubmitBtnMuted,
                  pressed && styles.btnPressed,
                ]}
              >
                <Text style={styles.authSubmitBtnText}>
                  {authLoading ? 'Please wait…' : isSignIn ? 'Sign In' : 'Create Account'}
                </Text>
              </Pressable>
            )}

            <View style={styles.authDivider}>
              <View style={styles.authDividerLine} />
              <Text style={styles.authDividerText}>or continue with</Text>
              <View style={styles.authDividerLine} />
            </View>

            <View style={styles.socialGrid}>
              <Pressable style={[styles.socialGridBtn, styles.socialGridBtnSoon]} disabled>
                <Text style={styles.googleG}>G</Text>
                <Text style={styles.socialGridBtnText}>Google</Text>
              </Pressable>
              <Pressable style={[styles.socialGridBtn, styles.socialGridBtnSoon]} disabled>
                <Text style={styles.appleIcon}></Text>
                <Text style={styles.socialGridBtnText}>Apple</Text>
              </Pressable>
              <Pressable style={[styles.socialGridBtn, styles.socialGridBtnSoon]} disabled>
                <Text style={styles.githubIcon}>GH</Text>
                <Text style={styles.socialGridBtnText}>GitHub</Text>
              </Pressable>
              <Pressable style={[styles.socialGridBtn, styles.socialGridBtnSoon]} disabled>
                <Text style={styles.ssoIcon}>☁</Text>
                <Text style={styles.socialGridBtnText}>SSO</Text>
              </Pressable>
            </View>
            <Text style={styles.socialComingSoon}>OAuth providers coming soon</Text>

            <View style={styles.authSubtitleRow}>
              <Text style={styles.authSubtitleText}>
                {isSignIn ? 'New here? ' : 'Already have an account? '}
              </Text>
              <Pressable
                onPress={() => {
                  setAuthMode(isSignIn ? 'signUp' : 'signIn');
                  setError('');
                  setMessage('');
                  setDisplayNameInput('');
                }}
              >
                <Text style={styles.authSubtitleLink}>
                  {isSignIn ? 'Create account' : 'Sign in'}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.authFooter}>
            <Text style={styles.authFooterText}>
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      {/* Title bar */}
      {(() => {
        const seed = profile?.email ?? session.user.email ?? '';
        const avatarColor = pickAvatarColor(seed);
        const animal = customAnimal ?? pickAvatarAnimal(seed);
        const initials = accountDisplayName
          .split(/[\s._-]+/)
          .slice(0, 2)
          .map((w) => w[0]?.toUpperCase() ?? '')
          .join('');
        return (
          <View style={styles.titleBar}>
            <View style={styles.titleBarLeft}>
              <View style={styles.userIdentityRow}>
                <Pressable
                  onPress={() => setAnimalPickerVisible(true)}
                  accessibilityLabel="Change avatar"
                  hitSlop={4}
                >
                  <View style={[styles.userAvatarBig, { backgroundColor: avatarColor }]}>
                    <Text style={styles.userAvatarBigAnimal}>{animal}</Text>
                  </View>
                </Pressable>
                <View style={styles.userMeta}>
                  <Pressable
                    onPress={() => setNavExpanded((v) => !v)}
                    style={styles.userMetaNameRow}
                    accessibilityRole="button"
                    accessibilityLabel="Toggle account menu"
                  >
                    <Text style={styles.userMetaName} numberOfLines={1}>{accountDisplayName}</Text>
                    <Text style={styles.userNavChevron}>{navExpanded ? '▴' : '▾'}</Text>
                  </Pressable>
                  <View style={styles.userMetaStatusRow}>
                    <View style={styles.onlineDot} />
                    {statusEditing ? (
                      <TextInput
                        style={styles.statusInput}
                        value={statusDraft}
                        onChangeText={setStatusDraft}
                        onBlur={saveStatus}
                        onSubmitEditing={saveStatus}
                        placeholder="What are you up to?"
                        placeholderTextColor="#d1d5db"
                        autoFocus
                        maxLength={80}
                        returnKeyType="done"
                      />
                    ) : (
                      <Pressable onPress={() => setStatusEditing(true)} style={styles.statusPressable}>
                        <Text style={statusDraft ? styles.statusText : styles.statusPlaceholder} numberOfLines={1}>
                          {statusDraft || 'What are you up to?'}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.titleBarCenter}>
              <View style={styles.searchBar}>
                <Text style={styles.searchIcon}>⌕</Text>
                <Text style={styles.searchPlaceholder}>Search</Text>
                <Text style={styles.searchShortcut}>⌘K</Text>
              </View>
            </View>

            <View style={styles.titleBarRight}>
              <Text style={styles.titleBarDateText}>
                {now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </Text>
              <Text style={styles.titleBarTimeText}>
                {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        );
      })()}

      <View style={styles.teamPanel}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.workspaceTabs}
          style={styles.workspaceTabsScroll}
        >
          <Pressable
            onPress={() => {
              setSelectedTeamId(null);
              setSelectedProjectId(null);
              setProjectsViewOpen(false);
              setTeamsViewOpen(false);
              setCalendarViewOpen(false);
              setResourcesViewOpen(false);
              setDashboardViewOpen(false);
            }}
            style={[styles.workspaceTab, isPersonal && !teamsViewOpen && styles.workspaceTabActive]}
          >
            <Text style={[styles.workspaceTabText, isPersonal && !teamsViewOpen && styles.workspaceTabTextActive]}>
              Workspace
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              const firstProject = projects[0] ?? null;
              setSelectedTeamId(null);
              setSelectedProjectId(firstProject?.id ?? null);
              setProjectsViewOpen(!firstProject);
              setTeamsViewOpen(false);
              setCalendarViewOpen(false);
              setResourcesViewOpen(false);
              setDashboardViewOpen(false);
            }}
            style={[styles.workspaceTab, (isProject || projectsViewOpen) && !teamsViewOpen && styles.workspaceTabActive]}
          >
            <Text style={[styles.workspaceTabText, (isProject || projectsViewOpen) && !teamsViewOpen && styles.workspaceTabTextActive]}>
              Projects
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setSelectedTeamId(null);
              setSelectedProjectId(null);
              setProjectsViewOpen(false);
              setTeamsViewOpen(false);
              setCalendarViewOpen(true);
              setResourcesViewOpen(false);
              setDashboardViewOpen(false);
            }}
            style={[styles.workspaceTab, calendarViewOpen && styles.workspaceTabActive]}
          >
            <Text style={[styles.workspaceTabText, calendarViewOpen && styles.workspaceTabTextActive]}>
              Calendar
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setSelectedTeamId(null);
              setSelectedProjectId(null);
              setProjectsViewOpen(false);
              setTeamsViewOpen(false);
              setCalendarViewOpen(false);
              setResourcesViewOpen(true);
              setDashboardViewOpen(false);
            }}
            style={[styles.workspaceTab, resourcesViewOpen && styles.workspaceTabActive]}
          >
            <Text style={[styles.workspaceTabText, resourcesViewOpen && styles.workspaceTabTextActive]}>
              Resources
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setSelectedTeamId(null);
              setSelectedProjectId(null);
              setProjectsViewOpen(false);
              setTeamsViewOpen(false);
              setCalendarViewOpen(false);
              setResourcesViewOpen(false);
              setDashboardViewOpen(true);
            }}
            style={[styles.workspaceTab, dashboardViewOpen && styles.workspaceTabActive]}
          >
            <Text style={[styles.workspaceTabText, dashboardViewOpen && styles.workspaceTabTextActive]}>
              Dashboard
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setProjectsViewOpen(false);
              setCalendarViewOpen(false);
              setTeamsViewOpen((v) => !v);
            }}
            style={[styles.workspaceTab, teamsViewOpen && styles.workspaceTabActive]}
          >
            <Text style={[styles.workspaceTabText, teamsViewOpen && styles.workspaceTabTextActive]}>People</Text>
          </Pressable>

        </ScrollView>
      </View>

      {/* Organizations with team tabs */}
      {teamsViewOpen && (
        <ScrollView style={styles.organizationsView} contentContainerStyle={styles.organizationsViewContent}>
          {organizations.map((org) => {
            const orgTeams = teams.filter((team) => team.org_id === org.id);
            return (
              <View key={org.id} style={styles.organizationSection}>
                <View style={styles.organizationHeader}>
                  <Pressable onPress={() => openOrgModal(org.id)} style={styles.organizationTitleWrap}>
                    <Text style={styles.organizationTitle} numberOfLines={1}>{org.name}</Text>
                    <Text style={styles.organizationMeta}>
                      {org.member_count ?? 0} member{(org.member_count ?? 0) !== 1 ? 's' : ''}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => openCreateTeam(org.id)}
                    style={styles.organizationAddTeamButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Create team in ${org.name}`}
                  >
                    <Text style={styles.organizationAddTeamText}>+</Text>
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.organizationTeamTabs}
                >
                  {orgTeams.length === 0 ? (
                    <Pressable onPress={() => openCreateTeam(org.id)} style={styles.organizationEmptyTeamTab}>
                      <Text style={styles.organizationEmptyTeamText}>No teams yet</Text>
                    </Pressable>
                  ) : (
                    orgTeams.map((team) => (
                      <Pressable
                        key={team.id}
                        onPress={() => {
                          setSelectedTeamId(team.id);
                          setSelectedProjectId(null);
                          setTeamsViewOpen(false);
                          setCalendarViewOpen(false);
                        }}
                        style={[styles.organizationTeamTab, selectedTeamId === team.id && styles.organizationTeamTabActive]}
                        accessibilityRole="button"
                        accessibilityLabel={`Open team ${team.name}`}
                      >
                        <Text
                          style={[styles.organizationTeamTabText, selectedTeamId === team.id && styles.organizationTeamTabTextActive]}
                          numberOfLines={1}
                        >
                          {team.name}
                        </Text>
                        <Text style={styles.organizationTeamMeta}>
                          {team.member_count ?? 0}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </ScrollView>
              </View>
            );
          })}

          {teams.some((team) => !team.org_id) && (
            <View style={styles.organizationSection}>
              <View style={styles.organizationHeader}>
                <View style={styles.organizationTitleWrap}>
                  <Text style={styles.organizationTitle}>Ungrouped Teams</Text>
                  <Text style={styles.organizationMeta}>No organization</Text>
                </View>
                <Pressable
                  onPress={() => openCreateTeam(null)}
                  style={styles.organizationAddTeamButton}
                  accessibilityRole="button"
                  accessibilityLabel="Create ungrouped team"
                >
                  <Text style={styles.organizationAddTeamText}>+</Text>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.organizationTeamTabs}
              >
                {teams.filter((team) => !team.org_id).map((team) => (
                  <Pressable
                    key={team.id}
                    onPress={() => {
                      setSelectedTeamId(team.id);
                      setSelectedProjectId(null);
                      setTeamsViewOpen(false);
                      setCalendarViewOpen(false);
                    }}
                    style={[styles.organizationTeamTab, selectedTeamId === team.id && styles.organizationTeamTabActive]}
                    accessibilityRole="button"
                    accessibilityLabel={`Open team ${team.name}`}
                  >
                    <Text
                      style={[styles.organizationTeamTabText, selectedTeamId === team.id && styles.organizationTeamTabTextActive]}
                      numberOfLines={1}
                    >
                      {team.name}
                    </Text>
                    <Text style={styles.organizationTeamMeta}>{team.member_count ?? 0}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <Pressable
            onPress={() => openCreateTarget('organization')}
            style={styles.organizationCardNew}
            accessibilityRole="button"
            accessibilityLabel="Create organization"
          >
            <Text style={styles.organizationCardNewIcon}>+</Text>
            <Text style={styles.organizationCardNewText}>New Organization</Text>
          </Pressable>
        </ScrollView>
      )}

      {projectsViewOpen && (
        <ScrollView style={styles.projectsGrid} contentContainerStyle={styles.projectsGridContent}>
          {projects.map((project) => {
            const linkedTeam = project.team_id ? teams.find((t) => t.id === project.team_id) : null;
            return (
              <View key={project.id} style={styles.projectCard}>
                <Pressable
                  onPress={() => {
                    setSelectedProjectId(project.id);
                    setSelectedTeamId(null);
                    setProjectsViewOpen(false);
                    setTeamsViewOpen(false);
                    setCalendarViewOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Open project ${project.name}`}
                >
                  <Text style={styles.projectCardName} numberOfLines={1}>{project.name}</Text>
                  <Text style={styles.projectCardMeta} numberOfLines={1}>
                    {linkedTeam ? linkedTeam.name : 'No team linked'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => { setRenamingProject(project); setRenameProjectName(project.name); }}
                  style={{ marginTop: 10 }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Rename project ${project.name}`}
                >
                  <Text style={{ fontSize: 11, color: '#6366f1', fontWeight: '600' }}>Rename</Text>
                </Pressable>
              </View>
            );
          })}
          <Pressable
            onPress={() => { setTeamsViewOpen(false); setCalendarViewOpen(false); openCreateTarget('project'); }}
            style={styles.projectCardNew}
            accessibilityRole="button"
            accessibilityLabel="Create project"
          >
            <Text style={styles.projectCardNewIcon}>+</Text>
            <Text style={styles.projectCardNewText}>New Project</Text>
          </Pressable>
        </ScrollView>
      )}

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

      {resourcesViewOpen && (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const allTodos = [...todos, ...assignedToMe];
        // Build per-member workload from all loaded todos
        const memberRows = members.map((m) => {
          const mine = allTodos.filter((t) => t.assigned_to === m.user_id && !t.done);
          const overdue = mine.filter((t) => {
            if (!t.due_date) return false;
            const [y, mo, d] = t.due_date.split('-').map(Number);
            return new Date(y, mo - 1, d) < today;
          });
          const dueToday = mine.filter((t) => {
            if (!t.due_date) return false;
            const [y, mo, d] = t.due_date.split('-').map(Number);
            const due = new Date(y, mo - 1, d);
            return due.getTime() === today.getTime();
          });
          const urgent = mine.filter((t) => t.priority === 'urgent');
          return { member: m, active: mine.length, overdue: overdue.length, dueToday: dueToday.length, urgent: urgent.length };
        });
        const myId = session?.user.id;
        const myActive = allTodos.filter((t) => t.created_by === myId && !t.done);
        const myOverdue = myActive.filter((t) => {
          if (!t.due_date) return false;
          const [y, mo, d] = t.due_date.split('-').map(Number);
          return new Date(y, mo - 1, d) < today;
        });
        const myDueToday = myActive.filter((t) => {
          if (!t.due_date) return false;
          const [y, mo, d] = t.due_date.split('-').map(Number);
          return new Date(y, mo - 1, d).getTime() === today.getTime();
        });
        return (
          <ScrollView style={styles.resourcesView} contentContainerStyle={styles.resourcesContent}>
            <View style={styles.resourcesHeader}>
              <Text style={styles.resourcesTitle}>Resources</Text>
              <Text style={styles.resourcesSubtitle}>Workload overview — active assigned tasks per person</Text>
            </View>

            {/* Personal row */}
            <View style={styles.resourceCard}>
              <View style={styles.resourceCardHeader}>
                <Text style={styles.resourceCardName}>{accountDisplayName}</Text>
                <Text style={styles.resourceCardMeta}>You</Text>
              </View>
              <View style={styles.resourceStats}>
                <View style={styles.resourceStat}>
                  <Text style={styles.resourceStatValue}>{myActive.length}</Text>
                  <Text style={styles.resourceStatLabel}>Active</Text>
                </View>
                <View style={[styles.resourceStat, myOverdue.length > 0 && styles.resourceStatDanger]}>
                  <Text style={[styles.resourceStatValue, myOverdue.length > 0 && styles.resourceStatValueDanger]}>{myOverdue.length}</Text>
                  <Text style={styles.resourceStatLabel}>Overdue</Text>
                </View>
                <View style={styles.resourceStat}>
                  <Text style={styles.resourceStatValue}>{myDueToday.length}</Text>
                  <Text style={styles.resourceStatLabel}>Due today</Text>
                </View>
              </View>
            </View>

            {memberRows.length > 0 && (
              <>
                <Text style={styles.resourcesSectionLabel}>Team Members</Text>
                {memberRows.map(({ member, active: act, overdue: ov, dueToday: dt, urgent: urg }) => (
                  <View key={member.user_id} style={styles.resourceCard}>
                    <View style={styles.resourceCardHeader}>
                      <Text style={styles.resourceCardName}>{profileDisplayName(member)}</Text>
                      <Text style={styles.resourceCardMeta}>{member.role}</Text>
                    </View>
                    <View style={styles.resourceStats}>
                      <View style={styles.resourceStat}>
                        <Text style={styles.resourceStatValue}>{act}</Text>
                        <Text style={styles.resourceStatLabel}>Active</Text>
                      </View>
                      <View style={[styles.resourceStat, ov > 0 && styles.resourceStatDanger]}>
                        <Text style={[styles.resourceStatValue, ov > 0 && styles.resourceStatValueDanger]}>{ov}</Text>
                        <Text style={styles.resourceStatLabel}>Overdue</Text>
                      </View>
                      <View style={styles.resourceStat}>
                        <Text style={styles.resourceStatValue}>{dt}</Text>
                        <Text style={styles.resourceStatLabel}>Due today</Text>
                      </View>
                      <View style={[styles.resourceStat, urg > 0 && styles.resourceStatUrgent]}>
                        <Text style={[styles.resourceStatValue, urg > 0 && styles.resourceStatValueUrgent]}>{urg}</Text>
                        <Text style={styles.resourceStatLabel}>Urgent</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </>
            )}

            {memberRows.length === 0 && (
              <View style={styles.resourcesEmpty}>
                <Text style={styles.resourcesEmptyText}>No team selected. Open a team workspace to see member workloads.</Text>
              </View>
            )}
          </ScrollView>
        );
      })()}

      {dashboardViewOpen && (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekEnd = new Date(today);
        weekEnd.setDate(today.getDate() + 7);
        const allTodos = [...todos, ...assignedToMe];
        const activeTodos = allTodos.filter((t) => !t.done);
        const overdueTodos = activeTodos.filter((t) => {
          if (!t.due_date) return false;
          const [y, mo, d] = t.due_date.split('-').map(Number);
          return new Date(y, mo - 1, d) < today;
        });
        const dueTodayTodos = activeTodos.filter((t) => {
          if (!t.due_date) return false;
          const [y, mo, d] = t.due_date.split('-').map(Number);
          return new Date(y, mo - 1, d).getTime() === today.getTime();
        });
        const dueThisWeekTodos = activeTodos.filter((t) => {
          if (!t.due_date) return false;
          const [y, mo, d] = t.due_date.split('-').map(Number);
          const due = new Date(y, mo - 1, d);
          return due > today && due <= weekEnd;
        });
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        const completedThisWeek = allTodos.filter((t) => {
          if (!t.done || !t.completed_at) return false;
          return new Date(t.completed_at) >= weekStart;
        });
        const urgentTodos = activeTodos.filter((t) => t.priority === 'urgent');

        const statCards = [
          { label: 'Active', value: activeTodos.length, color: '#6366f1', bg: '#eef2ff' },
          { label: 'Overdue', value: overdueTodos.length, color: overdueTodos.length > 0 ? '#dc2626' : '#6b7280', bg: overdueTodos.length > 0 ? '#fef2f2' : '#f3f4f6' },
          { label: 'Due Today', value: dueTodayTodos.length, color: dueTodayTodos.length > 0 ? '#d97706' : '#6b7280', bg: dueTodayTodos.length > 0 ? '#fef3c7' : '#f3f4f6' },
          { label: 'Due This Week', value: dueThisWeekTodos.length, color: '#4338ca', bg: '#eef2ff' },
          { label: 'Done This Week', value: completedThisWeek.length, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Urgent', value: urgentTodos.length, color: urgentTodos.length > 0 ? '#ef4444' : '#6b7280', bg: urgentTodos.length > 0 ? '#fef2f2' : '#f3f4f6' },
        ];
        return (
          <ScrollView style={styles.dashboardView} contentContainerStyle={styles.dashboardContent}>
            <View style={styles.dashboardHeader}>
              <Text style={styles.dashboardTitle}>Dashboard</Text>
              <Text style={styles.dashboardSubtitle}>
                {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>

            <View style={styles.dashboardStatGrid}>
              {statCards.map((card) => (
                <View key={card.label} style={[styles.dashboardStatCard, { backgroundColor: card.bg }]}>
                  <Text style={[styles.dashboardStatValue, { color: card.color }]}>{card.value}</Text>
                  <Text style={styles.dashboardStatLabel}>{card.label}</Text>
                </View>
              ))}
            </View>

            {members.length > 0 && (
              <>
                <Text style={styles.dashboardSectionTitle}>Team Workload</Text>
                <View style={styles.dashboardMemberGrid}>
                  {members.map((m) => {
                    const mActive = allTodos.filter((t) => t.assigned_to === m.user_id && !t.done).length;
                    const mOverdue = allTodos.filter((t) => {
                      if (t.assigned_to !== m.user_id || t.done || !t.due_date) return false;
                      const [y, mo, d] = t.due_date.split('-').map(Number);
                      return new Date(y, mo - 1, d) < today;
                    }).length;
                    return (
                      <View key={m.user_id} style={styles.dashboardMemberCard}>
                        <Text style={styles.dashboardMemberName} numberOfLines={1}>{profileDisplayName(m)}</Text>
                        <Text style={styles.dashboardMemberStats}>
                          {mActive} active{mOverdue > 0 ? ` · ${mOverdue} overdue` : ''}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {overdueTodos.length > 0 && (
              <>
                <Text style={styles.dashboardSectionTitle}>Overdue</Text>
                {overdueTodos.slice(0, 5).map((todo) => (
                  <Pressable key={todo.id} onPress={() => openEditModal(todo)} style={styles.dashboardTodoRow}>
                    <View style={[styles.dashboardTodoPriority, { backgroundColor: todo.priority === 'urgent' ? '#ef4444' : todo.priority === 'high' ? '#f59e0b' : '#9ca3af' }]} />
                    <Text style={styles.dashboardTodoText} numberOfLines={1}>{todo.text}</Text>
                    {todo.due_date && <Text style={styles.dashboardTodoDue}>{todo.due_date}</Text>}
                  </Pressable>
                ))}
                {overdueTodos.length > 5 && <Text style={styles.dashboardMoreText}>+{overdueTodos.length - 5} more</Text>}
              </>
            )}

            {dueTodayTodos.length > 0 && (
              <>
                <Text style={styles.dashboardSectionTitle}>Due Today</Text>
                {dueTodayTodos.map((todo) => (
                  <Pressable key={todo.id} onPress={() => openEditModal(todo)} style={styles.dashboardTodoRow}>
                    <View style={[styles.dashboardTodoPriority, { backgroundColor: todo.priority === 'urgent' ? '#ef4444' : todo.priority === 'high' ? '#f59e0b' : '#60a5fa' }]} />
                    <Text style={styles.dashboardTodoText} numberOfLines={1}>{todo.text}</Text>
                  </Pressable>
                ))}
              </>
            )}
          </ScrollView>
        );
      })()}

      {!projectsViewOpen && !teamsViewOpen && !calendarViewOpen && !resourcesViewOpen && !dashboardViewOpen && selectedTeam && (
        <View style={styles.memberPanel}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.panelTitle}>{selectedTeam.name}</Text>
            {currentTeamRole && ['owner', 'admin'].includes(currentTeamRole) && (
              <Pressable onPress={() => { setRenamingTeam(selectedTeam); setRenameTeamName(selectedTeam.name); }} hitSlop={8}>
                <Text style={{ fontSize: 12, color: '#6366f1', fontWeight: '600' }}>Rename</Text>
              </Pressable>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberList}>
            {members.map((member) => (
              <Text key={member.user_id} style={styles.memberChip}>
                {profileDisplayName(member)}
              </Text>
            ))}
          </ScrollView>
          <View style={styles.compactForm}>
            <TextInput
              style={styles.compactInput}
              value={memberEmail}
              onChangeText={setMemberEmail}
              placeholder="Add member by email"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              keyboardType="email-address"
              onSubmitEditing={addMember}
            />
            <Pressable
              onPress={addMember}
              style={({ pressed }) => [styles.smallBtn, pressed && styles.btnPressed]}
            >
              <Text style={styles.smallBtnText}>Add</Text>
            </Pressable>
          </View>
        </View>
      )}

      {!projectsViewOpen && !teamsViewOpen && !calendarViewOpen && !resourcesViewOpen && !dashboardViewOpen && isProject && nextMilestone && (
        <View style={[styles.milestoneBanner, nextMilestone.daysLeft < 0 && styles.milestoneBannerOverdue]}>
          <Text style={styles.milestoneBannerText}>
            ◆ {nextMilestone.text}
            {nextMilestone.daysLeft === 0
              ? ' — due today'
              : nextMilestone.daysLeft > 0
                ? ` — ${nextMilestone.daysLeft}d away`
                : ` — ${-nextMilestone.daysLeft}d overdue`}
          </Text>
        </View>
      )}

      {!projectsViewOpen && !teamsViewOpen && !calendarViewOpen && !resourcesViewOpen && !dashboardViewOpen && isProject && (
        <View style={styles.projectSwitchBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.projectSwitchList}
            style={styles.projectSwitchScroll}
          >
            {projects.map((project) => (
              <Pressable
                key={project.id}
                onPress={() => {
                  setSelectedProjectId(project.id);
                  setSelectedTeamId(null);
                }}
                style={[
                  styles.projectSwitchButton,
                  selectedProjectId === project.id && styles.projectSwitchButtonActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Open project ${project.name}`}
              >
                <Text
                  style={[
                    styles.projectSwitchButtonText,
                    selectedProjectId === project.id && styles.projectSwitchButtonTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {project.name}
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => openCreateTarget('project')}
              style={styles.projectSwitchAddButton}
              accessibilityRole="button"
              accessibilityLabel="Create project"
            >
              <Text style={styles.projectSwitchAddButtonText}>+</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}


      {!projectsViewOpen && !teamsViewOpen && !calendarViewOpen && !resourcesViewOpen && !dashboardViewOpen && isProject && (
        <View style={styles.projectViewModeBar}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {(['plan', 'kanban'] as ProjectViewMode[]).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => setProjectViewMode(mode)}
                style={[
                  styles.projectViewModeButton,
                  projectViewMode === mode && styles.projectViewModeButtonActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Show ${mode} view`}
              >
                <Text
                  style={[
                    styles.projectViewModeButtonText,
                    projectViewMode === mode && styles.projectViewModeButtonTextActive,
                  ]}
                >
                  {mode === 'plan' ? 'Plan' : 'Kanban'}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.projectViewModeMeta}>
            {selectedProjectOwner && (
              <View style={styles.projectOwnerBadge}>
                <View style={styles.projectOwnerAvatarRing}>
                  <InboxAssignerAvatar
                    initials={(profileDisplayName(selectedProjectOwner)[0] ?? '?').toUpperCase()}
                    color={pickAvatarColor(selectedProjectOwner.email)}
                    tooltip="Owner"
                  />
                </View>
                <View style={styles.projectOwnerBadgeText}>
                  <Text style={styles.projectOwnerBadgeName} numberOfLines={1}>
                    {profileDisplayName(selectedProjectOwner)}
                  </Text>
                </View>
              </View>
            )}
            {projectMemberAvatars.length > 0 && (
              <View style={styles.projectMemberAvatarRow}>
                {projectMemberAvatars.map((m) => {
                  const name = profileDisplayName(m);
                  const initials = (name[0] ?? '?').toUpperCase();
                  const color = pickAvatarColor(m.email);
                  return (
                    <InboxAssignerAvatar
                      key={m.user_id}
                      initials={initials}
                      color={color}
                      tooltip={name}
                    />
                  );
                })}
              </View>
            )}
          </View>
        </View>
      )}

      {!projectsViewOpen && !teamsViewOpen && !calendarViewOpen && !resourcesViewOpen && !dashboardViewOpen && (isProject ? (
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
                      accessibilityLabel={`Rename ${phase.name} column`}
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
          <View style={styles.inputBar}>
            <View style={styles.todoInputWrap}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="Add a todo..."
                placeholderTextColor="#9ca3af"
                onSubmitEditing={addTodo}
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
            <Pressable onPress={addTodo} style={({ pressed }) => [styles.addBtn, pressed && styles.btnPressed]}>
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          </View>

          <View style={[styles.todoBoard, showInboxSidePanel && styles.todoBoardWithAssigned]}>
            <View style={styles.todoListPane}>
              <View style={styles.activeTasksBox}>
                <View style={[styles.sortBar, { paddingVertical: rowPV }]}>
                  {Platform.OS === 'web' && !sortField && <View style={styles.sortHandleSpacer} />}
                  <View style={styles.sortCheckboxSpacer} />
                  <Pressable onPress={() => toggleSort('text')} style={[styles.sortColTask, styles.sortColInner]}>
                    <Text style={[styles.sortColLabel, sortField === 'text' && styles.sortColLabelActive]}>TASK ({active.length})</Text>
                    {sortField === 'text' && <Text style={[styles.sortColIndicator, styles.sortColLabelActive]}>{sortDir === 'asc' ? '↑' : '↓'}</Text>}
                  </Pressable>
                  <View style={[styles.sortColPriority, { flexShrink: 0 }]} />
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
                  style={[styles.activeTasksList, { maxHeight: rowH * defaultVisibleTaskRows }]}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item: todo, drag, isActive }) => {
                    const assigner = getAssignerInfo(todo);
                    return (
                      <TodoItem
                        text={todo.text} done={todo.done} priority={todo.priority}
                        scheduledStartAt={todo.scheduled_start_at}
                        startedWorkAt={todo.started_work_at}
                        dueDate={todo.due_date} note={todo.note} createdAt={todo.created_at}
                        assignedAt={todo.assigned_at ?? undefined}
                        assignedLabel={isPersonal ? undefined : assigneeLabel(todo.assigned_to)}
                        kanbanStage={todoKanbanStage(todo)}
                        assignerInitials={assigner?.initials} assignerColor={assigner?.color}
                        assignerName={assigner?.name}
                        onToggle={() => toggle(todo.id)}
                        onOpenEdit={() => openEditModal(todo)}
                        onStartWork={() => startWorkOnTodo(todo)}
                        onAssign={isPersonal ? undefined : () => openAssigneePicker(todo)}
                        onPriority={() => cyclePriority(todo)} onDueDate={() => openDueCalendar(todo)}
                        onArchive={() => archiveTodo(todo.id)}
                        onDrag={drag} isDragging={isActive ?? false}
                        rowPV={rowPV}
                      />
                    );
                  }}
                  ListHeaderComponent={
                    <>
                      {!!error && <Text style={styles.error}>{error}</Text>}
                      {!!message && <Text style={styles.message}>{message}</Text>}
                      {loading && !error && <Text style={styles.empty}>Loading todos...</Text>}
                      {!loading && active.length === 0 && done.length === 0 && (
                        <Text style={styles.empty}>No todos yet. Add one above.</Text>
                      )}
                    </>
                  }
                  ListFooterComponent={
                    <>
                      {isPersonal && assignedToMe.length > 0 && !showInboxSidePanel && (
                        <>
                          <View style={styles.sectionDivider}>
                            <View style={styles.sectionDividerLine} />
                            <Text style={styles.sectionLabel}>Inbox</Text>
                            <View style={styles.sectionDividerLine} />
                          </View>
                          {assignedToMe.map(renderAssignedToMeTodo)}
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
                              Archived ({archivedTodos.length}) {archivedExpanded ? '↑' : '↓'}
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
              </View>

              {done.length > 0 && (
                <View style={styles.completedBox}>
                  <Text style={[styles.completedBoxHeader, { paddingVertical: rowPV }]}>Completed ({done.length})</Text>
                  <ScrollView style={[styles.completedBoxScroll, { maxHeight: rowH * 3 }]} scrollEnabled={done.length > 3}>
                    {done.map((todo) => {
                      const assigner = getAssignerInfo(todo);
                      return (
                        <TodoItem
                          key={todo.id} text={todo.text} done={todo.done} priority={todo.priority}
                          scheduledStartAt={todo.scheduled_start_at}
                          startedWorkAt={todo.started_work_at}
                          dueDate={todo.due_date} note={todo.note} createdAt={todo.created_at}
                          assignedAt={todo.assigned_at ?? undefined}
                          assignedLabel={isPersonal ? undefined : assigneeLabel(todo.assigned_to)}
                          kanbanStage={todoKanbanStage(todo)}
                          assignerInitials={assigner?.initials} assignerColor={assigner?.color}
                          assignerName={assigner?.name}
                          onToggle={() => toggle(todo.id)}
                          onOpenEdit={() => openEditModal(todo)}
                          onStartWork={() => startWorkOnTodo(todo)}
                          onAssign={isPersonal ? undefined : () => openAssigneePicker(todo)}
                          onPriority={() => cyclePriority(todo)} onDueDate={() => openDueCalendar(todo)}
                          onArchive={() => archiveTodo(todo.id)}
                          reserveDragSpace={Platform.OS === 'web'}
                          rowPV={rowPV}
                        />
                      );
                    })}
                  </ScrollView>
                </View>
              )}

            </View>

            {showInboxSidePanel && (
              <View style={styles.assignedToMePanel}>
                <Text style={[styles.assignedToMePanelTitle, { paddingVertical: rowPV }]}>INBOX ({assignedToMe.length})</Text>
                <ScrollView style={styles.assignedToMePanelList} showsVerticalScrollIndicator={false}>
                  {assignedToMe.map(renderAssignedToMeTodo)}
                </ScrollView>
              </View>
            )}
          </View>
        </>
      ))}

      {!!toast && (
        <View pointerEvents="none" style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

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
      <Modal
        visible={navExpanded}
        transparent
        animationType="fade"
        onRequestClose={() => setNavExpanded(false)}
      >
        <Pressable style={styles.navDropdownBackdrop} onPress={() => setNavExpanded(false)}>
          <Pressable style={styles.navDropdownCard}>
            <Text style={styles.navDropdownName} numberOfLines={1}>{accountDisplayName}</Text>
            <Text style={styles.navDropdownEmail} numberOfLines={1}>{profile?.email ?? session.user.email}</Text>
            <Text style={styles.navDropdownMutedText} numberOfLines={1}>{session?.user.id}</Text>

            <View style={styles.navDropdownDivider} />

            <Pressable onPress={() => { setEditDisplayNameValue(profile?.display_name ?? ''); setEditingDisplayName(true); setNavExpanded(false); }} style={styles.navDropdownItem}>
              <Text style={styles.navDropdownItemText}>Edit Display Name</Text>
            </Pressable>
            <Pressable onPress={() => setSettingsExpanded(v => !v)} style={styles.navDropdownItem}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.navDropdownItemText}>Settings</Text>
                <Text style={{ fontSize: 11, color: '#9ca3af' }}>{settingsExpanded ? '▲' : '▼'}</Text>
              </View>
            </Pressable>
            {settingsExpanded && (
              <View style={{ paddingBottom: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#9ca3af', paddingHorizontal: 14, paddingVertical: 4, letterSpacing: 0.3 }}>VIEW DENSITY</Text>
                {(['compact', 'cozy', 'roomy'] as Density[]).map(d => (
                  <Pressable key={d} style={[styles.navDropdownItem, { paddingLeft: 20 }]} onPress={() => setDensity(d)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 11, color: '#6366f1', width: 12 }}>{density === d ? '✓' : ''}</Text>
                      <Text style={styles.navDropdownItemText}>{d.charAt(0).toUpperCase() + d.slice(1)}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
            <Pressable onPress={() => { setAboutVisible(true); setNavExpanded(false); }} style={styles.navDropdownItem}>
              <Text style={styles.navDropdownItemText}>About</Text>
            </Pressable>

            <View style={styles.navDropdownDivider} />

            <View style={styles.navDropdownSection}>
              <View style={styles.navDropdownSectionHeader}>
                <Text style={styles.navDropdownSectionTitle}>Organizations</Text>
                <Pressable onPress={() => { openCreateTarget('organization'); setNavExpanded(false); }} hitSlop={8}>
                  <Text style={styles.navDropdownSectionAction}>+</Text>
                </Pressable>
              </View>
              {organizations.length === 0 ? (
                <Pressable onPress={() => { openCreateTarget('organization'); setNavExpanded(false); }} style={styles.navDropdownItem}>
                  <Text style={styles.navDropdownMutedText}>No organizations yet</Text>
                </Pressable>
              ) : (
                organizations.map((org) => (
                  <Pressable key={org.id} onPress={() => { openOrgModal(org.id); setNavExpanded(false); }} style={styles.navDropdownItem}>
                    <Text style={styles.navDropdownItemText} numberOfLines={1}>{org.name}</Text>
                    <Text style={styles.navDropdownMutedText}>{org.member_count ?? 0} member{(org.member_count ?? 0) !== 1 ? 's' : ''}</Text>
                  </Pressable>
                ))
              )}
            </View>

            <View style={styles.navDropdownSection}>
              <View style={styles.navDropdownSectionHeader}>
                <Text style={styles.navDropdownSectionTitle}>Teams</Text>
                <Pressable onPress={() => { openCreateTeam(null); setNavExpanded(false); }} hitSlop={8}>
                  <Text style={styles.navDropdownSectionAction}>+</Text>
                </Pressable>
              </View>
              {teams.length === 0 ? (
                <Pressable onPress={() => { openCreateTeam(null); setNavExpanded(false); }} style={styles.navDropdownItem}>
                  <Text style={styles.navDropdownMutedText}>No teams yet</Text>
                </Pressable>
              ) : (
                teams.map((team) => (
                  <Pressable
                    key={team.id}
                    onPress={() => { selectTeamFromAccountMenu(team.id); setNavExpanded(false); }}
                    style={styles.navDropdownItem}
                  >
                    <Text
                      style={[styles.navDropdownItemText, team.id === selectedTeamId && styles.navDropdownItemTextActive]}
                      numberOfLines={1}
                    >
                      {team.name}
                    </Text>
                  </Pressable>
                ))
              )}
            </View>

            <View style={styles.navDropdownDivider} />

            <Pressable onPress={signOut} style={styles.navDropdownItem}>
              <Text style={styles.navDropdownSignOutText}>Log Out</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={createTarget === 'project'}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateTarget(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCreateTarget(null)}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>New Project</Text>
            <TextInput
              style={styles.editModalInput}
              value={projectName}
              onChangeText={setProjectName}
              placeholder="Project name"
              placeholderTextColor="#9ca3af"
              returnKeyType="done"
              autoFocus
              onSubmitEditing={createProject}
            />
            {teams.length > 0 && (
              <>
                <Text style={styles.editModalSectionLabel}>Team (optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <Pressable
                    onPress={() => setNewProjectTeamId(null)}
                    style={[styles.phasePill, !newProjectTeamId && styles.phasePillActive]}
                  >
                    <Text style={[styles.phasePillText, !newProjectTeamId && styles.phasePillTextActive]}>
                      None
                    </Text>
                  </Pressable>
                  {teams.map((team) => (
                    <Pressable
                      key={team.id}
                      onPress={() => setNewProjectTeamId(team.id)}
                      style={[styles.phasePill, newProjectTeamId === team.id && styles.phasePillActive]}
                    >
                      <Text style={[styles.phasePillText, newProjectTeamId === team.id && styles.phasePillTextActive]}>
                        {team.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}
            <View style={styles.editModalActions}>
              <Pressable
                onPress={() => {
                  setCreateTarget(null);
                  setProjectName('');
                  setNewProjectTeamId(null);
                }}
              >
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={createProject}
                style={({ pressed }) => [styles.smallBtn, pressed && styles.btnPressed]}
              >
                <Text style={styles.smallBtnText}>Create</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={!!orgManageMember}
        transparent
        animationType="fade"
        onRequestClose={() => setOrgManageMember(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setOrgManageMember(null)}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle} numberOfLines={1}>
              {orgManageMember?.display_name || orgManageMember?.email}
            </Text>
            <Text style={styles.orgMemberRole}>{orgManageMember?.email}</Text>

            {!!error && <Text style={[styles.error, { marginTop: 8 }]}>{error}</Text>}

            {orgManageMember?.role !== 'owner' && (
              <Pressable
                onPress={() => transferOrgOwnership(orgManageMember!.user_id)}
                style={styles.manageMemberAction}
              >
                <Text style={styles.manageMemberActionText}>Transfer ownership to this person</Text>
                <Text style={styles.manageMemberActionNote}>You become an admin</Text>
              </Pressable>
            )}
            {orgManageMember?.role === 'member' && (
              <Pressable
                onPress={() => updateOrgMemberRole(orgManageMember!.user_id, 'admin')}
                style={styles.manageMemberAction}
              >
                <Text style={styles.manageMemberActionText}>Promote to admin</Text>
              </Pressable>
            )}
            {orgManageMember?.role === 'admin' && (
              <Pressable
                onPress={() => updateOrgMemberRole(orgManageMember!.user_id, 'member')}
                style={styles.manageMemberAction}
              >
                <Text style={styles.manageMemberActionText}>Demote to member</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => removeOrgMember(orgManageMember!.user_id)}
              style={styles.manageMemberAction}
            >
              <Text style={[styles.manageMemberActionText, styles.manageMemberActionDanger]}>
                Remove from organization
              </Text>
            </Pressable>

            <View style={[styles.editModalActions, { marginTop: 12 }]}>
              <View />
              <Pressable onPress={() => { setOrgManageMember(null); setError(''); }}>
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={!!orgModalId}
        transparent
        animationType="fade"
        onRequestClose={() => setOrgModalId(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setOrgModalId(null)}>
          <Pressable style={styles.calendarCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={[styles.editModalTitle, { marginBottom: 0 }]}>
                {organizations.find((o) => o.id === orgModalId)?.name ?? 'Organization'}
              </Text>
              {(currentOrgRole === 'owner' || currentOrgRole === 'admin') && (
                <Pressable
                  onPress={() => {
                    const org = organizations.find((o) => o.id === orgModalId);
                    if (org) { setRenamingOrg(org); setRenameOrgName(org.name); }
                    setOrgModalId(null);
                  }}
                  hitSlop={8}
                >
                  <Text style={{ fontSize: 12, color: '#6366f1', fontWeight: '600' }}>Rename</Text>
                </Pressable>
              )}
            </View>

            {orgModalMembers.length > 0 && (
              <View style={styles.orgMemberList}>
                {orgModalMembers.map((m) => {
                  const canManage = currentOrgRole === 'owner' && m.user_id !== session?.user.id;
                  return (
                    <Pressable
                      key={m.user_id}
                      style={styles.orgMemberRow}
                      onPress={() => canManage ? setOrgManageMember(m) : undefined}
                    >
                      <Text style={styles.orgMemberEmail} numberOfLines={1}>
                        {m.display_name ? `${m.display_name} (${m.email})` : m.email}
                      </Text>
                      <View style={styles.orgMemberRowRight}>
                        <Text style={styles.orgMemberRole}>{m.role}</Text>
                        {canManage && <Text style={styles.orgMemberManageIcon}>›</Text>}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {!!error && <Text style={[styles.error, { marginBottom: 8 }]}>{error}</Text>}

            <View style={styles.compactForm}>
              <TextInput
                style={styles.compactInput}
                value={orgMemberEmail}
                onChangeText={(v) => { setOrgMemberEmail(v); if (error) setError(''); }}
                placeholder="Add member by email"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                keyboardType="email-address"
                onSubmitEditing={addOrgMember}
              />
              <Pressable
                onPress={addOrgMember}
                style={({ pressed }) => [styles.smallBtn, pressed && styles.btnPressed]}
              >
                <Text style={styles.smallBtnText}>Add</Text>
              </Pressable>
            </View>

            <View style={[styles.editModalActions, { marginTop: 12 }]}>
              <View />
              <Pressable onPress={() => setOrgModalId(null)}>
                <Text style={styles.calendarCancelText}>Close</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={linkingProjectTeam}
        transparent
        animationType="fade"
        onRequestClose={() => setLinkingProjectTeam(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setLinkingProjectTeam(false)}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>Link team to project</Text>
            <Text style={styles.editModalSectionLabel}>
              Members of the linked team can be assigned to tasks.
            </Text>

            <Pressable
              onPress={() => linkProjectTeam(null)}
              style={styles.teamLinkRow}
            >
              <Text style={styles.teamLinkRowText}>No team</Text>
              {!selectedProject?.team_id && <Text style={styles.assigneePickerCheck}>✓</Text>}
            </Pressable>
            {teams.map((team) => (
              <Pressable
                key={team.id}
                onPress={() => linkProjectTeam(team.id)}
                style={styles.teamLinkRow}
              >
                <View style={[styles.teamLinkDot, { backgroundColor: pickAvatarColor(team.id) }]}>
                  <Text style={styles.teamLinkDotText}>{(team.name[0] ?? 'T').toUpperCase()}</Text>
                </View>
                <Text style={styles.teamLinkRowText} numberOfLines={1}>{team.name}</Text>
                <Text style={styles.teamLinkMeta}>{team.member_count ?? 0} member{(team.member_count ?? 0) !== 1 ? 's' : ''}</Text>
                {selectedProject?.team_id === team.id && <Text style={styles.assigneePickerCheck}>✓</Text>}
              </Pressable>
            ))}

            <View style={[styles.editModalActions, { marginTop: 8 }]}>
              <View />
              <Pressable onPress={() => setLinkingProjectTeam(false)}>
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={createTarget === 'organization'}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateTarget(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCreateTarget(null)}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>New Organization</Text>
            <TextInput
              style={styles.editModalInput}
              value={orgName}
              onChangeText={setOrgName}
              placeholder="Organization name"
              placeholderTextColor="#9ca3af"
              returnKeyType="done"
              autoFocus
              onSubmitEditing={createOrganization}
            />
            <View style={styles.editModalActions}>
              <Pressable onPress={() => { setCreateTarget(null); setOrgName(''); }}>
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={createOrganization}
                style={({ pressed }) => [styles.smallBtn, pressed && styles.btnPressed]}
              >
                <Text style={styles.smallBtnText}>Create</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={createTarget === 'team'}
        transparent
        animationType="fade"
        onRequestClose={() => { setCreateTarget(null); setNewTeamOrgId(null); }}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => { setCreateTarget(null); setNewTeamOrgId(null); }}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>New Team</Text>
            <Text style={styles.editModalSectionLabel}>
              {newTeamOrgId
                ? `Organization: ${organizations.find((org) => org.id === newTeamOrgId)?.name ?? 'Selected'}`
                : 'No organization'}
            </Text>
            <TextInput
              style={styles.editModalInput}
              value={teamName}
              onChangeText={setTeamName}
              placeholder="Team name"
              placeholderTextColor="#9ca3af"
              returnKeyType="done"
              autoFocus
              onSubmitEditing={createTeam}
            />
            <View style={styles.editModalActions}>
              <Pressable
                onPress={() => {
                  setCreateTarget(null);
                  setTeamName('');
                  setNewTeamOrgId(null);
                }}
              >
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={createTeam}
                style={({ pressed }) => [styles.smallBtn, pressed && styles.btnPressed]}
              >
                <Text style={styles.smallBtnText}>Create</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={!!editTodo}
        transparent
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeEditModal}>
          <Pressable style={[styles.calendarCard, { width: 340, maxHeight: '85%' }]}>
            <Text style={styles.editModalTitle}>Edit Todo</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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

              <View style={styles.pickerSectionDivider}>
                <View style={styles.pickerSectionLine} />
                <Text style={styles.pickerSectionLabel}>Priority</Text>
                <View style={styles.pickerSectionLine} />
              </View>
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

              <View style={styles.pickerSectionDivider}>
                <View style={styles.pickerSectionLine} />
                <Text style={styles.pickerSectionLabel}>Due Date</Text>
                <View style={styles.pickerSectionLine} />
              </View>
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
              {editDraftDueDate && (
                <Pressable onPress={() => setEditDraftDueDate(null)} style={{ alignItems: 'center', paddingVertical: 6 }}>
                  <Text style={styles.calendarCancelText}>Clear date</Text>
                </Pressable>
              )}

              <View style={styles.pickerSectionDivider}>
                <View style={styles.pickerSectionLine} />
                <Text style={styles.pickerSectionLabel}>Estimate</Text>
                <View style={styles.pickerSectionLine} />
              </View>
              <TextInput
                style={styles.editModalInput}
                value={editDraftEstimate}
                onChangeText={setEditDraftEstimate}
                placeholder="e.g. 30m, 2h, 1d"
                placeholderTextColor="#9ca3af"
                returnKeyType="done"
              />

              <View style={styles.pickerSectionDivider}>
                <View style={styles.pickerSectionLine} />
                <Text style={styles.pickerSectionLabel}>Start Working</Text>
                <View style={styles.pickerSectionLine} />
              </View>
              <TextInput
                style={styles.editModalInput}
                value={editDraftScheduledStartAt}
                onChangeText={setEditDraftScheduledStartAt}
                placeholder="YYYY-MM-DDTHH:mm"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                autoCorrect={false}
              />

              {!isProject && projects.filter(p => !p.archived_at).length > 0 && (
                <>
                  <View style={styles.pickerSectionDivider}>
                    <View style={styles.pickerSectionLine} />
                    <Text style={styles.pickerSectionLabel}>Project</Text>
                    <View style={styles.pickerSectionLine} />
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                    <Pressable
                      onPress={() => setEditDraftProjectId(null)}
                      style={[styles.phasePill, !editDraftProjectId && styles.phasePillActive]}
                    >
                      <Text style={[styles.phasePillText, !editDraftProjectId && styles.phasePillTextActive]}>
                        None
                      </Text>
                    </Pressable>
                    {projects.filter(p => !p.archived_at).map((project) => (
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
                </>
              )}

              {members.length > 0 && (
                <>
                  <View style={styles.pickerSectionDivider}>
                    <View style={styles.pickerSectionLine} />
                    <Text style={styles.pickerSectionLabel}>Assign to</Text>
                    <View style={styles.pickerSectionLine} />
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                    <Pressable
                      onPress={() => setEditDraftAssignedTo(null)}
                      style={[styles.phasePill, !editDraftAssignedTo && styles.phasePillActive]}
                    >
                      <Text style={[styles.phasePillText, !editDraftAssignedTo && styles.phasePillTextActive]}>
                        None
                      </Text>
                    </Pressable>
                    {members.map((m) => (
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
                </>
              )}
              {isProject && (
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

            <View style={[styles.editModalActions, { marginTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e7eb', paddingTop: 12 }]}>
              <Pressable onPress={() => editTodo && archiveTodo(editTodo.id)}>
                <Text style={styles.archiveBtnText}>Archive</Text>
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

      <Modal
        visible={!!renamingPhase}
        transparent
        animationType="fade"
        onRequestClose={closeRenamePhase}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeRenamePhase}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>Rename Column</Text>
            <TextInput
              style={styles.editModalInput}
              value={renamePhaseName}
              onChangeText={setRenamePhaseName}
              placeholder="Column name"
              placeholderTextColor="#9ca3af"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={saveRenamePhase}
            />
            <View style={styles.editModalActions}>
              <Pressable onPress={closeRenamePhase}>
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={saveRenamePhase}
                style={({ pressed }) => [styles.smallBtn, pressed && styles.btnPressed]}
              >
                <Text style={styles.smallBtnText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={!!renamingWorkflowLane}
        transparent
        animationType="fade"
        onRequestClose={closeRenameWorkflowLane}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeRenameWorkflowLane}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>Rename Kanban Column</Text>
            <TextInput
              style={styles.editModalInput}
              value={renameWorkflowLaneName}
              onChangeText={setRenameWorkflowLaneName}
              placeholder="Column name"
              placeholderTextColor="#9ca3af"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={saveRenameWorkflowLane}
            />
            <View style={styles.editModalActions}>
              <Pressable onPress={closeRenameWorkflowLane}>
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={saveRenameWorkflowLane}
                style={({ pressed }) => [styles.smallBtn, pressed && styles.btnPressed]}
              >
                <Text style={styles.smallBtnText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
              autoFocus
              onSubmitEditing={addPhase}
            />
            <View style={styles.editModalActions}>
              <Pressable onPress={() => { setAddingPhase(false); setNewPhaseName(''); }}>
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

      <Modal
        visible={animalPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAnimalPickerVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setAnimalPickerVisible(false)}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>Choose your avatar</Text>
            <View style={styles.animalGrid}>
              {AVATAR_ANIMALS.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => { setCustomAnimal(emoji); setAnimalPickerVisible(false); }}
                  style={[
                    styles.animalCell,
                    (customAnimal ?? pickAvatarAnimal(profile?.email ?? session?.user.email ?? '')) === emoji
                      && styles.animalCellActive,
                  ]}
                >
                  <Text style={styles.animalCellText}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.editModalActions}>
              <Pressable onPress={() => setAnimalPickerVisible(false)}>
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>
              {customAnimal && (
                <Pressable
                  onPress={() => { setCustomAnimal(null); setAnimalPickerVisible(false); }}
                  style={({ pressed }) => [styles.smallBtn, { backgroundColor: '#6b7280' }, pressed && styles.btnPressed]}
                >
                  <Text style={styles.smallBtnText}>Reset</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={aboutVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAboutVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setAboutVisible(false)}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>About</Text>
            <Text style={styles.aboutText}>
              This app is built for simplicity. For example, a project has a maximum of 5 phases
              because real work rarely needs more — and if it does, it probably needs a dedicated
              project management tool, not this one.
            </Text>
            <Text style={styles.aboutText}>
              The goal is to make you productive, not to make you plan. We want to help you capture
              what matters, assign it, do it, track it, and deliver it.
            </Text>
            <Text style={[styles.aboutText, { marginBottom: 0 }]}>
              If you need Gantt charts, dependency graphs, or resource leveling, products such as
              ClickUp, Asana, Jira, and MS Project are waiting for you. This tool is for the other
              95% of work.
            </Text>
            <View style={styles.editModalActions}>
              <View />
              <Pressable
                onPress={() => setAboutVisible(false)}
                style={({ pressed }) => [styles.smallBtn, pressed && styles.btnPressed]}
              >
                <Text style={styles.smallBtnText}>Got it</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={editingDisplayName}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingDisplayName(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setEditingDisplayName(false)}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>Display Name</Text>
            <TextInput
              style={styles.editModalInput}
              value={editDisplayNameValue}
              onChangeText={setEditDisplayNameValue}
              placeholder={emailDisplayName(session?.user.email)}
              placeholderTextColor="#9ca3af"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={saveDisplayName}
            />
            {!!error && <Text style={[styles.error, { marginBottom: 8 }]}>{error}</Text>}
            <View style={styles.editModalActions}>
              <Pressable onPress={() => { setEditingDisplayName(false); setError(''); }}>
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={saveDisplayName} style={({ pressed }) => [styles.smallBtn, pressed && styles.btnPressed]}>
                <Text style={styles.smallBtnText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={!!renamingTeam}
        transparent
        animationType="fade"
        onRequestClose={() => setRenamingTeam(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setRenamingTeam(null)}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>Rename Team</Text>
            <TextInput
              style={styles.editModalInput}
              value={renameTeamName}
              onChangeText={setRenameTeamName}
              placeholder="Team name"
              placeholderTextColor="#9ca3af"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={renameTeam}
            />
            {!!error && <Text style={[styles.error, { marginBottom: 8 }]}>{error}</Text>}
            <View style={styles.editModalActions}>
              <Pressable onPress={() => { setRenamingTeam(null); setError(''); }}>
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={renameTeam} style={({ pressed }) => [styles.smallBtn, pressed && styles.btnPressed]}>
                <Text style={styles.smallBtnText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={!!renamingOrg}
        transparent
        animationType="fade"
        onRequestClose={() => setRenamingOrg(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setRenamingOrg(null)}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>Rename Organization</Text>
            <TextInput
              style={styles.editModalInput}
              value={renameOrgName}
              onChangeText={setRenameOrgName}
              placeholder="Organization name"
              placeholderTextColor="#9ca3af"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={renameOrg}
            />
            {!!error && <Text style={[styles.error, { marginBottom: 8 }]}>{error}</Text>}
            <View style={styles.editModalActions}>
              <Pressable onPress={() => { setRenamingOrg(null); setError(''); }}>
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={renameOrg} style={({ pressed }) => [styles.smallBtn, pressed && styles.btnPressed]}>
                <Text style={styles.smallBtnText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={!!renamingProject}
        transparent
        animationType="fade"
        onRequestClose={() => setRenamingProject(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setRenamingProject(null)}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>Rename Project</Text>
            <TextInput
              style={styles.editModalInput}
              value={renameProjectName}
              onChangeText={setRenameProjectName}
              placeholder="Project name"
              placeholderTextColor="#9ca3af"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={renameProject}
            />
            {!!error && <Text style={[styles.error, { marginBottom: 8 }]}>{error}</Text>}
            <View style={styles.editModalActions}>
              <Pressable onPress={() => { setRenamingProject(null); setError(''); }}>
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={renameProject} style={({ pressed }) => [styles.smallBtn, pressed && styles.btnPressed]}>
                <Text style={styles.smallBtnText}>Save</Text>
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
  todoBoard: {
    flex: 1,
    padding: 12,
    gap: 12,
  },
  todoBoardWithAssigned: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 0,
  },
  todoListPane: {
    flex: 1,
    minWidth: 0,
    gap: 12,
  },
  activeTasksBox: {
    maxHeight: taskBoxMaxHeight,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  activeTasksList: {
    maxHeight: todoRowHeight * defaultVisibleTaskRows,
    flexGrow: 0,
  },
  completedDivider: {
    height: 2,
    backgroundColor: '#e5e7eb',
  },
  completedBox: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fafafa',
    overflow: 'hidden',
    flexShrink: 0,
  },
  completedBoxHeader: {
    paddingVertical: 7,
    paddingLeft: 62,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    backgroundColor: '#f3f4f6',
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 0.3,
  },
  completedPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
    letterSpacing: 0.3,
  },
  completedBoxScroll: {
    maxHeight: todoRowHeight * 3,
  },
  assignedToMePanel: {
    width: 340,
    maxWidth: '36%',
    maxHeight: incomingBoxMaxHeight,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  assignedToMePanelTitle: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  assignedToMePanelList: {
    maxHeight: incomingRowHeight * defaultVisibleTaskRows,
    flexGrow: 0,
  },
  authScroll: {
    flexGrow: 1,
  },
  authPanel: {
    flex: 1,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingTop: 56,
    paddingBottom: 24,
  },
  authBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 10,
  },
  authLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authLogoText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  authBrandName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  authTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  authTitleSub: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 28,
  },
  authLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 14,
  },
  authPasswordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 14,
  },
  authSuccessBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
  },
  authSuccessText: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  socialGridBtnSoon: {
    opacity: 0.5,
  },
  socialComingSoon: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  authSubtitleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  authSubtitleText: {
    color: '#6b7280',
    fontSize: 15,
  },
  authSubtitleLink: {
    color: '#6366f1',
    fontSize: 15,
    fontWeight: '600',
  },
  socialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  socialGridBtn: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
    gap: 8,
  },
  socialGridBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  googleG: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4285F4',
  },
  appleIcon: {
    fontSize: 18,
    color: '#111827',
    lineHeight: 22,
  },
  githubIcon: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  ssoIcon: {
    fontSize: 15,
    color: '#6b7280',
  },
  socialBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  authDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  authDividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#d1d5db',
  },
  authDividerText: {
    color: '#6b7280',
    fontSize: 13,
    paddingHorizontal: 12,
  },
  authMessage: {
    color: '#6b7280',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
  },
  authConfirmMessage: {
    color: '#16a34a',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 14,
  },
  authInput: {
    height: 52,
    backgroundColor: '#eef2ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#111827',
    marginBottom: 4,
  },
  authInputError: {
    borderColor: '#ef4444',
    borderWidth: 1.5,
  },
  authFieldError: {
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 10,
  },
  authPasswordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: '#eef2ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    paddingHorizontal: 16,
    marginTop: 12,
  },
  authPasswordInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#111827',
  },
  passwordToggleText: {
    fontSize: 18,
    color: '#9ca3af',
    paddingLeft: 8,
  },
  authSubmitBtn: {
    height: 52,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  authSubmitBtnMuted: {
    backgroundColor: '#9ca3af',
  },
  authSubmitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  forgotBtn: {
    alignItems: 'flex-end',
    marginTop: 12,
  },
  forgotBtnText: {
    color: '#6366f1',
    fontSize: 13,
    fontWeight: '600',
  },
  authFooter: {
    paddingBottom: 36,
    alignItems: 'center',
  },
  authFooterText: {
    color: '#9ca3af',
    fontSize: 13,
  },
  accountMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 260,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  accountMenuButtonText: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 220,
  },
  accountMenuCaret: {
    color: '#6366f1',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
  },
  accountMenuBackdrop: {
    flex: 1,
    alignItems: 'flex-end',
    backgroundColor: 'rgba(17, 24, 39, 0.12)',
    paddingTop: 64,
    paddingRight: 16,
  },
  accountMenuCard: {
    width: 240,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  accountMenuName: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 2,
  },
  accountMenuEmail: {
    color: '#6b7280',
    fontSize: 11,
    paddingHorizontal: 12,
    paddingTop: 2,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  accountMenuItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  accountMenuItemText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '600',
  },
  accountMenuItemTextActive: {
    color: '#4338ca',
  },
  accountMenuMutedText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '600',
  },
  accountMenuSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    paddingTop: 6,
    marginTop: 4,
  },
  accountMenuSectionHeader: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  accountMenuSectionTitle: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  accountMenuSectionAction: {
    color: '#6366f1',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  accountMenuSignOutText: {
    color: '#6366f1',
    fontSize: 13,
    fontWeight: '700',
  },
  teamPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  workspaceLabel: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  workspaceTabs: {
    paddingBottom: 2,
  },
  workspaceTab: {
    minHeight: 36,
    maxWidth: 180,
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    justifyContent: 'center',
  },
  workspaceTabActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  workspaceTabText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 13,
  },
  workspaceTabTextActive: {
    color: '#4338ca',
  },
  workspaceAddTab: {
    width: 36,
    minHeight: 36,
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workspaceAddText: {
    color: '#6366f1',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  workspaceTabsScroll: {
    flex: 1,
  },
  teamsBtn: {
    flexShrink: 0,
    height: 36,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  teamsBtnActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  teamsBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  teamsBtnTextActive: {
    color: '#4338ca',
  },
  teamsGrid: {
    flex: 1,
  },
  teamsGridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  organizationsView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  organizationsViewContent: {
    padding: 16,
    gap: 12,
  },
  organizationSection: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    padding: 12,
  },
  organizationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  organizationTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  organizationTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  organizationMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 2,
  },
  organizationAddTeamButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    flexShrink: 0,
  },
  organizationAddTeamText: {
    color: '#6366f1',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
  organizationTeamTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 2,
  },
  organizationTeamTab: {
    minHeight: 36,
    maxWidth: 190,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  organizationTeamTabActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  organizationTeamTabText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
    minWidth: 0,
  },
  organizationTeamTabTextActive: {
    color: '#4338ca',
  },
  organizationTeamMeta: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '700',
  },
  organizationEmptyTeamTab: {
    minHeight: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  organizationEmptyTeamText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '600',
  },
  organizationCardNew: {
    minHeight: 72,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  organizationCardNewIcon: {
    fontSize: 22,
    color: '#6366f1',
    fontWeight: '300',
    lineHeight: 26,
  },
  organizationCardNewText: {
    color: '#6366f1',
    fontSize: 13,
    fontWeight: '700',
  },
  projectsGrid: {
    flex: 1,
  },
  projectsGridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  projectCard: {
    width: 220,
    minHeight: 108,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    justifyContent: 'center',
  },
  projectCardName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  projectCardMeta: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  projectCardNew: {
    width: 220,
    minHeight: 108,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  projectCardNewIcon: {
    fontSize: 24,
    color: '#6366f1',
    fontWeight: '300',
    lineHeight: 30,
  },
  projectCardNewText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6366f1',
  },
  calendarView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  calendarViewContent: {
    padding: 16,
  },
  calendarViewPanel: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  calendarViewHeader: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  calendarViewEyebrow: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  calendarViewTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  calendarViewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarViewNavButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  calendarViewNavText: {
    color: '#374151',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
  calendarViewTodayButton: {
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  calendarViewTodayText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
  },
  calendarViewModeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  calendarViewModeButton: {
    minHeight: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  calendarViewModeButtonActive: {
    borderColor: '#111827',
    backgroundColor: '#111827',
  },
  calendarViewModeButtonText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
  },
  calendarViewModeButtonTextActive: {
    color: '#fff',
  },
  calendarViewWeekdays: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  calendarViewWeekday: {
    width: '14.2857%',
    paddingVertical: 8,
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  calendarViewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarViewDayCell: {
    width: '14.2857%',
    minHeight: 116,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    padding: 8,
    backgroundColor: '#fff',
  },
  calendarViewDayBlank: {
    backgroundColor: '#f9fafb',
  },
  calendarViewDayToday: {
    backgroundColor: '#eef2ff',
  },
  calendarViewDaySelected: {
    borderColor: '#6366f1',
    borderWidth: 1,
  },
  calendarViewDayNumber: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
  },
  calendarViewDayNumberToday: {
    color: '#4338ca',
  },
  calendarViewItems: {
    gap: 5,
  },
  calendarViewTask: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 6,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 6,
  },
  calendarViewPriorityDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    flexShrink: 0,
  },
  calendarViewTaskText: {
    flex: 1,
    minWidth: 0,
    color: '#111827',
    fontSize: 12,
    fontWeight: '700',
  },
  calendarViewTaskDoneText: {
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  calendarViewMoreText: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '700',
  },
  calendarDayView: {
    flexDirection: 'row',
    minHeight: 520,
  },
  calendarDayViewStacked: {
    flexDirection: 'column',
  },
  calendarDayAgenda: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    minWidth: 0,
  },
  calendarDayAgendaHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  calendarDayAgendaTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  calendarDayAgendaDate: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '700',
  },
  calendarViewEmpty: {
    color: '#9ca3af',
    fontSize: 15,
    fontWeight: '600',
    padding: 16,
  },
  calendarDayTask: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  calendarDayTaskBody: {
    flex: 1,
    minWidth: 0,
  },
  calendarDayTaskTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  calendarDayTaskNote: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  calendarDayNotes: {
    width: 340,
    padding: 14,
    backgroundColor: '#fff',
  },
  calendarDayNotesStacked: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  calendarDayNotesTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  calendarDayNotesInput: {
    minHeight: 420,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    color: '#111827',
    fontSize: 15,
    fontWeight: '500',
    backgroundColor: '#f9fafb',
  },
  calendarWeekHeaderDay: {
    width: '14.2857%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 2,
  },
  calendarWeekHeaderDaySelected: {
    backgroundColor: '#eef2ff',
  },
  calendarWeekHeaderText: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  calendarWeekHeaderNumber: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '800',
  },
  calendarWeekHeaderTextSelected: {
    color: '#4338ca',
  },
  calendarWeekGrid: {
    flexDirection: 'row',
    minHeight: 520,
  },
  calendarWeekDayColumn: {
    width: '14.2857%',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    padding: 8,
    gap: 6,
  },
  calendarWeekEmpty: {
    color: '#d1d5db',
    fontSize: 11,
    fontWeight: '700',
  },
  teamCard: {
    width: 200,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    overflow: 'hidden',
  },
  teamCardBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 72,
    borderRadius: 14,
  },
  teamCardAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 36,
    marginBottom: 8,
  },
  teamCardAvatarText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  teamCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  teamCardMeta: {
    fontSize: 11,
    color: '#6b7280',
  },
  teamCardAddBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamCardAddBtnText: {
    fontSize: 18,
    color: '#6b7280',
    lineHeight: 22,
    fontWeight: '300',
  },
  teamCardNew: {
    width: 200,
    height: 130,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  teamCardNewIcon: {
    fontSize: 22,
    color: '#d1d5db',
    fontWeight: '300',
    lineHeight: 28,
  },
  teamCardNewText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
  },
  memberPanel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  panelTitle: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  memberList: {
    marginBottom: 8,
  },
  memberChip: {
    color: '#374151',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    fontSize: 11,
  },
  compactForm: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  compactInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#111827',
    marginRight: 8,
  },
  smallBtn: {
    height: 40,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  todoInputWrap: {
    flex: 1,
    marginRight: 10,
  },
  input: {
    height: 44,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
  },
  assigneePill: {
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
  },
  assigneePillActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  assigneePillText: {
    color: '#374151',
    fontSize: 11,
    fontWeight: '600',
  },
  assigneePillTextActive: {
    color: '#4338ca',
  },
  addBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingHorizontal: 18,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  btnPressed: {
    opacity: 0.8,
  },
  empty: {
    textAlign: 'center',
    color: '#9ca3af',
    marginTop: 80,
    fontSize: 15,
  },
  error: {
    color: '#b91c1c',
    backgroundColor: '#fee2e2',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    fontSize: 13,
  },
  message: {
    color: '#166534',
    backgroundColor: '#dcfce7',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    fontSize: 13,
  },
  toast: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  toastText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
    gap: 10,
  },
  sectionDividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#d1d5db',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
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
    fontWeight: '600',
    lineHeight: 24,
  },
  calendarTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayText: {
    width: '14.2857%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
    paddingVertical: 4,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
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
    color: '#374151',
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
    justifyContent: 'space-around',
    marginTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  calendarActionText: {
    color: '#6366f1',
    fontWeight: '600',
    fontSize: 13,
  },
  calendarCancelText: {
    color: '#9ca3af',
    fontWeight: '600',
    fontSize: 13,
  },
  editModalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
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
    minHeight: 72,
    textAlignVertical: 'top',
  },
  editModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    backgroundColor: '#f3f4f6',
  },
  sortHandleSpacer: {
    width: 32,
    flexShrink: 0,
  },
  sortCheckboxSpacer: {
    width: 34,
    flexShrink: 0,
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
  prioritySortSquare: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  sortColDue: {
    width: 64,
    marginLeft: 8,
    paddingLeft: 6,
  },
  sortColAgeGap: {
    width: 56,
    marginLeft: 2,
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
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 0.3,
  },
  sortColIndicator: {
    fontSize: 11,
    color: '#c4c9d4',
  },
  sortColLabelActive: {
    color: '#4338ca',
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 52 : 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
    gap: 10,
  },
  titleBarLeft: {
    flexDirection: 'column',
    flex: 1,
    maxWidth: 280,
  },
  userIdentityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  userNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 2,
    marginTop: 6,
    marginLeft: 48,
  },
  userNavLink: {
    paddingVertical: 1,
    paddingHorizontal: 2,
  },
  userNavLinkText: {
    fontSize: 11,
    color: '#6b7280',
  },
  userNavDot: {
    fontSize: 11,
    color: '#d1d5db',
  },
  userNavSignOutText: {
    fontSize: 11,
    color: '#ef4444',
  },
  userNavStatusEdit: {
    marginTop: 4,
    marginLeft: 48,
    paddingVertical: 1,
    paddingHorizontal: 2,
  },
  userNavStatusInput: {
    marginTop: 4,
    marginLeft: 48,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 200,
  },
  userNavSections: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 6,
    marginLeft: 48,
  },
  userNavSection: {
    flexDirection: 'column',
    minWidth: 80,
  },
  userNavSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  userNavSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userNavSectionAction: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '700',
    lineHeight: 14,
  },
  userNavSectionItem: {
    paddingVertical: 1,
  },
  userNavSectionItemText: {
    fontSize: 11,
    color: '#374151',
  },
  userNavSectionItemTextActive: {
    color: '#6366f1',
    fontWeight: '600',
  },
  userNavSectionMuted: {
    fontSize: 11,
    color: '#d1d5db',
  },
  navDropdownBackdrop: {
    flex: 1,
  },
  navDropdownCard: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 112 : 72,
    left: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    paddingVertical: 8,
    minWidth: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  navDropdownName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 1,
  },
  navDropdownEmail: {
    fontSize: 11,
    color: '#9ca3af',
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  navDropdownStatusPressable: {
    marginHorizontal: 10,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  navDropdownStatusText: {
    fontSize: 11,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  navDropdownStatusPlaceholder: {
    fontSize: 11,
    color: '#d1d5db',
    fontStyle: 'italic',
  },
  navDropdownStatusInput: {
    fontSize: 11,
    color: '#6b7280',
    fontStyle: 'italic',
    marginHorizontal: 10,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#6366f1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  navDropdownDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
    marginVertical: 4,
  },
  navDropdownSection: {
    paddingBottom: 2,
  },
  navDropdownSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 2,
  },
  navDropdownSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  navDropdownSectionAction: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '700',
  },
  navDropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  navDropdownItemText: {
    fontSize: 13,
    color: '#111827',
  },
  navDropdownItemTextActive: {
    color: '#6366f1',
    fontWeight: '600',
  },
  navDropdownMutedText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  navDropdownSignOutText: {
    fontSize: 13,
    color: '#ef4444',
  },
  userAvatarBig: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  userAvatarBigText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  userAvatarBigAnimal: {
    fontSize: 22,
    lineHeight: 28,
  },
  userMeta: {
    flexShrink: 1,
    flex: 1,
  },
  userMetaNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userMetaName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  userNavChevron: {
    fontSize: 11,
    color: '#9ca3af',
    lineHeight: 14,
  },
  userMetaStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
    flex: 1,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    flexShrink: 0,
  },
  statusPressable: {
    flex: 1,
  },
  statusText: {
    fontSize: 11,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  statusPlaceholder: {
    fontSize: 11,
    color: '#d1d5db',
  },
  statusInput: {
    flex: 1,
    fontSize: 11,
    color: '#6b7280',
    fontStyle: 'italic',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  titleBarCenter: {
    flex: 2,
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
    width: '100%',
    maxWidth: 360,
  },
  searchIcon: {
    fontSize: 15,
    color: '#9ca3af',
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 13,
    color: '#9ca3af',
  },
  searchShortcut: {
    fontSize: 11,
    color: '#c4c9d4',
    fontWeight: '600',
  },
  titleBarRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    flexShrink: 0,
    minWidth: 90,
  },
  titleBarDateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  titleBarTimeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  avatarBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  avatarAnimal: {
    fontSize: 18,
    lineHeight: 22,
  },
  kanban: {
    flex: 1,
  },
  kanbanContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 12,
  },
  kanbanCol: {
    width: 280,
    flexShrink: 0,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  kanbanColHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    gap: 8,
    backgroundColor: '#fff',
  },
  kanbanStatusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    flexShrink: 0,
  },
  kanbanColMeta: {
    flex: 1,
    minWidth: 0,
  },
  kanbanColMenuButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  kanbanColTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  kanbanColDateRange: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 1,
  },
  kanbanCountBadge: {
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  kanbanCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
  },
  kanbanColInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    gap: 6,
    backgroundColor: '#fff',
  },
  kanbanInputField: {
    flex: 1,
    height: 34,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#111827',
  },
  kanbanAddBtn: {
    width: 34,
    height: 34,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kanbanAddBtnText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '300',
    lineHeight: 26,
  },
  kanbanColBody: {
    flex: 1,
    minHeight: 120,
    maxHeight: 520,
  },
  kanbanAddCol: {
    width: 140,
    height: 76,
    flexShrink: 0,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 2,
  },
  kanbanAddColIcon: {
    fontSize: 22,
    color: '#d1d5db',
    fontWeight: '300',
    lineHeight: 26,
  },
  kanbanAddColText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
  },
  backlogStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    minHeight: 44,
    gap: 8,
  },
  backlogLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  backlogCountBadge: {
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    flexShrink: 0,
  },
  backlogCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
  },
  backlogItemsScroll: {
    flex: 1,
  },
  backlogItemsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 4,
  },
  backlogChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
    maxWidth: 160,
  },
  backlogChipMilestone: {
    borderColor: '#a78bfa',
    backgroundColor: '#f5f3ff',
  },
  backlogMilestoneIcon: {
    fontSize: 9,
    color: '#7c3aed',
  },
  backlogChipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  backlogInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  backlogInput: {
    height: 32,
    minWidth: 140,
    maxWidth: 220,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#6366f1',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#111827',
  },
  backlogConfirmBtn: {
    height: 32,
    paddingHorizontal: 12,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backlogConfirmText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  backlogCancelText: {
    fontSize: 15,
    color: '#9ca3af',
    lineHeight: 20,
  },
  backlogAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  backlogAddBtnText: {
    fontSize: 18,
    color: '#6b7280',
    lineHeight: 22,
    fontWeight: '300',
  },
  milestoneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fefce8',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#fde68a',
  },
  milestoneBannerOverdue: {
    backgroundColor: '#fef2f2',
    borderBottomColor: '#fecaca',
  },
  milestoneBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
  },
  phasePill: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 2,
  },
  phasePillActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  phasePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  phasePillTextActive: {
    color: '#4338ca',
  },
  milestoneToggle: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  milestoneToggleActive: {
    backgroundColor: '#fefce8',
    borderColor: '#fde68a',
  },
  milestoneToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  milestoneToggleTextActive: {
    color: '#92400e',
  },
  editModalSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  aboutText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  animalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  animalCell: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  animalCellActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  animalCellText: {
    fontSize: 26,
    lineHeight: 32,
  },
  projectSwitchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    gap: 8,
  },
  projectSwitchLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    width: 48,
  },
  projectSwitchScroll: {
    flex: 1,
    minWidth: 0,
  },
  projectSwitchList: {
    gap: 8,
    paddingRight: 2,
  },
  projectSwitchButton: {
    minHeight: 32,
    maxWidth: 180,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    paddingHorizontal: 11,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  projectSwitchButtonActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  projectSwitchButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  projectSwitchButtonTextActive: {
    color: '#4338ca',
  },
  projectSwitchAddButton: {
    width: 32,
    minHeight: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectSwitchAddButtonText: {
    color: '#6366f1',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  projectViewModeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  projectViewModeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    minWidth: 0,
  },
  projectOwnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff1f2',
    minWidth: 0,
    flexShrink: 1,
  },
  projectOwnerAvatarRing: {
    padding: 2,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ef4444',
  },
  projectOwnerBadgeText: {
    minWidth: 0,
    flexShrink: 1,
  },
  projectOwnerBadgeName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991b1b',
    lineHeight: 16,
  },
  projectMemberAvatarRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    flexShrink: 0,
  },
  projectViewModeButton: {
    minHeight: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  projectViewModeButtonActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  projectViewModeButtonText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
  },
  projectViewModeButtonTextActive: {
    color: '#fff',
  },
  projectHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  projectHeaderTextWrap: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  projectHeaderLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  projectHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginTop: 2,
  },
  projectHeaderRenameButton: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  projectHeaderRenameButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  teamLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f3f4f6',
    gap: 10,
  },
  teamLinkDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  teamLinkDotText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  teamLinkRowText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  teamLinkMeta: {
    fontSize: 11,
    color: '#9ca3af',
  },
  colAssigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 6,
    gap: 6,
  },
  colAssigneeAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.55,
  },
  colAssigneeAvatarSelected: {
    opacity: 1,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  colAssigneeInitial: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  colAssigneeName: {
    fontSize: 11,
    color: '#6366f1',
    fontWeight: '600',
    flexShrink: 1,
  },
  assigneePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f3f4f6',
    gap: 10,
  },
  assigneePickerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  assigneePickerAvatarText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  assigneePickerName: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  assigneePickerCheck: {
    fontSize: 15,
    color: '#6366f1',
    fontWeight: '700',
    flexShrink: 0,
  },
  orgMemberRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orgMemberManageIcon: {
    fontSize: 13,
    color: '#9ca3af',
  },
  manageMemberAction: {
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f3f4f6',
    marginTop: 4,
  },
  manageMemberActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  manageMemberActionNote: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  manageMemberActionDanger: {
    color: '#dc2626',
  },
  orgMemberList: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  orgMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
  },
  orgMemberEmail: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    marginRight: 8,
  },
  orgMemberRole: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  pickerSectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 8,
  },
  pickerSectionLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
  },
  pickerSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerConfirmBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pickerConfirmText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  archiveBtnText: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '600',
  },
  editModalActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    fontSize: 13,
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
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  assignedToMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 16,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  incomingAcceptIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  incomingAcceptTooltip: {
    position: 'absolute',
    top: 32,
    left: 0,
    zIndex: 10,
    borderRadius: 6,
    backgroundColor: '#111827',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  incomingAcceptTooltipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  assignedToMeText: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  assignedToMeContext: {
    fontSize: 11,
    color: '#9ca3af',
    flexShrink: 1,
  },
  assignedToMeDue: {
    fontSize: 11,
    color: '#9ca3af',
    flexShrink: 0,
  },
  assignedToMeDueOverdue: {
    color: '#dc2626',
    fontWeight: '600',
  },
  assignedToMePriority: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  assignedToMePriorityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  priorityPickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  priorityPickerBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  priorityPickerLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Resources view ────────────────────────────────────────────────
  resourcesView: {
    flex: 1,
  },
  resourcesContent: {
    padding: 24,
    maxWidth: 860,
    alignSelf: 'center',
    width: '100%',
  },
  resourcesHeader: {
    marginBottom: 24,
  },
  resourcesTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  resourcesSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  resourcesSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
  },
  resourceCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 10,
  },
  resourceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resourceCardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  resourceCardMeta: {
    fontSize: 12,
    color: '#9ca3af',
    textTransform: 'capitalize',
  },
  resourceStats: {
    flexDirection: 'row',
    gap: 12,
  },
  resourceStat: {
    minWidth: 64,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  resourceStatDanger: {
    backgroundColor: '#fef2f2',
  },
  resourceStatUrgent: {
    backgroundColor: '#fef2f2',
  },
  resourceStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  resourceStatValueDanger: {
    color: '#dc2626',
  },
  resourceStatValueUrgent: {
    color: '#ef4444',
  },
  resourceStatLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  resourcesEmpty: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  resourcesEmptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },

  // ── Dashboard view ────────────────────────────────────────────────
  dashboardView: {
    flex: 1,
  },
  dashboardContent: {
    padding: 24,
    maxWidth: 860,
    alignSelf: 'center',
    width: '100%',
  },
  dashboardHeader: {
    marginBottom: 24,
  },
  dashboardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  dashboardSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  dashboardStatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  dashboardStatCard: {
    flexBasis: '30%',
    flexGrow: 1,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    minWidth: 100,
  },
  dashboardStatValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  dashboardStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  dashboardSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    letterSpacing: 0.3,
    marginBottom: 10,
    marginTop: 8,
  },
  dashboardMemberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  dashboardMemberCard: {
    flexBasis: '30%',
    flexGrow: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minWidth: 120,
  },
  dashboardMemberName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  dashboardMemberStats: {
    fontSize: 12,
    color: '#6b7280',
  },
  dashboardTodoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    gap: 10,
  },
  dashboardTodoPriority: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  dashboardTodoText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  dashboardTodoDue: {
    fontSize: 12,
    color: '#dc2626',
  },
  dashboardMoreText: {
    fontSize: 12,
    color: '#9ca3af',
    paddingVertical: 8,
  },
});
