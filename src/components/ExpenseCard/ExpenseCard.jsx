import React from 'react';
import { Edit2, Trash2, Calendar, Paperclip, Clock } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import styles from './ExpenseCard.module.css';

const ExpenseCard = ({ expense, expenseTypeName, onEdit, onDelete }) => {
  
  // Helper to generate attachment URL
  const getAttachmentUrl = (id) => {
    return `http://127.0.0.1:8000/expense/attachment/${id}`;
  };

  return (
    <div className={styles.card}>
      
      {/* Header: Title, Type Badge, Amount */}
      <div className={styles.cardHeader}>
        <div className={styles.titleSection}>
          <h3 className={styles.title}>{expense.title}</h3>
          <span className={styles.categoryBadge}>
             {expenseTypeName || 'General'} 
          </span>
        </div>
        <div className={styles.amount}>
          {formatCurrency(expense.amount)}
        </div>
      </div>

      {/* Date */}
      <div className={styles.dateRow}>
        <Calendar size={14} className={styles.icon} /> 
        {/* Formatting ISO Date from API */}
        <span>
            {new Date(expense.date).toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
            })}
        </span>
      </div>

      {/* --- DETAILS BLOCK (Conditional Fields) --- */}
      <div className={styles.detailsBlock}>
         {/* Main Description */}
         {expense.description && expense.description.trim() !== "" && (
            <p className={styles.detailText}>Description: {expense.description}</p>
         )}
         
         {/* Specific Fields based on Type */}
         {expense.carNumber && (
            <p className={styles.detailMeta}>Vehicle No: <strong>{expense.carNumber}</strong></p>
         )}
         {expense.serviceType && (
            <p className={styles.detailMeta}>Service: <strong>{expense.serviceType}</strong></p>
         )}
         {expense.location && (
            <p className={styles.detailMeta}>Location: {expense.location}</p>
         )}
         {expense.equipmentName && (
            <p className={styles.detailMeta}>Equipment: <strong>{expense.equipmentName}</strong></p>
         )}
      </div>

      {/* --- ATTACHMENTS --- */}
      {expense.attachments && expense.attachments.length > 0 && (
        <div className={styles.attachmentRow}>
          <Paperclip size={14} className={styles.icon} /> 
          <span className={styles.attachmentLabel}>Attachments:</span>
          <div className={styles.attachmentLinks}>
            {expense.attachments.map((att) => (
                <a 
                    key={att.id} 
                    href={getAttachmentUrl(att.id)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles.attLink}
                    title={att.filename} // Show full name on hover
                >
                    {/* Display Actual Filename instead of "File X" */}
                    {att.filename}
                </a>
            ))}
          </div>
        </div>
      )}

      {/* Footer: Timestamps & Actions */}
      <div className={styles.cardFooter}>
        <div className={styles.timestamps}>
          <div className={styles.timeItem}>
            <Clock size={12} /> 
            Created: {new Date(expense.createdAt).toLocaleDateString()}
          </div>
        </div>

        <div className={styles.actions}>
          <button
            onClick={() => onEdit(expense)}
            className={styles.editButton}
            title="Edit Expense"
          >
            <Edit2 size={16} /> 
            <span>Edit</span>
          </button>
          <button
            onClick={() => onDelete(expense._id)} // Using Database _id
            className={styles.deleteButton}
            title="Delete Expense"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseCard;