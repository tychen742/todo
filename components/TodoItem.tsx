import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';

type Props = {
  text: string;
  done: boolean;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  dueDate?: string | null;
  note?: string | null;
  createdAt?: string;
  assignedAt?: string;
  assignedLabel?: string;
  phaseLabel?: string;
  isMilestone?: boolean;
  assignerInitials?: string;
  assignerColor?: string;
  assignerName?: string;
  onToggle: () => void;
  onOpenEdit?: () => void;
  onAssign?: () => void;
  onPriority?: () => void;
  onDueDate?: () => void;
  onPhase?: () => void;
  onDrag?: () => void;
  reserveDragSpace?: boolean;
  isDragging?: boolean;
  rowPV?: number;
};

const priorityLabels = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

const priorityColors = {
  low: '#9ca3af',
  normal: '#60a5fa',
  high: '#f59e0b',
  urgent: '#ef4444',
};

function agePill(value?: string): { label: string; days: number; hours: number } | null {
  if (!value) return null;
  const ms = Date.now() - new Date(value).getTime();
  if (Number.isNaN(ms) || ms < 0) return null;
  const s = Math.floor(ms / 1000);
  const totalMinutes = Math.floor(s / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (s < 60) return { label: 'now', days: 0, hours: 0 };
  if (totalMinutes < 60) return { label: `${totalMinutes}m`, days: 0, hours: 0 };
  if (totalHours < 24) return { label: `${totalHours}h`, days: 0, hours: totalHours };
  return { label: `${days}d`, days, hours };
}

type DuePill = { label: string; bg: string; color: string };

function dueDatePill(value?: string | null): DuePill | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  const today = new Date();
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueMid = new Date(y, m - 1, d);
  if (Number.isNaN(dueMid.getTime())) return null;
  const delta = Math.round((dueMid.getTime() - todayMid.getTime()) / 86400000);

  if (delta < -1) return { label: `${Math.abs(delta)}d late`, bg: '#fef2f2', color: '#dc2626' };
  if (delta === -1) return { label: '1d late', bg: '#fef2f2', color: '#dc2626' };
  if (delta === 0) return { label: 'Today', bg: '#fef3c7', color: '#d97706' };
  if (delta === 1) return { label: 'Tmrw', bg: '#fefce8', color: '#ca8a04' };
  if (delta <= 7) return { label: `${delta}d`, bg: '#eef2ff', color: '#4338ca' };
  const date = new Date(y, m - 1, d);
  const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return { label, bg: '#f3f4f6', color: '#6b7280' };
}

export default function TodoItem({
  text,
  done,
  priority = 'normal',
  dueDate,
  note,
  createdAt,
  assignedAt,
  assignedLabel,
  phaseLabel,
  isMilestone = false,
  assignerInitials,
  assignerColor,
  assignerName,
  onToggle,
  onOpenEdit,
  onAssign,
  onPriority,
  onDueDate,
  onPhase,
  onDrag,
  reserveDragSpace = false,
  isDragging = false,
  rowPV = 7,
}: Props) {
  const [priorityHovered, setPriorityHovered] = useState(false);
  const [assignerHovered, setAssignerHovered] = useState(false);
  const [ageHovered, setAgeHovered] = useState(false);
  const [dueDateHovered, setDueDateHovered] = useState(false);

  const duePill = dueDatePill(dueDate);
  const ageTimestamp = assignedAt ?? createdAt;
  const ageLabel = assignedAt ? 'Assigned' : 'Created';
  const age = agePill(ageTimestamp);

  const dueDateTooltip = (() => {
    if (!dueDate) return null;
    const [y, m, d] = dueDate.split('-').map(Number);
    if (!y || !m || !d) return null;
    const dueDay = new Date(y, m - 1, d);
    const full = dueDay.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
    const diffMs = dueDay.getTime() - Date.now();
    const absDiff = Math.abs(diffMs);
    const totalHours = Math.floor(absDiff / 3600000);
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const past = diffMs < 0;
    let relative: string;
    if (days === 0 && hours === 0) relative = 'Due now';
    else if (days === 0) relative = past ? `${hours}h overdue` : `In ${hours}h`;
    else if (hours === 0) relative = past ? `${days} day${days !== 1 ? 's' : ''} overdue` : `In ${days} day${days !== 1 ? 's' : ''}`;
    else relative = past
      ? `${days} day${days !== 1 ? 's' : ''} and ${hours}h overdue`
      : `In ${days} day${days !== 1 ? 's' : ''} and ${hours}h`;
    return { full, relative };
  })();

  return (
    <View style={[styles.rowOuter, isDragging && styles.rowDragging, isMilestone && styles.rowMilestone, (ageHovered || dueDateHovered) && styles.rowTooltipActive]}>
    <View style={[styles.row, { paddingVertical: rowPV }]}>
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

      <Pressable onPress={onOpenEdit} disabled={!onOpenEdit} style={styles.textWrap}>
        <View style={styles.textRow}>
          {isMilestone && <Text style={styles.milestoneIcon}>◆</Text>}
          <Text
            style={[styles.text, done && styles.textDone, isMilestone && !done && styles.textMilestone]}
            numberOfLines={1}
          >
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

      <View style={styles.priorityGroup}>
        <Pressable
          onPress={onPriority}
          disabled={!onPriority}
          onHoverIn={() => setPriorityHovered(true)}
          onHoverOut={() => setPriorityHovered(false)}
          style={styles.priorityControl}
          accessibilityRole="button"
          accessibilityLabel={`Priority: ${priorityLabels[priority]}`}
        >
          <View style={[styles.prioritySquare, { backgroundColor: priorityColors[priority] }]} />
          {priorityHovered && Platform.OS === 'web' && (
            <View style={styles.tooltip}>
              <Text style={styles.tooltipText}>{priorityLabels[priority]}</Text>
            </View>
          )}
        </Pressable>
        {!!assignerInitials && (
          <Pressable
            onHoverIn={() => setAssignerHovered(true)}
            onHoverOut={() => setAssignerHovered(false)}
            style={styles.assignerAvatarWrap}
            hitSlop={4}
          >
            <View style={[styles.assignerAvatar, { backgroundColor: assignerColor ?? '#9ca3af' }]}>
              <Text style={styles.assignerAvatarText}>{assignerInitials}</Text>
            </View>
            {assignerHovered && Platform.OS === 'web' && assignerName && (
              <View style={styles.tooltip}>
                <Text style={styles.tooltipText}>{assignerName}</Text>
              </View>
            )}
          </Pressable>
        )}
      </View>

      {!!assignedLabel && (
        <Pressable onPress={onAssign} disabled={!onAssign} style={styles.inlineControl}>
          <Text style={styles.assignee} numberOfLines={1}>
            {assignedLabel}
          </Text>
        </Pressable>
      )}

      <Pressable
        onPress={onDueDate}
        disabled={!onDueDate && !duePill}
        onHoverIn={() => setDueDateHovered(true)}
        onHoverOut={() => setDueDateHovered(false)}
        style={styles.dueDateCol}
      >
        {duePill ? (
          <View style={[styles.pill, { backgroundColor: duePill.bg }]}>
            <Text style={[styles.pillText, { color: duePill.color }]} numberOfLines={1}>
              {duePill.label}
            </Text>
          </View>
        ) : (
          onDueDate ? <Text style={styles.pillEmpty}>+ date</Text> : null
        )}
        {dueDateHovered && Platform.OS === 'web' && dueDateTooltip && (
          <View style={styles.dueDateTooltip}>
            <Text style={styles.tooltipText}>Due: {dueDateTooltip.full}</Text>
            <Text style={styles.tooltipText}>{dueDateTooltip.relative}</Text>
          </View>
        )}
      </Pressable>

      <Pressable
        style={styles.ageCol}
        onHoverIn={() => setAgeHovered(true)}
        onHoverOut={() => setAgeHovered(false)}
        disabled={!ageTimestamp}
      >
        {age ? (
          <View style={styles.agePill}>
            <Text style={styles.agePillText}>{age.label}</Text>
          </View>
        ) : null}
        {ageHovered && Platform.OS === 'web' && !!ageTimestamp && age && (
          <View style={styles.ageTooltip}>
            <Text style={styles.tooltipText}>
              {'Age: ' + (age.days > 0 ? `${age.days}d ` : '') + (age.hours > 0 ? `${age.hours}h` : age.days === 0 ? age.label : '0h')}
            </Text>
            <Text style={styles.tooltipText}>
              {ageLabel + ' ' + new Date(ageTimestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
    <View style={styles.rowSeparator} />
    </View>
  );
}

const styles = StyleSheet.create({
  rowOuter: {
    flexDirection: 'column',
    zIndex: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingRight: 16,
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
    marginLeft: 32,
  },
  checkbox: {
    marginRight: 12,
  },
  box: {
    width: 18,
    height: 18,
    borderRadius: 5,
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
    fontSize: 11,
    fontWeight: '700',
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  text: {
    fontSize: 15,
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
  assignee: {
    color: '#6b7280',
    fontSize: 11,
    maxWidth: 96,
  },
  dueDateCol: {
    marginLeft: 8,
    width: 64,
    alignItems: 'flex-start',
  },
  ageCol: {
    marginLeft: 2,
    width: 56,
    alignItems: 'flex-start',
  },
  pill: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pillEmpty: {
    fontSize: 11,
    color: '#d1d5db',
    fontWeight: '500',
    paddingLeft: 6,
  },
  agePill: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#f3f4f6',
  },
  agePillText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  priorityGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    width: 48,
  },
  priorityControl: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prioritySquare: {
    width: 14,
    height: 14,
    borderRadius: 3,
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
    fontSize: 11,
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
  inlineControl: {
    marginLeft: 8,
  },
  assignerAvatarWrap: {
    marginLeft: 2,
    position: 'relative',
  },
  assignerAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignerAvatarText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  rowTooltipActive: {
    zIndex: 10,
  },
  tooltip: {
    position: 'absolute',
    bottom: 24,
    left: '50%' as unknown as number,
    transform: [{ translateX: -40 }],
    backgroundColor: '#374151',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 100,
    minWidth: 80,
    alignItems: 'center',
  },
  dueDateTooltip: {
    position: 'absolute',
    bottom: 24,
    right: 0,
    backgroundColor: '#374151',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 100,
    minWidth: 190,
    alignItems: 'flex-start',
  },
  ageTooltip: {
    position: 'absolute',
    top: 24,
    right: 0,
    backgroundColor: '#374151',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 100,
    minWidth: 160,
    alignItems: 'flex-start',
  },
  tooltipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    whiteSpace: 'nowrap' as any,
  },
});
