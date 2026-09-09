export type QuickCapturePriority = 'low' | 'normal' | 'high' | 'urgent';

export type QuickCaptureProject = {
  id: string;
  name: string;
};

export function projectCaptureAbbreviation(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
}

function normalizeProjectCaptureKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function priorityFromQuickCaptureToken(token: string): QuickCapturePriority | null {
  const match = token.match(/^:([a-z])$/i);
  if (!match) return null;

  switch (match[1].toLowerCase()) {
    case 'u':
      return 'urgent';
    case 'h':
      return 'high';
    case 'm':
    case 'n':
      return 'normal';
    case 'l':
      return 'low';
    default:
      return null;
  }
}

function resolveProjectCaptureToken(rawToken: string, availableProjects: QuickCaptureProject[]) {
  const key = normalizeProjectCaptureKey(rawToken);
  if (!key) return { project: null as QuickCaptureProject | null, error: '', matched: false };

  const exactNameMatches = availableProjects.filter(
    (project) => normalizeProjectCaptureKey(project.name) === key
  );
  const abbreviationMatches = availableProjects.filter(
    (project) => normalizeProjectCaptureKey(projectCaptureAbbreviation(project.name)) === key
  );

  const matchingProjects = exactNameMatches.length > 0 ? exactNameMatches : abbreviationMatches;
  if (matchingProjects.length === 0) return { project: null as QuickCaptureProject | null, error: '', matched: false };

  if (matchingProjects.length > 1) {
    return {
      project: null as QuickCaptureProject | null,
      error: `Project shortcut "${rawToken}" matches multiple projects. Type the full project name before the project shortcut.`,
      matched: true,
    };
  }

  return { project: matchingProjects[0], error: '', matched: true };
}

export function parseTodoQuickCapture(
  text: string,
  availableProjects: QuickCaptureProject[],
  options: { allowProjectRouting: boolean }
) {
  let body = text.trim();
  let project: QuickCaptureProject | null = null;
  let priority: QuickCapturePriority | null = null;
  let consumedAttribute = false;

  if (options.allowProjectRouting) {
    const legacyPrefixMatch = body.match(/^([^:\n]{1,80}):\s*(.*)$/);
    if (legacyPrefixMatch) {
      const rawPrefix = legacyPrefixMatch[1].trim();
      const result = resolveProjectCaptureToken(rawPrefix, availableProjects);
      if (result.error) return { text, project: null as QuickCaptureProject | null, priority, error: result.error };
      if (result.project) {
        if (!legacyPrefixMatch[2].trim()) {
          return {
            text,
            project: null as QuickCaptureProject | null,
            priority,
            error: `Add task text after "${rawPrefix}:".`,
          };
        }
        body = legacyPrefixMatch[2].trim();
        project = result.project;
        consumedAttribute = true;
      }
    }
  }

  const cleanedTokens: string[] = [];
  const tokens = body.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    const parsedPriority = priorityFromQuickCaptureToken(token);
    if (parsedPriority) {
      priority = parsedPriority;
      consumedAttribute = true;
      continue;
    }

    let rawProjectToken: string | null = null;
    if (options.allowProjectRouting && (token.startsWith(':') || token.startsWith('+')) && token.length > 1) {
      rawProjectToken = token.slice(1);
    } else if (options.allowProjectRouting && token.endsWith(':') && token.length > 1) {
      rawProjectToken = token.slice(0, -1);
    }

    if (rawProjectToken) {
      const result = resolveProjectCaptureToken(rawProjectToken, availableProjects);
      if (result.error) return { text, project: null as QuickCaptureProject | null, priority, error: result.error };
      if (result.project) {
        project = result.project;
        consumedAttribute = true;
        continue;
      }
    }

    cleanedTokens.push(token);
  }

  const cleanedText = cleanedTokens.join(' ').trim();
  if (!cleanedText && consumedAttribute) {
    return {
      text,
      project: null as QuickCaptureProject | null,
      priority,
      error: 'Add task text after quick-capture attributes.',
    };
  }

  return { text: cleanedText || text, project, priority, error: '' };
}
