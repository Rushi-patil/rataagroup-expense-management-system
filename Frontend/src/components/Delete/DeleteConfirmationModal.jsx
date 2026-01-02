import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import styles from './DeleteConfirmationModal.module.css';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        
        {/* Icon Circle (Gold on Dark Green) */}
        <div className={styles.iconContainer}>
          <Trash2 className={styles.icon} size={32} />
        </div>

        <h3 className={styles.title}>Delete Expense?</h3>
        
        <p className={styles.message}>
          Are you sure you want to remove this record?
          <br />
          This action cannot be undone.
        </p>

        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.deleteButton} onClick={onConfirm}>
            Yes, Delete
          </button>
        </div>

      </div>
    </div>
  );
};

export default DeleteConfirmationModal;