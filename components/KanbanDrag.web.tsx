import React from 'react';
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type ProviderProps = {
  children: React.ReactNode;
  onMove: (todoId: string, targetPhaseId: string | null, targetWorkflowStatus: string | null, overTodoId: string | null) => void;
};

type LaneProps = {
  id: string;
  phaseId: string | null;
  workflowStatus?: string | null;
  itemIds: string[];
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
};

type ItemProps = {
  id: string;
  phaseId: string | null;
  workflowStatus?: string | null;
  children: React.ReactNode;
};

type DragData = {
  type: 'todo' | 'lane';
  todoId?: string;
  phaseId: string | null;
  workflowStatus?: string | null;
};

export function KanbanDragProvider({ children, onMove }: ProviderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    })
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over) return;
    const activeData = active.data.current as DragData | undefined;
    const overData = over.data.current as DragData | undefined;
    if (activeData?.type !== 'todo' || !activeData.todoId || !overData) return;

    const targetPhaseId = overData.phaseId;
    const targetWorkflowStatus = overData.workflowStatus ?? null;
    const overTodoId = overData.type === 'todo' ? (overData.todoId ?? null) : null;
    if (
      activeData.phaseId === targetPhaseId &&
      activeData.workflowStatus === targetWorkflowStatus &&
      activeData.todoId === overTodoId
    ) return;
    onMove(activeData.todoId, targetPhaseId, targetWorkflowStatus, overTodoId);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      {children}
    </DndContext>
  );
}

export function KanbanDropLane({ id, phaseId, workflowStatus = null, itemIds, children, orientation = 'vertical' }: LaneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { type: 'lane', phaseId, workflowStatus } satisfies DragData,
  });

  const style: React.CSSProperties = {
    display: 'flex',
    flexDirection: orientation === 'horizontal' ? 'row' : 'column',
    gap: orientation === 'horizontal' ? 6 : 0,
    minHeight: 24,
    outline: isOver ? '2px solid #a5b4fc' : undefined,
    outlineOffset: isOver ? 2 : undefined,
    borderRadius: isOver ? 8 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <SortableContext
        items={itemIds}
        strategy={orientation === 'horizontal' ? horizontalListSortingStrategy : verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
    </div>
  );
}

export function KanbanDragItem({ id, phaseId, workflowStatus = null, children }: ItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { type: 'todo', todoId: id, phaseId, workflowStatus } satisfies DragData,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
    opacity: isDragging ? 0.65 : 1,
    zIndex: isDragging ? 100 : undefined,
    cursor: 'grab',
    touchAction: 'none',
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  );
}
