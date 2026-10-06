import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Phase } from '../../../components/PhaseStrip';
import { supabase } from '../../../lib/supabase';
import { pickAvatarColor, projectInitials } from '../../../lib/avatar';
import type {
  Member,
  ProfileSummary,
  Project,
  ProjectViewMode,
  WorkflowLaneKey,
} from '../../../lib/types';
import { defaultWorkflowColumnLabels } from '../../../lib/todos';
import { emailDisplayName, isValidEmailAddress, profileDisplayName } from '../../../lib/display';
import { projectInviteUrl } from '../../../lib/authSession';
import { appName } from '../constants';
import type { FeedbackState } from './useFeedback';
import type { WorkspaceViewsState } from './useWorkspaceViews';
import type { AuthState } from './useAuth';
import type { ProfileState } from './useProfile';
import type { OrganizationsState } from './useOrganizations';

type ProjectsDeps = Pick<
    FeedbackState,
    | 'setError'
    | 'setMessage'
    | 'showToast'
  > &
  Pick<
    WorkspaceViewsState,
    | 'calendarViewOpen'
    | 'dashboardViewOpen'
    | 'notesViewOpen'
    | 'projectsViewOpen'
    | 'resourcesViewOpen'
    | 'setCreateTarget'
    | 'teamsViewOpen'
  > &
  Pick<
    AuthState,
    | 'session'
  > &
  Pick<
    ProfileState,
    | 'ensureProfile'
    | 'profile'
  > &
  Pick<
    OrganizationsState,
    | 'loadOrganizations'
    | 'loadTeams'
    | 'memberById'
    | 'memberEmail'
    | 'members'
    | 'selectedTeamId'
    | 'setMemberEmail'
    | 'setMembers'
    | 'setSelectedTeamId'
    | 'teams'
  >;

export function useProjects({
  setError,
  setMessage,
  showToast,
  calendarViewOpen,
  dashboardViewOpen,
  notesViewOpen,
  projectsViewOpen,
  resourcesViewOpen,
  setCreateTarget,
  teamsViewOpen,
  session,
  ensureProfile,
  profile,
  loadOrganizations,
  loadTeams,
  memberById,
  memberEmail,
  members,
  selectedTeamId,
  setMemberEmail,
  setMembers,
  setSelectedTeamId,
  teams,
}: ProjectsDeps) {
  const [projectName, setProjectName] = useState('');
  const [newProjectTeamId, setNewProjectTeamId] = useState<string | null>(null);
  const [linkingProjectTeam, setLinkingProjectTeam] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [lastSelectedProjectId, setLastSelectedProjectId] = useState<string | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [projectViewMode, setProjectViewMode] = useState<ProjectViewMode>('plan');
  const [workflowColumnLabels, setWorkflowColumnLabels] = useState(defaultWorkflowColumnLabels);
  const [projectAccessQuery, setProjectAccessQuery] = useState('');
  const [projectAccessPeople, setProjectAccessPeople] = useState<ProfileSummary[]>([]);
  const [projectAccessSearchLoading, setProjectAccessSearchLoading] = useState(false);
  const [projectAccessBusy, setProjectAccessBusy] = useState(false);
  const [addingPhase, setAddingPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');
  const [renamingPhase, setRenamingPhase] = useState<Phase | null>(null);
  const [renamePhaseName, setRenamePhaseName] = useState('');
  const [phaseDeleteConfirming, setPhaseDeleteConfirming] = useState(false);
  const [renamingWorkflowLane, setRenamingWorkflowLane] = useState<WorkflowLaneKey | null>(null);
  const [renameWorkflowLaneName, setRenameWorkflowLaneName] = useState('');
  const [newTodoAssignee, setNewTodoAssignee] = useState<string | null>(null);
  const [renamingProject, setRenamingProject] = useState<Project | null>(null);
  const [renameProjectName, setRenameProjectName] = useState('');

  useEffect(() => {
    const uid = session?.user.id;
    let cancelled = false;
    const storageKey = uid && selectedProjectId
      ? `todo:workflow-column-labels:${uid}:${selectedProjectId}`
      : null;

    (storageKey ? AsyncStorage.getItem(storageKey) : Promise.resolve(null))
      .then((value) => {
        if (cancelled) return;
        if (!value) {
          setWorkflowColumnLabels(defaultWorkflowColumnLabels);
          return;
        }
        const labels = JSON.parse(value) as Partial<Record<WorkflowLaneKey, string>>;
        setWorkflowColumnLabels({ ...defaultWorkflowColumnLabels, ...labels });
      })
      .catch(() => {
        if (!cancelled) setWorkflowColumnLabels(defaultWorkflowColumnLabels);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId, session]);

  const isProject = selectedProjectId !== null;
  const isPersonal = selectedTeamId === null && !isProject && !projectsViewOpen && !teamsViewOpen && !notesViewOpen && !calendarViewOpen && !resourcesViewOpen && !dashboardViewOpen;
  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;
  const selectedTeam = isProject ? null : (teams.find((team) => team.id === selectedTeamId) ?? null);
  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects]
  );

  function projectAvatarFor(project: Project): { label: string; initials: string; color: string } {
    return {
      label: project.name,
      initials: projectInitials(project.name),
      color: pickAvatarColor(`project:${project.id}`),
    };
  }
  const selectedProjectOwner = useMemo(() => {
    if (!selectedProject?.created_by) return null;
    return memberById.get(selectedProject.created_by) ?? null;
  }, [memberById, selectedProject?.created_by]);
  const projectMemberAvatars = useMemo(() => {
    if (!selectedProject?.created_by) return members;
    return members.filter((member) => member.user_id !== selectedProject.created_by);
  }, [members, selectedProject?.created_by]);
  const projectAccessTeams = useMemo(() => {
    const query = projectAccessQuery.trim().toLowerCase();
    return teams
      .filter((team) => !query || team.name.toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [projectAccessQuery, teams]);
  const projectAccessPeopleVisible = useMemo(
    () => projectAccessPeople.filter((person) => !memberById.has(person.id)),
    [memberById, projectAccessPeople]
  );
  const activeProjects = useMemo(
    () => projects.filter((project) => !project.archived_at),
    [projects]
  );
  const projectAccessInviteEmail = useMemo(() => {
    const query = projectAccessQuery.trim().toLowerCase();
    if (!isValidEmailAddress(query)) return '';
    if (projectAccessPeopleVisible.some((person) => person.email.toLowerCase() === query)) return '';
    return query;
  }, [projectAccessPeopleVisible, projectAccessQuery]);

  useEffect(() => {
    if (!linkingProjectTeam) {
      setProjectAccessPeople([]);
      setProjectAccessSearchLoading(false);
      return;
    }

    const query = projectAccessQuery.trim();
    if (!query) {
      setProjectAccessPeople([]);
      setProjectAccessSearchLoading(false);
      return;
    }

    let cancelled = false;
    setProjectAccessSearchLoading(true);

    const timeout = setTimeout(async () => {
      const { data, error } = await supabase.rpc('search_profiles', {
        p_query: query,
        p_limit: 8,
      });
      if (cancelled) return;
      if (error) {
        setProjectAccessSearchLoading(false);
        setError(error.message);
        return;
      }

      setProjectAccessPeople((data ?? []) as ProfileSummary[]);
      setProjectAccessSearchLoading(false);
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [linkingProjectTeam, projectAccessQuery, setError]);

  const loadProjects = useCallback(async () => {
    if (!session) return;
    const { data, error: err } = await supabase
      .from('projects')
      .select('id, name, team_id, created_by, archived_at')
      .is('archived_at', null)
      .order('created_at', { ascending: true });
    if (err) return;

    if ((data ?? []).length === 0) {
      const { data: seeded } = await supabase
        .from('projects')
        .insert({ name: 'Individual' })
        .select('id, name, team_id, created_by, archived_at')
        .single();
      setProjects(seeded ? [seeded as Project] : []);
    } else {
      setProjects(data as Project[]);
    }
  }, [session]);

  const loadPhases = useCallback(async () => {
    if (!selectedProjectId) {
      setPhases([]);
      return;
    }
    const { data, error: err } = await supabase
      .from('project_phases')
      .select('id, project_id, name, order_index, status, planned_start, planned_end')
      .eq('project_id', selectedProjectId)
      .order('order_index', { ascending: true });
    if (!err) setPhases(data ?? []);
  }, [selectedProjectId]);

  const loadMembers = useCallback(async () => {
    if (selectedProjectId) {
      // Load explicit project members.
      const { data: pmData, error: pmError } = await supabase
        .from('project_members')
        .select('user_id, role')
        .eq('project_id', selectedProjectId);
      if (pmError) { setError(pmError.message); return; }

      // Also union team members if the project is linked to a team.
      const project = projects.find((p) => p.id === selectedProjectId);
      const teamId = project?.team_id ?? null;
      let teamMemberships: { user_id: string; role: string }[] = [];
      if (teamId) {
        const { data: tmData } = await supabase
          .from('team_members')
          .select('user_id, role')
          .eq('team_id', teamId);
        teamMemberships = tmData ?? [];
      }

      // Deduplicate; project_members role takes precedence.
      const roleMap = new Map<string, string>();
      teamMemberships.forEach((m) => roleMap.set(m.user_id, m.role));
      (pmData ?? []).forEach((m) => roleMap.set(m.user_id, m.role));
      const ownerId = selectedProject?.created_by ?? null;
      if (ownerId) {
        roleMap.set(ownerId, 'owner');
      }

      const ids = [...roleMap.keys()];
      if (ids.length === 0) { setMembers([]); setNewTodoAssignee(null); return; }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, display_name, avatar_url')
        .in('id', ids);
      if (profileError) { setError(profileError.message); return; }

      const profilesById = new Map((profileData ?? []).map((p) => [p.id, p]));
      const nextMembers: Member[] = ids
        .filter((id) => profilesById.has(id))
        .map((id) => ({
          user_id: id,
          role: roleMap.get(id) ?? 'member',
          email: profilesById.get(id)!.email,
          display_name: profilesById.get(id)!.display_name ?? null,
          avatar_url: profilesById.get(id)!.avatar_url ?? null,
        }));

      setMembers(nextMembers);
      setNewTodoAssignee((current) => {
        if (current && nextMembers.some((m) => m.user_id === current)) return current;
        return session?.user.id ?? nextMembers[0]?.user_id ?? null;
      });
      setError('');
      return;
    }

    // Team-only context (no project selected).
    const teamId = selectedTeamId;
    if (!teamId) { setMembers([]); setNewTodoAssignee(null); return; }

    const { data: membershipData, error: membershipError } = await supabase
      .from('team_members')
      .select('user_id, role')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true });
    if (membershipError) { setError(membershipError.message); return; }

    const memberships = membershipData ?? [];
    const ids = memberships.map((member) => member.user_id);
    if (ids.length === 0) { setMembers([]); setNewTodoAssignee(null); return; }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, display_name, avatar_url')
      .in('id', ids);
    if (profileError) { setError(profileError.message); return; }

    const profilesById = new Map((profileData ?? []).map((profile) => [profile.id, profile]));
    const nextMembers = memberships.map((member) => ({
      user_id: member.user_id,
      role: member.role,
      email: profilesById.get(member.user_id)?.email ?? 'unknown@example.com',
      display_name: profilesById.get(member.user_id)?.display_name ?? null,
      avatar_url: profilesById.get(member.user_id)?.avatar_url ?? null,
    }));

    setMembers(nextMembers);
    setNewTodoAssignee((current) => {
      if (current && nextMembers.some((member) => member.user_id === current)) return current;
      return session?.user.id ?? nextMembers[0]?.user_id ?? null;
    });
    setError('');
  }, [selectedTeamId, selectedProjectId, selectedProject?.created_by, projects, session, setError, setMembers]);

  useEffect(() => {
    if (!session) return;

    ensureProfile(session).then(() => {
      loadOrganizations();
      loadTeams();
      loadProjects();
    });
  }, [ensureProfile, loadOrganizations, loadTeams, loadProjects, session]);

  useEffect(() => {
    if (!session) return;
    loadPhases();
  }, [loadPhases, session]);

  async function renameProject() {
    if (!renamingProject) return;
    const name = renameProjectName.trim();
    if (!name) return;
    const { error: err } = await supabase.from('projects').update({ name }).eq('id', renamingProject.id);
    if (err) { setError(err.message); return; }
    setProjects((prev) => prev.map((p) => p.id === renamingProject.id ? { ...p, name } : p));
    setRenamingProject(null);
    setRenameProjectName('');
    setError('');
  }

  async function createProject() {
    if (!session) return;
    const name = projectName.trim();
    if (!name) return;

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({ name, created_by: session.user.id, team_id: newProjectTeamId })
      .select('id, name, team_id, created_by, archived_at')
      .single();

    if (projectError) {
      setError(projectError.message);
      return;
    }

    const defaultPhases = ['Planning', 'Execution', 'Review'];
    const createdPhases = await Promise.all(
      defaultPhases.map((phaseName, i) =>
        supabase
          .from('project_phases')
          .insert({
            project_id: project.id,
            name: phaseName,
            order_index: i,
            status: i === 0 ? 'active' : 'upcoming',
          })
          .select('id, project_id, name, order_index, status, planned_start, planned_end')
          .single()
      )
    );
    const nextPhases = createdPhases
      .map((result) => result.data)
      .filter((phase): phase is Phase => !!phase);

    // Auto-add the creator to the linked team so they can assign tasks.
    if (newProjectTeamId) {
      await supabase
        .from('team_members')
        .insert({ team_id: newProjectTeamId, user_id: session.user.id, role: 'member' })
        .select();
    }

    setProjectName('');
    setNewProjectTeamId(null);
    setProjects((prev) => [...prev, project]);
    setPhases(nextPhases);
    setSelectedProjectId(project.id);
    setLastSelectedProjectId(project.id);
    setSelectedTeamId(null);
    setCreateTarget(null);
    setMessage('');
    setError('');
  }

  async function linkProjectTeam(teamId: string | null) {
    if (!selectedProjectId || !session) return;
    const { error } = await supabase
      .from('projects')
      .update({ team_id: teamId })
      .eq('id', selectedProjectId);
    if (error) { setError(error.message); return; }

    // Auto-add the project owner to the linked team so they can assign tasks.
    if (teamId) {
      await supabase
        .from('team_members')
        .insert({ team_id: teamId, user_id: session.user.id, role: 'member' })
        .select();
    }

    setProjects((prev) =>
      prev.map((p) => p.id === selectedProjectId ? { ...p, team_id: teamId } : p)
    );
    closeProjectAccessModal();
    loadMembers();
  }

  function openProjectAccessModal() {
    setProjectAccessQuery('');
    setProjectAccessPeople([]);
    setProjectAccessBusy(false);
    setProjectAccessSearchLoading(false);
    setError('');
    setLinkingProjectTeam(true);
  }

  function closeProjectAccessModal() {
    setLinkingProjectTeam(false);
    setProjectAccessQuery('');
    setProjectAccessPeople([]);
    setProjectAccessBusy(false);
    setProjectAccessSearchLoading(false);
    setError('');
  }

  async function addProjectMember(profile: ProfileSummary) {
    if (!selectedProjectId) return false;

    const { error: insertError } = await supabase
      .from('project_members')
      .upsert({
        project_id: selectedProjectId,
        user_id: profile.id,
        role: 'member',
      });

    if (insertError) {
      setError(insertError.message);
      return false;
    }

    setProjectAccessQuery('');
    setProjectAccessPeople([]);
    await loadMembers();
    showToast(`${profileDisplayName(profile)} added to project.`);
    return true;
  }

  async function addProjectMemberByProfile(profile: ProfileSummary) {
    if (!selectedProjectId || projectAccessBusy) return;
    setProjectAccessBusy(true);
    try {
      await addProjectMember(profile);
    } finally {
      setProjectAccessBusy(false);
    }
  }

  async function inviteProjectMemberByEmail(rawEmail: string) {
    if (!selectedProjectId || !selectedProject || projectAccessBusy) return;
    const normalizedEmail = rawEmail.trim().toLowerCase();
    if (!isValidEmailAddress(normalizedEmail)) {
      setError('Enter a valid email address to invite.');
      return;
    }

    setProjectAccessBusy(true);
    try {
      const { data: rows, error: inviteError } = await supabase.rpc('create_project_invitation', {
        p_project_id: selectedProjectId,
        p_email: normalizedEmail,
      });
      if (inviteError) {
        setError(inviteError.message);
        return;
      }

      const invite = rows?.[0] ?? null;
      if (!invite?.token) {
        setError('Could not create the project invitation.');
        return;
      }

      const inviterName = profile ? profileDisplayName(profile) : emailDisplayName(session?.user.email);
      const inviteLink = projectInviteUrl(invite.token);
      const subject = `${inviterName} invited you to ${selectedProject.name} in ${appName}`;
      const body = [
        `Hi,`,
        '',
        `${inviterName} has invited you to the project "${selectedProject.name}" in ${appName}.`,
        'Would you accept this invitation?',
        `You will need to create a member account in ${appName} before you can join the project if you do not already have one.`,
        '',
        `Open this invitation link: ${inviteLink}`,
        '',
        `If you already have a ${appName} account, sign in with this email address to accept the invite.`,
      ].join('\n');

      const mailtoUrl = `mailto:${encodeURIComponent(normalizedEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        setMessage(`Invitation created for ${normalizedEmail}. Copy this link: ${inviteLink}`);
      }

      setProjectAccessQuery('');
      setProjectAccessPeople([]);
      showToast(`Invitation prepared for ${normalizedEmail}.`);
    } finally {
      setProjectAccessBusy(false);
    }
  }

  async function addMember() {
    if (!selectedTeamId) return;

    const normalizedEmail = memberEmail.trim().toLowerCase();
    if (!normalizedEmail) return;

    const { data: rows, error: profileError } = await supabase
      .rpc('find_profile_by_email', { p_email: normalizedEmail });

    if (profileError) {
      setError(profileError.message);
      return;
    }

    const profile = rows?.[0] ?? null;
    if (!profile) {
      setError('No account found for that email. They must sign in at least once before you can add them.');
      return;
    }

    const { error: memberError } = await supabase.from('team_members').upsert({
      team_id: selectedTeamId,
      user_id: profile.id,
      role: 'member',
    });

    if (memberError) {
      setError(memberError.message);
      return;
    }

    setMemberEmail('');
    setMessage(`Added ${profile.email}.`);
    setError('');
    loadMembers();
  }

  async function archiveProject(id: string) {
    const archived_at = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('projects')
      .update({ archived_at })
      .eq('id', id);
    if (updateError) { setError(updateError.message); return; }
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (selectedProjectId === id) setSelectedProjectId(null);
    if (lastSelectedProjectId === id) setLastSelectedProjectId(null);
    setError('');
  }

  async function cyclePhaseStatus(phase: Phase) {
    const order: Phase['status'][] = ['upcoming', 'active', 'completed'];
    const next = order[(order.indexOf(phase.status) + 1) % order.length];
    const { error: updateError } = await supabase
      .from('project_phases')
      .update({ status: next })
      .eq('id', phase.id);
    if (updateError) { setError(updateError.message); return; }
    setPhases((prev) => prev.map((p) => (p.id === phase.id ? { ...p, status: next } : p)));
  }

  async function addPhase() {
    if (!selectedProjectId) return;
    const name = newPhaseName.trim();
    if (!name) return;
    const { data, error: err } = await supabase
      .from('project_phases')
      .insert({ project_id: selectedProjectId, name, order_index: phases.length, status: 'upcoming' })
      .select('id, project_id, name, order_index, status, planned_start, planned_end')
      .single();
    if (err) { setError(err.message); return; }
    if (data) {
      setPhases((prev) => [...prev, data as Phase]);
    }
    setNewPhaseName('');
    setAddingPhase(false);
  }

  function openRenamePhase(phase: Phase) {
    setRenamingPhase(phase);
    setRenamePhaseName(phase.name);
    setPhaseDeleteConfirming(false);
  }

  function closeRenamePhase() {
    setRenamingPhase(null);
    setRenamePhaseName('');
    setPhaseDeleteConfirming(false);
  }

  async function saveRenamePhase() {
    if (!renamingPhase) return;
    const name = renamePhaseName.trim();
    if (!name) return;

    const { error: updateError } = await supabase
      .from('project_phases')
      .update({ name })
      .eq('id', renamingPhase.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setPhases((prev) => prev.map((phase) => (
      phase.id === renamingPhase.id ? { ...phase, name } : phase
    )));
    closeRenamePhase();
    setError('');
  }

  function openRenameWorkflowLane(lane: WorkflowLaneKey) {
    setRenamingWorkflowLane(lane);
    setRenameWorkflowLaneName(workflowColumnLabels[lane]);
  }

  function closeRenameWorkflowLane() {
    setRenamingWorkflowLane(null);
    setRenameWorkflowLaneName('');
  }

  async function saveRenameWorkflowLane() {
    if (!selectedProjectId || !renamingWorkflowLane) return;
    const name = renameWorkflowLaneName.trim();
    if (!name) return;

    const labels = {
      ...workflowColumnLabels,
      [renamingWorkflowLane]: name,
    };
    setWorkflowColumnLabels(labels);
    const uid = session?.user.id;
    if (uid) {
      await AsyncStorage.setItem(
        `todo:workflow-column-labels:${uid}:${selectedProjectId}`,
        JSON.stringify(labels)
      );
    }
    closeRenameWorkflowLane();
  }

  return {
    projectName,
    setProjectName,
    newProjectTeamId,
    setNewProjectTeamId,
    linkingProjectTeam,
    projects,
    setProjects,
    selectedProjectId,
    setSelectedProjectId,
    lastSelectedProjectId,
    setLastSelectedProjectId,
    phases,
    setPhases,
    projectViewMode,
    setProjectViewMode,
    workflowColumnLabels,
    projectAccessQuery,
    setProjectAccessQuery,
    projectAccessSearchLoading,
    projectAccessBusy,
    addingPhase,
    setAddingPhase,
    newPhaseName,
    setNewPhaseName,
    renamingPhase,
    renamePhaseName,
    setRenamePhaseName,
    phaseDeleteConfirming,
    setPhaseDeleteConfirming,
    renamingWorkflowLane,
    renameWorkflowLaneName,
    setRenameWorkflowLaneName,
    newTodoAssignee,
    setNewTodoAssignee,
    renamingProject,
    setRenamingProject,
    renameProjectName,
    setRenameProjectName,
    isProject,
    isPersonal,
    selectedProject,
    selectedTeam,
    projectById,
    projectAvatarFor,
    selectedProjectOwner,
    projectMemberAvatars,
    projectAccessTeams,
    projectAccessPeopleVisible,
    activeProjects,
    projectAccessInviteEmail,
    loadMembers,
    renameProject,
    createProject,
    linkProjectTeam,
    openProjectAccessModal,
    closeProjectAccessModal,
    addProjectMemberByProfile,
    inviteProjectMemberByEmail,
    addMember,
    cyclePhaseStatus,
    addPhase,
    openRenamePhase,
    closeRenamePhase,
    saveRenamePhase,
    openRenameWorkflowLane,
    closeRenameWorkflowLane,
    saveRenameWorkflowLane,
  };
}

export type ProjectsState = ReturnType<typeof useProjects>;
