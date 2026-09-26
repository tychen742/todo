export type Priority = 'low' | 'normal' | 'high' | 'urgent';
export type SortField = 'text' | 'priority' | 'assigned_by' | 'status' | 'project' | 'due_date' | 'age' | 'created_at';
export type CreateTarget = 'team' | 'organization' | 'project';
export type ProjectViewMode = 'plan' | 'kanban';
export type WorkflowLaneKey = 'backlog' | 'doing' | 'review' | 'done';
export type CalendarViewMode = 'day' | 'week' | 'month';
export type AuthErrorField = 'displayName' | 'email' | 'password' | 'all' | null;
export type AppThemeKey = 'flow' | 'focus' | 'graphite';
export type Density = 'compact' | 'cozy' | 'roomy';

export type Todo = {
  id: string;
  text: string;
  done: boolean;
  scheduled_start_at: string | null;
  started_work_at: string | null;
  assigned_to: string | null;
  created_by: string | null;
  priority: Priority;
  due_date: string | null;
  note: string | null;
  created_at: string;
  assigned_at: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  archived_at: string | null;
  position: number | null;
  workflow_position: number | null;
  is_milestone: boolean;
  project_id: string | null;
  phase_id: string | null;
  workflow_status: WorkflowLaneKey;
  team_id: string | null;
  estimate: string | null;
};

export type Organization = {
  id: string;
  name: string;
  member_count?: number;
};

export type Team = {
  id: string;
  name: string;
  org_id: string | null;
  member_count?: number;
};

export type Project = {
  id: string;
  name: string;
  team_id: string | null;
  created_by: string;
  archived_at: string | null;
};

export type Member = {
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
};

export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  status: string | null;
};

export type ProfileSummary = Pick<Profile, 'id' | 'email' | 'display_name'>;

export type MindmapPoint = {
  x: number;
  y: number;
};

export type WorkspaceMindmapNode = {
  id: string;
  label: string;
  x?: number;
  y?: number;
  children: WorkspaceMindmapNode[];
};

export type MindmapLayoutMode = 'balanced' | 'right';

export type WorkspaceMindmapSettings = {
  layout: MindmapLayoutMode;
  coloredBranches: boolean;
  compactSpacing: boolean;
};

export type WorkspaceMindmap = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  template: MindmapTemplateKey;
  topics: string[];
  root_position?: MindmapPoint;
  nodes: WorkspaceMindmapNode[];
  settings: WorkspaceMindmapSettings;
};

export type WorkspaceMindmapInput = Omit<Partial<WorkspaceMindmap>, 'root_position' | 'nodes' | 'settings'> & {
  root_position?: Partial<MindmapPoint>;
  nodes?: Partial<WorkspaceMindmapNode>[];
  settings?: Partial<WorkspaceMindmapSettings>;
};

export type StoredWorkspaceNotes = {
  ideas?: string;
  mindmap?: string;
  mindmapDraft?: string;
  mindmaps?: WorkspaceMindmapInput[];
};

export type WorkspaceMindmapRow = {
  id: string;
  title: string | null;
  body: string | null;
  created_at: string | null;
  template: string | null;
  topics: string[] | null;
  root_position: Partial<MindmapPoint> | null;
  nodes: Partial<WorkspaceMindmapNode>[] | null;
  settings: Partial<WorkspaceMindmapSettings> | null;
};

export type MindmapTemplateKey = 'balanced' | 'right-stack' | 'workshop' | 'business-plan';

export type MindmapTemplate = {
  key: MindmapTemplateKey;
  name: string;
  title: string;
  topics: string[];
  colors: string[];
};

export type AppTheme = {
  name: string;
  accent: string;
  accentStrong: string;
  accentSoft: string;
  accentTint: string;
  inputBackground: string;
  inputBorder: string;
  inputFocusBorder: string;
};
