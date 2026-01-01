import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import styles from './NotificationModal.module.css';

const NotificationModal = ({ isOpen, message, onClose, type = 'info' }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
        </button>
        
        <div className={styles.content}>
            <div className={styles.iconWrapper}>
                <AlertCircle size={40} className={styles.icon} />
            </div>
            <h3 className={styles.title}>Notice</h3>
            <p className={styles.message}>{message}</p>
            <button className={styles.okButton} onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;