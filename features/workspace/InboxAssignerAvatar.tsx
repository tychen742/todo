import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Image } from 'react-native';

export function InboxAssignerAvatar({
  initials,
  color,
  avatarUrl,
  tooltip,
}: {
  initials: string;
  color: string;
  avatarUrl?: string | null;
  tooltip: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={ias.wrap}
      hitSlop={4}
    >
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={ias.avatarPhoto} />
      ) : (
        <View style={[ias.avatar, { backgroundColor: color }]}>
          <Text style={ias.initials}>{initials}</Text>
        </View>
      )}
      {hovered && Platform.OS === 'web' && (
        <View style={ias.tooltip}>
          <Text style={ias.tooltipText}>{tooltip}</Text>
        </View>
      )}
    </Pressable>
  );
}
const ias = StyleSheet.create({
  wrap: { position: 'relative' },
  avatar: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  avatarPhoto: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#e5e7eb' },
  initials: { fontSize: 9, fontWeight: '700', color: '#fff' },
  tooltip: {
    position: 'absolute', bottom: 26, right: 0, backgroundColor: '#111827',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, zIndex: 100, minWidth: 80,
  },
  tooltipText: { color: '#fff', fontSize: 11 },
});
