import { useState } from 'react';
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
import TodoItem from '../components/TodoItem';

type Todo = {
  id: string;
  text: string;
  done: boolean;
};

export default function HomeScreen() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');

  const active = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);

  function addTodo() {
    const text = input.trim();
    if (!text) return;
    setTodos((prev) => [{ id: Date.now().toString(), text, done: false }, ...prev]);
    setInput('');
  }

  function toggle(id: string) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function remove(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
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
        {active.length === 0 && done.length === 0 && (
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
  empty: {
    textAlign: 'center',
    color: '#9ca3af',
    marginTop: 80,
    fontSize: 15,
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
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
