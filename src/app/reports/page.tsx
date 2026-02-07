"use client";

import styles from "./page.module.css";
import ReportExplorer from "@/components/ReportExplorer";
import { useTheme } from "@/context/ThemeContext";

export default function ReportsPage() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>Climate Impact Explorer</h1>
          <p className={styles.subtitle}>
            Planetrics scenario metrics applied to the Future Fund Portfolio
          </p>
        </div>
        <div className={styles.themeToggle}>
          <button
            type="button"
            className={`${styles.themeBtn} ${!isDark ? styles.themeBtnActive : ""}`}
            onClick={() => setTheme("light")}
          >
            Light
          </button>
          <button
            type="button"
            className={`${styles.themeBtn} ${isDark ? styles.themeBtnActive : ""}`}
            onClick={() => setTheme("dark")}
          >
            Dark
          </button>
        </div>
      </header>
      <ReportExplorer />
    </div>
  );
}
