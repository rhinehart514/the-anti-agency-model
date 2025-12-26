'use client';

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { Theme, generateThemeVars } from './types';
import { defaultTheme } from './presets';

interface ThemeContextValue {
  theme: Theme;
  cssVars: Record<string, string>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  theme?: Theme;
  children: ReactNode;
}

export function ThemeProvider({ theme = defaultTheme, children }: ThemeProviderProps) {
  const cssVars = useMemo(() => generateThemeVars(theme), [theme]);

  const style = useMemo(() => {
    const styleObj: Record<string, string> = {};
    Object.entries(cssVars).forEach(([key, value]) => {
      styleObj[key] = value;
    });
    return styleObj;
  }, [cssVars]);

  return (
    <ThemeContext.Provider value={{ theme, cssVars }}>
      <div style={style} className="theme-root">
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Generate inline CSS for SSR
export function generateThemeCSS(theme: Theme): string {
  const vars = generateThemeVars(theme);
  const cssVars = Object.entries(vars)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n  ');

  return `:root {\n  ${cssVars}\n}`;
}

// Style tag component for SSR
export function ThemeStyleTag({ theme }: { theme: Theme }) {
  const css = generateThemeCSS(theme);
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
