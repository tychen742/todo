import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppThemeKey, Density } from '../../../lib/types';
import { densityPV, densityRowH, appThemes, themeStorageKey } from '../constants';

export function usePreferences() {
  const { width, height } = useWindowDimensions();
  const [aboutVisible, setAboutVisible] = useState(false);
  const [density, setDensity] = useState<Density>('cozy');
  const [themeKey, setThemeKey] = useState<AppThemeKey>('flow');
  const [themeReady, setThemeReady] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);

  const rowPV = densityPV[density];
  const rowH = densityRowH[density];
  const appTheme = appThemes[themeKey];

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(themeStorageKey)
      .then((value) => {
        if (cancelled) return;
        if (value && value in appThemes) setThemeKey(value as AppThemeKey);
      })
      .finally(() => {
        if (!cancelled) setThemeReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!themeReady) return;
    AsyncStorage.setItem(themeStorageKey, themeKey).catch(() => undefined);
  }, [themeKey, themeReady]);

  return {
    width,
    height,
    aboutVisible,
    setAboutVisible,
    density,
    setDensity,
    themeKey,
    setThemeKey,
    settingsExpanded,
    setSettingsExpanded,
    rowPV,
    rowH,
    appTheme,
  };
}

export type PreferencesState = ReturnType<typeof usePreferences>;
