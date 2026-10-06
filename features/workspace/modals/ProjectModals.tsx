import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Modal } from 'react-native';
import { pickAvatarColor } from '../../../lib/avatar';
import { profileDisplayName } from '../../../lib/display';
import { styles } from '../styles';
import type { SignedInWorkspaceScreen } from '../useWorkspaceScreen';

type CreateProjectModalProps = Pick<
  SignedInWorkspaceScreen,
  | 'teams'
  | 'createTarget'
  | 'setCreateTarget'
  | 'projectName'
  | 'setProjectName'
  | 'newProjectTeamId'
  | 'setNewProjectTeamId'
  | 'createProject'
>;

export function CreateProjectModal({
  teams,
  createTarget,
  setCreateTarget,
  projectName,
  setProjectName,
  newProjectTeamId,
  setNewProjectTeamId,
  createProject,
}: CreateProjectModalProps) {
  return (
    <>
      <Modal
        visible={createTarget === 'project'}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateTarget(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCreateTarget(null)}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>New Project</Text>
            <TextInput
              style={styles.editModalInput}
              value={projectName}
              onChangeText={setProjectName}
              placeholder="Project name"
              placeholderTextColor="#9ca3af"
              returnKeyType="done"
              autoFocus
              onSubmitEditing={createProject}
            />
            {teams.length > 0 && (
              <>
                <Text style={styles.editModalSectionLabel}>Team (optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <Pressable
                    onPress={() => setNewProjectTeamId(null)}
                    style={[styles.phasePill, !newProjectTeamId && styles.phasePillActive]}
                  >
                    <Text style={[styles.phasePillText, !newProjectTeamId && styles.phasePillTextActive]}>
                      None
                    </Text>
                  </Pressable>
                  {teams.map((team) => (
                    <Pressable
                      key={team.id}
                      onPress={() => setNewProjectTeamId(team.id)}
                      style={[styles.phasePill, newProjectTeamId === team.id && styles.phasePillActive]}
                    >
                      <Text style={[styles.phasePillText, newProjectTeamId === team.id && styles.phasePillTextActive]}>
                        {team.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}
            <View style={styles.editModalActions}>
              <Pressable
                onPress={() => {
                  setCreateTarget(null);
                  setProjectName('');
                  setNewProjectTeamId(null);
                }}
              >
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={createProject}
                style={({ pressed }) => [styles.smallBtn, pressed && styles.btnPressed]}
              >
                <Text style={styles.smallBtnText}>Create</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

type ProjectAccessModalProps = Pick<
  SignedInWorkspaceScreen,
  | 'linkingProjectTeam'
  | 'projectAccessQuery'
  | 'setProjectAccessQuery'
  | 'projectAccessSearchLoading'
  | 'projectAccessBusy'
  | 'error'
  | 'setError'
  | 'selectedProject'
  | 'projectAccessTeams'
  | 'projectAccessPeopleVisible'
  | 'projectAccessInviteEmail'
  | 'linkProjectTeam'
  | 'closeProjectAccessModal'
  | 'addProjectMemberByProfile'
  | 'inviteProjectMemberByEmail'
>;

export function ProjectAccessModal({
  linkingProjectTeam,
  projectAccessQuery,
  setProjectAccessQuery,
  projectAccessSearchLoading,
  projectAccessBusy,
  error,
  setError,
  selectedProject,
  projectAccessTeams,
  projectAccessPeopleVisible,
  projectAccessInviteEmail,
  linkProjectTeam,
  closeProjectAccessModal,
  addProjectMemberByProfile,
  inviteProjectMemberByEmail,
}: ProjectAccessModalProps) {
  return (
    <>
      <Modal
        visible={linkingProjectTeam}
        transparent
        animationType="fade"
        onRequestClose={closeProjectAccessModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeProjectAccessModal}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>Project access</Text>
            <Text style={styles.editModalSectionLabel}>
              Add a team to share its members, or search people and add them directly.
            </Text>

            <TextInput
              style={styles.editModalInput}
              value={projectAccessQuery}
              onChangeText={(v) => { setProjectAccessQuery(v); if (error) setError(''); }}
              placeholder="Search people or teams"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              keyboardType="default"
              returnKeyType="search"
              autoFocus
              onSubmitEditing={() => {
                const value = projectAccessQuery.trim();
                if (!value) return;
                if (projectAccessPeopleVisible.length === 1) {
                  addProjectMemberByProfile(projectAccessPeopleVisible[0]);
                  return;
                }
                if (projectAccessInviteEmail) {
                  inviteProjectMemberByEmail(value);
                }
              }}
            />

            <View style={styles.projectAccessSection}>
              <View style={styles.pickerSectionDivider}>
                <View style={styles.pickerSectionLine} />
                <Text style={styles.pickerSectionLabel}>People</Text>
                <View style={styles.pickerSectionLine} />
              </View>

              {!projectAccessQuery.trim() ? (
                <Text style={styles.editModalSectionLabel}>
                  Type a name or email to search people.
                </Text>
              ) : projectAccessSearchLoading ? (
                <Text style={styles.editModalSectionLabel}>
                  Searching people...
                </Text>
              ) : projectAccessPeopleVisible.length > 0 ? projectAccessPeopleVisible.map((person) => {
                const name = profileDisplayName(person);
                const initials = (name[0] ?? '?').toUpperCase();
                const color = pickAvatarColor(person.email);
                return (
                  <Pressable
                    key={person.id}
                    onPress={() => addProjectMemberByProfile(person)}
                    disabled={projectAccessBusy}
                    style={[styles.teamLinkRow, projectAccessBusy && styles.manageMemberActionDisabled]}
                  >
                    <View style={[styles.teamLinkDot, { backgroundColor: color }]}>
                      <Text style={styles.teamLinkDotText}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.teamLinkRowText} numberOfLines={1}>{name}</Text>
                      <Text style={styles.teamLinkMeta}>{person.email}</Text>
                    </View>
                    <Text style={styles.projectAccessAddGlyph}>+</Text>
                  </Pressable>
                );
              }) : projectAccessInviteEmail ? (
                <Pressable
                  onPress={() => inviteProjectMemberByEmail(projectAccessInviteEmail)}
                  disabled={projectAccessBusy}
                  style={[styles.manageMemberAction, projectAccessBusy && styles.manageMemberActionDisabled]}
                >
                  <Text style={styles.manageMemberActionText}>
                    {projectAccessBusy ? 'Preparing invitation...' : `Invite ${projectAccessInviteEmail}`}
                  </Text>
                  <Text style={styles.manageMemberActionNote}>
                    They will get an email invitation to join this project.
                  </Text>
                </Pressable>
              ) : (
                <Text style={styles.editModalSectionLabel}>
                  No people match this search.
                </Text>
              )}
            </View>

            <View style={styles.projectAccessSection}>
              <View style={styles.pickerSectionDivider}>
                <View style={styles.pickerSectionLine} />
                <Text style={styles.pickerSectionLabel}>Team</Text>
                <View style={styles.pickerSectionLine} />
              </View>

              <Pressable onPress={() => linkProjectTeam(null)} style={styles.teamLinkRow}>
                <Text style={styles.teamLinkRowText}>No team</Text>
                {!selectedProject?.team_id && <Text style={styles.assigneePickerCheck}>✓</Text>}
              </Pressable>

              {projectAccessTeams.length > 0 ? projectAccessTeams.map((team) => (
                <Pressable
                  key={team.id}
                  onPress={() => linkProjectTeam(team.id)}
                  style={styles.teamLinkRow}
                >
                  <View style={[styles.teamLinkDot, { backgroundColor: pickAvatarColor(team.id) }]}>
                    <Text style={styles.teamLinkDotText}>{(team.name[0] ?? 'T').toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.teamLinkRowText} numberOfLines={1}>{team.name}</Text>
                    <Text style={styles.teamLinkMeta}>{team.member_count ?? 0} member{(team.member_count ?? 0) !== 1 ? 's' : ''}</Text>
                  </View>
                  {selectedProject?.team_id === team.id && <Text style={styles.assigneePickerCheck}>✓</Text>}
                </Pressable>
              )) : (
                <Text style={styles.editModalSectionLabel}>
                  No teams match this search.
                </Text>
              )}
            </View>

            <View style={[styles.editModalActions, { marginTop: 8 }]}>
              <View />
              <Pressable onPress={closeProjectAccessModal}>
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

type ColumnSettingsModalProps = Pick<
  SignedInWorkspaceScreen,
  | 'phases'
  | 'renamingPhase'
  | 'renamePhaseName'
  | 'setRenamePhaseName'
  | 'phaseDeleteConfirming'
  | 'setPhaseDeleteConfirming'
  | 'setError'
  | 'closeRenamePhase'
  | 'saveRenamePhase'
  | 'deletePhase'
>;

export function ColumnSettingsModal({
  phases,
  renamingPhase,
  renamePhaseName,
  setRenamePhaseName,
  phaseDeleteConfirming,
  setPhaseDeleteConfirming,
  setError,
  closeRenamePhase,
  saveRenamePhase,
  deletePhase,
}: ColumnSettingsModalProps) {
  return (
    <>
      <Modal
        visible={!!renamingPhase}
        transparent
        animationType="fade"
        onRequestClose={closeRenamePhase}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeRenamePhase}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>Column Settings</Text>
            <TextInput
              style={styles.editModalInput}
              value={renamePhaseName}
              onChangeText={setRenamePhaseName}
              placeholder="Column name"
              placeholderTextColor="#9ca3af"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={saveRenamePhase}
            />
            {phaseDeleteConfirming && (
              <View style={styles.columnDeleteConfirm}>
                <Text style={styles.columnDeleteConfirmText}>
                  Delete this column? Its tasks will move to Backlog.
                </Text>
              </View>
            )}
            <View style={[styles.editModalActions, { marginTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e7eb', paddingTop: 12 }]}>
              <Pressable
                onPress={() => {
                  if (phases.length <= 1) {
                    setError('Projects must keep at least one column.');
                    closeRenamePhase();
                    return;
                  }
                  if (phaseDeleteConfirming) {
                    deletePhase();
                  } else {
                    setPhaseDeleteConfirming(true);
                  }
                }}
                disabled={phases.length <= 1}
                accessibilityRole="button"
                accessibilityLabel={phases.length <= 1 ? 'Cannot delete the only column' : 'Delete column'}
              >
                <Text style={[
                  styles.archiveBtnText,
                  styles.columnDeleteText,
                  phases.length <= 1 && styles.columnDeleteTextDisabled,
                ]}>
                  {phaseDeleteConfirming ? 'Confirm delete' : 'Delete'}
                </Text>
              </Pressable>
              <View style={styles.editModalActionsRight}>
                <Pressable onPress={closeRenamePhase}>
                  <Text style={styles.calendarCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={saveRenamePhase}
                  style={({ pressed }) => [styles.smallBtn, pressed && styles.btnPressed]}
                >
                  <Text style={styles.smallBtnText}>Save</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

type RenameWorkflowLaneModalProps = Pick<
  SignedInWorkspaceScreen,
  | 'renamingWorkflowLane'
  | 'renameWorkflowLaneName'
  | 'setRenameWorkflowLaneName'
  | 'closeRenameWorkflowLane'
  | 'saveRenameWorkflowLane'
>;

export function RenameWorkflowLaneModal({
  renamingWorkflowLane,
  renameWorkflowLaneName,
  setRenameWorkflowLaneName,
  closeRenameWorkflowLane,
  saveRenameWorkflowLane,
}: RenameWorkflowLaneModalProps) {
  return (
    <>
      <Modal
        visible={!!renamingWorkflowLane}
        transparent
        animationType="fade"
        onRequestClose={closeRenameWorkflowLane}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeRenameWorkflowLane}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>Rename Kanban Column</Text>
            <TextInput
              style={styles.editModalInput}
              value={renameWorkflowLaneName}
              onChangeText={setRenameWorkflowLaneName}
              placeholder="Column name"
              placeholderTextColor="#9ca3af"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={saveRenameWorkflowLane}
            />
            <View style={styles.editModalActions}>
              <Pressable onPress={closeRenameWorkflowLane}>
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={saveRenameWorkflowLane}
                style={({ pressed }) => [styles.smallBtn, pressed && styles.btnPressed]}
              >
                <Text style={styles.smallBtnText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

type AddPhaseModalProps = Pick<
  SignedInWorkspaceScreen,
  | 'addingPhase'
  | 'setAddingPhase'
  | 'newPhaseName'
  | 'setNewPhaseName'
  | 'addPhase'
>;

export function AddPhaseModal({
  addingPhase,
  setAddingPhase,
  newPhaseName,
  setNewPhaseName,
  addPhase,
}: AddPhaseModalProps) {
  return (
    <>
      <Modal
        visible={addingPhase}
        transparent
        animationType="fade"
        onRequestClose={() => setAddingPhase(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setAddingPhase(false)}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>New Column</Text>
            <TextInput
              style={styles.editModalInput}
              value={newPhaseName}
              onChangeText={setNewPhaseName}
              placeholder="Column name"
              placeholderTextColor="#9ca3af"
              autoFocus
              onSubmitEditing={addPhase}
            />
            <View style={styles.editModalActions}>
              <Pressable onPress={() => { setAddingPhase(false); setNewPhaseName(''); }}>
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={addPhase}
                style={({ pressed }) => [styles.smallBtn, pressed && styles.btnPressed]}
              >
                <Text style={styles.smallBtnText}>Add</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

type RenameProjectModalProps = Pick<
  SignedInWorkspaceScreen,
  | 'error'
  | 'setError'
  | 'renamingProject'
  | 'setRenamingProject'
  | 'renameProjectName'
  | 'setRenameProjectName'
  | 'renameProject'
>;

export function RenameProjectModal({
  error,
  setError,
  renamingProject,
  setRenamingProject,
  renameProjectName,
  setRenameProjectName,
  renameProject,
}: RenameProjectModalProps) {
  return (
    <>
      <Modal
        visible={!!renamingProject}
        transparent
        animationType="fade"
        onRequestClose={() => setRenamingProject(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setRenamingProject(null)}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>Rename Project</Text>
            <TextInput
              style={styles.editModalInput}
              value={renameProjectName}
              onChangeText={setRenameProjectName}
              placeholder="Project name"
              placeholderTextColor="#9ca3af"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={renameProject}
            />
            {!!error && <Text style={[styles.error, { marginBottom: 8 }]}>{error}</Text>}
            <View style={styles.editModalActions}>
              <Pressable onPress={() => { setRenamingProject(null); setError(''); }}>
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={renameProject} style={({ pressed }) => [styles.smallBtn, pressed && styles.btnPressed]}>
                <Text style={styles.smallBtnText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
