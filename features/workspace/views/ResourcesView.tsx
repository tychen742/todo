import { View, Text, ScrollView } from 'react-native';
import { profileDisplayName } from '../../../lib/display';
import { styles } from '../styles';
import type { SignedInWorkspaceScreen } from '../useWorkspaceScreen';

type ResourcesViewProps = Pick<
  SignedInWorkspaceScreen,
  | 'session'
  | 'resourcesViewOpen'
  | 'assignedToMe'
  | 'members'
  | 'todos'
  | 'accountDisplayName'
>;

export function ResourcesView({
  session,
  resourcesViewOpen,
  assignedToMe,
  members,
  todos,
  accountDisplayName,
}: ResourcesViewProps) {
  return (
    <>
      {resourcesViewOpen && (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const allTodos = [...todos, ...assignedToMe];
        // Build per-member workload from all loaded todos
        const memberRows = members.map((m) => {
          const mine = allTodos.filter((t) => t.assigned_to === m.user_id && !t.done);
          const overdue = mine.filter((t) => {
            if (!t.due_date) return false;
            const [y, mo, d] = t.due_date.split('-').map(Number);
            return new Date(y, mo - 1, d) < today;
          });
          const dueToday = mine.filter((t) => {
            if (!t.due_date) return false;
            const [y, mo, d] = t.due_date.split('-').map(Number);
            const due = new Date(y, mo - 1, d);
            return due.getTime() === today.getTime();
          });
          const urgent = mine.filter((t) => t.priority === 'urgent');
          return { member: m, active: mine.length, overdue: overdue.length, dueToday: dueToday.length, urgent: urgent.length };
        });
        const myId = session?.user.id;
        const myActive = allTodos.filter((t) => t.created_by === myId && !t.done);
        const myOverdue = myActive.filter((t) => {
          if (!t.due_date) return false;
          const [y, mo, d] = t.due_date.split('-').map(Number);
          return new Date(y, mo - 1, d) < today;
        });
        const myDueToday = myActive.filter((t) => {
          if (!t.due_date) return false;
          const [y, mo, d] = t.due_date.split('-').map(Number);
          return new Date(y, mo - 1, d).getTime() === today.getTime();
        });
        return (
          <ScrollView style={styles.resourcesView} contentContainerStyle={styles.resourcesContent}>
            <View style={styles.resourcesHeader}>
              <Text style={styles.resourcesTitle}>Resources</Text>
              <Text style={styles.resourcesSubtitle}>Workload overview — active assigned tasks per person</Text>
            </View>

            {/* Personal row */}
            <View style={styles.resourceCard}>
              <View style={styles.resourceCardHeader}>
                <Text style={styles.resourceCardName}>{accountDisplayName}</Text>
                <Text style={styles.resourceCardMeta}>You</Text>
              </View>
              <View style={styles.resourceStats}>
                <View style={styles.resourceStat}>
                  <Text style={styles.resourceStatValue}>{myActive.length}</Text>
                  <Text style={styles.resourceStatLabel}>Active</Text>
                </View>
                <View style={[styles.resourceStat, myOverdue.length > 0 && styles.resourceStatDanger]}>
                  <Text style={[styles.resourceStatValue, myOverdue.length > 0 && styles.resourceStatValueDanger]}>{myOverdue.length}</Text>
                  <Text style={styles.resourceStatLabel}>Overdue</Text>
                </View>
                <View style={styles.resourceStat}>
                  <Text style={styles.resourceStatValue}>{myDueToday.length}</Text>
                  <Text style={styles.resourceStatLabel}>Due today</Text>
                </View>
              </View>
            </View>

            {memberRows.length > 0 && (
              <>
                <Text style={styles.resourcesSectionLabel}>Team Members</Text>
                {memberRows.map(({ member, active: act, overdue: ov, dueToday: dt, urgent: urg }) => (
                  <View key={member.user_id} style={styles.resourceCard}>
                    <View style={styles.resourceCardHeader}>
                      <Text style={styles.resourceCardName}>{profileDisplayName(member)}</Text>
                      <Text style={styles.resourceCardMeta}>{member.role}</Text>
                    </View>
                    <View style={styles.resourceStats}>
                      <View style={styles.resourceStat}>
                        <Text style={styles.resourceStatValue}>{act}</Text>
                        <Text style={styles.resourceStatLabel}>Active</Text>
                      </View>
                      <View style={[styles.resourceStat, ov > 0 && styles.resourceStatDanger]}>
                        <Text style={[styles.resourceStatValue, ov > 0 && styles.resourceStatValueDanger]}>{ov}</Text>
                        <Text style={styles.resourceStatLabel}>Overdue</Text>
                      </View>
                      <View style={styles.resourceStat}>
                        <Text style={styles.resourceStatValue}>{dt}</Text>
                        <Text style={styles.resourceStatLabel}>Due today</Text>
                      </View>
                      <View style={[styles.resourceStat, urg > 0 && styles.resourceStatUrgent]}>
                        <Text style={[styles.resourceStatValue, urg > 0 && styles.resourceStatValueUrgent]}>{urg}</Text>
                        <Text style={styles.resourceStatLabel}>Urgent</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </>
            )}

            {memberRows.length === 0 && (
              <View style={styles.resourcesEmpty}>
                <Text style={styles.resourcesEmptyText}>No team selected. Open a team workspace to see member workloads.</Text>
              </View>
            )}
          </ScrollView>
        );
      })()}
    </>
  );
}
