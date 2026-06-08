import { View, Text, Pressable, StyleSheet } from 'react-native';

type Props = {
  text: string;
  done: boolean;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  dueDate?: string | null;
  note?: string | null;
  createdAt?: string;
  assignedLabel?: string;
  onToggle: () => void;
  onDelete: () => void;
  onAssign?: () => void;
  onPriority?: () => void;
  onDueDate?: () => void;
};

const priorityLabels = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

function relativeTime(value?: string) {
  if (!value) return '';

  const createdAt = new Date(value).getTime();
  if (Number.isNaN(createdAt)) return '';

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - createdAt) / 1000));
  if (elapsedSeconds < 30) return 'Just now';
  if (elapsedSeconds < 60) return `${elapsedSeconds}s ago`;

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays === 1) return 'Yesterday';
  if (elapsedDays < 7) return `${elapsedDays}d ago`;

  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function dueDateLabel(value?: string | null) {
  if (!value) return '';

  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const dueDate = new Date(year, month - 1, day);

  if (Number.isNaN(dueDate.getTime())) return '';

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueMidnight = new Date(year, month - 1, day);
  const dayDelta = Math.round(
    (dueMidnight.getTime() - todayMidnight.getTime()) / (24 * 60 * 60 * 1000)
  );

  if (dayDelta === 0) return 'Due today';
  if (dayDelta === 1) return 'Due tomorrow';
  if (dayDelta === -1) return 'Due yesterday';

  return `Due ${dueDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })}`;
}

export default function TodoItem({
  text,
  done,
  priority = 'normal',
  dueDate,
  note,
  createdAt,
  assignedLabel,
  onToggle,
  onDelete,
  onAssign,
  onPriority,
  onDueDate,
}: Props) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onToggle} style={styles.checkbox}>
        <View style={[styles.box, done && styles.boxChecked]}>
          {done && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </Pressable>
      <Pressable onPress={onToggle} style={styles.textWrap}>
        <Text style={[styles.text, done && styles.textDone]} numberOfLines={1}>
          {text}
        </Text>
      </Pressable>
      <Pressable onPress={onPriority} disabled={!onPriority} style={styles.inlineControl}>
        <Text style={[styles.priority, styles[`priority_${priority}`]]}>
          {priorityLabels[priority]}
        </Text>
      </Pressable>
      {!!assignedLabel && (
        <Pressable onPress={onAssign} disabled={!onAssign} style={styles.inlineControl}>
          <Text style={styles.assignee} numberOfLines={1}>
            {assignedLabel}
          </Text>
        </Pressable>
      )}
      <Pressable onPress={onDueDate} disabled={!onDueDate} style={styles.inlineControl}>
        <Text style={[styles.dueDate, !dueDate && styles.dueDateEmpty]} numberOfLines={1}>
          {dueDate ? dueDateLabel(dueDate) : 'Due'}
        </Text>
      </Pressable>
      {!!createdAt && (
        <Text style={styles.timestamp} numberOfLines={1}>
          {relativeTime(createdAt)}
        </Text>
      )}
      <Pressable onPress={onDelete} style={styles.deleteBtn} hitSlop={8}>
        <Text style={styles.deleteText}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  checkbox: {
    marginRight: 12,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  checkmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  text: {
    fontSize: 16,
    color: '#111827',
  },
  textDone: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  assignee: {
    color: '#6b7280',
    fontSize: 12,
    maxWidth: 96,
  },
  timestamp: {
    color: '#9ca3af',
    fontSize: 12,
    marginLeft: 8,
  },
  dueDate: {
    color: '#4338ca',
    fontSize: 12,
    fontWeight: '700',
  },
  dueDateEmpty: {
    color: '#6b7280',
    fontWeight: '600',
  },
  priority: {
    borderRadius: 6,
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: '700',
  },
  priority_low: {
    color: '#4b5563',
    backgroundColor: '#f3f4f6',
  },
  priority_normal: {
    color: '#1d4ed8',
    backgroundColor: '#dbeafe',
  },
  priority_high: {
    color: '#92400e',
    backgroundColor: '#fef3c7',
  },
  priority_urgent: {
    color: '#b91c1c',
    backgroundColor: '#fee2e2',
  },
  deleteBtn: {
    paddingLeft: 12,
  },
  inlineControl: {
    marginLeft: 8,
  },
  deleteText: {
    fontSize: 14,
    color: '#9ca3af',
  },
});
