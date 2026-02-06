"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./ModalShowcase.module.css";

function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onClose={onClose}
      onClick={handleClick}
    >
      <div className={styles.dialogContent}>{children}</div>
    </dialog>
  );
}

export default function ModalShowcase() {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.title}>Modal Dialog</h2>
      <p className={styles.description}>
        Click the button below to open an example detail dialog.
      </p>
      <button className={styles.openButton} onClick={() => setOpen(true)}>
        View Employee Details
      </button>

      <Modal open={open} onClose={() => setOpen(false)}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Employee Details</h3>
          <button
            className={styles.closeButton}
            onClick={() => setOpen(false)}
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>

        <div className={styles.detailGrid}>
          <div className={styles.avatar}>AJ</div>
          <div className={styles.detailInfo}>
            <h4 className={styles.detailName}>Alice Johnson</h4>
            <p className={styles.detailRole}>Senior Developer</p>
          </div>
        </div>

        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Department</span>
            <span className={styles.fieldValue}>Engineering</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Email</span>
            <span className={styles.fieldValue}>alice@company.com</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Start Date</span>
            <span className={styles.fieldValue}>March 15, 2020</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Salary</span>
            <span className={styles.fieldValue}>$125,000</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Status</span>
            <span className={styles.statusBadge}>Active</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Team Size</span>
            <span className={styles.fieldValue}>8 members</span>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            className={styles.secondaryButton}
            onClick={() => setOpen(false)}
          >
            Close
          </button>
          <button className={styles.primaryButton}>Edit Profile</button>
        </div>
      </Modal>
    </div>
  );
}
