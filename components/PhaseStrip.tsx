import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';

export type Phase = {
  id: string;
  project_id: string;
  name: string;
  order_index: number;
  status: 'upcoming' | 'active' | 'completed';
  planned_start: string | null;
  planned_end: string | null;
};

type Props = {
  phases: Phase[];
  onCycleStatus: (phase: Phase) => void;
  onAdd: () => void;
};

function statusIcon(status: Phase['status']) {
  if (status === 'completed') return '✓';
  if (status === 'active') return '●';
  return '○';
}

function formatPhaseDate(value: string | null) {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function dateRange(phase: Phase) {
  const start = formatPhaseDate(phase.planned_start);
  const end = formatPhaseDate(phase.planned_end);
  if (start && end) return `${start} – ${end}`;
  if (start) return `From ${start}`;
  if (end) return `Until ${end}`;
  return null;
}

export default function PhaseStrip({ phases, onCycleStatus, onAdd }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
      contentContainerStyle={styles.content}
    >
      {phases.map((phase) => {
        const range = dateRange(phase);
        return (
          <Pressable
            key={phase.id}
            onPress={() => onCycleStatus(phase)}
            style={[styles.card, styles[`card_${phase.status}`]]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.statusIcon, styles[`icon_${phase.status}`]]}>
                {statusIcon(phase.status)}
              </Text>
              <Text style={[styles.phaseName, styles[`name_${phase.status}`]]} numberOfLines={1}>
                {phase.name}
              </Text>
            </View>
            {range ? <Text style={styles.dateRange}>{range}</Text> : null}
          </Pressable>
        );
      })}
      <Pressable onPress={onAdd} style={styles.addCard}>
        <Text style={styles.addText}>+ Phase</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  card: {
    minWidth: 110,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  card_upcoming: {
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  card_active: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  card_completed: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusIcon: {
    fontSize: 11,
    fontWeight: '700',
  },
  icon_upcoming: { color: '#9ca3af' },
  icon_active: { color: '#6366f1' },
  icon_completed: { color: '#16a34a' },
  phaseName: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  name_upcoming: { color: '#6b7280' },
  name_active: { color: '#4338ca' },
  name_completed: { color: '#15803d' },
  dateRange: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 3,
  },
  addCard: {
    minWidth: 76,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
  },
});
