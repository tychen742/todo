import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../lib/supabase';
import type {
  MindmapPoint,
  MindmapTemplateKey,
  Todo,
  WorkspaceMindmap,
  WorkspaceMindmapRow,
  WorkspaceMindmapSettings,
} from '../../../lib/types';
import {
  addMindmapNode,
  canReparentMindmapNode,
  defaultMindmapSettings,
  deleteMindmapNode,
  findMindmapNodeLocation,
  mapMindmapNodes,
  mindmapBody,
  mindmapNodesFromTopics,
  mindmapTemplateFor,
  moveMindmapNode,
  reparentMindmapNode,
  readLocalWorkspaceNotes,
  relayoutMindmapNodes,
  restoreMindmapNode,
  workspaceMindmapDbPayload,
  workspaceMindmapFromRow,
  workspaceNotesStorageKey,
} from '../../../lib/mindmaps';
import type { FeedbackState } from './useFeedback';
import type { AuthState } from './useAuth';
import type { OrganizationsState } from './useOrganizations';
import type { ProjectsState } from './useProjects';
import type { TodosState } from './useTodos';
import type { TodoPickersState } from './useTodoPickers';
import type { TodoEditingState } from './useTodoEditing';

type MindmapsDeps = Pick<
    FeedbackState,
    | 'mindmapNodeUndo'
    | 'setError'
    | 'setMindmapNodeUndo'
    | 'setToast'
    | 'showToast'
  > &
  Pick<
    AuthState,
    | 'session'
  > &
  Pick<
    OrganizationsState,
    | 'selectedTeamId'
  > &
  Pick<
    ProjectsState,
    | 'isProject'
    | 'newTodoAssignee'
    | 'selectedProjectId'
  > &
  Pick<
    TodosState,
    | 'newTodoProjectId'
  > &
  Pick<
    TodoPickersState,
    | 'setIsCreatingTodo'
  > &
  Pick<
    TodoEditingState,
    | 'openEditModal'
  >;

export function useMindmaps({
  mindmapNodeUndo,
  setError,
  setMindmapNodeUndo,
  setToast,
  showToast,
  session,
  selectedTeamId,
  isProject,
  newTodoAssignee,
  selectedProjectId,
  newTodoProjectId,
  setIsCreatingTodo,
  openEditModal,
}: MindmapsDeps) {
  const [workspaceIdeas, setWorkspaceIdeas] = useState('');
  const [workspaceMindmaps, setWorkspaceMindmaps] = useState<WorkspaceMindmap[]>([]);
  const [activeMindmapId, setActiveMindmapId] = useState<string | null>(null);
  const [mindmapTemplatePickerOpen, setMindmapTemplatePickerOpen] = useState(false);

  useEffect(() => {
    const uid = session?.user.id;
    let cancelled = false;
    if (!uid) return;

    Promise.all([
      supabase
        .from('workspace_mindmaps')
        .select('id, title, body, created_at, template, topics, root_position, nodes, settings')
        .eq('owner_id', uid)
        .order('created_at', { ascending: false }),
      readLocalWorkspaceNotes(uid),
    ])
      .then(([syncedResult, localNotes]) => {
        if (cancelled) return;

        if (syncedResult.error) {
          setWorkspaceIdeas(localNotes.ideas);
          setWorkspaceMindmaps(localNotes.mindmaps);
          setActiveMindmapId((currentId) => (
            currentId && localNotes.mindmaps.some((mindmap) => mindmap.id === currentId)
              ? currentId
              : localNotes.mindmaps[0]?.id ?? null
          ));
          setError(syncedResult.error.message);
          return;
        }

        const syncedMindmaps = ((syncedResult.data ?? []) as WorkspaceMindmapRow[])
          .map((row) => workspaceMindmapFromRow(row));
        const nextMindmaps = syncedMindmaps.length > 0 ? syncedMindmaps : localNotes.mindmaps;
        setWorkspaceIdeas(localNotes.ideas);
        setWorkspaceMindmaps(nextMindmaps);
        setActiveMindmapId((currentId) => (
          currentId && nextMindmaps.some((mindmap) => mindmap.id === currentId)
            ? currentId
            : nextMindmaps[0]?.id ?? null
        ));

        if (syncedMindmaps.length === 0 && localNotes.mindmaps.length > 0) {
          supabase
            .from('workspace_mindmaps')
            .upsert(localNotes.mindmaps.map((mindmap) => workspaceMindmapDbPayload(uid, mindmap)))
            .then(({ error: migrationError }) => {
              if (migrationError && !cancelled) setError(migrationError.message);
            });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWorkspaceIdeas('');
          setWorkspaceMindmaps([]);
          setActiveMindmapId(null);
          setMindmapTemplatePickerOpen(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session, setError]);

  function saveWorkspaceNotes(
    nextIdeas: string,
    nextMindmaps: WorkspaceMindmap[]
  ) {
    const uid = session?.user.id;
    if (!uid) return;
    AsyncStorage.setItem(
      workspaceNotesStorageKey(uid),
      JSON.stringify({ ideas: nextIdeas, mindmaps: nextMindmaps })
    ).catch(() => {
      setError('Could not save notes.');
    });
  }

  function saveWorkspaceMindmap(mindmap: WorkspaceMindmap) {
    const uid = session?.user.id;
    if (!uid) return;
    supabase
      .from('workspace_mindmaps')
      .upsert(workspaceMindmapDbPayload(uid, mindmap))
      .then(({ error: saveError }) => {
        if (saveError) setError(saveError.message);
      });
  }

  function createWorkspaceMindmap(templateKey: MindmapTemplateKey) {
    const template = mindmapTemplateFor(templateKey);
    const nodes = mindmapNodesFromTopics(template.topics, template.key);
    const settings = defaultMindmapSettings(template.key);
    const id = `${Date.now()}`;
    const mindmap = {
      id,
      title: template.title,
      body: mindmapBody(template.title, nodes),
      created_at: new Date().toISOString(),
      template: template.key,
      topics: nodes.map((node) => node.label),
      nodes,
      settings,
    };
    const nextMindmaps = [
      mindmap,
      ...workspaceMindmaps,
    ];
    setWorkspaceMindmaps(nextMindmaps);
    setActiveMindmapId(id);
    setMindmapTemplatePickerOpen(false);
    saveWorkspaceNotes(workspaceIdeas, nextMindmaps);
    saveWorkspaceMindmap(mindmap);
  }

  function deleteWorkspaceMindmap(id: string) {
    const nextMindmaps = workspaceMindmaps.filter((mindmap) => mindmap.id !== id);
    setWorkspaceMindmaps(nextMindmaps);
    setActiveMindmapId((currentId) => (
      currentId === id ? nextMindmaps[0]?.id ?? null : currentId
    ));
    saveWorkspaceNotes(workspaceIdeas, nextMindmaps);
    supabase
      .from('workspace_mindmaps')
      .delete()
      .eq('id', id)
      .eq('owner_id', session?.user.id ?? '')
      .then(({ error: deleteError }) => {
        if (deleteError) setError(deleteError.message);
      });
  }

  function updateWorkspaceMindmap(id: string, updates: Partial<Pick<WorkspaceMindmap, 'title' | 'nodes' | 'root_position' | 'settings'>>) {
    let updatedMindmap: WorkspaceMindmap | null = null;
    const nextMindmaps = workspaceMindmaps.map((mindmap) => {
      if (mindmap.id !== id) return mindmap;
      const title = updates.title ?? mindmap.title;
      const nodes = updates.nodes ?? mindmap.nodes;
      updatedMindmap = {
        ...mindmap,
        title,
        nodes,
        settings: updates.settings ?? mindmap.settings,
        root_position: updates.root_position ?? mindmap.root_position,
        topics: nodes.map((node) => node.label),
        body: mindmapBody(title, nodes),
      };
      return updatedMindmap;
    });
    setWorkspaceMindmaps(nextMindmaps);
    saveWorkspaceNotes(workspaceIdeas, nextMindmaps);
    if (updatedMindmap) saveWorkspaceMindmap(updatedMindmap);
  }

  function addWorkspaceMindmapNode(id: string, parentNodeId: string | null) {
    const mindmap = workspaceMindmaps.find((item) => item.id === id);
    if (!mindmap) return;
    // New nodes start empty so the input's greyed placeholder (Topic N / Child) shows until the user types.
    const label = '';
    const layoutTemplateKey = mindmap.settings.layout === 'right' ? 'right-stack' : mindmap.template;
    updateWorkspaceMindmap(id, { nodes: addMindmapNode(mindmap.nodes, parentNodeId, label, layoutTemplateKey) });
  }

  function updateWorkspaceMindmapSettings(id: string, updates: Partial<WorkspaceMindmapSettings>) {
    const mindmap = workspaceMindmaps.find((item) => item.id === id);
    if (!mindmap) return;
    const nextSettings = { ...mindmap.settings, ...updates };
    const shouldRelayout = updates.layout !== undefined && updates.layout !== mindmap.settings.layout;
    updateWorkspaceMindmap(id, {
      settings: nextSettings,
      nodes: shouldRelayout
        ? relayoutMindmapNodes(mindmap.nodes, mindmap.template, nextSettings.layout)
        : mindmap.nodes,
    });
  }

  function updateWorkspaceMindmapNodeLabel(id: string, nodeId: string, value: string) {
    const mindmap = workspaceMindmaps.find((item) => item.id === id);
    if (!mindmap) return;
    updateWorkspaceMindmap(id, {
      nodes: mapMindmapNodes(mindmap.nodes, nodeId, (node) => ({ ...node, label: value })),
    });
  }

  function deleteWorkspaceMindmapNode(id: string, nodeId: string) {
    const mindmap = workspaceMindmaps.find((item) => item.id === id);
    if (!mindmap) return;
    if (mindmap.nodes.length <= 1 && mindmap.nodes.some((node) => node.id === nodeId)) return;
    const location = findMindmapNodeLocation(mindmap.nodes, nodeId);
    updateWorkspaceMindmap(id, {
      nodes: deleteMindmapNode(mindmap.nodes, nodeId),
    });
    if (!location) return;
    const label = location.node.label.trim();
    showToast(label ? `Deleted "${label}".` : 'Node deleted.');
    setMindmapNodeUndo({ mindmapId: id, location });
  }

  function undoMindmapNodeDelete() {
    if (!mindmapNodeUndo) return;
    const mindmap = workspaceMindmaps.find((item) => item.id === mindmapNodeUndo.mindmapId);
    setMindmapNodeUndo(null);
    setToast('');
    if (!mindmap) return;
    updateWorkspaceMindmap(mindmap.id, { nodes: restoreMindmapNode(mindmap.nodes, mindmapNodeUndo.location) });
  }

  function updateWorkspaceMindmapRootPosition(id: string, point: MindmapPoint) {
    updateWorkspaceMindmap(id, { root_position: point });
  }

  function updateWorkspaceMindmapNodePosition(id: string, nodeId: string, point: MindmapPoint) {
    const mindmap = workspaceMindmaps.find((item) => item.id === id);
    if (!mindmap) return;
    updateWorkspaceMindmap(id, {
      nodes: moveMindmapNode(mindmap.nodes, nodeId, point),
    });
  }

  function reparentWorkspaceMindmapNode(id: string, nodeId: string, parentNodeId: string | null) {
    const mindmap = workspaceMindmaps.find((item) => item.id === id);
    if (!mindmap || !canReparentMindmapNode(mindmap.nodes, nodeId, parentNodeId)) return false;
    const layoutTemplateKey = mindmap.settings.layout === 'right' ? 'right-stack' : mindmap.template;
    const nodes = reparentMindmapNode(mindmap.nodes, nodeId, parentNodeId, layoutTemplateKey);
    if (nodes === mindmap.nodes) return false;
    updateWorkspaceMindmap(id, { nodes });
    return true;
  }

  function createTodoFromMindmapNode(label: string) {
    if (!session) return;
    const projectId = isProject ? selectedProjectId : newTodoProjectId;
    const assignedTo = selectedTeamId && !isProject ? newTodoAssignee : null;
    const draft: Todo = {
      id: '',
      text: label.trim(),
      done: false,
      scheduled_start_at: null,
      started_work_at: null,
      assigned_to: assignedTo,
      created_by: session.user.id,
      priority: 'normal',
      due_date: null,
      note: null,
      created_at: new Date().toISOString(),
      assigned_at: null,
      accepted_at: null,
      completed_at: null,
      archived_at: null,
      position: null,
      workflow_position: null,
      is_milestone: false,
      project_id: projectId ?? null,
      phase_id: null,
      workflow_status: 'backlog',
      team_id: projectId ? null : isProject ? null : selectedTeamId,
      estimate: null,
    };
    setIsCreatingTodo(true);
    openEditModal(draft);
  }

  return {
    setWorkspaceIdeas,
    workspaceMindmaps,
    setWorkspaceMindmaps,
    activeMindmapId,
    setActiveMindmapId,
    mindmapTemplatePickerOpen,
    setMindmapTemplatePickerOpen,
    createWorkspaceMindmap,
    deleteWorkspaceMindmap,
    updateWorkspaceMindmap,
    addWorkspaceMindmapNode,
    updateWorkspaceMindmapSettings,
    updateWorkspaceMindmapNodeLabel,
    deleteWorkspaceMindmapNode,
    undoMindmapNodeDelete,
    updateWorkspaceMindmapRootPosition,
    updateWorkspaceMindmapNodePosition,
    reparentWorkspaceMindmapNode,
    createTodoFromMindmapNode,
  };
}

export type MindmapsState = ReturnType<typeof useMindmaps>;
