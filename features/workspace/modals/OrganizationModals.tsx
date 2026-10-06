import { View, Text, TextInput, Pressable, Modal } from 'react-native';
import { styles } from '../styles';
import type { SignedInWorkspaceScreen } from '../useWorkspaceScreen';

type OrgMemberModalProps = Pick<
  SignedInWorkspaceScreen,
  | 'orgManageMember'
  | 'setOrgManageMember'
  | 'error'
  | 'setError'
  | 'transferOrgOwnership'
  | 'updateOrgMemberRole'
  | 'removeOrgMember'
>;

export function OrgMemberModal({
  orgManageMember,
  setOrgManageMember,
  error,
  setError,
  transferOrgOwnership,
  updateOrgMemberRole,
  removeOrgMember,
}: OrgMemberModalProps) {
  return (
    <>
      <Modal
        visible={!!orgManageMember}
        transparent
        animationType="fade"
        onRequestClose={() => setOrgManageMember(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setOrgManageMember(null)}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle} numberOfLines={1}>
              {orgManageMember?.display_name || orgManageMember?.email}
            </Text>
            <Text style={styles.orgMemberRole}>{orgManageMember?.email}</Text>

            {!!error && <Text style={[styles.error, { marginTop: 8 }]}>{error}</Text>}

            {orgManageMember?.role !== 'owner' && (
              <Pressable
                onPress={() => transferOrgOwnership(orgManageMember!.user_id)}
                style={styles.manageMemberAction}
              >
                <Text style={styles.manageMemberActionText}>Transfer ownership to this person</Text>
                <Text style={styles.manageMemberActionNote}>You become an admin</Text>
              </Pressable>
            )}
            {orgManageMember?.role === 'member' && (
              <Pressable
                onPress={() => updateOrgMemberRole(orgManageMember!.user_id, 'admin')}
                style={styles.manageMemberAction}
              >
                <Text style={styles.manageMemberActionText}>Promote to admin</Text>
              </Pressable>
            )}
            {orgManageMember?.role === 'admin' && (
              <Pressable
                onPress={() => updateOrgMemberRole(orgManageMember!.user_id, 'member')}
                style={styles.manageMemberAction}
              >
                <Text style={styles.manageMemberActionText}>Demote to member</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => removeOrgMember(orgManageMember!.user_id)}
              style={styles.manageMemberAction}
            >
              <Text style={[styles.manageMemberActionText, styles.manageMemberActionDanger]}>
                Remove from organization
              </Text>
            </Pressable>

            <View style={[styles.editModalActions, { marginTop: 12 }]}>
              <View />
              <Pressable onPress={() => { setOrgManageMember(null); setError(''); }}>
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

type OrganizationModalProps = Pick<
  SignedInWorkspaceScreen,
  | 'session'
  | 'organizations'
  | 'orgModalId'
  | 'setOrgModalId'
  | 'orgModalMembers'
  | 'orgMemberEmail'
  | 'setOrgMemberEmail'
  | 'setOrgManageMember'
  | 'error'
  | 'setError'
  | 'setRenamingOrg'
  | 'setRenameOrgName'
  | 'currentOrgRole'
  | 'addOrgMember'
>;

export function OrganizationModal({
  session,
  organizations,
  orgModalId,
  setOrgModalId,
  orgModalMembers,
  orgMemberEmail,
  setOrgMemberEmail,
  setOrgManageMember,
  error,
  setError,
  setRenamingOrg,
  setRenameOrgName,
  currentOrgRole,
  addOrgMember,
}: OrganizationModalProps) {
  return (
    <>
      <Modal
        visible={!!orgModalId}
        transparent
        animationType="fade"
        onRequestClose={() => setOrgModalId(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setOrgModalId(null)}>
          <Pressable style={styles.calendarCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={[styles.editModalTitle, { marginBottom: 0 }]}>
                {organizations.find((o) => o.id === orgModalId)?.name ?? 'Organization'}
              </Text>
              {(currentOrgRole === 'owner' || currentOrgRole === 'admin') && (
                <Pressable
                  onPress={() => {
                    const org = organizations.find((o) => o.id === orgModalId);
                    if (org) { setRenamingOrg(org); setRenameOrgName(org.name); }
                    setOrgModalId(null);
                  }}
                  hitSlop={8}
                >
                  <Text style={{ fontSize: 12, color: '#6366f1', fontWeight: '600' }}>Rename</Text>
                </Pressable>
              )}
            </View>

            {orgModalMembers.length > 0 && (
              <View style={styles.orgMemberList}>
                {orgModalMembers.map((m) => {
                  const canManage = currentOrgRole === 'owner' && m.user_id !== session?.user.id;
                  return (
                    <Pressable
                      key={m.user_id}
                      style={styles.orgMemberRow}
                      onPress={() => canManage ? setOrgManageMember(m) : undefined}
                    >
                      <Text style={styles.orgMemberEmail} numberOfLines={1}>
                        {m.display_name ? `${m.display_name} (${m.email})` : m.email}
                      </Text>
                      <View style={styles.orgMemberRowRight}>
                        <Text style={styles.orgMemberRole}>{m.role}</Text>
                        {canManage && <Text style={styles.orgMemberManageIcon}>›</Text>}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {!!error && <Text style={[styles.error, { marginBottom: 8 }]}>{error}</Text>}

            <View style={styles.compactForm}>
              <TextInput
                style={styles.compactInput}
                value={orgMemberEmail}
                onChangeText={(v) => { setOrgMemberEmail(v); if (error) setError(''); }}
                placeholder="Add member by email"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                keyboardType="email-address"
                onSubmitEditing={addOrgMember}
              />
              <Pressable
                onPress={addOrgMember}
                style={({ pressed }) => [styles.smallBtn, pressed && styles.btnPressed]}
              >
                <Text style={styles.smallBtnText}>Add</Text>
              </Pressable>
            </View>

            <View style={[styles.editModalActions, { marginTop: 12 }]}>
              <View />
              <Pressable onPress={() => setOrgModalId(null)}>
                <Text style={styles.calendarCancelText}>Close</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

type CreateOrganizationModalProps = Pick<
  SignedInWorkspaceScreen,
  | 'createTarget'
  | 'setCreateTarget'
  | 'orgName'
  | 'setOrgName'
  | 'createOrganization'
>;

export function CreateOrganizationModal({
  createTarget,
  setCreateTarget,
  orgName,
  setOrgName,
  createOrganization,
}: CreateOrganizationModalProps) {
  return (
    <>
      <Modal
        visible={createTarget === 'organization'}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateTarget(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCreateTarget(null)}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>New Organization</Text>
            <TextInput
              style={styles.editModalInput}
              value={orgName}
              onChangeText={setOrgName}
              placeholder="Organization name"
              placeholderTextColor="#9ca3af"
              returnKeyType="done"
              autoFocus
              onSubmitEditing={createOrganization}
            />
            <View style={styles.editModalActions}>
              <Pressable onPress={() => { setCreateTarget(null); setOrgName(''); }}>
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={createOrganization}
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

type CreateTeamModalProps = Pick<
  SignedInWorkspaceScreen,
  | 'organizations'
  | 'createTarget'
  | 'setCreateTarget'
  | 'teamName'
  | 'setTeamName'
  | 'newTeamOrgId'
  | 'setNewTeamOrgId'
  | 'createTeam'
>;

export function CreateTeamModal({
  organizations,
  createTarget,
  setCreateTarget,
  teamName,
  setTeamName,
  newTeamOrgId,
  setNewTeamOrgId,
  createTeam,
}: CreateTeamModalProps) {
  return (
    <>
      <Modal
        visible={createTarget === 'team'}
        transparent
        animationType="fade"
        onRequestClose={() => { setCreateTarget(null); setNewTeamOrgId(null); }}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => { setCreateTarget(null); setNewTeamOrgId(null); }}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>New Team</Text>
            <Text style={styles.editModalSectionLabel}>
              {newTeamOrgId
                ? `Organization: ${organizations.find((org) => org.id === newTeamOrgId)?.name ?? 'Selected'}`
                : 'No organization'}
            </Text>
            <TextInput
              style={styles.editModalInput}
              value={teamName}
              onChangeText={setTeamName}
              placeholder="Team name"
              placeholderTextColor="#9ca3af"
              returnKeyType="done"
              autoFocus
              onSubmitEditing={createTeam}
            />
            <View style={styles.editModalActions}>
              <Pressable
                onPress={() => {
                  setCreateTarget(null);
                  setTeamName('');
                  setNewTeamOrgId(null);
                }}
              >
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={createTeam}
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

type RenameTeamModalProps = Pick<
  SignedInWorkspaceScreen,
  | 'error'
  | 'setError'
  | 'renamingTeam'
  | 'setRenamingTeam'
  | 'renameTeamName'
  | 'setRenameTeamName'
  | 'renameTeam'
>;

export function RenameTeamModal({
  error,
  setError,
  renamingTeam,
  setRenamingTeam,
  renameTeamName,
  setRenameTeamName,
  renameTeam,
}: RenameTeamModalProps) {
  return (
    <>
      <Modal
        visible={!!renamingTeam}
        transparent
        animationType="fade"
        onRequestClose={() => setRenamingTeam(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setRenamingTeam(null)}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>Rename Team</Text>
            <TextInput
              style={styles.editModalInput}
              value={renameTeamName}
              onChangeText={setRenameTeamName}
              placeholder="Team name"
              placeholderTextColor="#9ca3af"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={renameTeam}
            />
            {!!error && <Text style={[styles.error, { marginBottom: 8 }]}>{error}</Text>}
            <View style={styles.editModalActions}>
              <Pressable onPress={() => { setRenamingTeam(null); setError(''); }}>
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={renameTeam} style={({ pressed }) => [styles.smallBtn, pressed && styles.btnPressed]}>
                <Text style={styles.smallBtnText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

type RenameOrganizationModalProps = Pick<
  SignedInWorkspaceScreen,
  | 'error'
  | 'setError'
  | 'renamingOrg'
  | 'setRenamingOrg'
  | 'renameOrgName'
  | 'setRenameOrgName'
  | 'renameOrg'
>;

export function RenameOrganizationModal({
  error,
  setError,
  renamingOrg,
  setRenamingOrg,
  renameOrgName,
  setRenameOrgName,
  renameOrg,
}: RenameOrganizationModalProps) {
  return (
    <>
      <Modal
        visible={!!renamingOrg}
        transparent
        animationType="fade"
        onRequestClose={() => setRenamingOrg(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setRenamingOrg(null)}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>Rename Organization</Text>
            <TextInput
              style={styles.editModalInput}
              value={renameOrgName}
              onChangeText={setRenameOrgName}
              placeholder="Organization name"
              placeholderTextColor="#9ca3af"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={renameOrg}
            />
            {!!error && <Text style={[styles.error, { marginBottom: 8 }]}>{error}</Text>}
            <View style={styles.editModalActions}>
              <Pressable onPress={() => { setRenamingOrg(null); setError(''); }}>
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={renameOrg} style={({ pressed }) => [styles.smallBtn, pressed && styles.btnPressed]}>
                <Text style={styles.smallBtnText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
