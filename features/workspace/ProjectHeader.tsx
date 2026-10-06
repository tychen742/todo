import { View, Text, Pressable, ScrollView } from 'react-native';
import { pickAvatarColor } from '../../lib/avatar';
import type { ProjectViewMode } from '../../lib/types';
import { profileDisplayName } from '../../lib/display';
import { InboxAssignerAvatar } from './InboxAssignerAvatar';
import { styles } from './styles';
import type { SignedInWorkspaceScreen } from './useWorkspaceScreen';

type ProjectHeaderProps = Pick<
  SignedInWorkspaceScreen,
  | 'setSelectedTeamId'
  | 'projects'
  | 'selectedProjectId'
  | 'setSelectedProjectId'
  | 'setLastSelectedProjectId'
  | 'projectViewMode'
  | 'setProjectViewMode'
  | 'projectsViewOpen'
  | 'teamsViewOpen'
  | 'notesViewOpen'
  | 'calendarViewOpen'
  | 'resourcesViewOpen'
  | 'dashboardViewOpen'
  | 'isProject'
  | 'projectAvatarFor'
  | 'selectedProjectOwner'
  | 'projectMemberAvatars'
  | 'nextMilestone'
  | 'openProjectAccessModal'
  | 'openCreateTarget'
>;

export function ProjectHeader({
  setSelectedTeamId,
  projects,
  selectedProjectId,
  setSelectedProjectId,
  setLastSelectedProjectId,
  projectViewMode,
  setProjectViewMode,
  projectsViewOpen,
  teamsViewOpen,
  notesViewOpen,
  calendarViewOpen,
  resourcesViewOpen,
  dashboardViewOpen,
  isProject,
  projectAvatarFor,
  selectedProjectOwner,
  projectMemberAvatars,
  nextMilestone,
  openProjectAccessModal,
  openCreateTarget,
}: ProjectHeaderProps) {
  return (
    <>
      {!projectsViewOpen && !teamsViewOpen && !notesViewOpen && !calendarViewOpen && !resourcesViewOpen && !dashboardViewOpen && isProject && nextMilestone && (
        <View style={[styles.milestoneBanner, nextMilestone.daysLeft < 0 && styles.milestoneBannerOverdue]}>
          <Text style={styles.milestoneBannerText}>
            ◆ {nextMilestone.text}
            {nextMilestone.daysLeft === 0
              ? ' — due today'
              : nextMilestone.daysLeft > 0
                ? ` — ${nextMilestone.daysLeft}d away`
                : ` — ${-nextMilestone.daysLeft}d overdue`}
          </Text>
        </View>
      )}

      {!projectsViewOpen && !teamsViewOpen && !notesViewOpen && !calendarViewOpen && !resourcesViewOpen && !dashboardViewOpen && isProject && (
        <View style={styles.projectSwitchBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.projectSwitchList}
            style={styles.projectSwitchScroll}
          >
            {projects.map((project) => {
              const avatar = projectAvatarFor(project);
              return (
                <Pressable
                  key={project.id}
                  onPress={() => {
                    setSelectedProjectId(project.id);
                    setLastSelectedProjectId(project.id);
                    setSelectedTeamId(null);
                  }}
                  style={[
                    styles.projectSwitchButton,
                    selectedProjectId === project.id && styles.projectSwitchButtonActive,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Open project ${project.name}`}
                >
                  <View style={[styles.projectSwitchAvatar, { backgroundColor: avatar.color }]}>
                    <Text style={styles.projectSwitchAvatarText}>{avatar.initials}</Text>
                  </View>
                  <Text
                    style={[
                      styles.projectSwitchButtonText,
                      selectedProjectId === project.id && styles.projectSwitchButtonTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {project.name}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => openCreateTarget('project')}
              style={styles.projectSwitchAddButton}
              accessibilityRole="button"
              accessibilityLabel="Create project"
            >
              <Text style={styles.projectSwitchAddButtonText}>+</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}


      {!projectsViewOpen && !teamsViewOpen && !notesViewOpen && !calendarViewOpen && !resourcesViewOpen && !dashboardViewOpen && isProject && (
        <View style={styles.projectViewModeBar}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {(['plan', 'kanban'] as ProjectViewMode[]).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => setProjectViewMode(mode)}
                style={[
                  styles.projectViewModeButton,
                  projectViewMode === mode && styles.projectViewModeButtonActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Show ${mode} view`}
              >
                <Text
                  style={[
                    styles.projectViewModeButtonText,
                    projectViewMode === mode && styles.projectViewModeButtonTextActive,
                  ]}
                >
                  {mode === 'plan' ? 'Plan' : 'Kanban'}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.projectViewModeMeta}>
            {selectedProjectOwner && (
              <View style={styles.projectOwnerBadge}>
                <View style={styles.projectOwnerAvatarRing}>
                  <InboxAssignerAvatar
                    initials={(profileDisplayName(selectedProjectOwner)[0] ?? '?').toUpperCase()}
                    color={pickAvatarColor(selectedProjectOwner.email)}
                    tooltip="Owner"
                  />
                </View>
                <View style={styles.projectOwnerBadgeText}>
                  <Text style={styles.projectOwnerBadgeName} numberOfLines={1}>
                    {profileDisplayName(selectedProjectOwner)}
                  </Text>
                </View>
              </View>
            )}
            <Pressable
              onPress={openProjectAccessModal}
              style={styles.projectOwnerAddButton}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Add members or team to project"
            >
              <Text style={styles.projectOwnerAddButtonText}>+</Text>
            </Pressable>
            {projectMemberAvatars.length > 0 && (
              <View style={styles.projectMemberAvatarRow}>
                {projectMemberAvatars.map((m) => {
                  const name = profileDisplayName(m);
                  const initials = (name[0] ?? '?').toUpperCase();
                  const color = pickAvatarColor(m.email);
                  return (
                    <InboxAssignerAvatar
                      key={m.user_id}
                      initials={initials}
                      color={color}
                      tooltip={name}
                    />
                  );
                })}
              </View>
            )}
          </View>
        </View>
      )}
    </>
  );
}
