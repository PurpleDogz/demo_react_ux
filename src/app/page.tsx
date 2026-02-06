import styles from "./page.module.css";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import DataGrid from "@/components/DataGrid";
import InputShowcase from "@/components/InputShowcase";
import Charts from "@/components/Charts";
import ModalShowcase from "@/components/ModalShowcase";

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>Theme Showcase</h1>
          <p className={styles.subtitle}>
            Switch between 5 themes to see AG Grid and input controls adapt
          </p>
        </div>
        <ThemeSwitcher />
      </header>
      <div className={styles.sections}>
        <section className={styles.section}>
          <DataGrid />
        </section>
        <section className={styles.section}>
          <Charts />
        </section>
        <section className={styles.section}>
          <ModalShowcase />
        </section>
        <section className={styles.section}>
          <InputShowcase />
        </section>
      </div>
    </div>
  );
}
