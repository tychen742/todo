import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  MindmapLayoutMode,
  MindmapPoint,
  MindmapTemplate,
  MindmapTemplateKey,
  StoredWorkspaceNotes,
  WorkspaceMindmap,
  WorkspaceMindmapInput,
  WorkspaceMindmapNode,
  WorkspaceMindmapRow,
  WorkspaceMindmapSettings,
} from './types';

export const mindmapTemplates: MindmapTemplate[] = [
  {
    key: 'balanced',
    name: 'Balanced',
    title: 'Central Topic',
    topics: ['Main Topic 4', 'Main Topic 3', 'Main Topic 1', 'Main Topic 2'],
    colors: ['#f87171', '#fb923c', '#34d399', '#22d3ee'],
  },
  {
    key: 'right-stack',
    name: 'Right Stack',
    title: 'Central Topic',
    topics: ['Main Topic 1', 'Main Topic 2', 'Main Topic 3', 'Main Topic 4'],
    colors: ['#facc15', '#f97316', '#3b82f6', '#14b8a6'],
  },
  {
    key: 'workshop',
    name: 'Workshop',
    title: 'Workshop',
    topics: ['Goals', 'Agenda', 'Materials', 'Engage', 'Venue', 'Feedback'],
    colors: ['#86efac', '#fdba74', '#c4b5fd', '#f9a8d4', '#93c5fd', '#5eead4'],
  },
  {
    key: 'business-plan',
    name: 'Business Plan',
    title: 'Business Plan',
    topics: ['Market', 'Strategy', 'Team', 'Summary', 'Company', 'Financial', 'Product'],
    colors: ['#38bdf8', '#34d399', '#a78bfa', '#fbbf24', '#fb7185', '#2dd4bf', '#818cf8'],
  },
];

export function mindmapTemplateFor(key: MindmapTemplateKey) {
  return mindmapTemplates.find((template) => template.key === key) ?? mindmapTemplates[0];
}

export function createMindmapNode(label: string, point?: MindmapPoint): WorkspaceMindmapNode {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label,
    ...(point ? point : {}),
    children: [],
  };
}

export function mindmapNodesFromTopics(topics: string[], templateKey: MindmapTemplateKey = 'balanced') {
  const positions = editableMindmapPositions(templateKey, topics.length);
  return topics.map((topic, index) => createMindmapNode(topic || `Topic ${index + 1}`, positions[index]));
}

export function normalizeMindmapPoint(point: Partial<MindmapPoint> | undefined): MindmapPoint | undefined {
  if (typeof point?.x !== 'number' || typeof point.y !== 'number') return undefined;
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return undefined;
  return {
    x: Math.max(0, Math.min(100, point.x)),
    y: Math.max(0, Math.min(100, point.y)),
  };
}

export function defaultMindmapSettings(templateKey: MindmapTemplateKey): WorkspaceMindmapSettings {
  return {
    layout: templateKey === 'right-stack' ? 'right' : 'balanced',
    coloredBranches: true,
    compactSpacing: false,
  };
}

function normalizeMindmapSettings(
  settings: Partial<WorkspaceMindmapSettings> | undefined,
  templateKey: MindmapTemplateKey
): WorkspaceMindmapSettings {
  const fallback = defaultMindmapSettings(templateKey);
  return {
    layout: settings?.layout === 'right' || settings?.layout === 'balanced'
      ? settings.layout
      : fallback.layout,
    coloredBranches: typeof settings?.coloredBranches === 'boolean'
      ? settings.coloredBranches
      : fallback.coloredBranches,
    compactSpacing: typeof settings?.compactSpacing === 'boolean'
      ? settings.compactSpacing
      : fallback.compactSpacing,
  };
}

function normalizeMindmapNodes(
  nodes: Partial<WorkspaceMindmapNode>[] | undefined,
  fallbackTopics: string[],
  templateKey: MindmapTemplateKey = 'balanced'
): WorkspaceMindmapNode[] {
  if (!Array.isArray(nodes) || nodes.length === 0) return mindmapNodesFromTopics(fallbackTopics, templateKey);
  return nodes.map((node, index) => {
    const point = normalizeMindmapPoint(node);
    return {
      id: node.id ?? `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      label: node.label ?? fallbackTopics[index] ?? `Topic ${index + 1}`,
      ...(point ? point : {}),
      children: normalizeMindmapNodes(node.children, [], templateKey),
    };
  });
}

export function mindmapBody(title: string, nodes: WorkspaceMindmapNode[]) {
  const lines = [title.trim() || 'Mindmap'];
  function addNodeLines(items: WorkspaceMindmapNode[], depth: number) {
    items.forEach((node) => {
      lines.push(`${'  '.repeat(depth)}- ${node.label.trim() || 'Topic'}`);
      addNodeLines(node.children, depth + 1);
    });
  }
  addNodeLines(nodes, 0);
  return lines.join('\n');
}

function mindmapFieldsFromBody(body: string, fallback: MindmapTemplate) {
  const lines = body.split(/\n/).map((line) => line.trim()).filter(Boolean);
  const title = lines[0] ?? fallback.title;
  const bodyTopics = lines.slice(1).map((line) => line.replace(/^[-*]\s*/, '')).filter(Boolean);
  const topicCount = Math.max(fallback.topics.length, bodyTopics.length);
  return {
    title,
    topics: Array.from({ length: topicCount }, (_, index) => bodyTopics[index] ?? fallback.topics[index] ?? `Topic ${index + 1}`),
  };
}

function normalizeWorkspaceMindmap(
  mindmap: WorkspaceMindmapInput,
  index = 0
): WorkspaceMindmap {
  const template = mindmapTemplateFor(mindmap.template ?? 'balanced');
  const fields = mindmapFieldsFromBody(mindmap.body ?? '', template);
  const title = mindmap.title ?? fields.title;
  const savedTopics = Array.isArray(mindmap.topics) ? mindmap.topics : [];
  const topicCount = Math.max(template.topics.length, savedTopics.length, fields.topics.length);
  const topics = savedTopics.length > 0
    ? Array.from({ length: topicCount }, (_, topicIndex) =>
        savedTopics[topicIndex] ?? fields.topics[topicIndex] ?? template.topics[topicIndex] ?? `Topic ${topicIndex + 1}`
      )
    : Array.from({ length: topicCount }, (_, topicIndex) =>
        fields.topics[topicIndex] ?? template.topics[topicIndex] ?? `Topic ${topicIndex + 1}`
      );
  const nodes = normalizeMindmapNodes(mindmap.nodes, topics, template.key);

  return {
    id: mindmap.id ?? `legacy-${index}-${Date.now()}`,
    title,
    body: mindmap.body ?? mindmapBody(title, nodes),
    created_at: mindmap.created_at ?? new Date().toISOString(),
    template: template.key,
    topics: nodes.map((node) => node.label),
    root_position: normalizeMindmapPoint(mindmap.root_position),
    nodes,
    settings: normalizeMindmapSettings(mindmap.settings, template.key),
  };
}

export function workspaceNotesStorageKey(userId: string) {
  return `todo:workspace-notes:${userId}`;
}

export function workspaceMindmapFromRow(row: WorkspaceMindmapRow): WorkspaceMindmap {
  return normalizeWorkspaceMindmap({
    id: row.id,
    title: row.title ?? undefined,
    body: row.body ?? undefined,
    created_at: row.created_at ?? undefined,
    template: (row.template ?? undefined) as MindmapTemplateKey | undefined,
    topics: row.topics ?? undefined,
    root_position: row.root_position ?? undefined,
    nodes: Array.isArray(row.nodes) ? row.nodes : undefined,
    settings: row.settings ?? undefined,
  });
}

export function workspaceMindmapDbPayload(ownerId: string, mindmap: WorkspaceMindmap) {
  return {
    id: mindmap.id,
    owner_id: ownerId,
    title: mindmap.title,
    body: mindmap.body,
    template: mindmap.template,
    topics: mindmap.topics,
    root_position: mindmap.root_position ?? null,
    nodes: mindmap.nodes,
    settings: mindmap.settings,
    created_at: mindmap.created_at,
    updated_at: new Date().toISOString(),
  };
}

export async function readLocalWorkspaceNotes(userId: string) {
  const value = await AsyncStorage.getItem(workspaceNotesStorageKey(userId));
  if (!value) return { ideas: '', mindmaps: [] as WorkspaceMindmap[] };

  const notes = JSON.parse(value) as StoredWorkspaceNotes;
  const loadedMindmaps = Array.isArray(notes.mindmaps)
    ? notes.mindmaps.map((mindmap, index) => normalizeWorkspaceMindmap(mindmap, index))
    : [];
  const legacyDraft = notes.mindmapDraft ?? notes.mindmap ?? '';
  const migratedMindmaps = legacyDraft.trim() && loadedMindmaps.length === 0
    ? (() => {
        const template = mindmapTemplateFor('balanced');
        const fields = mindmapFieldsFromBody(legacyDraft, template);
        const nodes = mindmapNodesFromTopics(fields.topics, template.key);
        return [
          normalizeWorkspaceMindmap({
            id: `legacy-draft-${Date.now()}`,
            title: fields.title,
            body: mindmapBody(fields.title, nodes),
            created_at: new Date().toISOString(),
            template: template.key,
            topics: nodes.map((node) => node.label),
            nodes,
            settings: defaultMindmapSettings(template.key),
          }),
        ];
      })()
    : loadedMindmaps;

  return {
    ideas: notes.ideas ?? '',
    mindmaps: migratedMindmaps,
  };
}

export function mapMindmapNodes(
  nodes: WorkspaceMindmapNode[],
  nodeId: string,
  updater: (node: WorkspaceMindmapNode) => WorkspaceMindmapNode
): WorkspaceMindmapNode[] {
  return nodes.map((node) => {
    if (node.id === nodeId) return updater(node);
    return { ...node, children: mapMindmapNodes(node.children, nodeId, updater) };
  });
}

export function clampMindmapPercentPoint(point: MindmapPoint): MindmapPoint {
  return {
    x: Math.max(4, Math.min(96, point.x)),
    y: Math.max(5, Math.min(95, point.y)),
  };
}

function childMindmapGrowthPoint(parentPoint: MindmapPoint, index: number, count: number, depth: number): MindmapPoint {
  const side = parentPoint.x < 48 ? -1 : parentPoint.x > 52 ? 1 : index % 2 === 0 ? 1 : -1;
  const horizontalOffset = 18 + Math.min(depth, 3) * 6;
  const verticalSpread = Math.max(10, 16 - Math.min(depth, 4) * 2);
  return clampMindmapPercentPoint({
    x: parentPoint.x + side * horizontalOffset,
    y: parentPoint.y + (index - (count - 1) / 2) * verticalSpread,
  });
}

function materializeMindmapNodePositions(
  nodes: WorkspaceMindmapNode[],
  templateKey: MindmapTemplateKey,
  parentPoint?: MindmapPoint,
  depth = 0
): WorkspaceMindmapNode[] {
  const topLevelPositions = depth === 0 ? editableMindmapPositions(templateKey, nodes.length) : [];
  return nodes.map((node, index) => {
    const savedPoint = normalizeMindmapPoint(node);
    const point = savedPoint
      ?? (depth === 0
        ? topLevelPositions[index]
        : childMindmapGrowthPoint(parentPoint ?? { x: 50, y: 50 }, index, nodes.length, depth));
    const normalizedPoint = clampMindmapPercentPoint(point ?? { x: 50, y: 50 });
    return {
      ...node,
      ...normalizedPoint,
      children: materializeMindmapNodePositions(node.children, templateKey, normalizedPoint, depth + 1),
    };
  });
}

function appendMindmapNodeToParent(
  nodes: WorkspaceMindmapNode[],
  parentNodeId: string,
  label: string,
  depth = 0
): WorkspaceMindmapNode[] {
  return nodes.map((node) => {
    if (node.id === parentNodeId) {
      const parentPoint = normalizeMindmapPoint(node) ?? { x: 50, y: 50 };
      const nextPoint = childMindmapGrowthPoint(parentPoint, node.children.length, node.children.length + 1, depth + 1);
      return {
        ...node,
        children: [...node.children, createMindmapNode(label, nextPoint)],
      };
    }
    return {
      ...node,
      children: appendMindmapNodeToParent(node.children, parentNodeId, label, depth + 1),
    };
  });
}

export function addMindmapNode(nodes: WorkspaceMindmapNode[], parentNodeId: string | null, label: string, templateKey: MindmapTemplateKey): WorkspaceMindmapNode[] {
  const materializedNodes = materializeMindmapNodePositions(nodes, templateKey);
  if (!parentNodeId) {
    const nextPosition = editableMindmapPositions(templateKey, materializedNodes.length + 1)[materializedNodes.length];
    return [...materializedNodes, createMindmapNode(label, nextPosition)];
  }
  return appendMindmapNodeToParent(materializedNodes, parentNodeId, label);
}

function clearNestedMindmapPositions(nodes: WorkspaceMindmapNode[]): WorkspaceMindmapNode[] {
  return nodes.map((node) => {
    const { x: _x, y: _y, ...nodeWithoutPosition } = node;
    return {
      ...nodeWithoutPosition,
      children: clearNestedMindmapPositions(node.children),
    };
  });
}

export function relayoutMindmapNodes(
  nodes: WorkspaceMindmapNode[],
  templateKey: MindmapTemplateKey,
  layout: MindmapLayoutMode
): WorkspaceMindmapNode[] {
  const layoutTemplateKey = layout === 'right' ? 'right-stack' : templateKey;
  const positions = editableMindmapPositions(layoutTemplateKey, nodes.length);
  return nodes.map((node, index) => ({
    ...node,
    ...(positions[index] ?? {}),
    children: clearNestedMindmapPositions(node.children),
  }));
}

export function deleteMindmapNode(nodes: WorkspaceMindmapNode[], nodeId: string): WorkspaceMindmapNode[] {
  return nodes
    .filter((node) => node.id !== nodeId)
    .map((node) => ({ ...node, children: deleteMindmapNode(node.children, nodeId) }));
}

export function moveMindmapNode(nodes: WorkspaceMindmapNode[], nodeId: string, point: MindmapPoint): WorkspaceMindmapNode[] {
  return mapMindmapNodes(nodes, nodeId, (node) => ({ ...node, ...point }));
}

export function editableMindmapPositions(templateKey: MindmapTemplateKey, count: number) {
  const presets: Partial<Record<MindmapTemplateKey, { x: number; y: number }[]>> = {
    balanced: [
      { x: 24, y: 26 },
      { x: 24, y: 74 },
      { x: 76, y: 26 },
      { x: 76, y: 74 },
    ],
    'right-stack': [
      { x: 78, y: 18 },
      { x: 78, y: 39 },
      { x: 78, y: 61 },
      { x: 78, y: 82 },
    ],
    workshop: [
      { x: 27, y: 24 },
      { x: 20, y: 50 },
      { x: 27, y: 76 },
      { x: 73, y: 24 },
      { x: 80, y: 50 },
      { x: 73, y: 76 },
    ],
    'business-plan': [
      { x: 22, y: 21 },
      { x: 20, y: 50 },
      { x: 22, y: 79 },
      { x: 78, y: 16 },
      { x: 80, y: 39 },
      { x: 80, y: 61 },
      { x: 78, y: 84 },
    ],
  };
  const base = presets[templateKey] ?? presets.balanced!;
  return Array.from({ length: count }, (_, index) => {
    if (base[index]) return base[index];
    const angle = -Math.PI / 2 + ((Math.PI * 2) * index) / Math.max(count, 1);
    return {
      x: 50 + Math.cos(angle) * 32,
      y: 50 + Math.sin(angle) * 34,
    };
  });
}
