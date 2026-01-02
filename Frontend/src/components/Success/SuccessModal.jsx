import React from 'react';
import { CheckCircle } from 'lucide-react';
import styles from './SuccessModal.module.css';

const SuccessModal = ({ isOpen, onClose, message, title = "Success!" }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        
        {/* Success Icon (Green & Gold) */}
        <div className={styles.iconContainer}>
          <CheckCircle className={styles.icon} size={32} />
        </div>

        <h3 className={styles.title}>{title}</h3>
        
        <p className={styles.message}>
          {message}
        </p>

        <div className={styles.actions}>
          <button className={styles.okButton} onClick={onClose}>
            OK
          </button>
        </div>

      </div>
    </div>
  );
};

export default SuccessModal;