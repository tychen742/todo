import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import TodoItem from '../components/TodoItem';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

type Todo = {
  id: string;
  text: string;
  done: boolean;
};

export default function HomeScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const active = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);

  const loadTodos = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      setError('Add Supabase env vars to sync todos.');
      return;
    }

    if (!session) {
      setTodos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error: loadError } = await supabase
      .from('todos')
      .select('id, text, done')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (loadError) {
      setError(loadError.message);
    } else {
      setTodos(data ?? []);
      setError('');
    }
    setLoading(false);
  }, [session]);

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
      setTodos([]);
      setError('');
      setMessage('');
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    loadTodos();

    if (!isSupabaseConfigured || !session) return;

    const channel = supabase
      .channel(`todos-sync-${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'todos',
          filter: `user_id=eq.${session.user.id}`,
        },
        loadTodos
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTodos, session]);

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
    await supabase.auth.signOut();
    setInput('');
  }

  async function addTodo() {
    const text = input.trim();
    if (!text || !session) return;

    const { data, error: insertError } = await supabase
      .from('todos')
      .insert({ text, user_id: session.user.id })
      .select('id, text, done')
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }

    if (data) {
      setTodos((prev) => [data, ...prev]);
    }
    setInput('');
    setError('');
  }

  async function toggle(id: string) {
    if (!session) return;
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    const { error: updateError } = await supabase
      .from('todos')
      .update({ done: !todo.done })
      .eq('id', id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    setError('');
  }

  async function remove(id: string) {
    if (!session) return;
    const { error: deleteError } = await supabase.from('todos').delete().eq('id', id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setTodos((prev) => prev.filter((t) => t.id !== id));
    setError('');
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
              pressed && styles.addBtnPressed,
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
      <StatusBar style="dark" />
      <View style={styles.accountBar}>
        <Text style={styles.accountText} numberOfLines={1}>
          {session.user.email}
        </Text>
        <Pressable onPress={signOut} hitSlop={8}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>
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
          style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
        >
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>
      <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!message && <Text style={styles.message}>{message}</Text>}

        {loading && !error && <Text style={styles.empty}>Loading todos...</Text>}

        {!loading && active.length === 0 && done.length === 0 && (
          <Text style={styles.empty}>No todos yet — add one below</Text>
        )}

        {active.map((t) => (
          <TodoItem key={t.id} text={t.text} done={t.done} onToggle={() => toggle(t.id)} onDelete={() => remove(t.id)} />
        ))}

        {done.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Completed</Text>
            {done.map((t) => (
              <TodoItem key={t.id} text={t.text} done={t.done} onToggle={() => toggle(t.id)} onDelete={() => remove(t.id)} />
            ))}
          </>
        )}
      </ScrollView>
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
  accountBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  accountText: {
    flex: 1,
    color: '#6b7280',
    fontSize: 13,
    marginRight: 12,
  },
  signOutText: {
    color: '#6366f1',
    fontWeight: '600',
    fontSize: 13,
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
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#111827',
    marginRight: 10,
  },
  addBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingHorizontal: 18,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnPressed: {
    opacity: 0.8,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
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
});
