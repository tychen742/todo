import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="project/[id]" options={{ title: 'Project' }} />
    </Stack>
  );
}
