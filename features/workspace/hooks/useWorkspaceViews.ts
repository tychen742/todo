import { useState } from 'react';
import type { CreateTarget } from '../../../lib/types';

export function useWorkspaceViews() {
  const [createTarget, setCreateTarget] = useState<CreateTarget | null>(null);
  const [projectsViewOpen, setProjectsViewOpen] = useState(false);
  const [teamsViewOpen, setTeamsViewOpen] = useState(false);
  const [notesViewOpen, setNotesViewOpen] = useState(false);
  const [calendarViewOpen, setCalendarViewOpen] = useState(false);
  const [resourcesViewOpen, setResourcesViewOpen] = useState(false);
  const [dashboardViewOpen, setDashboardViewOpen] = useState(false);

  function openCreateTarget(target: CreateTarget) {
    if (target === 'team') {
      setCreateTarget('team');
      return;
    }

    if (target === 'project') {
      setCreateTarget('project');
      return;
    }

    setCreateTarget('organization');
  }

  return {
    createTarget,
    setCreateTarget,
    projectsViewOpen,
    setProjectsViewOpen,
    teamsViewOpen,
    setTeamsViewOpen,
    notesViewOpen,
    setNotesViewOpen,
    calendarViewOpen,
    setCalendarViewOpen,
    resourcesViewOpen,
    setResourcesViewOpen,
    dashboardViewOpen,
    setDashboardViewOpen,
    openCreateTarget,
  };
}

export type WorkspaceViewsState = ReturnType<typeof useWorkspaceViews>;
