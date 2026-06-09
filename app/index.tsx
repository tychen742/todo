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
import { DraggableList } from '../components/DraggableList';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import type { Session } from '@supabase/supabase-js';
import TodoItem from '../components/TodoItem';
import PhaseStrip, { type Phase } from '../components/PhaseStrip';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

type Todo = {
  id: string;
  text: string;
  done: boolean;
  assigned_to: string | null;
  priority: Priority;
  due_date: string | null;
  note: string | null;
  created_at: string;
  position: number | null;
  is_milestone: boolean;
  project_id: string | null;
  phase_id: string | null;
};

type Team = {
  id: string;
  name: string;
  member_count?: number;
};

type Project = {
  id: string;
  name: string;
  team_id: string | null;
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

const priorities: Priority[] = ['low', 'normal', 'high', 'urgent'];

const priorityRank: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

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

function monthLabel(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

function buildCalendarDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = Array.from({ length: firstDay.getDay() }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
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
function KanbanCard({ todo, assigneeLabel, onToggle, onDelete, onEdit, onCycleAssignee }: {
  todo: KanbanCardTodo;
  assigneeLabel: string | null;
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
        </View>
        <View style={kcs.meta}>
          {priorityStyle && <Text style={[kcs.badge, priorityStyle]}>{todo.priority}</Text>}
          {dueLabel && <Text style={[kcs.due, overdue && kcs.dueOverdue]}>{dueLabel}</Text>}
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); onCycleAssignee(); }}
            style={[kcs.assigneePill, hasAssignee && kcs.assigneePillAssigned]}
            hitSlop={6}
          >
            <Text style={[kcs.assigneeText, hasAssignee && kcs.assigneeTextAssigned]} numberOfLines={1}>
              {assigneeLabel ?? 'Assign'}
            </Text>
          </Pressable>
        </View>
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
  checkmark: { color: '#fff', fontSize: 10, fontWeight: '700' },
  body: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  milestoneIcon: { fontSize: 9, color: '#d97706', marginTop: 3, flexShrink: 0 },
  text: { flex: 1, fontSize: 13, color: '#111827', lineHeight: 18 },
  textDone: { textDecorationLine: 'line-through', color: '#9ca3af' },
  meta: { flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' },
  badge: { fontSize: 10, borderRadius: 4, overflow: 'hidden', paddingHorizontal: 5, paddingVertical: 2, fontWeight: '600' },
  priority_low: { color: '#4b5563', backgroundColor: '#f3f4f6' },
  priority_high: { color: '#92400e', backgroundColor: '#fef3c7' },
  priority_urgent: { color: '#b91c1c', backgroundColor: '#fee2e2' },
  due: { fontSize: 10, color: '#4338ca', fontWeight: '600' },
  dueOverdue: { color: '#b91c1c' },
  del: { fontSize: 12, color: '#d1d5db', paddingLeft: 4 },
  assigneePill: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb', maxWidth: 100 },
  assigneePillAssigned: { backgroundColor: '#ede9fe', borderColor: '#c4b5fd' },
  assigneeText: { fontSize: 10, color: '#9ca3af', fontWeight: '600' },
  assigneeTextAssigned: { color: '#6d28d9' },
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

export default function HomeScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>('signIn');
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [createTarget, setCreateTarget] = useState<CreateTarget | null>(null);
  const [teamName, setTeamName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [phasePickerTodo, setPhasePickerTodo] = useState<Todo | null>(null);
  const [addingPhase, setAddingPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');
  const [editDraftPhaseId, setEditDraftPhaseId] = useState<string | null>(null);
  const [columnInputs, setColumnInputs] = useState<Record<string, string>>({});
  const [backlogInputVisible, setBacklogInputVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [teamsViewOpen, setTeamsViewOpen] = useState(false);
  const [animalPickerVisible, setAnimalPickerVisible] = useState(false);
  const [customAnimal, setCustomAnimal] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState('');
  const [statusEditing, setStatusEditing] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [newTodoAssignee, setNewTodoAssignee] = useState<string | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');
  const [dueTodo, setDueTodo] = useState<Todo | null>(null);
  const [editTodo, setEditTodo] = useState<Todo | null>(null);
  const [editDraftText, setEditDraftText] = useState('');
  const [editDraftNote, setEditDraftNote] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const isProject = selectedProjectId !== null;
  const isPersonal = selectedTeamId === null && !isProject;
  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;
  const selectedTeam = isProject ? null : (teams.find((team) => team.id === selectedTeamId) ?? null);
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
  const phaseById = useMemo(() => new Map(phases.map((p) => [p.id, p])), [phases]);
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
  const accountDisplayName = profile
    ? profileDisplayName(profile)
    : emailDisplayName(session?.user.email);

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
      .select('id, name, team_members(count)')
      .order('created_at', { ascending: true });

    if (teamsError) {
      setError(teamsError.message);
      return;
    }

    const nextTeams = (data ?? []).map((t: any) => ({
      id: t.id,
      name: t.name,
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

  const loadProjects = useCallback(async () => {
    if (!session) return;
    const { data, error: err } = await supabase
      .from('projects')
      .select('id, name, team_id')
      .order('created_at', { ascending: true });
    if (!err) setProjects(data ?? []);
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
    // Resolve the team to load members from: direct team selection or the project's linked team.
    const teamId = selectedTeamId ?? (
      selectedProjectId
        ? (projects.find((p) => p.id === selectedProjectId)?.team_id ?? null)
        : null
    );
    if (!teamId) {
      setMembers([]);
      setNewTodoAssignee(null);
      return;
    }

    const { data: membershipData, error: membershipError } = await supabase
      .from('team_members')
      .select('user_id, role')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true });

    if (membershipError) {
      setError(membershipError.message);
      return;
    }

    const memberships = membershipData ?? [];
    const ids = memberships.map((member) => member.user_id);
    if (ids.length === 0) {
      setMembers([]);
      setNewTodoAssignee(null);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, display_name')
      .in('id', ids);

    if (profileError) {
      setError(profileError.message);
      return;
    }

    const profilesById = new Map((profileData ?? []).map((profile) => [profile.id, profile]));
    const nextMembers = memberships.map((member) => ({
      user_id: member.user_id,
      role: member.role,
      email: profilesById.get(member.user_id)?.email ?? 'unknown@example.com',
      display_name: profilesById.get(member.user_id)?.display_name ?? null,
    }));

    setMembers(nextMembers);
    setNewTodoAssignee((current) => {
      if (current && nextMembers.some((member) => member.user_id === current)) {
        return current;
      }
      return session?.user.id ?? nextMembers[0]?.user_id ?? null;
    });
    setError('');
  }, [selectedTeamId, selectedProjectId, projects, session]);

  const loadTodos = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('todos')
      .select('id, text, done, assigned_to, priority, due_date, note, created_at, position, is_milestone, project_id, phase_id')
      .order('created_at', { ascending: false });

    if (selectedProjectId) {
      query = query.eq('project_id', selectedProjectId);
    } else {
      query = selectedTeamId
        ? query.eq('team_id', selectedTeamId)
        : query.is('team_id', null);
      query = query.is('project_id', null);
    }

    const { data, error: loadError } = await query;

    if (loadError) {
      setError(loadError.message);
    } else {
      setTodos(sortTodos((data ?? []) as Todo[]));
      setError('');
    }
    setLoading(false);
  }, [selectedTeamId, selectedProjectId]);

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
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
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
      loadTeams();
      loadProjects();
    });
  }, [ensureProfile, loadTeams, loadProjects, session]);

  useEffect(() => {
    if (!session) return;
    loadPhases();
  }, [loadPhases, session]);

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
      setError('Enter an email and password.');
      return;
    }

    setAuthLoading(true);
    setError('');
    setMessage('');

    const result =
      authMode === 'signIn'
        ? await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
        : await supabase.auth.signUp({ email: normalizedEmail, password });

    setAuthLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (authMode === 'signUp' && !result.data.session) {
      setMessage('Check your email to confirm the account, then sign in.');
    }
  }

  async function signOut() {
    setAccountMenuOpen(false);
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

  function choosePlannedUserFeature(label: string) {
    setAccountMenuOpen(false);
    setMessage(`${label} is planned.`);
    setError('');
  }

  async function createTeam() {
    if (!session) return;

    const name = teamName.trim();
    if (!name) return;

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({ name, created_by: session.user.id })
      .select('id, name')
      .single();

    if (teamError) {
      setError(teamError.message);
      return;
    }

    const { error: memberError } = await supabase.from('team_members').insert({
      team_id: team.id,
      user_id: session.user.id,
      role: 'owner',
    });

    if (memberError) {
      // Roll back the team row so we don't leave an owner-less team.
      await supabase.from('teams').delete().eq('id', team.id);
      setError(memberError.message);
      return;
    }

    setTeamName('');
    setTeams((prev) => [...prev, team]);
    setSelectedTeamId(team.id);
    setCreateTarget(null);
    setMessage(`Created ${team.name}.`);
    setError('');
  }

  async function createProject() {
    if (!session) return;
    const name = projectName.trim();
    if (!name) return;

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({ name, created_by: session.user.id })
      .select('id, name, team_id')
      .single();

    if (projectError) {
      setError(projectError.message);
      return;
    }

    const defaultPhases = ['Planning', 'Execution', 'Review'];
    await Promise.all(
      defaultPhases.map((phaseName, i) =>
        supabase.from('project_phases').insert({
          project_id: project.id,
          name: phaseName,
          order_index: i,
          status: i === 0 ? 'active' : 'upcoming',
        })
      )
    );

    setProjectName('');
    setProjects((prev) => [...prev, project]);
    setSelectedProjectId(project.id);
    setSelectedTeamId(null);
    setCreateTarget(null);
    setMessage('');
    setError('');
  }

  function openCreateTarget(target: CreateTarget) {
    setAccountMenuOpen(false);

    if (target === 'team') {
      setCreateTarget('team');
      return;
    }

    if (target === 'project') {
      setCreateTarget('project');
      return;
    }

    setMessage('Organization creation needs organization tables next.');
    setError('');
  }

  function selectTeamFromAccountMenu(teamId: string) {
    setSelectedTeamId(teamId);
    setAccountMenuOpen(false);
  }

  async function addMember() {
    if (!selectedTeamId) return;

    const normalizedEmail = memberEmail.trim().toLowerCase();
    if (!normalizedEmail) return;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (profileError) {
      setError(profileError.message);
      return;
    }

    if (!profile) {
      setError('That user must sign up before you can add them.');
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

  async function addTodo() {
    const text = input.trim();
    if (!text || !session) return;

    const { data, error: insertError } = await supabase
      .from('todos')
      .insert({
        text,
        team_id: isProject ? null : selectedTeamId,
        project_id: selectedProjectId,
        created_by: session.user.id,
        assigned_to: selectedTeamId && !isProject ? newTodoAssignee : null,
        priority: 'normal',
      })
      .select('id, text, done, assigned_to, priority, due_date, note, created_at, position, is_milestone, project_id, phase_id')
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

    const { data, error: insertError } = await supabase
      .from('todos')
      .insert({
        text,
        project_id: selectedProjectId,
        phase_id: phaseId,
        created_by: session.user.id,
        priority: 'normal',
      })
      .select('id, text, done, assigned_to, priority, due_date, note, created_at, position, is_milestone, project_id, phase_id')
      .single();

    if (insertError) { setError(insertError.message); return; }
    if (data) setTodos((prev) => [data as Todo, ...prev]);
    setColumnInputs((prev) => ({ ...prev, [key]: '' }));
    setError('');
  }

  async function toggle(id: string) {
    const todo = todos.find((item) => item.id === id);
    if (!todo) return;

    const { error: updateError } = await supabase
      .from('todos')
      .update({ done: !todo.done })
      .eq('id', id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setTodos((prev) => prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
    setError('');
  }

  async function cycleAssignee(todo: Todo) {
    const options = [null, ...members.map((member) => member.user_id)];
    const currentIndex = options.indexOf(todo.assigned_to);
    const assigned_to = options[(currentIndex + 1) % options.length];

    const { error: updateError } = await supabase
      .from('todos')
      .update({ assigned_to })
      .eq('id', todo.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setTodos((prev) =>
      prev.map((item) => (item.id === todo.id ? { ...item, assigned_to } : item))
    );
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

  function openEditModal(todo: Todo) {
    setEditTodo(todo);
    setEditDraftText(todo.text);
    setEditDraftNote(todo.note ?? '');
    setEditDraftPhaseId(todo.phase_id ?? null);
  }

  function closeEditModal() {
    setEditTodo(null);
  }

  async function saveEditModal() {
    if (!editTodo) return;
    const text = editDraftText.trim();
    if (!text) return;

    const note = editDraftNote.trim() || null;
    const phase_id = isProject ? editDraftPhaseId : editTodo.phase_id;

    const { error: updateError } = await supabase
      .from('todos')
      .update({ text, note, phase_id })
      .eq('id', editTodo.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setTodos((prev) =>
      prev.map((item) =>
        item.id === editTodo.id ? { ...item, text, note, phase_id: phase_id ?? null } : item
      )
    );
    closeEditModal();
    setError('');
  }

  async function remove(id: string) {
    const { error: deleteError } = await supabase.from('todos').delete().eq('id', id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setTodos((prev) => prev.filter((todo) => todo.id !== id));
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
    if (data) setPhases((prev) => [...prev, data as Phase]);
    setNewPhaseName('');
    setAddingPhase(false);
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
            <Text style={styles.authTitle}>
              {isSignIn ? 'Welcome back!' : 'Create your account'}
            </Text>
            <View style={styles.authSubtitleRow}>
              <Text style={styles.authSubtitleText}>
                {isSignIn ? "Don't have an account? " : 'Already have an account? '}
              </Text>
              <Pressable
                onPress={() => {
                  setAuthMode(isSignIn ? 'signUp' : 'signIn');
                  setError('');
                  setMessage('');
                }}
              >
                <Text style={styles.authSubtitleLink}>
                  {isSignIn ? 'Sign up' : 'Sign in'}
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.socialBtn}
              onPress={() => setMessage('Google sign-in is coming soon.')}
            >
              <Text style={styles.googleG}>G</Text>
              <Text style={styles.socialBtnText}>Continue with Google</Text>
            </Pressable>

            <Pressable
              style={styles.socialBtn}
              onPress={() => setMessage('SSO is coming soon.')}
            >
              <Text style={styles.ssoIcon}>☁</Text>
              <Text style={styles.socialBtnText}>Continue with SSO</Text>
            </Pressable>

            <View style={styles.authDivider}>
              <View style={styles.authDividerLine} />
              <Text style={styles.authDividerText}>or</Text>
              <View style={styles.authDividerLine} />
            </View>

            <TextInput
              style={[styles.authInput, !!error && styles.authInputError]}
              value={email}
              onChangeText={(v) => { setEmail(v); if (error) setError(''); }}
              placeholder="Work email"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            {!!error && (
              <Text style={styles.authFieldError}>{error}</Text>
            )}

            <View style={styles.authPasswordWrap}>
              <TextInput
                style={styles.authPasswordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                textContentType={isSignIn ? 'password' : 'newPassword'}
                onSubmitEditing={submitAuth}
              />
              <Pressable
                onPress={() => setShowPassword((p) => !p)}
                hitSlop={8}
              >
                <Text style={styles.passwordToggleText}>{showPassword ? '◉' : '◎'}</Text>
              </Pressable>
            </View>

            {!!message ? (
              <Text style={styles.authConfirmMessage}>{message}</Text>
            ) : (
              <Pressable
                onPress={submitAuth}
                disabled={authLoading}
                style={({ pressed }) => [
                  styles.authSubmitBtn,
                  (!email.trim() || !password) && styles.authSubmitBtnMuted,
                  pressed && styles.btnPressed,
                ]}
              >
                <Text style={styles.authSubmitBtnText}>
                  {authLoading ? 'Please wait…' : isSignIn ? 'Log In' : 'Sign Up'}
                </Text>
              </Pressable>
            )}

            {isSignIn && (
              <Pressable
                onPress={() => setMessage('Password reset is coming soon.')}
                style={styles.forgotBtn}
              >
                <Text style={styles.forgotBtnText}>Forgot Password?</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.authFooter}>
            <Text style={styles.authFooterText}>Need help?</Text>
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
              <Pressable
                onPress={() => setAnimalPickerVisible(true)}
                accessibilityLabel="Change avatar"
              >
                <View style={[styles.userAvatarBig, { backgroundColor: avatarColor }]}>
                  <Text style={styles.userAvatarBigAnimal}>{animal}</Text>
                </View>
              </Pressable>
              <View style={styles.userMeta}>
                <Text style={styles.userMetaName} numberOfLines={1}>{accountDisplayName}</Text>
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

            <View style={styles.titleBarCenter}>
              <View style={styles.searchBar}>
                <Text style={styles.searchIcon}>⌕</Text>
                <Text style={styles.searchPlaceholder}>Search</Text>
                <Text style={styles.searchShortcut}>⌘K</Text>
              </View>
            </View>

            <Pressable
              onPress={() => setAccountMenuOpen(true)}
              style={styles.titleBarRight}
              accessibilityRole="button"
              accessibilityLabel="Open account menu"
            >
              <View style={[styles.avatarBadge, { backgroundColor: avatarColor }]}>
                <Text style={styles.avatarText}>{initials || (accountDisplayName[0] ?? '?').toUpperCase()}</Text>
              </View>
              <Text style={styles.titleBarCaretDown}>⌄</Text>
            </Pressable>
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
            onPress={() => { setSelectedTeamId(null); setSelectedProjectId(null); setTeamsViewOpen(false); }}
            style={[styles.workspaceTab, isPersonal && !teamsViewOpen && styles.workspaceTabActive]}
          >
            <Text style={[styles.workspaceTabText, isPersonal && !teamsViewOpen && styles.workspaceTabTextActive]}>
              Personal
            </Text>
          </Pressable>

          {projects.map((project) => (
            <Pressable
              key={project.id}
              onPress={() => { setSelectedProjectId(project.id); setSelectedTeamId(null); setTeamsViewOpen(false); }}
              style={[styles.workspaceTab, selectedProjectId === project.id && !teamsViewOpen && styles.workspaceTabActive]}
              accessibilityRole="button"
              accessibilityLabel={`Open ${project.name}`}
            >
              <Text style={[styles.workspaceTabText, selectedProjectId === project.id && !teamsViewOpen && styles.workspaceTabTextActive]} numberOfLines={1}>{project.name}</Text>
            </Pressable>
          ))}
          {projects.length === 0 && (
            <Pressable
              onPress={() => openCreateTarget('project')}
              style={styles.workspaceTab}
              accessibilityRole="button"
              accessibilityLabel="Create first project"
            >
              <Text style={[styles.workspaceTabText, { color: '#9ca3af' }]}>Project 1</Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => openCreateTarget('project')}
            style={styles.workspaceAddTab}
            accessibilityRole="button"
            accessibilityLabel="Create project"
          >
            <Text style={styles.workspaceAddText}>+</Text>
          </Pressable>
        </ScrollView>

        {/* Teams button pinned to the right */}
        <Pressable
          onPress={() => setTeamsViewOpen((v) => !v)}
          style={[styles.teamsBtn, teamsViewOpen && styles.teamsBtnActive]}
        >
          <Text style={[styles.teamsBtnText, teamsViewOpen && styles.teamsBtnTextActive]}>Teams</Text>
        </Pressable>
      </View>

      {/* Teams card grid */}
      {teamsViewOpen && (
        <ScrollView style={styles.teamsGrid} contentContainerStyle={styles.teamsGridContent}>
          {teams.map((team) => {
            const cardColor = pickAvatarColor(team.id);
            const initial = (team.name[0] ?? 'T').toUpperCase();
            return (
              <Pressable
                key={team.id}
                style={styles.teamCard}
                onPress={() => { setSelectedTeamId(team.id); setSelectedProjectId(null); setTeamsViewOpen(false); }}
              >
                <View style={[styles.teamCardBg, { backgroundColor: cardColor + '33' }]} />
                <View style={[styles.teamCardAvatar, { backgroundColor: cardColor }]}>
                  <Text style={styles.teamCardAvatarText}>{initial}</Text>
                </View>
                <Text style={styles.teamCardName} numberOfLines={1}>{team.name}</Text>
                <Text style={styles.teamCardMeta}>{team.member_count ?? 0} member{(team.member_count ?? 0) !== 1 ? 's' : ''}</Text>
                <Pressable
                  onPress={(e) => { e.stopPropagation?.(); setSelectedTeamId(team.id); setSelectedProjectId(null); setTeamsViewOpen(false); }}
                  style={styles.teamCardAddBtn}
                  hitSlop={8}
                >
                  <Text style={styles.teamCardAddBtnText}>+</Text>
                </Pressable>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => { setTeamsViewOpen(false); openCreateTarget('team'); }}
            style={styles.teamCardNew}
          >
            <Text style={styles.teamCardNewIcon}>+</Text>
            <Text style={styles.teamCardNewText}>New Team</Text>
          </Pressable>
        </ScrollView>
      )}

      {selectedTeam && (
        <View style={styles.memberPanel}>
          <Text style={styles.panelTitle}>{selectedTeam.name}</Text>
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

      {isProject && nextMilestone && (
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

      {isProject ? (
        <>
          {/* Backlog strip — one-line capture bar; tasks land here by default */}
          {(() => {
            const backlogTodos = todos.filter((t) => !t.phase_id);
            const backlogActive = backlogTodos.filter((t) => !t.done);
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
                  {backlogActive.map((todo) => (
                    <Pressable
                      key={todo.id}
                      onPress={() => openEditModal(todo)}
                      style={[styles.backlogChip, todo.is_milestone && styles.backlogChipMilestone]}
                    >
                      {todo.is_milestone && <Text style={styles.backlogMilestoneIcon}>◆</Text>}
                      <Text style={styles.backlogChipText} numberOfLines={1}>{todo.text}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                {backlogInputVisible ? (
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
              const colActive = todos.filter((t) => !t.done && t.phase_id === phase.id);
              const colDone = todos.filter((t) => t.done && t.phase_id === phase.id);
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
                    {colActive.map((todo) => (
                      <KanbanCard key={todo.id} todo={todo}
                        assigneeLabel={todo.assigned_to ? assigneeLabel(todo.assigned_to) : null}
                        onToggle={() => toggle(todo.id)} onDelete={() => remove(todo.id)}
                        onEdit={() => openEditModal(todo)}
                        onCycleAssignee={() => cycleAssignee(todo)} />
                    ))}
                    {colDone.length > 0 && <>
                      <View style={styles.sectionDivider}>
                        <View style={styles.sectionDividerLine} />
                        <Text style={styles.sectionLabel}>Done</Text>
                        <View style={styles.sectionDividerLine} />
                      </View>
                      {colDone.map((todo) => (
                        <KanbanCard key={todo.id} todo={todo}
                          assigneeLabel={todo.assigned_to ? assigneeLabel(todo.assigned_to) : null}
                          onToggle={() => toggle(todo.id)} onDelete={() => remove(todo.id)}
                          onEdit={() => openEditModal(todo)}
                          onCycleAssignee={() => cycleAssignee(todo)} />
                      ))}
                    </>}
                  </ScrollView>
                </View>
              );
            })}
            <Pressable onPress={() => setAddingPhase(true)} style={styles.kanbanAddCol}>
              <Text style={styles.kanbanAddColIcon}>+</Text>
              <Text style={styles.kanbanAddColText}>Add Phase</Text>
            </Pressable>
          </ScrollView>
        </>
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

          <View style={styles.sortBar}>
            {Platform.OS === 'web' && !sortField && <View style={styles.sortHandleSpacer} />}
            <View style={styles.sortCheckboxSpacer} />
            {(
              [
                { field: 'text', label: 'Task', colStyle: styles.sortColTask },
                { field: 'priority', label: 'Priority', colStyle: styles.sortColPriority },
                { field: 'due_date', label: 'Due', colStyle: styles.sortColDue },
                { field: 'created_at', label: 'Age', colStyle: styles.sortColAdded },
              ] as { field: SortField; label: string; colStyle: object }[]
            ).map(({ field, label, colStyle }) => {
              const isActive = sortField === field;
              const indicator = isActive ? (sortDir === 'asc' ? '↑' : '↓') : '↕';
              return (
                <Pressable key={field} onPress={() => toggleSort(field)} style={[colStyle, styles.sortColInner]}>
                  <Text style={[styles.sortColLabel, isActive && styles.sortColLabelActive]}>{label}</Text>
                  <Text style={[styles.sortColIndicator, isActive && styles.sortColLabelActive]}>{indicator}</Text>
                </Pressable>
              );
            })}
            <View style={styles.sortActionsSpacer} />
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
                text={todo.text} done={todo.done} priority={todo.priority}
                dueDate={todo.due_date} note={todo.note} createdAt={todo.created_at}
                assignedLabel={isPersonal ? undefined : assigneeLabel(todo.assigned_to)}
                onToggle={() => toggle(todo.id)} onDelete={() => remove(todo.id)}
                onEdit={(text) => editTodoText(todo.id, text)} onOpenEdit={() => openEditModal(todo)}
                onAssign={isPersonal ? undefined : () => cycleAssignee(todo)}
                onPriority={() => cyclePriority(todo)} onDueDate={() => openDueCalendar(todo)}
                onDrag={drag} isDragging={isActive ?? false}
              />
            )}
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
              done.length > 0 ? (
                <>
                  <View style={styles.sectionDivider}>
                    <View style={styles.sectionDividerLine} />
                    <Text style={styles.sectionLabel}>Completed</Text>
                    <View style={styles.sectionDividerLine} />
                  </View>
                  {done.map((todo) => (
                    <TodoItem
                      key={todo.id} text={todo.text} done={todo.done} priority={todo.priority}
                      dueDate={todo.due_date} note={todo.note} createdAt={todo.created_at}
                      assignedLabel={isPersonal ? undefined : assigneeLabel(todo.assigned_to)}
                      onToggle={() => toggle(todo.id)} onDelete={() => remove(todo.id)}
                      onEdit={(text) => editTodoText(todo.id, text)} onOpenEdit={() => openEditModal(todo)}
                      onAssign={isPersonal ? undefined : () => cycleAssignee(todo)}
                      onPriority={() => cyclePriority(todo)} onDueDate={() => openDueCalendar(todo)}
                      reserveDragSpace={Platform.OS === 'web'}
                    />
                  ))}
                </>
              ) : null
            }
          />
        </>
      )}

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
        visible={accountMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountMenuOpen(false)}
      >
        <Pressable style={styles.accountMenuBackdrop} onPress={() => setAccountMenuOpen(false)}>
          <Pressable style={styles.accountMenuCard}>
            <Text style={styles.accountMenuName} numberOfLines={1}>
              {accountDisplayName}
            </Text>
            <Text style={styles.accountMenuEmail} numberOfLines={1}>
              {profile?.email ?? session.user.email}
            </Text>
            <Pressable
              onPress={() => choosePlannedUserFeature('Profile')}
              style={styles.accountMenuItem}
            >
              <Text style={styles.accountMenuItemText}>Profile</Text>
            </Pressable>
            <Pressable
              onPress={() => choosePlannedUserFeature('Settings')}
              style={styles.accountMenuItem}
            >
              <Text style={styles.accountMenuItemText}>Settings</Text>
            </Pressable>
            <Pressable
              onPress={() => { setAccountMenuOpen(false); setAboutVisible(true); }}
              style={styles.accountMenuItem}
            >
              <Text style={styles.accountMenuItemText}>About</Text>
            </Pressable>
            <View style={styles.accountMenuSection}>
              <View style={styles.accountMenuSectionHeader}>
                <Text style={styles.accountMenuSectionTitle}>Organizations</Text>
                <Pressable onPress={() => openCreateTarget('organization')} hitSlop={8}>
                  <Text style={styles.accountMenuSectionAction}>+</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => choosePlannedUserFeature('Organizations')}
                style={styles.accountMenuItem}
              >
                <Text style={styles.accountMenuMutedText}>No organizations yet</Text>
              </Pressable>
            </View>
            <View style={styles.accountMenuSection}>
              <View style={styles.accountMenuSectionHeader}>
                <Text style={styles.accountMenuSectionTitle}>Teams</Text>
                <Pressable onPress={() => openCreateTarget('team')} hitSlop={8}>
                  <Text style={styles.accountMenuSectionAction}>+</Text>
                </Pressable>
              </View>
              {teams.length === 0 ? (
                <Pressable onPress={() => openCreateTarget('team')} style={styles.accountMenuItem}>
                  <Text style={styles.accountMenuMutedText}>No teams yet</Text>
                </Pressable>
              ) : (
                teams.map((team) => (
                  <Pressable
                    key={team.id}
                    onPress={() => selectTeamFromAccountMenu(team.id)}
                    style={styles.accountMenuItem}
                  >
                    <Text
                      style={[
                        styles.accountMenuItemText,
                        team.id === selectedTeamId && styles.accountMenuItemTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {team.name}
                    </Text>
                  </Pressable>
                ))
              )}
            </View>
            <Pressable onPress={signOut} style={styles.accountMenuItem}>
              <Text style={styles.accountMenuSignOutText}>Log Out</Text>
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
            <View style={styles.editModalActions}>
              <Pressable
                onPress={() => {
                  setCreateTarget(null);
                  setProjectName('');
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
        visible={createTarget === 'team'}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateTarget(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCreateTarget(null)}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>New Team</Text>
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
            {isProject && phases.length > 0 && (
              <>
                <Text style={styles.editModalSectionLabel}>Phase</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
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
                      style={[styles.phasePill, editDraftPhaseId === phase.id && styles.phasePillActive]}
                    >
                      <Text style={[styles.phasePillText, editDraftPhaseId === phase.id && styles.phasePillTextActive]}>
                        {phase.name}
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
            <View style={styles.editModalActions}>
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
        visible={addingPhase}
        transparent
        animationType="fade"
        onRequestClose={() => setAddingPhase(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setAddingPhase(false)}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>New Phase</Text>
            <TextInput
              style={styles.editModalInput}
              value={newPhaseName}
              onChangeText={setNewPhaseName}
              placeholder="Phase name"
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
  authScroll: {
    flexGrow: 1,
  },
  authPanel: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 24,
  },
  authTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  authSubtitleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
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
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  googleG: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
    marginRight: 10,
  },
  ssoIcon: {
    fontSize: 16,
    color: '#6b7280',
    marginRight: 10,
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
    fontSize: 14,
    paddingHorizontal: 12,
  },
  authMessage: {
    color: '#6b7280',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
  },
  authConfirmMessage: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 14,
  },
  authInput: {
    height: 52,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
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
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 16,
    marginTop: 12,
  },
  authPasswordInput: {
    flex: 1,
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
    fontSize: 16,
    fontWeight: '700',
  },
  forgotBtn: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotBtnText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
  },
  authFooter: {
    paddingBottom: 36,
    alignItems: 'center',
  },
  authFooterText: {
    color: '#9ca3af',
    fontSize: 14,
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
    fontSize: 12,
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
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 2,
  },
  accountMenuEmail: {
    color: '#6b7280',
    fontSize: 12,
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
    fontSize: 14,
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
    fontSize: 14,
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
    fontSize: 20,
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
    fontSize: 16,
    fontWeight: '700',
  },
  teamCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  teamCardMeta: {
    fontSize: 12,
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
    fontSize: 24,
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
    fontSize: 14,
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
    fontSize: 12,
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
    fontSize: 14,
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
    fontSize: 16,
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
    fontSize: 12,
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
    fontSize: 14,
  },
  message: {
    color: '#166534',
    backgroundColor: '#dcfce7',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
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
    fontSize: 14,
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
    fontSize: 14,
  },
  calendarCancelText: {
    color: '#9ca3af',
    fontWeight: '600',
    fontSize: 14,
  },
  editModalTitle: {
    fontSize: 16,
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
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
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
    width: 76,
    marginLeft: 8,
    paddingLeft: 6,
  },
  sortColDue: {
    width: 80,
    marginLeft: 8,
  },
  sortColAdded: {
    width: 56,
    marginLeft: 8,
  },
  sortActionsSpacer: {
    width: 56,
    flexShrink: 0,
  },
  sortColLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 0.3,
  },
  sortColIndicator: {
    fontSize: 10,
    color: '#c4c9d4',
  },
  sortColLabelActive: {
    color: '#4338ca',
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 52 : 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
    gap: 10,
  },
  titleBarLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
    maxWidth: 260,
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
    fontSize: 17,
    fontWeight: '700',
  },
  userAvatarBigAnimal: {
    fontSize: 22,
    lineHeight: 28,
  },
  userMeta: {
    flexShrink: 1,
  },
  userMetaName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
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
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  statusPlaceholder: {
    fontSize: 12,
    color: '#d1d5db',
  },
  statusInput: {
    flex: 1,
    fontSize: 12,
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
    fontSize: 16,
    color: '#9ca3af',
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: '#9ca3af',
  },
  searchShortcut: {
    fontSize: 11,
    color: '#c4c9d4',
    fontWeight: '600',
  },
  titleBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  titleBarCaretDown: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
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
    fontSize: 12,
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
    fontSize: 12,
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
    fontSize: 16,
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
    fontSize: 14,
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
});
