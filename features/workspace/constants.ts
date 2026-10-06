import type { AppTheme, AppThemeKey, Density } from '../../lib/types';

export const priorityPopoverWidth = 120;
export const priorityPopoverHeight = 108;
export const defaultVisibleTaskRows = 5;
export const todoRowHeight = 70;
export const densityPV: Record<Density, number> = { compact: 2, cozy: 2, roomy: 2 };
export const densityRowH: Record<Density, number> = { compact: 56, cozy: 70, roomy: 88 };
export const incomingRowHeight = 106;
export const taskHeaderHeight = 24;
export const taskBoxMaxHeight = taskHeaderHeight + todoRowHeight * defaultVisibleTaskRows;
export const incomingBoxMaxHeight = taskHeaderHeight + incomingRowHeight * defaultVisibleTaskRows;
export const workspaceContentMaxWidth = 960;
export const workspaceInboxColumnWidth = 340;
export const workspacePaneGap = 12;
export const workspaceBoardPadding = 12;
export const workspaceActiveDaySeconds = 8 * 60 * 60;
export const appThemes: Record<AppThemeKey, AppTheme> = {
  flow: {
    name: 'Flow',
    accent: '#0f766e',
    accentStrong: '#115e59',
    accentSoft: '#ccfbf1',
    accentTint: '#f0fdfa',
    inputBackground: '#f8fafc',
    inputBorder: '#d1d5db',
    inputFocusBorder: '#5eead4',
  },
  focus: {
    name: 'Focus',
    accent: '#2563eb',
    accentStrong: '#1d4ed8',
    accentSoft: '#dbeafe',
    accentTint: '#eff6ff',
    inputBackground: '#f8fafc',
    inputBorder: '#cbd5e1',
    inputFocusBorder: '#93c5fd',
  },
  graphite: {
    name: 'Graphite',
    accent: '#374151',
    accentStrong: '#111827',
    accentSoft: '#e5e7eb',
    accentTint: '#f9fafb',
    inputBackground: '#f9fafb',
    inputBorder: '#d1d5db',
    inputFocusBorder: '#9ca3af',
  },
};
export const appThemeKeys = Object.keys(appThemes) as AppThemeKey[];
export const webInputNoOutline = { outlineStyle: 'none' } as never;
export const completedDropTargetId = 'todo-completed-drop-target';
export const appName = 'RodoFlow';
export const themeStorageKey = 'rodoflow:theme';
