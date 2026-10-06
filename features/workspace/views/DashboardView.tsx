import { View, Text, Pressable, ScrollView } from 'react-native';
import { profileDisplayName } from '../../../lib/display';
import { styles } from '../styles';
import type { SignedInWorkspaceScreen } from '../useWorkspaceScreen';

type DashboardViewProps = Pick<
  SignedInWorkspaceScreen,
  | 'now'
  | 'dashboardViewOpen'
  | 'assignedToMe'
  | 'members'
  | 'todos'
  | 'openEditModal'
>;

export function DashboardView({
  now,
  dashboardViewOpen,
  assignedToMe,
  members,
  todos,
  openEditModal,
}: DashboardViewProps) {
  return (
    <>
      {dashboardViewOpen && (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekEnd = new Date(today);
        weekEnd.setDate(today.getDate() + 7);
        const allTodos = [...todos, ...assignedToMe];
        const activeTodos = allTodos.filter((t) => !t.done);
        const overdueTodos = activeTodos.filter((t) => {
          if (!t.due_date) return false;
          const [y, mo, d] = t.due_date.split('-').map(Number);
          return new Date(y, mo - 1, d) < today;
        });
        const dueTodayTodos = activeTodos.filter((t) => {
          if (!t.due_date) return false;
          const [y, mo, d] = t.due_date.split('-').map(Number);
          return new Date(y, mo - 1, d).getTime() === today.getTime();
        });
        const dueThisWeekTodos = activeTodos.filter((t) => {
          if (!t.due_date) return false;
          const [y, mo, d] = t.due_date.split('-').map(Number);
          const due = new Date(y, mo - 1, d);
          return due > today && due <= weekEnd;
        });
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        const completedThisWeek = allTodos.filter((t) => {
          if (!t.done || !t.completed_at) return false;
          return new Date(t.completed_at) >= weekStart;
        });
        const urgentTodos = activeTodos.filter((t) => t.priority === 'urgent');

        const statCards = [
          { label: 'Active', value: activeTodos.length, color: '#6366f1', bg: '#eef2ff' },
          { label: 'Overdue', value: overdueTodos.length, color: overdueTodos.length > 0 ? '#dc2626' : '#6b7280', bg: overdueTodos.length > 0 ? '#fef2f2' : '#f3f4f6' },
          { label: 'Due Today', value: dueTodayTodos.length, color: dueTodayTodos.length > 0 ? '#d97706' : '#6b7280', bg: dueTodayTodos.length > 0 ? '#fef3c7' : '#f3f4f6' },
          { label: 'Due This Week', value: dueThisWeekTodos.length, color: '#4338ca', bg: '#eef2ff' },
          { label: 'Done This Week', value: completedThisWeek.length, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Urgent', value: urgentTodos.length, color: urgentTodos.length > 0 ? '#ef4444' : '#6b7280', bg: urgentTodos.length > 0 ? '#fef2f2' : '#f3f4f6' },
        ];
        return (
          <ScrollView style={styles.dashboardView} contentContainerStyle={styles.dashboardContent}>
            <View style={styles.dashboardHeader}>
              <Text style={styles.dashboardTitle}>Dashboard</Text>
              <Text style={styles.dashboardSubtitle}>
                {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>

            <View style={styles.dashboardStatGrid}>
              {statCards.map((card) => (
                <View key={card.label} style={[styles.dashboardStatCard, { backgroundColor: card.bg }]}>
                  <Text style={[styles.dashboardStatValue, { color: card.color }]}>{card.value}</Text>
                  <Text style={styles.dashboardStatLabel}>{card.label}</Text>
                </View>
              ))}
            </View>

            {members.length > 0 && (
              <>
                <Text style={styles.dashboardSectionTitle}>Team Workload</Text>
                <View style={styles.dashboardMemberGrid}>
                  {members.map((m) => {
                    const mActive = allTodos.filter((t) => t.assigned_to === m.user_id && !t.done).length;
                    const mOverdue = allTodos.filter((t) => {
                      if (t.assigned_to !== m.user_id || t.done || !t.due_date) return false;
                      const [y, mo, d] = t.due_date.split('-').map(Number);
                      return new Date(y, mo - 1, d) < today;
                    }).length;
                    return (
                      <View key={m.user_id} style={styles.dashboardMemberCard}>
                        <Text style={styles.dashboardMemberName} numberOfLines={1}>{profileDisplayName(m)}</Text>
                        <Text style={styles.dashboardMemberStats}>
                          {mActive} active{mOverdue > 0 ? ` · ${mOverdue} overdue` : ''}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {overdueTodos.length > 0 && (
              <>
                <Text style={styles.dashboardSectionTitle}>Overdue</Text>
                {overdueTodos.slice(0, 5).map((todo) => (
                  <Pressable key={todo.id} onPress={() => openEditModal(todo)} style={styles.dashboardTodoRow}>
                    <View style={[styles.dashboardTodoPriority, { backgroundColor: todo.priority === 'urgent' ? '#ef4444' : todo.priority === 'high' ? '#f59e0b' : '#9ca3af' }]} />
                    <Text style={styles.dashboardTodoText} numberOfLines={1}>{todo.text}</Text>
                    {todo.due_date && <Text style={styles.dashboardTodoDue}>{todo.due_date}</Text>}
                  </Pressable>
                ))}
                {overdueTodos.length > 5 && <Text style={styles.dashboardMoreText}>+{overdueTodos.length - 5} more</Text>}
              </>
            )}

            {dueTodayTodos.length > 0 && (
              <>
                <Text style={styles.dashboardSectionTitle}>Due Today</Text>
                {dueTodayTodos.map((todo) => (
                  <Pressable key={todo.id} onPress={() => openEditModal(todo)} style={styles.dashboardTodoRow}>
                    <View style={[styles.dashboardTodoPriority, { backgroundColor: todo.priority === 'urgent' ? '#ef4444' : todo.priority === 'high' ? '#f59e0b' : '#60a5fa' }]} />
                    <Text style={styles.dashboardTodoText} numberOfLines={1}>{todo.text}</Text>
                  </Pressable>
                ))}
              </>
            )}
          </ScrollView>
        );
      })()}
    </>
  );
}
