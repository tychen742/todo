import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';

type Props = {
  text: string;
  done: boolean;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  dueDate?: string | null;
  note?: string | null;
  createdAt?: string;
  assignedLabel?: string;
  phaseLabel?: string;
  isMilestone?: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onEdit?: (text: string) => void;
  onOpenEdit?: () => void;
  onAssign?: () => void;
  onPriority?: () => void;
  onDueDate?: () => void;
  onPhase?: () => void;
  onDrag?: () => void;
  reserveDragSpace?: boolean;
  isDragging?: boolean;
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

  if (dayDelta === 0) return 'Today';
  if (dayDelta === 1) return 'Tomorrow';
  if (dayDelta === -1) return 'Yesterday';

  return dueDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export default function TodoItem({
  text,
  done,
  priority = 'normal',
  dueDate,
  note,
  createdAt,
  assignedLabel,
  phaseLabel,
  isMilestone = false,
  onToggle,
  onDelete,
  onEdit,
  onOpenEdit,
  onAssign,
  onPriority,
  onDueDate,
  onPhase,
  onDrag,
  reserveDragSpace = false,
  isDragging = false,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(text);

  function startEdit() {
    setDraft(text);
    setIsEditing(true);
  }

  function commitEdit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== text) {
      onEdit?.(trimmed);
    }
    setIsEditing(false);
  }

  return (
    <View style={[styles.row, isDragging && styles.rowDragging, isMilestone && styles.rowMilestone]}>
      {!!onDrag && (
        <Pressable onPressIn={onDrag} style={styles.dragHandle} hitSlop={8}>
          <Text style={styles.dragHandleText}>⠿</Text>
        </Pressable>
      )}
      {!onDrag && reserveDragSpace && <View style={styles.dragHandle} />}
      <Pressable onPress={onToggle} style={styles.checkbox}>
        <View style={[styles.box, done && styles.boxChecked]}>
          {done && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </Pressable>

      {isEditing ? (
        <TextInput
          style={[styles.text, styles.textEditing]}
          value={draft}
          onChangeText={setDraft}
          onBlur={commitEdit}
          onSubmitEditing={commitEdit}
          returnKeyType="done"
          autoFocus
          selectTextOnFocus
        />
      ) : (
        <Pressable onPress={startEdit} style={styles.textWrap}>
          <View style={styles.textRow}>
            {isMilestone && <Text style={styles.milestoneIcon}>◆</Text>}
            <Text style={[styles.text, done && styles.textDone, isMilestone && !done && styles.textMilestone]} numberOfLines={1}>
              {text}
            </Text>
          </View>
          {!!onPhase && (
            <Pressable onPress={onPhase} style={styles.phaseTagWrap}>
              <Text style={phaseLabel ? styles.phaseTag : styles.phaseTagEmpty}>
                {phaseLabel ?? 'Set phase'}
              </Text>
            </Pressable>
          )}
          {!!note && (
            <Text style={styles.notePreview} numberOfLines={1}>
              {note}
            </Text>
          )}
        </Pressable>
      )}

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
        <Text
          style={[
            styles.dueDate,
            !dueDate && styles.dueDateEmpty,
            (priority === 'urgent' || priority === 'high') && styles.dueDateBold,
          ]}
          numberOfLines={1}
        >
          {dueDate ? dueDateLabel(dueDate) : '—'}
        </Text>
      </Pressable>
      {!!createdAt && (
        <Text style={styles.timestamp} numberOfLines={1}>
          {relativeTime(createdAt)}
        </Text>
      )}
      {!!onOpenEdit && (
        <Pressable onPress={onOpenEdit} style={styles.editBtn} hitSlop={8}>
          <Text style={styles.editText}>✏</Text>
        </Pressable>
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
    paddingRight: 16,
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
    backgroundColor: '#9ca3af',
    borderColor: '#9ca3af',
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
  notePreview: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 1,
  },
  phaseTagWrap: {
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  phaseTag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4338ca',
    backgroundColor: '#eef2ff',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  phaseTagEmpty: {
    fontSize: 11,
    color: '#d1d5db',
  },
  textEditing: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    color: '#111827',
    borderBottomWidth: 1.5,
    borderBottomColor: '#6366f1',
    paddingVertical: 2,
    marginRight: 4,
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
    width: 56,
  },
  dueDate: {
    color: '#4338ca',
    fontSize: 12,
    width: 80,
  },
  dueDateBold: {
    fontWeight: '700',
  },
  dueDateEmpty: {
    color: '#6b7280',
  },
  priority: {
    borderRadius: 6,
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 11,
    width: 76,
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
    fontWeight: '700',
  },
  priority_urgent: {
    color: '#b91c1c',
    backgroundColor: '#fee2e2',
    fontWeight: '700',
  },
  editBtn: {
    paddingLeft: 8,
    width: 28,
    alignItems: 'center',
  },
  editText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  rowMilestone: {
    backgroundColor: '#fefce8',
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  milestoneIcon: {
    fontSize: 10,
    color: '#d97706',
  },
  textMilestone: {
    fontWeight: '600',
    color: '#92400e',
  },
  rowDragging: {
    backgroundColor: '#f5f3ff',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  dragHandle: {
    width: 32,
    alignItems: 'center',
  },
  dragHandleText: {
    fontSize: 18,
    color: '#d1d5db',
    lineHeight: 22,
  },
  deleteBtn: {
    paddingLeft: 8,
    width: 28,
    alignItems: 'center',
  },
  deleteText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  inlineControl: {
    marginLeft: 8,
  },
});
