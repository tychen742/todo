import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Priority } from '../lib/types';
import { pickAvatarColor } from '../lib/avatar';

type KanbanCardTodo = {
  id: string;
  text: string;
  done: boolean;
  priority: Priority;
  due_date: string | null;
  note: string | null;
  is_milestone: boolean;
  assigned_to: string | null;
};

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

export function KanbanCard({
  todo,
  assigneeEmail,
  onToggle,
  onDelete,
  onEdit,
  onCycleAssignee,
}: {
  todo: KanbanCardTodo;
  assigneeEmail: string | null;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onCycleAssignee: () => void;
}) {
  const priorityStyle =
    todo.priority === 'urgent' ? styles.priority_urgent :
    todo.priority === 'high' ? styles.priority_high :
    todo.priority === 'low' ? styles.priority_low : undefined;
  const dueLabel = todo.due_date ? kanbanDueLabel(todo.due_date) : null;
  const overdue = dueLabel?.includes('overdue') ?? false;
  const hasAssignee = !!todo.assigned_to;
  const avatarColor = assigneeEmail ? pickAvatarColor(assigneeEmail) : undefined;
  const initials = assigneeEmail
    ? assigneeEmail.split('@')[0].split(/[._-]/).filter((part) => part).map((part) => part[0]).join('').toUpperCase().slice(0, 2) || '?'
    : '?';

  return (
    <View style={[styles.card, todo.is_milestone && styles.cardMilestone]}>
      <Pressable onPress={onToggle} hitSlop={8} style={styles.checkbox}>
        <View style={[styles.box, todo.done && styles.boxDone]}>
          {todo.done && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </Pressable>
      <Pressable onPress={onEdit} style={styles.body}>
        <View style={styles.titleRow}>
          {todo.is_milestone && <Text style={styles.milestoneIcon}>◆</Text>}
          <Text style={[styles.text, todo.done && styles.textDone]} numberOfLines={2}>{todo.text}</Text>
          <Pressable
            onPress={(event) => { event.stopPropagation?.(); onCycleAssignee(); }}
            hitSlop={6}
            style={styles.assigneeInline}
          >
            {hasAssignee && avatarColor ? (
              <View style={[styles.assigneeAvatar, { backgroundColor: avatarColor }]}>
                <Text style={styles.assigneeAvatarText}>{initials}</Text>
              </View>
            ) : (
              <Text style={styles.assigneePlaceholder}>+</Text>
            )}
          </Pressable>
        </View>
        {(priorityStyle || dueLabel) && (
          <View style={styles.meta}>
            {priorityStyle && <Text style={[styles.badge, priorityStyle]}>{todo.priority}</Text>}
            {dueLabel && <Text style={[styles.due, overdue && styles.dueOverdue]}>{dueLabel}</Text>}
          </View>
        )}
      </Pressable>
      <Pressable onPress={onDelete} hitSlop={8}>
        <Text style={styles.del}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', padding: 10, marginHorizontal: 8, marginBottom: 6, gap: 8 },
  cardMilestone: { backgroundColor: '#fefce8', borderColor: '#fde68a' },
  checkbox: { paddingTop: 1 },
  box: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: '#d1d5db', backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center' },
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
