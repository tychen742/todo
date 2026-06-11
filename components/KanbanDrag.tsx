import React from 'react';

type ProviderProps = {
  children: React.ReactNode;
  onMove: (todoId: string, targetPhaseId: string | null, overTodoId: string | null, targetDone?: boolean) => void;
};

type LaneProps = {
  id: string;
  phaseId: string | null;
  done?: boolean;
  itemIds: string[];
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
};

type ItemProps = {
  id: string;
  phaseId: string | null;
  done?: boolean;
  children: React.ReactNode;
};

export function KanbanDragProvider({ children }: ProviderProps) {
  return <>{children}</>;
}

export function KanbanDropLane({ children }: LaneProps) {
  return <>{children}</>;
}

export function KanbanDragItem({ children }: ItemProps) {
  return <>{children}</>;
}
