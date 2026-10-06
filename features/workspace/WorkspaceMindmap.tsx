import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  PanResponder,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { ListTodo } from 'lucide-react-native';
import type {
  MindmapPoint,
  MindmapTemplate,
  WorkspaceMindmap,
  WorkspaceMindmapNode,
} from '../../lib/types';
import {
  canReparentMindmapNode,
  editableMindmapPositions,
  mindmapNodesFromTopics,
} from '../../lib/mindmaps';
import { styles } from './styles';

export function WorkspaceMindmapPreview({
  template,
  title,
  topics,
  compact = false,
}: {
  template: MindmapTemplate;
  title?: string;
  topics?: string[];
  compact?: boolean;
}) {
  const width = compact ? 220 : 320;
  const height = compact ? 108 : 170;
  const scale = compact ? 0.68 : 1;
  const textSize = compact ? 10 : 14;
  const centerTextSize = compact ? 14 : 22;
  const centralLabel = title ?? template.title;
  const topicLabels = template.topics.map((topic, index) => topics?.[index] ?? topic);

  if (template.key === 'right-stack') {
    return (
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Rect x={16 * scale} y={54 * scale} width={144 * scale} height={42 * scale} rx={5} fill="#fff" stroke="#11156a" strokeWidth={2.4} />
        <SvgText x={88 * scale} y={81 * scale} fill="#11156a" fontSize={centerTextSize} fontWeight="700" textAnchor="middle">
          {centralLabel}
        </SvgText>
        <Path d={`M ${184 * scale} ${37 * scale} C ${166 * scale} ${37 * scale}, ${166 * scale} ${47 * scale}, ${166 * scale} ${67 * scale} C ${166 * scale} ${84 * scale}, ${154 * scale} ${88 * scale}, ${154 * scale} ${88 * scale} C ${166 * scale} ${88 * scale}, ${166 * scale} ${94 * scale}, ${166 * scale} ${111 * scale} C ${166 * scale} ${132 * scale}, ${168 * scale} ${142 * scale}, ${184 * scale} ${142 * scale}`} stroke="#f5bd2d" strokeWidth={2.2} fill="none" />
        {template.colors.map((color, index) => (
          <G key={`${template.key}-${index}`}>
            <Rect x={204 * scale} y={(16 + index * 38) * scale} width={104 * scale} height={27 * scale} rx={5} fill={color} />
            <SvgText x={256 * scale} y={(34 + index * 38) * scale} fill={index === 1 || index === 2 ? '#fff' : '#111827'} fontSize={textSize} fontWeight="700" textAnchor="middle">
              {topicLabels[index]}
            </SvgText>
          </G>
        ))}
      </Svg>
    );
  }

  if (template.key === 'workshop') {
    const nodes = [
      { x: 90, y: 48, label: topicLabels[0] },
      { x: 72, y: 88, label: topicLabels[1] },
      { x: 94, y: 126, label: topicLabels[2] },
      { x: 230, y: 48, label: topicLabels[3] },
      { x: 244, y: 88, label: topicLabels[4] },
      { x: 226, y: 126, label: topicLabels[5] },
    ];
    return (
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Rect x={0} y={0} width={width} height={height} rx={8} fill="#eaf6f5" />
        <Ellipse cx={160 * scale} cy={86 * scale} rx={47 * scale} ry={22 * scale} fill="#374151" />
        <SvgText x={160 * scale} y={92 * scale} fill="#fff" fontSize={compact ? 12 : 16} fontWeight="700" textAnchor="middle">
          {centralLabel}
        </SvgText>
        {nodes.map((node, index) => (
          <G key={`${template.key}-${node.label}`}>
            <Path d={`M ${160 * scale} ${86 * scale} C ${((node.x + 160) / 2) * scale} ${86 * scale}, ${((node.x + 160) / 2) * scale} ${node.y * scale}, ${node.x * scale} ${node.y * scale}`} stroke={template.colors[index]} strokeWidth={2} fill="none" />
            <Ellipse cx={node.x * scale} cy={node.y * scale} rx={32 * scale} ry={12 * scale} fill={template.colors[index]} />
            <SvgText x={node.x * scale} y={(node.y + 4) * scale} fill="#111827" fontSize={compact ? 8 : 10} fontWeight="700" textAnchor="middle">
              {node.label}
            </SvgText>
          </G>
        ))}
      </Svg>
    );
  }

  if (template.key === 'business-plan') {
    const leftNodes = [
      { x: 58, y: 42, label: topicLabels[0] },
      { x: 72, y: 86, label: topicLabels[1] },
      { x: 60, y: 130, label: topicLabels[2] },
    ];
    const rightNodes = [
      { x: 242, y: 32, label: topicLabels[3] },
      { x: 242, y: 66, label: topicLabels[4] },
      { x: 242, y: 100, label: topicLabels[5] },
      { x: 242, y: 134, label: topicLabels[6] },
    ];
    return (
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Rect x={142 * scale} y={68 * scale} width={58 * scale} height={50 * scale} rx={4} fill="#20266e" />
        <SvgText x={171 * scale} y={89 * scale} fill="#fff" fontSize={compact ? 10 : 13} fontWeight="700" textAnchor="middle">
          {centralLabel.split(/\s+/)[0] ?? 'BUSINESS'}
        </SvgText>
        <SvgText x={171 * scale} y={104 * scale} fill="#fff" fontSize={compact ? 10 : 13} fontWeight="700" textAnchor="middle">
          {centralLabel.split(/\s+/).slice(1).join(' ') || 'PLAN'}
        </SvgText>
        {[...leftNodes, ...rightNodes].map((node, index) => (
          <G key={`${template.key}-${node.label}`}>
            <Path d={`M ${node.x < 160 ? 142 * scale : 200 * scale} ${92 * scale} C ${node.x < 160 ? 116 * scale : 222 * scale} ${92 * scale}, ${node.x * scale} ${node.y * scale}, ${node.x * scale} ${node.y * scale}`} stroke="#20266e" strokeWidth={1.5} fill="none" />
            <Rect x={(node.x - 40) * scale} y={(node.y - 12) * scale} width={80 * scale} height={24 * scale} rx={3} fill={template.colors[index]} />
            <SvgText x={node.x * scale} y={(node.y + 4) * scale} fill="#1f2937" fontSize={compact ? 8 : 10} fontWeight="700" textAnchor="middle">
              {node.label}
            </SvgText>
          </G>
        ))}
      </Svg>
    );
  }

  const balancedNodes = [
    { x: 64, y: 36, label: topicLabels[0] },
    { x: 64, y: 120, label: topicLabels[1] },
    { x: 254, y: 36, label: topicLabels[2] },
    { x: 254, y: 120, label: topicLabels[3] },
  ];
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <SvgText x={160 * scale} y={89 * scale} fill="#111827" fontSize={centerTextSize} fontWeight="700" textAnchor="middle">
        {centralLabel}
      </SvgText>
      {balancedNodes.map((node, index) => (
        <G key={`${template.key}-${node.label}`}>
          <Path d={`M ${160 * scale} ${84 * scale} C ${((node.x + 160) / 2) * scale} ${84 * scale}, ${((node.x + 160) / 2) * scale} ${node.y * scale}, ${node.x * scale} ${node.y * scale}`} stroke={template.colors[index]} strokeWidth={1.8} fill="none" />
          <Rect x={(node.x - 48) * scale} y={(node.y - 14) * scale} width={96 * scale} height={28 * scale} rx={4} fill={template.colors[index]} />
          <SvgText x={node.x * scale} y={(node.y + 5) * scale} fill="#111827" fontSize={textSize} fontWeight="700" textAnchor="middle">
            {node.label}
          </SvgText>
        </G>
      ))}
    </Svg>
  );
}

function MindmapDraggableNode({
  id,
  point,
  width,
  height,
  mapFieldWidth,
  mapFieldHeight,
  style,
  onTouchStart,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
  children,
}: {
  id: string;
  point: MindmapPoint;
  width: number;
  height: number;
  mapFieldWidth: number;
  mapFieldHeight: number;
  style: StyleProp<ViewStyle>;
  onTouchStart: () => void;
  onDragStart: (nodeId: string, point: MindmapPoint) => void;
  onDragMove: (nodeId: string, point: MindmapPoint) => string | null;
  onDragEnd: (nodeId: string, point: MindmapPoint, targetId: string | null) => void;
  onDragCancel: () => void;
  children: React.ReactNode;
}) {
  const currentPropsRef = useRef({
    id, point, width, height, mapFieldWidth, mapFieldHeight,
    onDragStart, onDragMove, onDragEnd, onDragCancel,
  });
  const activeDragRef = useRef<{
    originPoint: MindmapPoint;
    point: MindmapPoint;
    targetId: string | null;
  } | null>(null);

  useLayoutEffect(() => {
    currentPropsRef.current = {
      id, point, width, height, mapFieldWidth, mapFieldHeight,
      onDragStart, onDragMove, onDragEnd, onDragCancel,
    };
  }, [id, point, width, height, mapFieldWidth, mapFieldHeight, onDragStart, onDragMove, onDragEnd, onDragCancel]);

  // PanResponder callbacks need the latest committed props from the ref while remaining stable across renders.
  // eslint-disable-next-line react-hooks/refs
  const panHandlers = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gestureState) =>
      Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3,
    onPanResponderGrant: () => {
      const current = currentPropsRef.current;
      activeDragRef.current = { originPoint: current.point, point: current.point, targetId: null };
      current.onDragStart(current.id, current.point);
    },
    onPanResponderMove: (_event, gestureState) => {
      const activeDrag = activeDragRef.current;
      const current = currentPropsRef.current;
      if (!activeDrag || current.mapFieldWidth <= 0 || current.mapFieldHeight <= 0) return;
      const minX = ((current.width / 2 + 10) / current.mapFieldWidth) * 100;
      const minY = ((current.height / 2 + 10) / current.mapFieldHeight) * 100;
      const point = {
        x: Math.max(minX, Math.min(100 - minX, activeDrag.originPoint.x + (gestureState.dx / current.mapFieldWidth) * 100)),
        y: Math.max(minY, Math.min(100 - minY, activeDrag.originPoint.y + (gestureState.dy / current.mapFieldHeight) * 100)),
      };
      const targetId = current.onDragMove(current.id, point);
      activeDragRef.current = { ...activeDrag, point, targetId };
    },
    onPanResponderRelease: (_event, gestureState) => {
      const activeDrag = activeDragRef.current;
      const current = currentPropsRef.current;
      activeDragRef.current = null;
      if (!activeDrag) return;
      const minX = ((current.width / 2 + 10) / current.mapFieldWidth) * 100;
      const minY = ((current.height / 2 + 10) / current.mapFieldHeight) * 100;
      const point = current.mapFieldWidth > 0 && current.mapFieldHeight > 0
        ? {
            x: Math.max(minX, Math.min(100 - minX, activeDrag.originPoint.x + (gestureState.dx / current.mapFieldWidth) * 100)),
            y: Math.max(minY, Math.min(100 - minY, activeDrag.originPoint.y + (gestureState.dy / current.mapFieldHeight) * 100)),
          }
        : activeDrag.point;
      const targetId = current.onDragMove(current.id, point);
      current.onDragEnd(current.id, point, targetId);
    },
    onPanResponderTerminate: () => {
      activeDragRef.current = null;
      currentPropsRef.current.onDragCancel();
    },
  }).panHandlers, []);

  return (
    <View {...panHandlers} onTouchStart={onTouchStart} style={style}>
      {children}
    </View>
  );
}

export function EditableWorkspaceMindmap({
  mindmap,
  template,
  compact,
  onTitleChange,
  onNodeAdd,
  onNodeChange,
  onNodeDelete,
  onNodeCreateTodo,
  onRootPositionChange,
  onNodeMove,
  onNodeReparent,
}: {
  mindmap: WorkspaceMindmap;
  template: MindmapTemplate;
  compact: boolean;
  onTitleChange: (value: string) => void;
  onNodeAdd: (parentNodeId: string | null) => void;
  onNodeChange: (nodeId: string, value: string) => void;
  onNodeDelete: (nodeId: string) => void;
  onNodeCreateTodo: (label: string) => void;
  onRootPositionChange: (point: MindmapPoint) => void;
  onNodeMove: (nodeId: string, point: MindmapPoint) => void;
  onNodeReparent: (nodeId: string, parentNodeId: string | null) => boolean;
}) {
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [dragPreview, setDragPreview] = useState<{
    id: string;
    point: MindmapPoint;
    targetId: string | null;
  } | null>(null);
  const [selectedMindmapNodeId, setSelectedMindmapNodeId] = useState<string | null>(null);
  // Placeholders hide while their input has the cursor.
  const [focusedMindmapNodeId, setFocusedMindmapNodeId] = useState<string | null>(null);
  const effectiveCompact = compact || mindmap.settings.compactSpacing;
  const root = dragPreview?.id === 'root'
    ? dragPreview.point
    : mindmap.root_position ?? { x: 50, y: 50 };
  const topLevelNodes = mindmap.nodes.length > 0 ? mindmap.nodes : mindmapNodesFromTopics(mindmap.topics, mindmap.template);
  const layoutTemplateKey = mindmap.settings.layout === 'right' ? 'right-stack' : mindmap.template;
  const positions = editableMindmapPositions(layoutTemplateKey, topLevelNodes.length);
  const topicWidth = effectiveCompact ? 112 : 138;
  const childWidth = effectiveCompact ? 94 : 108;
  const rootWidth = effectiveCompact ? 138 : 166;
  const nodeHeight = 38;
  const rootHeight = 42;
  const childNodeHeight = 32;
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  const canvasWidth = canvasSize.width > 0 ? canvasSize.width : (effectiveCompact ? 640 : 980);
  const canvasHeight = canvasSize.height > 0 ? canvasSize.height : (effectiveCompact ? 380 : 560);
  const mapFieldWidth = Math.min(canvasWidth, effectiveCompact ? 600 : 980);
  const mapFieldHeight = Math.min(canvasHeight, effectiveCompact ? 320 : 500);
  const mapFieldOffsetX = Math.max((canvasWidth - mapFieldWidth) / 2, 0);
  const mapFieldOffsetY = Math.max((canvasHeight - mapFieldHeight) / 2, 0);
  const toCanvasPoint = (point: { x: number; y: number }) => ({
    x: mapFieldOffsetX + (point.x / 100) * mapFieldWidth,
    y: mapFieldOffsetY + (point.y / 100) * mapFieldHeight,
  });
  const gridPath = [20, 40, 60, 80].map((line) => {
    const x = mapFieldOffsetX + (line / 100) * mapFieldWidth;
    const y = mapFieldOffsetY + (line / 100) * mapFieldHeight;
    return `M ${x} ${mapFieldOffsetY} V ${mapFieldOffsetY + mapFieldHeight} M ${mapFieldOffsetX} ${y} H ${mapFieldOffsetX + mapFieldWidth}`;
  }).join(' ');
  function handleCanvasLayout(event: LayoutChangeEvent) {
    const { width: nextWidth, height: nextHeight } = event.nativeEvent.layout;
    setCanvasSize((current) => (
      Math.abs(current.width - nextWidth) < 1 && Math.abs(current.height - nextHeight) < 1
        ? current
        : { width: nextWidth, height: nextHeight }
    ));
  }
  function connectorPort(
    from: { x: number; y: number },
    to: { x: number; y: number },
    width: number,
    height: number
  ) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);
    if (distance === 0) return from;
    const targetVector = { x: dx / distance, y: dy / distance };
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const ports = [
      { x: -halfWidth, y: 0 },
      { x: -halfWidth * 0.62, y: -halfHeight },
      { x: 0, y: -halfHeight },
      { x: halfWidth * 0.62, y: -halfHeight },
      { x: halfWidth, y: 0 },
      { x: halfWidth * 0.62, y: halfHeight },
      { x: 0, y: halfHeight },
      { x: -halfWidth * 0.62, y: halfHeight },
    ];
    const bestPort = ports.reduce((best, port) => {
      const portDistance = Math.hypot(port.x, port.y);
      if (portDistance === 0) return best;
      const portVector = { x: port.x / portDistance, y: port.y / portDistance };
      const score = portVector.x * targetVector.x + portVector.y * targetVector.y;
      return score > best.score ? { port, score } : best;
    }, { port: ports[0], score: Number.NEGATIVE_INFINITY });
    return {
      x: from.x + bestPort.port.x,
      y: from.y + bestPort.port.y,
    };
  }
  function connectorPath(start: { x: number; y: number }, end: { x: number; y: number }) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      const handleX = Math.max(28, Math.min(92, Math.abs(dx) * 0.48));
      return `M ${start.x} ${start.y} C ${start.x + Math.sign(dx || 1) * handleX} ${start.y}, ${end.x - Math.sign(dx || 1) * handleX} ${end.y}, ${end.x} ${end.y}`;
    }
    const handleY = Math.max(22, Math.min(76, Math.abs(dy) * 0.45));
    return `M ${start.x} ${start.y} C ${start.x} ${start.y + Math.sign(dy || 1) * handleY}, ${end.x} ${end.y - Math.sign(dy || 1) * handleY}, ${end.x} ${end.y}`;
  }
  function getDropTargetId(draggedNodeId: string, point: MindmapPoint): string | null {
    if (draggedNodeId === 'root') return null;
    const canvasPoint = toCanvasPoint(point);
    const targets: { id: string; distance: number }[] = [];
    const addTarget = (id: string, targetPoint: { x: number; y: number }, width: number, height: number) => {
      const dx = canvasPoint.x - targetPoint.x;
      const dy = canvasPoint.y - targetPoint.y;
      if (Math.abs(dx) <= width / 2 && Math.abs(dy) <= height / 2) {
        targets.push({ id, distance: dx * dx + dy * dy });
      }
    };

    if (canReparentMindmapNode(mindmap.nodes, draggedNodeId, null)) {
      addTarget('root', rootPoint, rootWidth, rootHeight);
    }
    renderNodes.forEach((renderNode) => {
      if (!canReparentMindmapNode(mindmap.nodes, draggedNodeId, renderNode.node.id)) return;
      addTarget(
        renderNode.node.id,
        toCanvasPoint({ x: renderNode.x, y: renderNode.y }),
        renderNode.width,
        renderNode.height
      );
    });
    targets.sort((first, second) => first.distance - second.distance);
    return targets[0]?.id ?? null;
  }
  type RenderNode = {
    node: WorkspaceMindmapNode;
    x: number;
    y: number;
    parentId: string;
    parentX: number;
    parentY: number;
    width: number;
    height: number;
    parentWidth: number;
    parentHeight: number;
    depth: number;
    color: string;
    branchColor: string;
  };
  const renderNodes: RenderNode[] = [];
  function paleBranchColor(color: string) {
    const hex = color.replace('#', '');
    if (!/^[\da-f]{6}$/i.test(hex)) return color;
    const channels = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
    return `#${channels.map((channel) => Math.round(channel + (255 - channel) * 0.78).toString(16).padStart(2, '0')).join('')}`;
  }
  function childPosition(
    parentX: number,
    parentY: number,
    index: number,
    count: number,
    depth: number,
    parentWidth: number,
    childNodeWidth: number,
    childNodeHeightValue: number
  ) {
    const preferredSide = parentX < 46 ? -1 : parentX > 54 ? 1 : index % 2 === 0 ? -1 : 1;
    const minX = ((childNodeWidth / 2 + 10) / mapFieldWidth) * 100;
    const maxX = 100 - minX;
    const minY = ((childNodeHeightValue / 2 + 10) / mapFieldHeight) * 100;
    const maxY = 100 - minY;
    const horizontalGap = effectiveCompact ? 20 : 34;
    const requiredOffset = ((parentWidth / 2 + childNodeWidth / 2 + horizontalGap + depth * 10) / mapFieldWidth) * 100;
    const leftSpace = parentX - minX;
    const rightSpace = maxX - parentX;
    const side = preferredSide < 0
      ? (leftSpace >= requiredOffset || rightSpace < requiredOffset ? -1 : 1)
      : (rightSpace >= requiredOffset || leftSpace < requiredOffset ? 1 : -1);
    const spread = Math.max(effectiveCompact ? 8 : 12, ((childNodeHeightValue + (effectiveCompact ? 10 : 18)) / mapFieldHeight) * 100);
    const yOffset = (index - (count - 1) / 2) * spread;
    return {
      x: clamp(parentX + side * requiredOffset, minX, maxX),
      y: clamp(parentY + yOffset, minY, maxY),
    };
  }
  function collectNodes(
    nodes: WorkspaceMindmapNode[],
    parentId: string,
    parentX: number,
    parentY: number,
    parentWidth: number,
    parentHeight: number,
    depth: number,
    inheritedBranchColor: string | null = null
  ) {
    nodes.forEach((node, index) => {
      const width = depth === 0 ? topicWidth : childWidth;
      const height = depth === 0 ? nodeHeight : childNodeHeight;
      const autoPosition = depth === 0
        ? positions[index]
        : childPosition(parentX, parentY, index, nodes.length, depth, parentWidth, width, height);
      const savedPosition = typeof node.x === 'number' && typeof node.y === 'number'
        ? { x: node.x, y: node.y }
        : undefined;
      const previewPosition = dragPreview?.id === node.id ? dragPreview.point : undefined;
      const position = previewPosition ?? savedPosition ?? autoPosition;
      const templateBranchColor = template.colors[index % template.colors.length] ?? '#e5e7eb';
      const branchColor = depth === 0
        ? (mindmap.settings.coloredBranches ? templateBranchColor : '#94a3b8')
        : inheritedBranchColor ?? '#94a3b8';
      renderNodes.push({
        node,
        x: position.x,
        y: position.y,
        parentId,
        parentX,
        parentY,
        width,
        height,
        parentWidth,
        parentHeight,
        depth,
        color: depth === 0 ? branchColor : depth === 1 ? paleBranchColor(branchColor) : '#ffffff',
        branchColor,
      });
      collectNodes(
        node.children,
        node.id,
        position.x,
        position.y,
        width,
        height,
        depth + 1,
        depth === 0 ? branchColor : inheritedBranchColor
      );
    });
  }
  collectNodes(topLevelNodes, 'root', root.x, root.y, rootWidth, rootHeight, 0);
  const rootPoint = toCanvasPoint(root);
  function handleMindmapDragStart(id: string, point: MindmapPoint) {
    setDragPreview({ id, point, targetId: null });
  }
  function handleMindmapDragMove(id: string, point: MindmapPoint) {
    const targetId = getDropTargetId(id, point);
    setDragPreview({ id, point, targetId });
    return targetId;
  }
  function handleMindmapDragEnd(id: string, point: MindmapPoint, targetId: string | null) {
    setDragPreview(null);
    if (targetId) {
      const parentNodeId = targetId === 'root' ? null : targetId;
      if (onNodeReparent(id, parentNodeId)) return;
    }
    if (id === 'root') onRootPositionChange(point);
    else onNodeMove(id, point);
  }
  function handleMindmapDragCancel() {
    setDragPreview(null);
  }

  return (
    <View
      style={[styles.notesMindmapCanvas, effectiveCompact && styles.notesMindmapCanvasCompact]}
      onLayout={handleCanvasLayout}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        style={styles.notesMindmapCanvasConnectors}
        pointerEvents="none"
      >
        <Path
          d={gridPath}
          stroke="#dbe4f0"
          strokeWidth={1}
          opacity={0.48}
          fill="none"
        />
        <Rect
          x={mapFieldOffsetX}
          y={mapFieldOffsetY}
          width={mapFieldWidth}
          height={mapFieldHeight}
          rx={16}
          stroke="#cbd5e1"
          strokeWidth={1.2}
          strokeDasharray="8 8"
          opacity={0.56}
          fill="none"
        />
        {renderNodes.map((renderNode) => {
          const parentPoint = toCanvasPoint({ x: renderNode.parentX, y: renderNode.parentY });
          const nodePoint = toCanvasPoint({ x: renderNode.x, y: renderNode.y });
          const start = connectorPort(parentPoint, nodePoint, renderNode.parentWidth, renderNode.parentHeight);
          const end = connectorPort(nodePoint, parentPoint, renderNode.width, renderNode.height);
          const stroke = renderNode.depth === 0 ? renderNode.color : '#94a3b8';
          const isSelectedConnector = selectedMindmapNodeId === renderNode.node.id || selectedMindmapNodeId === renderNode.parentId;
          const hasSelectedNode = selectedMindmapNodeId !== null;
          const strokeWidth = isSelectedConnector ? (renderNode.depth === 0 ? 3.6 : 2.6) : (renderNode.depth === 0 ? 3 : 2);
          const portRadius = renderNode.depth === 0 ? 3.1 : 2.5;
          const connectorOpacity = !hasSelectedNode || isSelectedConnector
            ? (renderNode.depth === 0 ? 0.9 : 0.66)
            : 0.24;
          return (
            <G key={`${mindmap.id}-connector-${renderNode.node.id}`}>
              <Path
                d={connectorPath(start, end)}
                stroke={stroke}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                opacity={connectorOpacity}
              />
              <Circle
                cx={start.x}
                cy={start.y}
                r={portRadius}
                fill="#ffffff"
                stroke={stroke}
                strokeWidth={1.4}
                opacity={connectorOpacity}
              />
              <Circle
                cx={end.x}
                cy={end.y}
                r={portRadius}
                fill="#ffffff"
                stroke={stroke}
                strokeWidth={1.4}
                opacity={connectorOpacity}
              />
            </G>
          );
        })}
      </Svg>
      <MindmapDraggableNode
        id="root"
        point={root}
        width={rootWidth}
        height={rootHeight}
        mapFieldWidth={mapFieldWidth}
        mapFieldHeight={mapFieldHeight}
        onTouchStart={() => setSelectedMindmapNodeId('root')}
        onDragStart={handleMindmapDragStart}
        onDragMove={handleMindmapDragMove}
        onDragEnd={handleMindmapDragEnd}
        onDragCancel={handleMindmapDragCancel}
        style={[
          styles.notesMindmapNode,
          styles.notesMindmapRootNode,
          {
            left: rootPoint.x,
            top: rootPoint.y,
            width: rootWidth,
            height: rootHeight,
            transform: [
              { translateX: -rootWidth / 2 },
              { translateY: -rootHeight / 2 },
            ],
          },
          selectedMindmapNodeId === 'root' && styles.notesMindmapNodeSelected,
          dragPreview?.targetId === 'root' && styles.notesMindmapNodeDropTarget,
        ]}
      >
        <TextInput
          value={mindmap.title}
          onChangeText={onTitleChange}
          onFocus={() => {
            setSelectedMindmapNodeId('root');
            setFocusedMindmapNodeId('root');
          }}
          onBlur={() => setFocusedMindmapNodeId((current) => (current === 'root' ? null : current))}
          style={[styles.notesMindmapNodeInput, styles.notesMindmapRootInput]}
          placeholder={focusedMindmapNodeId === 'root' ? '' : 'Central topic'}
          placeholderTextColor="#9ca3af"
          accessibilityLabel="Central topic"
        />
        {selectedMindmapNodeId === 'root' ? (
          <View
            style={[
              styles.notesMindmapNodeActionGroup,
              styles.notesMindmapRootActionGroup,
              rootPoint.y - rootHeight / 2 < 32 && styles.notesMindmapNodeActionGroupBelow,
            ]}
          >
            <Pressable
              onPress={(event) => {
                event.stopPropagation?.();
                onNodeAdd(null);
              }}
              style={styles.notesMindmapRootAddAction}
              accessibilityRole="button"
              accessibilityLabel="Add first-level node"
              accessibilityHint="Adds a new topic connected to the central topic."
            >
              <Text style={styles.notesMindmapRootAddActionText}>+</Text>
            </Pressable>
          </View>
        ) : null}
      </MindmapDraggableNode>
      {renderNodes.map((renderNode, index) => {
        const color = renderNode.color;
        const width = renderNode.depth === 0 ? topicWidth : childWidth;
        const nodePoint = toCanvasPoint({ x: renderNode.x, y: renderNode.y });
        const nodePosition = { x: renderNode.x, y: renderNode.y };
        const canDeleteNode = topLevelNodes.length > 1 || renderNode.depth > 0;
        const isSelected = selectedMindmapNodeId === renderNode.node.id;
        const nodeColor = renderNode.depth <= 1 ? color : '#ffffff';
        const borderColor = renderNode.depth <= 1 ? renderNode.branchColor : '#cbd5e1';
        return (
          <MindmapDraggableNode
            id={renderNode.node.id}
            point={nodePosition}
            width={width}
            height={renderNode.height}
            mapFieldWidth={mapFieldWidth}
            mapFieldHeight={mapFieldHeight}
            onTouchStart={() => setSelectedMindmapNodeId(renderNode.node.id)}
            onDragStart={handleMindmapDragStart}
            onDragMove={handleMindmapDragMove}
            onDragEnd={handleMindmapDragEnd}
            onDragCancel={handleMindmapDragCancel}
            key={`${mindmap.id}-node-${renderNode.node.id}`}
            style={[
              styles.notesMindmapNode,
              renderNode.depth > 0 && styles.notesMindmapChildNode,
              {
                left: nodePoint.x,
                top: nodePoint.y,
                width,
                height: renderNode.height,
                transform: [
                  { translateX: -width / 2 },
                  { translateY: -renderNode.height / 2 },
                ],
                backgroundColor: nodeColor,
                borderColor,
              },
              isSelected && styles.notesMindmapNodeSelected,
              dragPreview?.targetId === renderNode.node.id && styles.notesMindmapNodeDropTarget,
            ]}
          >
            <TextInput
              value={renderNode.node.label}
              onChangeText={(value) => onNodeChange(renderNode.node.id, value)}
              onFocus={() => {
                setSelectedMindmapNodeId(renderNode.node.id);
                setFocusedMindmapNodeId(renderNode.node.id);
              }}
              onBlur={() => setFocusedMindmapNodeId((current) => (current === renderNode.node.id ? null : current))}
              style={[
                styles.notesMindmapNodeInput,
                renderNode.depth > 0 && styles.notesMindmapChildNodeInput,
                renderNode.depth === 0 && styles.notesMindmapTopicInput,
              ]}
              placeholder={focusedMindmapNodeId === renderNode.node.id ? '' : renderNode.depth === 0 ? `Topic ${index + 1}` : 'Child'}
              placeholderTextColor={renderNode.depth === 0 ? '#64748b' : '#94a3b8'}
              accessibilityLabel={`Mindmap node ${index + 1}`}
            />
            {isSelected ? (
              <View
                style={[
                  styles.notesMindmapNodeActionGroup,
                  nodePoint.y - renderNode.height / 2 < 32 && styles.notesMindmapNodeActionGroupBelow,
                ]}
              >
                <Pressable
                  onPress={(event) => {
                    event.stopPropagation?.();
                    onNodeAdd(renderNode.node.id);
                  }}
                  style={styles.notesMindmapNodeAction}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`Add child node to ${renderNode.node.label}`}
                >
                  <Text style={styles.notesMindmapNodeActionText}>+</Text>
                </Pressable>
                <Pressable
                  onPress={(event) => {
                    event.stopPropagation?.();
                    onNodeCreateTodo(renderNode.node.label);
                  }}
                  style={styles.notesMindmapNodeAction}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`Create todo from ${renderNode.node.label}`}
                >
                  <ListTodo size={11} color="#64748b" strokeWidth={2.5} />
                </Pressable>
                {canDeleteNode ? (
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation?.();
                      onNodeDelete(renderNode.node.id);
                    }}
                    style={styles.notesMindmapNodeAction}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete node ${renderNode.node.label}`}
                  >
                    <Text style={styles.notesMindmapNodeActionText}>×</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </MindmapDraggableNode>
        );
      })}
      <Pressable
        onPress={() => onNodeAdd(null)}
        style={styles.notesMindmapCanvasAddNode}
        accessibilityRole="button"
        accessibilityLabel="Add top-level mindmap node"
      >
        <Text style={styles.notesMindmapCanvasAddNodeText}>+</Text>
      </Pressable>
    </View>
  );
}
