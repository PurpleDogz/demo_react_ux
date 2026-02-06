"use client";

import { useTheme, THEMES } from "@/context/ThemeContext";
import styles from "./ThemeSwitcher.module.css";

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className={styles.switcher}>
      <span className={styles.label}>Theme:</span>
      {THEMES.map((t) => (
        <button
          key={t.id}
          className={`${styles.button} ${theme === t.id ? styles.active : ""}`}
          onClick={() => setTheme(t.id)}
          aria-pressed={theme === t.id}
        >
          <span
            className={styles.dot}
            style={{ backgroundColor: t.color }}
          />
          {t.label}
        </button>
      ))}
    </div>
  );
}
