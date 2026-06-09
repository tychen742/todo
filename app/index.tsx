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
};

type Team = {
  id: string;
  name: string;
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
    // Manual drag positions win once a user has ordered the list.
    if (a.position !== null && b.position !== null) return a.position - b.position;
    if (a.position !== null) return -1;
    if (b.position !== null) return 1;

    // Items without manual positions fall back to priority and recency.
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
  const [memberEmail, setMemberEmail] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [newTodoAssignee, setNewTodoAssignee] = useState<string | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');
  const [dueTodo, setDueTodo] = useState<Todo | null>(null);
  const [editTodo, setEditTodo] = useState<Todo | null>(null);
  const [editDraftText, setEditDraftText] = useState('');
  const [editDraftNote, setEditDraftNote] = useState('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const isPersonal = selectedTeamId === null;
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? null;
  const active = useMemo(() => {
    const items = todos.filter((t) => !t.done);
    if (!sortField) return items;
    return [...items].sort((a, b) => {
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
      .select('id, email, display_name')
      .single();

    if (profileError) {
      setError(profileError.message);
      return;
    }

    setProfile(profileData);
  }, []);

  const loadTeams = useCallback(async () => {
    if (!session) return;

    const { data, error: teamsError } = await supabase
      .from('teams')
      .select('id, name')
      .order('created_at', { ascending: true });

    if (teamsError) {
      setError(teamsError.message);
      return;
    }

    const nextTeams = data ?? [];
    setTeams(nextTeams);
    setSelectedTeamId((current) => {
      if (current && nextTeams.some((team) => team.id === current)) {
        return current;
      }
      return null;
    });
    setError('');
  }, [session]);

  const loadMembers = useCallback(async () => {
    if (!selectedTeamId) {
      setMembers([]);
      setNewTodoAssignee(null);
      return;
    }

    const { data: membershipData, error: membershipError } = await supabase
      .from('team_members')
      .select('user_id, role')
      .eq('team_id', selectedTeamId)
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
  }, [selectedTeamId, session]);

  const loadTodos = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('todos')
      .select('id, text, done, assigned_to, priority, due_date, note, created_at, position')
      .order('created_at', { ascending: false });

    query = selectedTeamId
      ? query.eq('team_id', selectedTeamId)
      : query.is('team_id', null);

    const { data, error: loadError } = await query;

    if (loadError) {
      setError(loadError.message);
    } else {
      setTodos(sortTodos((data ?? []) as Todo[]));
      setError('');
    }
    setLoading(false);
  }, [selectedTeamId]);

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
      setSelectedTeamId(null);
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

    ensureProfile(session).then(loadTeams);
  }, [ensureProfile, loadTeams, session]);

  useEffect(() => {
    if (!session || !isSupabaseConfigured) return;

    loadMembers();
    loadTodos();

    const todoChannel = selectedTeamId ? `todos-sync-${selectedTeamId}` : `todos-sync-personal`;
    const todosFilter = selectedTeamId
      ? `team_id=eq.${selectedTeamId}`
      : `created_by=eq.${session.user.id}`;

    const todosChannel = supabase
      .channel(todoChannel)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'todos',
          filter: todosFilter,
        },
        loadTodos
      )
      .subscribe();

    if (!selectedTeamId) {
      return () => {
        supabase.removeChannel(todosChannel);
      };
    }

    const membersChannel = supabase
      .channel(`team-members-sync-${selectedTeamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members',
          filter: `team_id=eq.${selectedTeamId}`,
        },
        loadMembers
      )
      .subscribe();

    return () => {
      supabase.removeChannel(todosChannel);
      supabase.removeChannel(membersChannel);
    };
  }, [loadMembers, loadTodos, selectedTeamId, session]);

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
    await supabase.auth.signOut();
    setInput('');
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

  function openCreateTarget(target: CreateTarget) {
    setAccountMenuOpen(false);

    if (target === 'team') {
      setCreateTarget('team');
      return;
    }

    setMessage(
      target === 'organization'
        ? 'Organization creation needs organization tables next.'
        : 'Project creation needs project tables next.'
    );
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
        team_id: selectedTeamId,
        created_by: session.user.id,
        assigned_to: selectedTeamId ? newTodoAssignee : null,
        priority: 'normal',
      })
      .select('id, text, done, assigned_to, priority, due_date, note, created_at, position')
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
  }

  function closeEditModal() {
    setEditTodo(null);
  }

  async function saveEditModal() {
    if (!editTodo) return;
    const text = editDraftText.trim();
    if (!text) return;

    const note = editDraftNote.trim() || null;

    const { error: updateError } = await supabase
      .from('todos')
      .update({ text, note })
      .eq('id', editTodo.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setTodos((prev) =>
      prev.map((item) => (item.id === editTodo.id ? { ...item, text, note } : item))
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
    return `Assigned to ${member.email}`;
  }

  if (!session) {
    return (
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar style="dark" />
        <View style={styles.authPanel}>
          <Text style={styles.authTitle}>Todos</Text>
          <TextInput
            style={styles.authInput}
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <TextInput
            style={styles.authInput}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            textContentType={authMode === 'signIn' ? 'password' : 'newPassword'}
            onSubmitEditing={submitAuth}
          />
          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!message && <Text style={styles.message}>{message}</Text>}
          <Pressable
            onPress={submitAuth}
            disabled={authLoading}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.btnPressed,
              authLoading && styles.disabledBtn,
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {authLoading ? 'Please wait...' : authMode === 'signIn' ? 'Sign In' : 'Sign Up'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setAuthMode((prev) => (prev === 'signIn' ? 'signUp' : 'signIn'));
              setError('');
              setMessage('');
            }}
            style={styles.switchBtn}
          >
            <Text style={styles.switchText}>
              {authMode === 'signIn' ? 'Create an account' : 'Use an existing account'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => setAccountMenuOpen(true)}
              style={styles.accountMenuButton}
              accessibilityRole="button"
              accessibilityLabel="Open account menu"
            >
              <Text style={styles.accountMenuButtonText} numberOfLines={1}>
                {session.user.email}
              </Text>
              <Text style={styles.accountMenuCaret}>v</Text>
            </Pressable>
          ),
        }}
      />
      <StatusBar style="dark" />

      <View style={styles.teamPanel}>
        <Text style={styles.workspaceLabel}>Workspace</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.workspaceTabs}
        >
          <Pressable
            onPress={() => setSelectedTeamId(null)}
            style={[styles.workspaceTab, isPersonal && styles.workspaceTabActive]}
          >
            <Text style={[styles.workspaceTabText, isPersonal && styles.workspaceTabTextActive]}>
              Personal
            </Text>
          </Pressable>

          <Pressable
            onPress={() => choosePlannedUserFeature('Project 1 planning')}
            style={styles.workspaceTab}
            accessibilityRole="button"
            accessibilityLabel="Open Project 1 planning"
          >
            <Text style={styles.workspaceTabText}>Project 1</Text>
          </Pressable>

          <Pressable
            onPress={() => openCreateTarget('project')}
            style={styles.workspaceAddTab}
            accessibilityRole="button"
            accessibilityLabel="Create project"
          >
            <Text style={styles.workspaceAddText}>+</Text>
          </Pressable>
        </ScrollView>
      </View>

      {selectedTeam && (
        <View style={styles.memberPanel}>
          <Text style={styles.panelTitle}>{selectedTeam.name}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberList}>
            {members.map((member) => (
              <Text key={member.user_id} style={styles.memberChip}>
                {member.email}
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Pressable
                onPress={() => setNewTodoAssignee(null)}
                style={[
                  styles.assigneePill,
                  newTodoAssignee === null && styles.assigneePillActive,
                ]}
              >
                <Text
                  style={[
                    styles.assigneePillText,
                    newTodoAssignee === null && styles.assigneePillTextActive,
                  ]}
                >
                  Unassigned
                </Text>
              </Pressable>
              {members.map((member) => (
                <Pressable
                  key={member.user_id}
                  onPress={() => setNewTodoAssignee(member.user_id)}
                  style={[
                    styles.assigneePill,
                    newTodoAssignee === member.user_id && styles.assigneePillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.assigneePillText,
                      newTodoAssignee === member.user_id && styles.assigneePillTextActive,
                    ]}
                  >
                    {member.user_id === session.user.id ? 'Me' : member.email}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
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
            text={todo.text}
            done={todo.done}
            priority={todo.priority}
            dueDate={todo.due_date}
            note={todo.note}
            createdAt={todo.created_at}
            assignedLabel={isPersonal ? undefined : assigneeLabel(todo.assigned_to)}
            onToggle={() => toggle(todo.id)}
            onDelete={() => remove(todo.id)}
            onEdit={(text) => editTodoText(todo.id, text)}
            onOpenEdit={() => openEditModal(todo)}
            onAssign={isPersonal ? undefined : () => cycleAssignee(todo)}
            onPriority={() => cyclePriority(todo)}
            onDueDate={() => openDueCalendar(todo)}
            onDrag={drag}
            isDragging={isActive ?? false}
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
                  key={todo.id}
                  text={todo.text}
                  done={todo.done}
                  priority={todo.priority}
                  dueDate={todo.due_date}
                  note={todo.note}
                  createdAt={todo.created_at}
                  assignedLabel={isPersonal ? undefined : assigneeLabel(todo.assigned_to)}
                  onToggle={() => toggle(todo.id)}
                  onDelete={() => remove(todo.id)}
                  onEdit={(text) => editTodoText(todo.id, text)}
                  onOpenEdit={() => openEditModal(todo)}
                  onAssign={isPersonal ? undefined : () => cycleAssignee(todo)}
                  onPriority={() => cyclePriority(todo)}
                  onDueDate={() => openDueCalendar(todo)}
                  reserveDragSpace={Platform.OS === 'web'}
                />
              ))}
            </>
          ) : null
        }
      />

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
            <Text style={styles.accountMenuEmail} numberOfLines={1}>
              {session.user.email}
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
  authPanel: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  authTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 24,
  },
  authInput: {
    height: 48,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#111827',
    marginBottom: 12,
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
  accountMenuEmail: {
    color: '#6b7280',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    marginBottom: 8,
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
  disabledBtn: {
    opacity: 0.6,
  },
  primaryBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  switchBtn: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  switchText: {
    color: '#6366f1',
    fontWeight: '600',
    fontSize: 14,
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
});
