import { LS_KEYS } from '../constants/storage-keys';

export type AppTheme = 'xingtu-orange' | 'xingtu-neutral';

export interface AppThemeOption {
  value: AppTheme;
  label: string;
  description: string;
}

export const DEFAULT_APP_THEME: AppTheme = 'xingtu-neutral';

export const APP_THEME_OPTIONS: AppThemeOption[] = [
  {
    value: 'xingtu-orange',
    label: '星图橙金',
    description: '使用当前星图默认橙金主题。',
  },
  {
    value: 'xingtu-neutral',
    label: '中性风',
    description: '使用黑白中性色主题。',
  },
];

export const normalizeAppTheme = (value: string | null): AppTheme => {
  return value === 'xingtu-orange' ? 'xingtu-orange' : DEFAULT_APP_THEME;
};

export const applyAppTheme = (theme: AppTheme): void => {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  if (theme === 'xingtu-neutral') {
    root.dataset.xingtuTheme = theme;
    return;
  }

  delete root.dataset.xingtuTheme;
};

export const getStoredAppTheme = (): AppTheme => {
  if (typeof localStorage === 'undefined') {
    return DEFAULT_APP_THEME;
  }

  try {
    return normalizeAppTheme(localStorage.getItem(LS_KEYS.APP_THEME));
  } catch (error) {
    console.debug('[app-theme] Failed to read theme preference', error);
    return DEFAULT_APP_THEME;
  }
};

export const setStoredAppTheme = (theme: AppTheme): void => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    if (theme === DEFAULT_APP_THEME) {
      localStorage.removeItem(LS_KEYS.APP_THEME);
      return;
    }

    localStorage.setItem(LS_KEYS.APP_THEME, theme);
  } catch (error) {
    console.debug('[app-theme] Failed to save theme preference', error);
    throw error;
  }
};
