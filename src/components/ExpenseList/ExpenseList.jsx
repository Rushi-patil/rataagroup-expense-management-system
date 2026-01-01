import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux'; // Redux Hook
import { Plus, FileText, Loader2 } from 'lucide-react';
import ExpenseCard from '../ExpenseCard/ExpenseCard';
import ExpenseModal from '../ExpenseModal/ExpenseModal';
import DeleteConfirmationModal from '../Delete/DeleteConfirmationModal';
import SuccessModal from '../Success/SuccessModal'; 
import styles from './ExpenseList.module.css';

const ExpenseList = ({ user, onTotalChange }) => {
  // --- REDUX STATE ---
  // Get the cached map directly from Redux store
  const { expenseTypesMap } = useSelector((state) => state.masterData);

  // --- LOCAL STATE ---
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  // Success Modal State
  const [successData, setSuccessData] = useState({ isOpen: false, message: '' });

  // Safe Email Access
  const userEmail = user?.EmailId || user?.Email || '';

  // --- FETCH EXPENSE TYPES REMOVED ---
  // We no longer fetch types here. We rely on the Redux store populated in App.jsx

  // --- 2. Calculate Total whenever 'expenses' changes ---
  useEffect(() => {
    const newTotal = expenses.reduce((sum, item) => {
        const amount = parseFloat(item.amount);
        return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    if (onTotalChange) {
        onTotalChange(newTotal);
    }
  }, [expenses, onTotalChange]);

  // --- 3. FETCH USER EXPENSES ---
  const fetchExpenses = useCallback(async (showLoading = false) => {
      if (!userEmail) return;
      
      if (showLoading) setIsLoading(true);
      
      try {
          const res = await fetch(`http://127.0.0.1:8000/expense/user/${userEmail}`);
          if (res.ok) {
              const data = await res.json();
              setExpenses(data); 
          }
      } catch (e) { 
          console.error("Error fetching expenses:", e); 
      } finally { 
          if (showLoading) setIsLoading(false); 
      }
  }, [userEmail]);

  // Initial Load
  useEffect(() => {
    if (userEmail) {
        fetchExpenses(true); 
    }
  }, [fetchExpenses, userEmail]);

  // --- HANDLERS ---

  const handleCreateClick = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (expense) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id) => {
    setExpenseToDelete(id);
  };

  // --- API ACTIONS & REFRESH ---

  const handleFormSubmit = async (result, actionType) => {
    await fetchExpenses(false); 
    
    const message = actionType === 'update' 
      ? "Expense record updated successfully." 
      : "New expense record created successfully.";
      
    setSuccessData({
        isOpen: true,
        message: message
    });
  };

  const confirmDelete = async () => {
    if (!expenseToDelete) return;
    try {
        const res = await fetch(`http://127.0.0.1:8000/expense/delete/${expenseToDelete}`, {
            method: 'DELETE',
        });
        
        if (res.ok) {
            setExpenses(prevExpenses => prevExpenses.filter(exp => exp._id !== expenseToDelete));
            setExpenseToDelete(null);
            fetchExpenses(false); 
            setSuccessData({
                isOpen: true,
                message: "Expense deleted successfully."
            });
        } else {
            const errorData = await res.json();
            alert(`Failed to delete: ${errorData.detail || 'Unknown error'}`);
        }
    } catch (error) {
        console.error("Delete error:", error);
        alert("Network error during delete");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Expense Records</h2>
        <button onClick={handleCreateClick} className={styles.addButton}>
          <Plus size={20} strokeWidth={2.5} />
          <span>Add Expense</span>
        </button>
      </div>

      <div className={styles.expenseContainer}>
        {isLoading ? (
           <div className={styles.emptyState}>
              <Loader2 className={styles.spinner} size={48} color="#dcb158" />
              <p>Loading records...</p>
           </div>
        ) : expenses.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.iconWrapper}><FileText size={48} className={styles.emptyIcon} /></div>
            <h3>No expenses recorded yet</h3>
            <p>Click "Add Expense" to create your first entry</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {expenses.map(expense => (
              <ExpenseCard
                key={expense._id}
                expense={expense}
                // --- USE REDUX MAP ---
                expenseTypeName={expenseTypesMap[expense.expenseTypeId] || 'General'} 
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <ExpenseModal
          editingExpense={editingExpense}
          onClose={() => setIsModalOpen(false)}
          userEmail={userEmail}
          onSubmit={handleFormSubmit} 
        />
      )}

      <DeleteConfirmationModal 
        isOpen={!!expenseToDelete} 
        onClose={() => setExpenseToDelete(null)}
        onConfirm={confirmDelete}
      />

      <SuccessModal 
        isOpen={successData.isOpen}
        message={successData.message}
        onClose={() => setSuccessData({ ...successData, isOpen: false })}
      />
    </div>
  );
};

export default ExpenseList;