import { useTheme } from '../context/ThemeContext';

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme, options } = useTheme();

  return (
    <label className={`theme-switcher ${compact ? 'theme-switcher-compact' : ''}`}>
      {!compact && <span>Thème</span>}
      <select value={theme} onChange={(e) => setTheme(e.target.value as typeof theme)}>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
