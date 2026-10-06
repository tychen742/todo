import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { styles } from '../features/workspace/styles';
import {
  useWorkspaceScreen,
  type SignedInWorkspaceScreen,
} from '../features/workspace/useWorkspaceScreen';
import { TitleBar } from '../features/workspace/TitleBar';
import { TeamPanel } from '../features/workspace/TeamPanel';
import { OrganizationsView } from '../features/workspace/views/OrganizationsView';
import { ProjectsView } from '../features/workspace/views/ProjectsView';
import { CalendarView } from '../features/workspace/views/CalendarView';
import { ResourcesView } from '../features/workspace/views/ResourcesView';
import { DashboardView } from '../features/workspace/views/DashboardView';
import { TeamMembersPanel } from '../features/workspace/TeamMembersPanel';
import { ProjectHeader } from '../features/workspace/ProjectHeader';
import { WorkspaceBoard } from '../features/workspace/WorkspaceBoard';
import {
  PriorityPickerModal,
  StatusPickerModal,
  ProjectFilterModal,
  AssignScheduleModal,
  DueDateModal,
  EditTodoModal,
  ProjectPickerModal,
  PhasePickerModal,
} from '../features/workspace/modals/TodoModals';
import {
  AccountMenuModal,
  AvatarPickerModal,
  AboutModal,
  DisplayNameModal,
  DeleteAccountModal,
} from '../features/workspace/modals/AccountModals';
import {
  CreateProjectModal,
  ProjectAccessModal,
  ColumnSettingsModal,
  RenameWorkflowLaneModal,
  AddPhaseModal,
  RenameProjectModal,
} from '../features/workspace/modals/ProjectModals';
import {
  OrgMemberModal,
  OrganizationModal,
  CreateOrganizationModal,
  CreateTeamModal,
  RenameTeamModal,
  RenameOrganizationModal,
} from '../features/workspace/modals/OrganizationModals';
import { PasswordRecoveryScreen } from '../features/workspace/auth/PasswordRecoveryScreen';
import { AuthScreen } from '../features/workspace/auth/AuthScreen';
if (Platform.OS === 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

export default function HomeScreen() {
  const screen = useWorkspaceScreen();
  const {
    session,
    authInitialized,
    passwordRecovery,
    notesViewOpen,
    toast,
    mindmapNodeUndo,
    hasLoadedCurrentTodos,
    undoMindmapNodeDelete,
    renderWorkspaceNotesPanel,
  } = screen;

  if (passwordRecovery) {
    return <PasswordRecoveryScreen {...screen} />;
  }

  if (!authInitialized) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style="dark" />
      </View>
    );
  }

  if (session && !hasLoadedCurrentTodos) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style="dark" />
      </View>
    );
  }

  if (!session) {
    return <AuthScreen {...screen} />;
  }

  const signedIn: SignedInWorkspaceScreen = { ...screen, session };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      <TitleBar {...signedIn} />

      <TeamPanel {...signedIn} />

      {/* Organizations with team tabs */}
      <OrganizationsView {...signedIn} />

      <ProjectsView {...signedIn} />

      {notesViewOpen && (
        <ScrollView style={styles.inboxView} contentContainerStyle={styles.inboxViewContent}>
          {renderWorkspaceNotesPanel('full')}
        </ScrollView>
      )}

      <CalendarView {...signedIn} />

      <ResourcesView {...signedIn} />

      <DashboardView {...signedIn} />

      <TeamMembersPanel {...signedIn} />

      <ProjectHeader {...signedIn} />

      <WorkspaceBoard {...signedIn} />

      {!!toast && (
        <View pointerEvents={mindmapNodeUndo ? 'box-none' : 'none'} style={[styles.toast, styles.toastRow]}>
          <Text style={styles.toastText}>{toast}</Text>
          {mindmapNodeUndo ? (
            <Pressable onPress={undoMindmapNodeDelete} hitSlop={8} accessibilityRole="button" accessibilityLabel="Undo node deletion">
              <Text style={styles.toastActionText}>Undo</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      <PriorityPickerModal {...signedIn} />
      <StatusPickerModal {...signedIn} />
      <ProjectFilterModal {...signedIn} />
      <AssignScheduleModal {...signedIn} />
      <DueDateModal {...signedIn} />
      <AccountMenuModal {...signedIn} />
      <CreateProjectModal {...signedIn} />
      <OrgMemberModal {...signedIn} />
      <OrganizationModal {...signedIn} />
      <ProjectAccessModal {...signedIn} />
      <CreateOrganizationModal {...signedIn} />
      <CreateTeamModal {...signedIn} />
      <EditTodoModal {...signedIn} />
      <ProjectPickerModal {...signedIn} />
      <PhasePickerModal {...signedIn} />
      <ColumnSettingsModal {...signedIn} />
      <RenameWorkflowLaneModal {...signedIn} />
      <AddPhaseModal {...signedIn} />
      <AvatarPickerModal {...signedIn} />
      <AboutModal {...signedIn} />
      <DisplayNameModal {...signedIn} />
      <DeleteAccountModal {...signedIn} />
      <RenameTeamModal {...signedIn} />
      <RenameOrganizationModal {...signedIn} />
      <RenameProjectModal {...signedIn} />
    </KeyboardAvoidingView>
  );
}
