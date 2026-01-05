import React, { useRef } from 'react';
import { Edit2, Trash2, Calendar, Paperclip, MapPin, Wrench, Truck } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import styles from './ExpenseCard.module.css';

const ExpenseCard = ({ expense, expenseTypeName, onEdit, onDelete }) => {
  const bodyRef = useRef(null);

  // Reset scroll position when mouse leaves the card
  const handleMouseLeave = () => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  };

  const isLongTitle = expense.title.length > 20;

  // Helper to generate attachment URL
  const getAttachmentUrl = (id) => {
    return `http://127.0.0.1:8000/expense/attachment/${id}`;
  };

  return (
    <div className={styles.card} onMouseLeave={handleMouseLeave}>
      
      {/* --- FIXED HEADER --- */}
      <div className={styles.cardHeader}>
        <div className={styles.topRow}>
          <h3 className={`${styles.title} ${isLongTitle ? styles.longTitle : ''}`} title={expense.title}>
            {expense.title}
          </h3>
          <span className={styles.amount}>{formatCurrency(expense.amount)}</span>
        </div>
        <span className={styles.badge}>{expenseTypeName || 'General'}</span>
      </div>

      {/* --- SCROLLABLE BODY --- */}
      <div className={styles.cardBody} ref={bodyRef}>
        
        <div className={styles.dateRow}>
          <Calendar size={14} className={styles.icon} />
          <span>
            {new Date(expense.date).toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
            })}
          </span>
        </div>

        {expense.carNumber && (
          <div className={styles.infoRow}>
            <span className={styles.label}>Vehicle No:</span>
            <span className={styles.valueHighlight}>{expense.carNumber}</span>
          </div>
        )}

        {/* --- ADDED LABEL FOR DESCRIPTION --- */}
        {expense.description && (
          <div className={styles.description}>
            <span className={styles.descLabel}>Description:</span> {expense.description}
          </div>
        )}

        {/* --- ADDED LABELS FOR EXTRA DETAILS --- */}
        {(expense.location || expense.serviceType || expense.equipmentName) && (
            <div className={styles.extraDetails}>
                {expense.location && (
                    <div className={styles.detailItem}>
                        <MapPin size={12} className={styles.detailIcon}/> 
                        <span className={styles.detailText}><strong>Loc:</strong> {expense.location}</span>
                    </div>
                )}
                {expense.serviceType && (
                    <div className={styles.detailItem}>
                        <Wrench size={12} className={styles.detailIcon}/> 
                        <span className={styles.detailText}><strong>Svc:</strong> {expense.serviceType}</span>
                    </div>
                )}
                {expense.equipmentName && (
                    <div className={styles.detailItem}>
                        <Truck size={12} className={styles.detailIcon}/> 
                        <span className={styles.detailText}><strong>Eqp:</strong> {expense.equipmentName}</span>
                    </div>
                )}
            </div>
        )}

        {expense.attachments && expense.attachments.length > 0 && (
          <div className={styles.attachments}>
            <div className={styles.attachLabel}><Paperclip size={12} /> Attachments:</div>
            <div className={styles.fileList}>
              {expense.attachments.map((file, index) => (
                <a 
                  key={index} 
                  href={getAttachmentUrl(file.id)}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.fileLink}
                  onClick={(e) => e.stopPropagation()} 
                  title={file.filename}
                >
                  {file.filename || file.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* --- FIXED FOOTER --- */}
      <div className={styles.cardFooter}>
        <span className={styles.createdDate}>
           Created: {new Date(expense.createdAt || Date.now()).toLocaleDateString()}
        </span>
        <div className={styles.actions}>
          <button 
            className={styles.editBtn} 
            onClick={(e) => { e.stopPropagation(); onEdit(expense); }}
            title="Edit Expense"
          >
            <Edit2 size={14} /> Edit
          </button>
          <button 
            className={styles.deleteBtn} 
            onClick={(e) => { e.stopPropagation(); onDelete(expense._id); }}
            title="Delete Expense"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

    </div>
  );
};

export default ExpenseCard;