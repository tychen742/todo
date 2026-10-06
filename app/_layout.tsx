import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="project/[id]" options={{ title: 'Project' }} />
      <Stack.Screen name="privacy" options={{ headerShown: false, title: 'Privacy Policy' }} />
      <Stack.Screen name="terms" options={{ headerShown: false, title: 'Terms of Service' }} />
    </Stack>
  );
}
