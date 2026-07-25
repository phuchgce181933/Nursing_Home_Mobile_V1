import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';
const THEME_STORAGE_KEY = 'themeMode';

type ThemeState = {
  mode: ThemeMode;
  effectiveScheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeState>({
  mode: 'system',
  effectiveScheme: 'light',
  setMode: () => {},
});

export const useThemeMode = () => useContext(ThemeContext);

const resolveScheme = (mode: ThemeMode, system: ColorSchemeName): 'light' | 'dark' => {
  if (mode === 'system') return system === 'dark' ? 'dark' : 'light';
  return mode;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored);
      }
    })();
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => setSystemScheme(colorScheme));
    return () => sub.remove();
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
  }, []);

  const effectiveScheme = resolveScheme(mode, systemScheme);

  return (
    <ThemeContext.Provider value={{ mode, effectiveScheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
