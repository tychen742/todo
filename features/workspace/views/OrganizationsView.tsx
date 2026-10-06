import { View, Text, Pressable, ScrollView } from 'react-native';
import { styles } from '../styles';
import type { SignedInWorkspaceScreen } from '../useWorkspaceScreen';

type OrganizationsViewProps = Pick<
  SignedInWorkspaceScreen,
  | 'organizations'
  | 'teams'
  | 'selectedTeamId'
  | 'setSelectedTeamId'
  | 'setSelectedProjectId'
  | 'teamsViewOpen'
  | 'setTeamsViewOpen'
  | 'setNotesViewOpen'
  | 'setCalendarViewOpen'
  | 'openCreateTeam'
  | 'openCreateTarget'
  | 'openOrgModal'
>;

export function OrganizationsView({
  organizations,
  teams,
  selectedTeamId,
  setSelectedTeamId,
  setSelectedProjectId,
  teamsViewOpen,
  setTeamsViewOpen,
  setNotesViewOpen,
  setCalendarViewOpen,
  openCreateTeam,
  openCreateTarget,
  openOrgModal,
}: OrganizationsViewProps) {
  return (
    <>
      {teamsViewOpen && (
        <ScrollView style={styles.organizationsView} contentContainerStyle={styles.organizationsViewContent}>
          {organizations.map((org) => {
            const orgTeams = teams.filter((team) => team.org_id === org.id);
            return (
              <View key={org.id} style={styles.organizationSection}>
                <View style={styles.organizationHeader}>
                  <Pressable onPress={() => openOrgModal(org.id)} style={styles.organizationTitleWrap}>
                    <Text style={styles.organizationTitle} numberOfLines={1}>{org.name}</Text>
                    <Text style={styles.organizationMeta}>
                      {org.member_count ?? 0} member{(org.member_count ?? 0) !== 1 ? 's' : ''}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => openCreateTeam(org.id)}
                    style={styles.organizationAddTeamButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Create team in ${org.name}`}
                  >
                    <Text style={styles.organizationAddTeamText}>+</Text>
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.organizationTeamTabs}
                >
                  {orgTeams.length === 0 ? (
                    <Pressable onPress={() => openCreateTeam(org.id)} style={styles.organizationEmptyTeamTab}>
                      <Text style={styles.organizationEmptyTeamText}>No teams yet</Text>
                    </Pressable>
                  ) : (
                    orgTeams.map((team) => (
                      <Pressable
                        key={team.id}
                        onPress={() => {
                          setSelectedTeamId(team.id);
                          setSelectedProjectId(null);
                          setTeamsViewOpen(false);
                          setNotesViewOpen(false);
                          setCalendarViewOpen(false);
                        }}
                        style={[styles.organizationTeamTab, selectedTeamId === team.id && styles.organizationTeamTabActive]}
                        accessibilityRole="button"
                        accessibilityLabel={`Open team ${team.name}`}
                      >
                        <Text
                          style={[styles.organizationTeamTabText, selectedTeamId === team.id && styles.organizationTeamTabTextActive]}
                          numberOfLines={1}
                        >
                          {team.name}
                        </Text>
                        <Text style={styles.organizationTeamMeta}>
                          {team.member_count ?? 0}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </ScrollView>
              </View>
            );
          })}

          {teams.some((team) => !team.org_id) && (
            <View style={styles.organizationSection}>
              <View style={styles.organizationHeader}>
                <View style={styles.organizationTitleWrap}>
                  <Text style={styles.organizationTitle}>Ungrouped Teams</Text>
                  <Text style={styles.organizationMeta}>No organization</Text>
                </View>
                <Pressable
                  onPress={() => openCreateTeam(null)}
                  style={styles.organizationAddTeamButton}
                  accessibilityRole="button"
                  accessibilityLabel="Create ungrouped team"
                >
                  <Text style={styles.organizationAddTeamText}>+</Text>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.organizationTeamTabs}
              >
                {teams.filter((team) => !team.org_id).map((team) => (
                  <Pressable
                    key={team.id}
                    onPress={() => {
                      setSelectedTeamId(team.id);
                      setSelectedProjectId(null);
                      setTeamsViewOpen(false);
                      setNotesViewOpen(false);
                      setCalendarViewOpen(false);
                    }}
                    style={[styles.organizationTeamTab, selectedTeamId === team.id && styles.organizationTeamTabActive]}
                    accessibilityRole="button"
                    accessibilityLabel={`Open team ${team.name}`}
                  >
                    <Text
                      style={[styles.organizationTeamTabText, selectedTeamId === team.id && styles.organizationTeamTabTextActive]}
                      numberOfLines={1}
                    >
                      {team.name}
                    </Text>
                    <Text style={styles.organizationTeamMeta}>{team.member_count ?? 0}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <Pressable
            onPress={() => openCreateTarget('organization')}
            style={styles.organizationCardNew}
            accessibilityRole="button"
            accessibilityLabel="Create organization"
          >
            <Text style={styles.organizationCardNewIcon}>+</Text>
            <Text style={styles.organizationCardNewText}>New Organization</Text>
          </Pressable>
        </ScrollView>
      )}
    </>
  );
}
