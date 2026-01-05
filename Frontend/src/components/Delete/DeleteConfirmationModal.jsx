import React from 'react';
import { Trash2, Loader2 } from 'lucide-react'; // Import Loader2
import styles from './DeleteConfirmationModal.module.css';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, isLoading }) => {
  if (!isOpen) return null;

  return (
    // Prevent closing via overlay click if loading
    <div className={styles.overlay} onClick={!isLoading ? onClose : undefined}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        
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
          <button 
            className={styles.cancelButton} 
            onClick={onClose}
            disabled={isLoading} // Disable Cancel
          >
            Cancel
          </button>
          
          <button 
            className={styles.deleteButton} 
            onClick={onConfirm}
            disabled={isLoading} // Disable Delete
          >
            {isLoading ? (
                <>
                    <Loader2 className={styles.spinner} size={18} />
                    <span>Deleting...</span>
                </>
            ) : (
                "Yes, Delete"
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default DeleteConfirmationModal;