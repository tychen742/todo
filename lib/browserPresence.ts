import { Platform } from 'react-native';

export function browserDisplayActive() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return true;
  const visible = document.visibilityState === 'visible';
  const focused = typeof document.hasFocus === 'function' ? document.hasFocus() : true;
  return visible && focused;
}

export function browserTabShown() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return true;
  return document.visibilityState === 'visible';
}
