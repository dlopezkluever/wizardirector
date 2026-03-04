import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';

interface ThemeToggleProps {
  collapsed?: boolean;
}

const themeOrder = ['dark', 'light', 'system'] as const;
const themeLabels: Record<string, string> = {
  dark: 'Dark',
  light: 'Light',
  system: 'System',
};
const themeIcons: Record<string, React.ElementType> = {
  dark: Moon,
  light: Sun,
  system: Monitor,
};

export function ThemeToggle({ collapsed }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    const currentIndex = themeOrder.indexOf(theme as typeof themeOrder[number]);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setTheme(themeOrder[nextIndex]);
  };

  const current = theme ?? 'dark';
  const Icon = themeIcons[current] ?? Moon;

  return (
    <button
      onClick={cycleTheme}
      className="sidebar-item w-full"
      aria-label={`Theme: ${themeLabels[current]}. Click to cycle.`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      {!collapsed && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="truncate"
        >
          {themeLabels[current]} Mode
        </motion.span>
      )}
    </button>
  );
}
