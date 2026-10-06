import { useCallback, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Member, Organization, Team } from '../../../lib/types';
import type { FeedbackState } from './useFeedback';
import type { WorkspaceViewsState } from './useWorkspaceViews';
import type { AuthState } from './useAuth';

type OrganizationsDeps = Pick<
    FeedbackState,
    | 'setError'
    | 'setMessage'
  > &
  Pick<
    WorkspaceViewsState,
    | 'openCreateTarget'
    | 'setCreateTarget'
  > &
  Pick<
    AuthState,
    | 'session'
  >;

export function useOrganizations({
  setError,
  setMessage,
  openCreateTarget,
  setCreateTarget,
  session,
}: OrganizationsDeps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [newTeamOrgId, setNewTeamOrgId] = useState<string | null>(null);
  const [orgModalId, setOrgModalId] = useState<string | null>(null);
  const [orgModalMembers, setOrgModalMembers] = useState<Member[]>([]);
  const [orgMemberEmail, setOrgMemberEmail] = useState('');
  const [orgManageMember, setOrgManageMember] = useState<Member | null>(null);
  const [memberEmail, setMemberEmail] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [renamingTeam, setRenamingTeam] = useState<Team | null>(null);
  const [renameTeamName, setRenameTeamName] = useState('');
  const [renamingOrg, setRenamingOrg] = useState<Organization | null>(null);
  const [renameOrgName, setRenameOrgName] = useState('');
  const memberById = useMemo(
    () => new Map(members.map((member) => [member.user_id, member])),
    [members]
  );
  const currentOrgRole = orgModalId
    ? (orgModalMembers.find((m) => m.user_id === session?.user.id)?.role ?? null)
    : null;
  const currentTeamRole = selectedTeamId
    ? (members.find((m) => m.user_id === session?.user.id)?.role ?? null)
    : null;

  const loadTeams = useCallback(async () => {
    if (!session) return;

    const { data, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, org_id, team_members(count)')
      .order('created_at', { ascending: true });

    if (teamsError) {
      setError(teamsError.message);
      return;
    }

    const nextTeams = (data ?? []).map((t: any) => ({
      id: t.id,
      name: t.name,
      org_id: t.org_id ?? null,
      member_count: t.team_members?.[0]?.count ?? 0,
    }));
    setTeams(nextTeams);
    setSelectedTeamId((current) => {
      if (current && nextTeams.some((team) => team.id === current)) {
        return current;
      }
      return null;
    });
    setError('');
  }, [session, setError]);

  const loadOrganizations = useCallback(async () => {
    if (!session) return;
    const { data, error: err } = await supabase
      .from('organizations')
      .select('id, name, org_members(count)')
      .order('created_at', { ascending: true });
    if (err) { setError(err.message); return; }
    setOrganizations(
      (data ?? []).map((o: any) => ({
        id: o.id,
        name: o.name,
        member_count: o.org_members?.[0]?.count ?? 0,
      }))
    );
  }, [session, setError]);

  async function renameTeam() {
    if (!renamingTeam) return;
    const name = renameTeamName.trim();
    if (!name) return;
    const { error: err } = await supabase.from('teams').update({ name }).eq('id', renamingTeam.id);
    if (err) { setError(err.message); return; }
    setTeams((prev) => prev.map((t) => t.id === renamingTeam.id ? { ...t, name } : t));
    setRenamingTeam(null);
    setRenameTeamName('');
    setError('');
  }

  async function renameOrg() {
    if (!renamingOrg) return;
    const name = renameOrgName.trim();
    if (!name) return;
    const { error: err } = await supabase.from('organizations').update({ name }).eq('id', renamingOrg.id);
    if (err) { setError(err.message); return; }
    setOrganizations((prev) => prev.map((o) => o.id === renamingOrg.id ? { ...o, name } : o));
    setRenamingOrg(null);
    setRenameOrgName('');
    setError('');
  }

  function openCreateTeam(orgId: string | null = null) {
    setNewTeamOrgId(orgId);
    openCreateTarget('team');
  }

  async function createTeam() {
    if (!session) return;

    const name = teamName.trim();
    if (!name) return;

    const { data, error: teamError } = await supabase
      .rpc('create_team_with_owner', { p_name: name, p_org_id: newTeamOrgId });

    if (teamError) {
      setError(teamError.message);
      return;
    }

    const team = (data as Array<{ id: string; name: string; org_id: string | null }>)?.[0];
    if (!team) {
      setError('Failed to create team.');
      return;
    }

    setTeamName('');
    setNewTeamOrgId(null);
    setTeams((prev) => [...prev, team]);
    setSelectedTeamId(team.id);
    setCreateTarget(null);
    setMessage(`Created ${team.name}.`);
    setError('');
  }

  async function createOrganization() {
    if (!session) return;
    const name = orgName.trim();
    if (!name) return;

    const { data, error: orgError } = await supabase
      .rpc('create_org_with_owner', { p_name: name });

    if (orgError) { setError(orgError.message); return; }

    const org = (data as Array<{ id: string; name: string }>)?.[0];
    if (!org) { setError('Failed to create organization.'); return; }

    setOrgName('');
    setOrganizations((prev) => [...prev, { ...org, member_count: 1 }]);
    setCreateTarget(null);
    setMessage(`Created ${org.name}.`);
    setError('');
  }

  function selectTeamFromAccountMenu(teamId: string) {
    setSelectedTeamId(teamId);
  }

  async function loadOrgMembers(orgId: string) {
    const { data: membershipData, error: membershipError } = await supabase
      .from('org_members')
      .select('user_id, role')
      .eq('org_id', orgId)
      .order('created_at', { ascending: true });

    if (membershipError) { setError(membershipError.message); return; }

    const ids = (membershipData ?? []).map((m) => m.user_id);
    if (ids.length === 0) { setOrgModalMembers([]); return; }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, display_name, avatar_url')
      .in('id', ids);

    if (profileError) { setError(profileError.message); return; }

    const profilesById = new Map((profileData ?? []).map((p) => [p.id, p]));
    setOrgModalMembers(
      (membershipData ?? []).map((m) => ({
        user_id: m.user_id,
        role: m.role,
        email: profilesById.get(m.user_id)?.email ?? 'unknown@example.com',
        display_name: profilesById.get(m.user_id)?.display_name ?? null,
        avatar_url: profilesById.get(m.user_id)?.avatar_url ?? null,
      }))
    );
  }

  async function openOrgModal(orgId: string) {
    setOrgModalId(orgId);
    setOrgMemberEmail('');
    setError('');
    await loadOrgMembers(orgId);
  }

  async function addOrgMember() {
    if (!orgModalId) return;
    const normalizedEmail = orgMemberEmail.trim().toLowerCase();
    if (!normalizedEmail) return;

    const { data: rows, error: profileError } = await supabase
      .rpc('find_profile_by_email', { p_email: normalizedEmail });

    if (profileError) { setError(profileError.message); return; }

    const profile = rows?.[0] ?? null;
    if (!profile) {
      setError('No account found for that email. They must sign in at least once before you can add them.');
      return;
    }

    const { error: memberError } = await supabase.from('org_members').upsert({
      org_id: orgModalId,
      user_id: profile.id,
      role: 'member',
    });

    if (memberError) { setError(memberError.message); return; }

    setOrgMemberEmail('');
    setError('');
    setOrganizations((prev) =>
      prev.map((o) =>
        o.id === orgModalId ? { ...o, member_count: (o.member_count ?? 0) + 1 } : o
      )
    );
    loadOrgMembers(orgModalId);
  }

  async function transferOrgOwnership(memberId: string) {
    if (!orgModalId) return;
    const { error } = await supabase.rpc('transfer_org_ownership', {
      p_org_id: orgModalId,
      p_new_owner_id: memberId,
    });
    if (error) { setError(error.message); return; }
    setOrgManageMember(null);
    setError('');
    loadOrgMembers(orgModalId);
  }

  async function updateOrgMemberRole(memberId: string, role: 'admin' | 'member') {
    if (!orgModalId) return;
    const { error } = await supabase
      .from('org_members')
      .update({ role })
      .eq('org_id', orgModalId)
      .eq('user_id', memberId);
    if (error) { setError(error.message); return; }
    setOrgManageMember(null);
    setError('');
    loadOrgMembers(orgModalId);
  }

  async function removeOrgMember(memberId: string) {
    if (!orgModalId) return;
    const { error } = await supabase
      .from('org_members')
      .delete()
      .eq('org_id', orgModalId)
      .eq('user_id', memberId);
    if (error) { setError(error.message); return; }
    setOrgManageMember(null);
    setError('');
    setOrganizations((prev) =>
      prev.map((o) =>
        o.id === orgModalId ? { ...o, member_count: Math.max(0, (o.member_count ?? 1) - 1) } : o
      )
    );
    loadOrgMembers(orgModalId);
  }

  return {
    organizations,
    setOrganizations,
    teams,
    setTeams,
    selectedTeamId,
    setSelectedTeamId,
    orgName,
    setOrgName,
    teamName,
    setTeamName,
    newTeamOrgId,
    setNewTeamOrgId,
    orgModalId,
    setOrgModalId,
    orgModalMembers,
    orgMemberEmail,
    setOrgMemberEmail,
    orgManageMember,
    setOrgManageMember,
    memberEmail,
    setMemberEmail,
    members,
    setMembers,
    renamingTeam,
    setRenamingTeam,
    renameTeamName,
    setRenameTeamName,
    renamingOrg,
    setRenamingOrg,
    renameOrgName,
    setRenameOrgName,
    memberById,
    currentOrgRole,
    currentTeamRole,
    loadTeams,
    loadOrganizations,
    renameTeam,
    renameOrg,
    openCreateTeam,
    createTeam,
    createOrganization,
    selectTeamFromAccountMenu,
    openOrgModal,
    addOrgMember,
    transferOrgOwnership,
    updateOrgMemberRole,
    removeOrgMember,
  };
}

export type OrganizationsState = ReturnType<typeof useOrganizations>;
