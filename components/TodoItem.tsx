import { View, Text, Pressable, StyleSheet } from 'react-native';

type Props = {
  text: string;
  done: boolean;
  assignedLabel?: string;
  onToggle: () => void;
  onDelete: () => void;
  onAssign?: () => void;
};

export default function TodoItem({ text, done, assignedLabel, onToggle, onDelete, onAssign }: Props) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onToggle} style={styles.checkbox}>
        <View style={[styles.box, done && styles.boxChecked]}>
          {done && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </Pressable>
      <View style={styles.textWrap}>
        <Pressable onPress={onToggle}>
        <Text style={[styles.text, done && styles.textDone]}>{text}</Text>
        </Pressable>
        {!!assignedLabel && (
          <Pressable onPress={onAssign} disabled={!onAssign}>
            <Text style={styles.assignee}>{assignedLabel}</Text>
          </Pressable>
        )}
      </View>
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
    paddingVertical: 12,
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
    marginTop: 4,
  },
  deleteBtn: {
    paddingLeft: 12,
  },
  deleteText: {
    fontSize: 14,
    color: '#9ca3af',
  },
});
