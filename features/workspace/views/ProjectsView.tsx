import { View, Text, Pressable, ScrollView } from 'react-native';
import { styles } from '../styles';
import type { SignedInWorkspaceScreen } from '../useWorkspaceScreen';

type ProjectsViewProps = Pick<
  SignedInWorkspaceScreen,
  | 'teams'
  | 'setSelectedTeamId'
  | 'setSelectedProjectId'
  | 'setLastSelectedProjectId'
  | 'projectsViewOpen'
  | 'setProjectsViewOpen'
  | 'setTeamsViewOpen'
  | 'setNotesViewOpen'
  | 'setCalendarViewOpen'
  | 'setRenamingProject'
  | 'setRenameProjectName'
  | 'projectAvatarFor'
  | 'searching'
  | 'searchMatchesProject'
  | 'orderedActiveProjects'
  | 'openCreateTarget'
>;

export function ProjectsView({
  teams,
  setSelectedTeamId,
  setSelectedProjectId,
  setLastSelectedProjectId,
  projectsViewOpen,
  setProjectsViewOpen,
  setTeamsViewOpen,
  setNotesViewOpen,
  setCalendarViewOpen,
  setRenamingProject,
  setRenameProjectName,
  projectAvatarFor,
  searching,
  searchMatchesProject,
  orderedActiveProjects,
  openCreateTarget,
}: ProjectsViewProps) {
  return (
    <>
      {projectsViewOpen && (
        <ScrollView style={styles.projectsGrid} contentContainerStyle={styles.projectsGridContent}>
          {orderedActiveProjects.map((project) => {
            const linkedTeam = project.team_id ? teams.find((t) => t.id === project.team_id) : null;
            const avatar = projectAvatarFor(project);
            const isSearchDimmed = searching && !searchMatchesProject(project);
            return (
              <View key={project.id} style={[styles.projectCard, isSearchDimmed && styles.searchResultDimmed]}>
                <Pressable
                  onPress={() => {
                    setSelectedProjectId(project.id);
                    setLastSelectedProjectId(project.id);
                    setSelectedTeamId(null);
                    setProjectsViewOpen(false);
                    setTeamsViewOpen(false);
                    setNotesViewOpen(false);
                    setCalendarViewOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Open project ${project.name}`}
                >
                  <View style={styles.projectCardHeader}>
                    <View style={[styles.projectCardAvatar, { backgroundColor: avatar.color }]}>
                      <Text style={styles.projectCardAvatarText}>{avatar.initials}</Text>
                    </View>
                    <Text style={styles.projectCardName} numberOfLines={1}>{project.name}</Text>
                  </View>
                  <Text style={styles.projectCardMeta} numberOfLines={1}>
                    {linkedTeam ? linkedTeam.name : 'No team linked'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => { setRenamingProject(project); setRenameProjectName(project.name); }}
                  style={{ marginTop: 10 }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Rename project ${project.name}`}
                >
                  <Text style={{ fontSize: 11, color: '#6366f1', fontWeight: '600' }}>Rename</Text>
                </Pressable>
              </View>
            );
          })}
          <Pressable
            onPress={() => { setTeamsViewOpen(false); setNotesViewOpen(false); setCalendarViewOpen(false); openCreateTarget('project'); }}
            style={styles.projectCardNew}
            accessibilityRole="button"
            accessibilityLabel="Create project"
          >
            <Text style={styles.projectCardNewIcon}>+</Text>
            <Text style={styles.projectCardNewText}>New Project</Text>
          </Pressable>
        </ScrollView>
      )}
    </>
  );
}
