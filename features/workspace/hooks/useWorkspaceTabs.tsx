import { useEffect } from 'react';
import { View, Platform } from 'react-native';
import { styles } from '../styles';
import type { PreferencesState } from './usePreferences';
import type { WorkspaceViewsState } from './useWorkspaceViews';
import type { AuthState } from './useAuth';
import type { PresenceState } from './usePresence';
import type { ProjectsState } from './useProjects';

type WorkspaceTabsDeps = Pick<
    PreferencesState,
    | 'width'
  > &
  Pick<
    WorkspaceViewsState,
    | 'calendarViewOpen'
    | 'dashboardViewOpen'
    | 'notesViewOpen'
    | 'projectsViewOpen'
    | 'resourcesViewOpen'
    | 'teamsViewOpen'
  > &
  Pick<
    AuthState,
    | 'session'
  > &
  Pick<
    PresenceState,
    | 'browserShown'
    | 'setWorkspaceActiveSeconds'
  > &
  Pick<
    ProjectsState,
    | 'isPersonal'
    | 'isProject'
  >;

export function useWorkspaceTabs({
  width,
  calendarViewOpen,
  dashboardViewOpen,
  notesViewOpen,
  projectsViewOpen,
  resourcesViewOpen,
  teamsViewOpen,
  session,
  browserShown,
  setWorkspaceActiveSeconds,
  isPersonal,
  isProject,
}: WorkspaceTabsDeps) {
  const workspaceTabActive = isPersonal && !teamsViewOpen;
  const projectsTabActive = (isProject || projectsViewOpen) && !teamsViewOpen;
  const notesTabActive = notesViewOpen;
  const calendarTabActive = calendarViewOpen;
  const resourcesTabActive = resourcesViewOpen;
  const dashboardTabActive = dashboardViewOpen;
  const peopleTabActive = teamsViewOpen;
  const showHeaderMessageBoard = Platform.OS === 'web' && width >= 980;
  const renderWorkspaceTabDivider = (active: boolean, nextActive: boolean, isLast = false) => (
    !active && !nextActive && !isLast ? <View pointerEvents="none" style={styles.workspaceTabDivider} /> : null
  );
  const showInboxSidePanel = Platform.OS === 'web' && width >= 900 && isPersonal;

  useEffect(() => {
    if (!session || !workspaceTabActive || !browserShown) return undefined;
    const id = setInterval(() => setWorkspaceActiveSeconds((seconds) => seconds + 1), 1000);
    return () => clearInterval(id);
  }, [browserShown, session, workspaceTabActive, setWorkspaceActiveSeconds]);

  return {
    workspaceTabActive,
    projectsTabActive,
    notesTabActive,
    calendarTabActive,
    resourcesTabActive,
    dashboardTabActive,
    peopleTabActive,
    showHeaderMessageBoard,
    renderWorkspaceTabDivider,
    showInboxSidePanel,
  };
}

export type WorkspaceTabsState = ReturnType<typeof useWorkspaceTabs>;
