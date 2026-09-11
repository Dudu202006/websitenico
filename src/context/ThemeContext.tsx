import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  applyTheme,
  loadStoredTheme,
  saveTheme,
  themeOptions,
  type ThemeId,
} from '../lib/themes';

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  options: typeof themeOptions;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<ThemeId>(() => loadStoredTheme(user?.id));

  useEffect(() => {
    const stored = loadStoredTheme(user?.id);
    setThemeState(stored);
    applyTheme(stored);
  }, [user?.id]);

  function setTheme(next: ThemeId) {
    setThemeState(next);
    saveTheme(next, user?.id);
    applyTheme(next);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, options: themeOptions }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme doit être utilisé dans ThemeProvider');
  }
  return context;
}
