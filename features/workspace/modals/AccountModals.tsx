import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, ActivityIndicator } from 'react-native';
import { AVATAR_ANIMALS, pickAvatarAnimal } from '../../../lib/avatar';
import type { Density } from '../../../lib/types';
import { emailDisplayName } from '../../../lib/display';
import { deleteAccount, loadAccountDeletionImpact, type AccountDeletionImpact } from '../../../lib/account';
import { appThemes, appThemeKeys } from '../constants';
import { styles } from '../styles';
import type { SignedInWorkspaceScreen } from '../useWorkspaceScreen';

type AccountMenuModalProps = Pick<
  SignedInWorkspaceScreen,
  | 'session'
  | 'exportingData'
  | 'exportMyData'
  | 'setDeleteAccountVisible'
  | 'navExpanded'
  | 'setNavExpanded'
  | 'profile'
  | 'organizations'
  | 'teams'
  | 'selectedTeamId'
  | 'setAboutVisible'
  | 'density'
  | 'setDensity'
  | 'themeKey'
  | 'setThemeKey'
  | 'settingsExpanded'
  | 'setSettingsExpanded'
  | 'setEditingDisplayName'
  | 'setEditDisplayNameValue'
  | 'accountDisplayName'
  | 'signOut'
  | 'openCreateTeam'
  | 'openCreateTarget'
  | 'selectTeamFromAccountMenu'
  | 'openOrgModal'
>;

export function AccountMenuModal({
  session,
  exportingData,
  exportMyData,
  setDeleteAccountVisible,
  navExpanded,
  setNavExpanded,
  profile,
  organizations,
  teams,
  selectedTeamId,
  setAboutVisible,
  density,
  setDensity,
  themeKey,
  setThemeKey,
  settingsExpanded,
  setSettingsExpanded,
  setEditingDisplayName,
  setEditDisplayNameValue,
  accountDisplayName,
  signOut,
  openCreateTeam,
  openCreateTarget,
  selectTeamFromAccountMenu,
  openOrgModal,
}: AccountMenuModalProps) {
  return (
    <>
      <Modal
        visible={navExpanded}
        transparent
        animationType="fade"
        onRequestClose={() => setNavExpanded(false)}
      >
        <Pressable style={styles.navDropdownBackdrop} onPress={() => setNavExpanded(false)}>
          <Pressable style={styles.navDropdownCard}>
            <Text style={styles.navDropdownName} numberOfLines={1}>{accountDisplayName}</Text>
            <Text style={styles.navDropdownEmail} numberOfLines={1}>{profile?.email ?? session.user.email}</Text>
            <Text style={styles.navDropdownMutedText} numberOfLines={1}>{session?.user.id}</Text>

            <View style={styles.navDropdownDivider} />

            <Pressable onPress={() => { setEditDisplayNameValue(profile?.display_name ?? ''); setEditingDisplayName(true); setNavExpanded(false); }} style={styles.navDropdownItem}>
              <Text style={styles.navDropdownItemText}>Edit Display Name</Text>
            </Pressable>
            <Pressable onPress={() => setSettingsExpanded(v => !v)} style={styles.navDropdownItem}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.navDropdownItemText}>Settings</Text>
                <Text style={{ fontSize: 11, color: '#9ca3af' }}>{settingsExpanded ? '▲' : '▼'}</Text>
              </View>
            </Pressable>
            {settingsExpanded && (
              <View style={{ paddingBottom: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#9ca3af', paddingHorizontal: 14, paddingVertical: 4, letterSpacing: 0.3 }}>VIEW DENSITY</Text>
                {(['compact', 'cozy', 'roomy'] as Density[]).map(d => (
                  <Pressable key={d} style={[styles.navDropdownItem, { paddingLeft: 20 }]} onPress={() => setDensity(d)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 11, color: '#6366f1', width: 12 }}>{density === d ? '✓' : ''}</Text>
                      <Text style={styles.navDropdownItemText}>{d.charAt(0).toUpperCase() + d.slice(1)}</Text>
                    </View>
                  </Pressable>
                ))}
                <Text style={styles.navDropdownSettingsHeader}>Theme</Text>
                {appThemeKeys.map((key) => {
                  const theme = appThemes[key];
                  const selected = themeKey === key;
                  return (
                    <Pressable
                      key={key}
                      style={[styles.navDropdownThemeItem, selected && { backgroundColor: theme.accentTint }]}
                      onPress={() => setThemeKey(key)}
                    >
                      <Text style={[styles.navDropdownThemeCheck, { color: theme.accent }]}>{selected ? '✓' : ''}</Text>
                      <View style={[styles.navDropdownThemeSwatch, { backgroundColor: theme.accent, borderColor: theme.accentStrong }]} />
                      <Text style={[styles.navDropdownItemText, selected && { color: theme.accentStrong, fontWeight: '700' }]}>
                        {theme.name}
                      </Text>
                    </Pressable>
                  );
                })}
                <Text style={styles.navDropdownSettingsHeader}>Your data</Text>
                <Pressable
                  style={[styles.navDropdownItem, { paddingLeft: 20 }]}
                  onPress={exportMyData}
                  disabled={exportingData}
                  accessibilityRole="button"
                >
                  <Text style={styles.navDropdownItemText}>{exportingData ? 'Preparing export...' : 'Export my data'}</Text>
                </Pressable>
                <Pressable
                  style={[styles.navDropdownItem, { paddingLeft: 20 }]}
                  onPress={() => { setNavExpanded(false); setDeleteAccountVisible(true); }}
                  accessibilityRole="button"
                >
                  <Text style={styles.navDropdownSignOutText}>Delete account</Text>
                </Pressable>
              </View>
            )}
            <Pressable onPress={() => { setAboutVisible(true); setNavExpanded(false); }} style={styles.navDropdownItem}>
              <Text style={styles.navDropdownItemText}>About</Text>
            </Pressable>

            <View style={styles.navDropdownDivider} />

            <View style={styles.navDropdownSection}>
              <View style={styles.navDropdownSectionHeader}>
                <Text style={styles.navDropdownSectionTitle}>Organizations</Text>
                <Pressable onPress={() => { openCreateTarget('organization'); setNavExpanded(false); }} hitSlop={8}>
                  <Text style={styles.navDropdownSectionAction}>+</Text>
                </Pressable>
              </View>
              {organizations.length === 0 ? (
                <Pressable onPress={() => { openCreateTarget('organization'); setNavExpanded(false); }} style={styles.navDropdownItem}>
                  <Text style={styles.navDropdownMutedText}>No organizations yet</Text>
                </Pressable>
              ) : (
                organizations.map((org) => (
                  <Pressable key={org.id} onPress={() => { openOrgModal(org.id); setNavExpanded(false); }} style={styles.navDropdownItem}>
                    <Text style={styles.navDropdownItemText} numberOfLines={1}>{org.name}</Text>
                    <Text style={styles.navDropdownMutedText}>{org.member_count ?? 0} member{(org.member_count ?? 0) !== 1 ? 's' : ''}</Text>
                  </Pressable>
                ))
              )}
            </View>

            <View style={styles.navDropdownSection}>
              <View style={styles.navDropdownSectionHeader}>
                <Text style={styles.navDropdownSectionTitle}>Teams</Text>
                <Pressable onPress={() => { openCreateTeam(null); setNavExpanded(false); }} hitSlop={8}>
                  <Text style={styles.navDropdownSectionAction}>+</Text>
                </Pressable>
              </View>
              {teams.length === 0 ? (
                <Pressable onPress={() => { openCreateTeam(null); setNavExpanded(false); }} style={styles.navDropdownItem}>
                  <Text style={styles.navDropdownMutedText}>No teams yet</Text>
                </Pressable>
              ) : (
                teams.map((team) => (
                  <Pressable
                    key={team.id}
                    onPress={() => { selectTeamFromAccountMenu(team.id); setNavExpanded(false); }}
                    style={styles.navDropdownItem}
                  >
                    <Text
                      style={[styles.navDropdownItemText, team.id === selectedTeamId && styles.navDropdownItemTextActive]}
                      numberOfLines={1}
                    >
                      {team.name}
                    </Text>
                  </Pressable>
                ))
              )}
            </View>

            <View style={styles.navDropdownDivider} />

            <Pressable onPress={signOut} style={styles.navDropdownItem}>
              <Text style={styles.navDropdownSignOutText}>Log Out</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

type AvatarPickerModalProps = Pick<
  SignedInWorkspaceScreen,
  | 'session'
  | 'profile'
  | 'animalPickerVisible'
  | 'setAnimalPickerVisible'
  | 'customAnimal'
  | 'setCustomAnimal'
  | 'uploadProfilePhoto'
>;

export function AvatarPickerModal({
  session,
  profile,
  animalPickerVisible,
  setAnimalPickerVisible,
  customAnimal,
  setCustomAnimal,
  uploadProfilePhoto,
}: AvatarPickerModalProps) {
  return (
    <>
      <Modal
        visible={animalPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAnimalPickerVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setAnimalPickerVisible(false)}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>Choose your avatar</Text>
            <Pressable
              onPress={uploadProfilePhoto}
              style={({ pressed }) => [styles.avatarUploadButton, pressed && styles.btnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Upload profile photo"
            >
              <Text style={styles.avatarUploadButtonText}>Upload photo</Text>
              <Text style={styles.avatarUploadHint}>Shown in task rows as the assigner avatar.</Text>
            </Pressable>
            <View style={styles.animalGrid}>
              {AVATAR_ANIMALS.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => { setCustomAnimal(emoji); setAnimalPickerVisible(false); }}
                  style={[
                    styles.animalCell,
                    (customAnimal ?? pickAvatarAnimal(profile?.email ?? session?.user.email ?? '')) === emoji
                      && styles.animalCellActive,
                  ]}
                >
                  <Text style={styles.animalCellText}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.editModalActions}>
              <Pressable onPress={() => setAnimalPickerVisible(false)}>
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>
              {customAnimal && (
                <Pressable
                  onPress={() => { setCustomAnimal(null); setAnimalPickerVisible(false); }}
                  style={({ pressed }) => [styles.smallBtn, { backgroundColor: '#6b7280' }, pressed && styles.btnPressed]}
                >
                  <Text style={styles.smallBtnText}>Reset</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

type AboutModalProps = Pick<
  SignedInWorkspaceScreen,
  | 'aboutVisible'
  | 'setAboutVisible'
>;

export function AboutModal({
  aboutVisible,
  setAboutVisible,
}: AboutModalProps) {
  return (
    <>
      <Modal
        visible={aboutVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAboutVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setAboutVisible(false)}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>About</Text>
            <Text style={styles.aboutText}>
              This app is built for simplicity. For example, a project has a maximum of 5 phases
              because real work rarely needs more — and if it does, it probably needs a dedicated
              project management tool, not this one.
            </Text>
            <Text style={styles.aboutText}>
              The goal is to make you productive, not to make you plan. We want to help you capture
              what matters, assign it, do it, track it, and deliver it.
            </Text>
            <Text style={[styles.aboutText, { marginBottom: 0 }]}>
              If you need Gantt charts, dependency graphs, or resource leveling, products such as
              ClickUp, Asana, Jira, and MS Project are waiting for you. This tool is for the other
              95% of work.
            </Text>
            <View style={styles.editModalActions}>
              <View />
              <Pressable
                onPress={() => setAboutVisible(false)}
                style={({ pressed }) => [styles.smallBtn, pressed && styles.btnPressed]}
              >
                <Text style={styles.smallBtnText}>Got it</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

type DisplayNameModalProps = Pick<
  SignedInWorkspaceScreen,
  | 'session'
  | 'error'
  | 'setError'
  | 'editingDisplayName'
  | 'setEditingDisplayName'
  | 'editDisplayNameValue'
  | 'setEditDisplayNameValue'
  | 'saveDisplayName'
>;

export function DisplayNameModal({
  session,
  error,
  setError,
  editingDisplayName,
  setEditingDisplayName,
  editDisplayNameValue,
  setEditDisplayNameValue,
  saveDisplayName,
}: DisplayNameModalProps) {
  return (
    <>
      <Modal
        visible={editingDisplayName}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingDisplayName(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setEditingDisplayName(false)}>
          <Pressable style={styles.calendarCard}>
            <Text style={styles.editModalTitle}>Display Name</Text>
            <TextInput
              style={styles.editModalInput}
              value={editDisplayNameValue}
              onChangeText={setEditDisplayNameValue}
              placeholder={emailDisplayName(session?.user.email)}
              placeholderTextColor="#9ca3af"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={saveDisplayName}
            />
            {!!error && <Text style={[styles.error, { marginBottom: 8 }]}>{error}</Text>}
            <View style={styles.editModalActions}>
              <Pressable onPress={() => { setEditingDisplayName(false); setError(''); }}>
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={saveDisplayName} style={({ pressed }) => [styles.smallBtn, pressed && styles.btnPressed]}>
                <Text style={styles.smallBtnText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

type DeleteAccountModalProps = Pick<
  SignedInWorkspaceScreen,
  | 'session'
  | 'deleteAccountVisible'
  | 'setDeleteAccountVisible'
  | 'exportingData'
  | 'exportMyData'
  | 'signOut'
  | 'setMessage'
>;

// Mounted only while open so the impact list is fetched fresh each time.
export function DeleteAccountModal(props: DeleteAccountModalProps) {
  if (!props.deleteAccountVisible) return null;
  return <DeleteAccountDialog {...props} />;
}

const deleteConfirmWord = 'DELETE';
const impactKindLabels: Record<AccountDeletionImpact['kind'], string> = {
  organization: 'Organization',
  team: 'Team',
  project: 'Project',
};

function DeleteAccountDialog({
  session,
  setDeleteAccountVisible,
  exportingData,
  exportMyData,
  signOut,
  setMessage,
}: DeleteAccountModalProps) {
  const [impact, setImpact] = useState<AccountDeletionImpact[] | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadAccountDeletionImpact()
      .then((rows) => {
        if (!cancelled) setImpact(rows);
      })
      .catch((loadError: Error) => {
        if (!cancelled) setDeleteError(loadError.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const canDelete = !deleting && impact !== null && confirmText.trim() === deleteConfirmWord;

  function close() {
    if (!deleting) setDeleteAccountVisible(false);
  }

  async function confirmDelete() {
    if (!canDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteAccount(session.user.id);
      setDeleteAccountVisible(false);
      await signOut();
      setMessage('Your account has been deleted.');
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Could not delete your account.');
      setDeleting(false);
    }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.modalBackdrop} onPress={close}>
        <Pressable style={styles.calendarCard}>
          <Text style={styles.editModalTitle}>Delete account</Text>
          <Text style={styles.aboutText}>
            This permanently deletes your account, your personal todos, maps, and comments, and
            removes you from every organization, team, and project. It cannot be undone.
          </Text>
          <Text style={styles.aboutText}>
            Shared spaces you created pass to another owner or admin when there is one. Todos you
            created in spaces that stay, or assigned to someone else, are kept for those people.
          </Text>
          {impact === null && !deleteError ? (
            <ActivityIndicator style={{ marginVertical: 8 }} />
          ) : null}
          {impact && impact.length > 0 ? (
            <View style={{ marginBottom: 12 }}>
              <Text style={[styles.aboutText, { marginBottom: 4, fontWeight: '700', color: '#b91c1c' }]}>
                These shared spaces have no other owner or admin and will be deleted for everyone:
              </Text>
              {impact.map((space) => (
                <Text key={`${space.kind}-${space.id}`} style={[styles.aboutText, { marginBottom: 2 }]}>
                  {impactKindLabels[space.kind]}: {space.name} ({space.other_members}{' '}
                  {space.other_members === 1 ? 'other member' : 'other members'})
                </Text>
              ))}
              <Text style={[styles.aboutText, { marginTop: 4 }]}>
                To keep one, make another member an owner or admin first.
              </Text>
            </View>
          ) : null}
          <Pressable onPress={exportMyData} disabled={exportingData || deleting} style={{ marginBottom: 12 }}>
            <Text style={styles.calendarCancelText}>
              {exportingData ? 'Preparing export...' : 'Export my data first'}
            </Text>
          </Pressable>
          <Text style={[styles.aboutText, { marginBottom: 4 }]}>
            Type {deleteConfirmWord} to confirm.
          </Text>
          <TextInput
            style={styles.editModalInput}
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder={deleteConfirmWord}
            placeholderTextColor="#9ca3af"
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!deleting}
            accessibilityLabel="Type DELETE to confirm account deletion"
          />
          {!!deleteError && <Text style={[styles.error, { marginBottom: 8 }]}>{deleteError}</Text>}
          <View style={styles.editModalActions}>
            <Pressable onPress={close} disabled={deleting}>
              <Text style={styles.calendarCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={confirmDelete}
              disabled={!canDelete}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.smallBtn,
                { backgroundColor: '#dc2626', opacity: canDelete ? 1 : 0.4 },
                pressed && styles.btnPressed,
              ]}
            >
              <Text style={styles.smallBtnText}>{deleting ? 'Deleting...' : 'Delete account'}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
