import React from 'react';
import { ScrollView } from 'react-native';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export type DragRenderItem<T> = {
  item: T;
  drag?: () => void;
  isActive?: boolean;
};

type Props<T> = {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (params: DragRenderItem<T>) => React.ReactElement | null;
  onDragEnd: (data: T[]) => void;
  onExternalDrop?: (item: T, targetId: string) => void;
  externalDropTargetId?: string;
  draggable?: boolean;
  ListHeaderComponent?: React.ReactElement | null;
  ListFooterComponent?: React.ReactElement | null;
  style?: object;
  keyboardShouldPersistTaps?: 'handled' | 'always' | 'never';
};

function SortableItem<T>({
  id,
  item,
  renderItem,
  draggable = true,
}: {
  id: string;
  item: T;
  renderItem: (params: DragRenderItem<T>) => React.ReactElement | null;
  draggable?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const wrapperStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 100 : undefined,
    display: 'flex',
    alignItems: 'center',
    backgroundColor: isDragging ? '#f5f3ff' : 'transparent',
  };

  const handleStyle: React.CSSProperties = {
    width: 32,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: draggable ? 'grab' : 'default',
    color: '#d1d5db',
    fontSize: 18,
    userSelect: 'none',
    touchAction: 'none',
  };

  const handleProps = draggable ? { ...listeners, ...attributes } : {};

  return (
    <div ref={setNodeRef} style={wrapperStyle}>
      <span {...handleProps} style={handleStyle}>⠿</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {renderItem({ item, drag: undefined, isActive: isDragging })}
      </div>
    </div>
  );
}

export function DraggableList<T>({
  data,
  keyExtractor,
  renderItem,
  onDragEnd,
  draggable = true,
  ListHeaderComponent,
  ListFooterComponent,
  style,
  keyboardShouldPersistTaps,
  onExternalDrop,
  externalDropTargetId,
}: Props<T>) {
  const pointerPositionRef = React.useRef<{ x: number; y: number } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ids = data.map(keyExtractor);

  React.useEffect(() => {
    function trackPointer(event: PointerEvent) {
      pointerPositionRef.current = { x: event.clientX, y: event.clientY };
    }
    function trackTouch(event: TouchEvent) {
      const touch = event.touches[0] ?? event.changedTouches[0];
      if (touch) pointerPositionRef.current = { x: touch.clientX, y: touch.clientY };
    }

    window.addEventListener('pointermove', trackPointer);
    window.addEventListener('touchmove', trackTouch);
    window.addEventListener('touchend', trackTouch);
    return () => {
      window.removeEventListener('pointermove', trackPointer);
      window.removeEventListener('touchmove', trackTouch);
      window.removeEventListener('touchend', trackTouch);
    };
  }, []);

  function handleDragEnd({ active, over }: DragEndEvent) {
    const oldIndex = ids.indexOf(active.id as string);
    if (oldIndex < 0) return;

    const pointerPosition = pointerPositionRef.current;
    if (pointerPosition && externalDropTargetId && onExternalDrop) {
      const target = document.getElementById(externalDropTargetId);
      const dropElement = document.elementFromPoint(pointerPosition.x, pointerPosition.y);
      if (target && dropElement && target.contains(dropElement)) {
        onExternalDrop(data[oldIndex], externalDropTargetId);
        return;
      }
    }

    if (over && active.id !== over.id) {
      const newIndex = ids.indexOf(over.id as string);
      onDragEnd(arrayMove(data, oldIndex, newIndex));
    }
  }

  return (
    <ScrollView style={style} keyboardShouldPersistTaps={keyboardShouldPersistTaps}>
      {ListHeaderComponent}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {data.map((item) => (
            <SortableItem key={keyExtractor(item)} id={keyExtractor(item)} item={item} renderItem={renderItem} draggable={draggable} />
          ))}
        </SortableContext>
      </DndContext>
      {ListFooterComponent}
    </ScrollView>
  );
}
