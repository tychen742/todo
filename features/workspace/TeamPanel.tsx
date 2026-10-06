import { View, Text, Pressable, ScrollView } from 'react-native';
import { styles } from './styles';
import type { SignedInWorkspaceScreen } from './useWorkspaceScreen';

type TeamPanelProps = Pick<
  SignedInWorkspaceScreen,
  | 'setSelectedTeamId'
  | 'projects'
  | 'setSelectedProjectId'
  | 'lastSelectedProjectId'
  | 'setProjectsViewOpen'
  | 'setTeamsViewOpen'
  | 'setNotesViewOpen'
  | 'setCalendarViewOpen'
  | 'setResourcesViewOpen'
  | 'setDashboardViewOpen'
  | 'workspaceTabActive'
  | 'projectsTabActive'
  | 'notesTabActive'
  | 'calendarTabActive'
  | 'resourcesTabActive'
  | 'dashboardTabActive'
  | 'peopleTabActive'
  | 'renderWorkspaceTabDivider'
>;

export function TeamPanel({
  setSelectedTeamId,
  projects,
  setSelectedProjectId,
  lastSelectedProjectId,
  setProjectsViewOpen,
  setTeamsViewOpen,
  setNotesViewOpen,
  setCalendarViewOpen,
  setResourcesViewOpen,
  setDashboardViewOpen,
  workspaceTabActive,
  projectsTabActive,
  notesTabActive,
  calendarTabActive,
  resourcesTabActive,
  dashboardTabActive,
  peopleTabActive,
  renderWorkspaceTabDivider,
}: TeamPanelProps) {
  return (
    <>
      <View style={styles.teamPanel}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.workspaceTabs}
          style={styles.workspaceTabsScroll}
        >
          <Pressable
            onPress={() => {
              setSelectedTeamId(null);
              setSelectedProjectId(null);
              setProjectsViewOpen(false);
              setTeamsViewOpen(false);
              setNotesViewOpen(false);
              setCalendarViewOpen(false);
              setResourcesViewOpen(false);
              setDashboardViewOpen(false);
            }}
            style={[styles.workspaceTab, styles.workspaceTabFirst, workspaceTabActive && styles.workspaceTabActive]}
          >
            <Text style={[styles.workspaceTabText, workspaceTabActive && styles.workspaceTabTextActive]}>
              Workspace
            </Text>
            {renderWorkspaceTabDivider(workspaceTabActive, projectsTabActive)}
          </Pressable>

          <Pressable
            onPress={() => {
              const rememberedProject = projects.find((project) => project.id === lastSelectedProjectId) ?? projects[0] ?? null;
              setSelectedTeamId(null);
              setSelectedProjectId(rememberedProject?.id ?? null);
              setProjectsViewOpen(!rememberedProject);
              setTeamsViewOpen(false);
              setNotesViewOpen(false);
              setCalendarViewOpen(false);
              setResourcesViewOpen(false);
              setDashboardViewOpen(false);
            }}
            style={[styles.workspaceTab, styles.workspaceTabJoined, projectsTabActive && styles.workspaceTabActive]}
          >
            <Text style={[styles.workspaceTabText, projectsTabActive && styles.workspaceTabTextActive]}>
              Projects
            </Text>
            {renderWorkspaceTabDivider(projectsTabActive, notesTabActive)}
          </Pressable>

          <Pressable
            onPress={() => {
              setSelectedTeamId(null);
              setSelectedProjectId(null);
              setProjectsViewOpen(false);
              setTeamsViewOpen(false);
              setNotesViewOpen(true);
              setCalendarViewOpen(false);
              setResourcesViewOpen(false);
              setDashboardViewOpen(false);
            }}
            style={[styles.workspaceTab, styles.workspaceTabJoined, notesTabActive && styles.workspaceTabActive]}
          >
            <Text style={[styles.workspaceTabText, notesTabActive && styles.workspaceTabTextActive]}>
              Maps
            </Text>
            {renderWorkspaceTabDivider(notesTabActive, calendarTabActive)}
          </Pressable>

          <Pressable
            onPress={() => {
              setSelectedTeamId(null);
              setSelectedProjectId(null);
              setProjectsViewOpen(false);
              setTeamsViewOpen(false);
              setNotesViewOpen(false);
              setCalendarViewOpen(true);
              setResourcesViewOpen(false);
              setDashboardViewOpen(false);
            }}
            style={[styles.workspaceTab, styles.workspaceTabJoined, calendarTabActive && styles.workspaceTabActive]}
          >
            <Text style={[styles.workspaceTabText, calendarTabActive && styles.workspaceTabTextActive]}>
              Calendar
            </Text>
            {renderWorkspaceTabDivider(calendarTabActive, resourcesTabActive)}
          </Pressable>

          <Pressable
            onPress={() => {
              setSelectedTeamId(null);
              setSelectedProjectId(null);
              setProjectsViewOpen(false);
              setTeamsViewOpen(false);
              setNotesViewOpen(false);
              setCalendarViewOpen(false);
              setResourcesViewOpen(true);
              setDashboardViewOpen(false);
            }}
            style={[styles.workspaceTab, styles.workspaceTabJoined, resourcesTabActive && styles.workspaceTabActive]}
          >
            <Text style={[styles.workspaceTabText, resourcesTabActive && styles.workspaceTabTextActive]}>
              Resources
            </Text>
            {renderWorkspaceTabDivider(resourcesTabActive, dashboardTabActive)}
          </Pressable>

          <Pressable
            onPress={() => {
              setSelectedTeamId(null);
              setSelectedProjectId(null);
              setProjectsViewOpen(false);
              setTeamsViewOpen(false);
              setNotesViewOpen(false);
              setCalendarViewOpen(false);
              setResourcesViewOpen(false);
              setDashboardViewOpen(true);
            }}
            style={[styles.workspaceTab, styles.workspaceTabJoined, dashboardTabActive && styles.workspaceTabActive]}
          >
            <Text style={[styles.workspaceTabText, dashboardTabActive && styles.workspaceTabTextActive]}>
              Dashboard
            </Text>
            {renderWorkspaceTabDivider(dashboardTabActive, peopleTabActive)}
          </Pressable>

          <Pressable
            onPress={() => {
              setProjectsViewOpen(false);
              setNotesViewOpen(false);
              setCalendarViewOpen(false);
              setResourcesViewOpen(false);
              setDashboardViewOpen(false);
              setTeamsViewOpen((v) => !v);
            }}
            style={[styles.workspaceTab, styles.workspaceTabJoined, styles.workspaceTabLast, peopleTabActive && styles.workspaceTabActive]}
          >
            <Text style={[styles.workspaceTabText, peopleTabActive && styles.workspaceTabTextActive]}>People</Text>
            {renderWorkspaceTabDivider(peopleTabActive, false, true)}
          </Pressable>

        </ScrollView>
      </View>
    </>
  );
}
