import React from 'react';
import { ScrollView } from 'react-native';

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
  draggable?: boolean;
  ListHeaderComponent?: React.ReactElement | null;
  ListFooterComponent?: React.ReactElement | null;
  style?: object;
  keyboardShouldPersistTaps?: 'handled' | 'always' | 'never';
};

export function DraggableList<T>({
  data,
  keyExtractor,
  renderItem,
  ListHeaderComponent,
  ListFooterComponent,
  style,
  keyboardShouldPersistTaps,
}: Props<T>) {
  return (
    <ScrollView style={style} keyboardShouldPersistTaps={keyboardShouldPersistTaps}>
      {ListHeaderComponent}
      {data.map((item) => (
        <React.Fragment key={keyExtractor(item)}>{renderItem({ item })}</React.Fragment>
      ))}
      {ListFooterComponent}
    </ScrollView>
  );
}
