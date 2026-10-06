import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { formatActiveDuration } from '../../../lib/calendar';
import { browserDisplayActive, browserTabShown } from '../../../lib/browserPresence';
import { workspaceActiveDaySeconds } from '../constants';

export function usePresence() {
  const [now, setNow] = useState(() => new Date());
  const [browserActive, setBrowserActive] = useState(browserDisplayActive);
  const [browserShown, setBrowserShown] = useState(browserTabShown);
  const [workspaceActiveSeconds, setWorkspaceActiveSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);
  const workspaceActiveLabel = formatActiveDuration(workspaceActiveSeconds);
  const workspaceActiveProgress = workspaceActiveSeconds === 0
    ? 0
    : Math.min(100, Math.max(2, (workspaceActiveSeconds / workspaceActiveDaySeconds) * 100));

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') return undefined;
    const updateBrowserPresence = () => {
      setBrowserActive(browserDisplayActive());
      setBrowserShown(browserTabShown());
    };
    updateBrowserPresence();
    window.addEventListener('focus', updateBrowserPresence);
    window.addEventListener('blur', updateBrowserPresence);
    document.addEventListener('visibilitychange', updateBrowserPresence);
    return () => {
      window.removeEventListener('focus', updateBrowserPresence);
      window.removeEventListener('blur', updateBrowserPresence);
      document.removeEventListener('visibilitychange', updateBrowserPresence);
    };
  }, []);

  return {
    now,
    browserActive,
    browserShown,
    setWorkspaceActiveSeconds,
    workspaceActiveLabel,
    workspaceActiveProgress,
  };
}

export type PresenceState = ReturnType<typeof usePresence>;
