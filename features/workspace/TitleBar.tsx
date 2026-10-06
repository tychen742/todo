import { View, Text, TextInput, Pressable, Platform, Image } from 'react-native';
import { pickAvatarAnimal, pickAvatarColor } from '../../lib/avatar';
import { webInputNoOutline } from './constants';
import { styles } from './styles';
import type { SignedInWorkspaceScreen } from './useWorkspaceScreen';

type TitleBarProps = Pick<
  SignedInWorkspaceScreen,
  | 'session'
  | 'browserActive'
  | 'navExpanded'
  | 'setNavExpanded'
  | 'statusEditing'
  | 'setStatusEditing'
  | 'profile'
  | 'setAnimalPickerVisible'
  | 'customAnimal'
  | 'statusDraft'
  | 'setStatusDraft'
  | 'searchQuery'
  | 'setSearchQuery'
  | 'searchInputRef'
  | 'showHeaderMessageBoard'
  | 'workspaceActiveLabel'
  | 'workspaceActiveProgress'
  | 'accountDisplayName'
  | 'saveStatus'
>;

export function TitleBar({
  session,
  browserActive,
  navExpanded,
  setNavExpanded,
  statusEditing,
  setStatusEditing,
  profile,
  setAnimalPickerVisible,
  customAnimal,
  statusDraft,
  setStatusDraft,
  searchQuery,
  setSearchQuery,
  searchInputRef,
  showHeaderMessageBoard,
  workspaceActiveLabel,
  workspaceActiveProgress,
  accountDisplayName,
  saveStatus,
}: TitleBarProps) {
  return (
    <>
      {(() => {
        const seed = profile?.email ?? session.user.email ?? '';
        const avatarColor = pickAvatarColor(seed);
        const animal = customAnimal ?? pickAvatarAnimal(seed);
        return (
          <View style={styles.titleBar}>
            <View style={styles.titleBarLeft}>
              <View style={styles.userIdentityRow}>
                <Pressable
                  onPress={() => setNavExpanded((v) => !v)}
                  onLongPress={() => setAnimalPickerVisible(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Open account menu"
                  style={styles.accountAvatarButton}
                  hitSlop={4}
                >
                  {profile?.avatar_url ? (
                    <Image source={{ uri: profile.avatar_url }} style={styles.userAvatarBigPhoto} />
                  ) : (
                    <View style={[styles.userAvatarBig, { backgroundColor: avatarColor }]}>
                      <Text style={styles.userAvatarBigAnimal}>{animal}</Text>
                    </View>
                  )}
                </Pressable>
                <View style={styles.userMeta}>
                  <View style={styles.userMetaNameRow}>
                    <View style={[styles.onlineDot, !browserActive && styles.onlineDotInactive]} />
                    <Pressable
                      onPress={() => setNavExpanded((v) => !v)}
                      style={styles.userNameButton}
                      accessibilityRole="button"
                      accessibilityLabel="Toggle account menu"
                    >
                      <Text style={styles.userMetaName} numberOfLines={1}>{accountDisplayName}</Text>
                      <Text style={styles.userNavChevron}>{navExpanded ? '▴' : '▾'}</Text>
                    </Pressable>
                    {statusEditing ? (
                      <TextInput
                        style={styles.statusInput}
                        value={statusDraft}
                        onChangeText={setStatusDraft}
                        onBlur={saveStatus}
                        onSubmitEditing={saveStatus}
                        placeholder="What are you up to?"
                        placeholderTextColor="#d1d5db"
                        autoFocus
                        maxLength={80}
                        returnKeyType="done"
                      />
                    ) : (
                      <Pressable onPress={() => setStatusEditing(true)} style={styles.statusPressable}>
                        <Text style={statusDraft ? styles.statusText : styles.statusPlaceholder} numberOfLines={1}>
                          {statusDraft || 'What are you up to?'}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                  <View style={styles.workspaceActiveBarRow}>
                    <View style={styles.workspaceActiveTrack}>
                      <View style={[styles.workspaceActiveFill, { width: `${workspaceActiveProgress}%` }]} />
                    </View>
                    <Text style={styles.workspaceActiveText}>{workspaceActiveLabel}/8h</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.titleBarCenter}>
              {showHeaderMessageBoard && (
                <View style={styles.messageBoard}>
                  <View style={[styles.messageBoardItem, styles.messageBoardPresence]}>
                    <Text style={styles.messageBoardText} numberOfLines={1}>Alice is online</Text>
                  </View>
                  <View style={[styles.messageBoardItem, styles.messageBoardChat]}>
                    <Text style={styles.messageBoardText} numberOfLines={1}>Alice: I am up to something</Text>
                  </View>
                </View>
              )}
              <View style={styles.searchBar}>
                <Text style={styles.searchIcon}>⌕</Text>
                <TextInput
                  ref={searchInputRef}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  style={[styles.searchInput, Platform.OS === 'web' && webInputNoOutline]}
                  accessibilityLabel="Search tasks and projects"
                />
                {searchQuery ? (
                  <Pressable
                    onPress={() => setSearchQuery('')}
                    style={styles.searchClearButton}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Clear search"
                  >
                    <Text style={styles.searchClearText}>×</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.searchShortcut}>⌘K</Text>
                )}
              </View>
            </View>

          </View>
        );
      })()}
    </>
  );
}
