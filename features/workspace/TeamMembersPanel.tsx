import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { profileDisplayName } from '../../lib/display';
import { styles } from './styles';
import type { SignedInWorkspaceScreen } from './useWorkspaceScreen';

type TeamMembersPanelProps = Pick<
  SignedInWorkspaceScreen,
  | 'projectsViewOpen'
  | 'teamsViewOpen'
  | 'notesViewOpen'
  | 'calendarViewOpen'
  | 'resourcesViewOpen'
  | 'dashboardViewOpen'
  | 'memberEmail'
  | 'setMemberEmail'
  | 'members'
  | 'setRenamingTeam'
  | 'setRenameTeamName'
  | 'selectedTeam'
  | 'currentTeamRole'
  | 'addMember'
>;

export function TeamMembersPanel({
  projectsViewOpen,
  teamsViewOpen,
  notesViewOpen,
  calendarViewOpen,
  resourcesViewOpen,
  dashboardViewOpen,
  memberEmail,
  setMemberEmail,
  members,
  setRenamingTeam,
  setRenameTeamName,
  selectedTeam,
  currentTeamRole,
  addMember,
}: TeamMembersPanelProps) {
  return (
    <>
      {!projectsViewOpen && !teamsViewOpen && !notesViewOpen && !calendarViewOpen && !resourcesViewOpen && !dashboardViewOpen && selectedTeam && (
        <View style={styles.memberPanel}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.panelTitle}>{selectedTeam.name}</Text>
            {currentTeamRole && ['owner', 'admin'].includes(currentTeamRole) && (
              <Pressable onPress={() => { setRenamingTeam(selectedTeam); setRenameTeamName(selectedTeam.name); }} hitSlop={8}>
                <Text style={{ fontSize: 12, color: '#6366f1', fontWeight: '600' }}>Rename</Text>
              </Pressable>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberList}>
            {members.map((member) => (
              <Text key={member.user_id} style={styles.memberChip}>
                {profileDisplayName(member)}
              </Text>
            ))}
          </ScrollView>
          <View style={styles.compactForm}>
            <TextInput
              style={styles.compactInput}
              value={memberEmail}
              onChangeText={setMemberEmail}
              placeholder="Add member by email"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              keyboardType="email-address"
              onSubmitEditing={addMember}
            />
            <Pressable
              onPress={addMember}
              style={({ pressed }) => [styles.smallBtn, pressed && styles.btnPressed]}
            >
              <Text style={styles.smallBtnText}>Add</Text>
            </Pressable>
          </View>
        </View>
      )}
    </>
  );
}
