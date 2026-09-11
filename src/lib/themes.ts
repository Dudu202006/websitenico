export type ThemeId = 'delice' | 'boulangerie' | 'ocean' | 'sombre';

export const themeOptions: { id: ThemeId; label: string }[] = [
  { id: 'delice', label: 'Bleu & Brun' },
  { id: 'boulangerie', label: 'Boulangerie' },
  { id: 'ocean', label: 'Océan' },
  { id: 'sombre', label: 'Sombre' },
];

const STORAGE_PREFIX = 'theme';

function storageKey(userId?: string) {
  return userId ? `${STORAGE_PREFIX}:${userId}` : STORAGE_PREFIX;
}

export function loadStoredTheme(userId?: string): ThemeId {
  const stored = localStorage.getItem(storageKey(userId));
  if (stored && themeOptions.some((t) => t.id === stored)) {
    return stored as ThemeId;
  }
  return 'delice';
}

export function saveTheme(theme: ThemeId, userId?: string) {
  localStorage.setItem(storageKey(userId), theme);
}

export function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme;
}
