import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux'; 
import { Plus, FileText, Loader2, Trash2, CheckSquare, Square, Search } from 'lucide-react';
import ExpenseCard from '../ExpenseCard/ExpenseCard';
import ExpenseModal from '../ExpenseModal/ExpenseModal';
import DeleteConfirmationModal from '../Delete/DeleteConfirmationModal';
import SuccessModal from '../Success/SuccessModal'; 
import NotificationModal from '../Notification/NotificationModal'; 
import Footer from '../Footer/Footer'; 
import styles from './ExpenseList.module.css';

const ExpenseList = ({ user, onTotalChange }) => {
  const { expenseTypesMap } = useSelector((state) => state.masterData);
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseToDelete, setExpenseToDelete] = useState(null); 
  const [isBatchDelete, setIsBatchDelete] = useState(false); 
  const [successData, setSuccessData] = useState({ isOpen: false, message: '' });
  
  // --- ADDED NOTIFICATION STATE ---
  const [notification, setNotification] = useState({ isOpen: false, message: '' });

  const userEmail = user?.EmailId || user?.Email || '';

  useEffect(() => {
    const newTotal = expenses.reduce((sum, item) => {
        const amount = parseFloat(item.amount);
        return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    if (onTotalChange) onTotalChange(newTotal);
  }, [expenses, onTotalChange]);

  const fetchExpenses = useCallback(async (showLoading = false) => {
      if (!userEmail) return;
      if (showLoading) setIsLoading(true);
      try {
          const res = await fetch(`http://127.0.0.1:8000/expense/user/${userEmail}`);
          if (res.ok) {
              const data = await res.json();
              setExpenses(data); 
              setSelectedExpenseIds([]);
          }
      } catch (e) { console.error(e); } 
      finally { if (showLoading) setIsLoading(false); }
  }, [userEmail]);

  useEffect(() => { if (userEmail) fetchExpenses(true); }, [fetchExpenses, userEmail]);

  const filteredExpenses = expenses.filter(exp => {
      const typeName = expenseTypesMap[exp.expenseTypeId] || 'General';
      const term = searchQuery.toLowerCase();
      return (
          exp.title.toLowerCase().includes(term) ||
          typeName.toLowerCase().includes(term)
      );
  });

  const handleCreateClick = () => { setEditingExpense(null); setIsModalOpen(true); };
  const handleEditClick = (expense) => { setEditingExpense(expense); setIsModalOpen(true); };
  const handleDeleteClick = (id) => { setExpenseToDelete(id); setIsBatchDelete(false); };

  const toggleSelection = (id) => {
    setSelectedExpenseIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedExpenseIds.length === filteredExpenses.length) {
        setSelectedExpenseIds([]);
    } else {
        setSelectedExpenseIds(filteredExpenses.map(e => e._id));
    }
  };

  const handleDeleteSelectedClick = () => {
    if (selectedExpenseIds.length === 0) return;
    setIsBatchDelete(true);
    setExpenseToDelete('BATCH'); 
  };

  const handleFormSubmit = async (result, actionType) => {
    await fetchExpenses(false); 
    setSuccessData({ isOpen: true, message: actionType === 'update' ? "Updated successfully." : "Created successfully." });
  };

  const confirmDelete = async () => {
    let idsToDelete = isBatchDelete ? selectedExpenseIds : (expenseToDelete ? [expenseToDelete] : []);
    if (idsToDelete.length === 0) return;
    setIsDeleting(true);
    try {
        const res = await fetch(`http://127.0.0.1:8000/expense/delete`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ expenseIds: idsToDelete })
        });
        const data = await res.json();
        if (res.ok) {
            setExpenses(prev => prev.filter(exp => !idsToDelete.includes(exp._id)));
            setExpenseToDelete(null);
            setIsBatchDelete(false);
            setSelectedExpenseIds([]);
            setSuccessData({ isOpen: true, message: `Deleted ${data.deletedCount} items.` });
            fetchExpenses(false); 
        } else {
            // REPLACED ALERT
            setNotification({ isOpen: true, message: `Failed: ${data.detail}` });
        }
    } catch (error) { 
        console.error(error);
        // REPLACED ALERT
        setNotification({ isOpen: true, message: "An error occurred while deleting." });
    } finally {
        setIsDeleting(false);
    }
  };

  const allSelected = filteredExpenses.length > 0 && selectedExpenseIds.length === filteredExpenses.length;

  return (
    <div className={styles.wrapper}>
      {/* ... (Keep existing layout) ... */}
      <div className={styles.topBar}>
        <h2 className={styles.sectionTitle}>Expense Records</h2>
        <div className={styles.controlsGroup}>
            <div className={styles.searchWrapper}>
                <Search size={16} className={styles.searchIcon} />
                <input 
                    type="text" 
                    placeholder="Search..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.searchInput}
                />
            </div>
            {selectedExpenseIds.length > 0 && (
                <button onClick={handleDeleteSelectedClick} className={styles.deleteBatchBtn}>
                    <Trash2 size={18} />
                    <span>Delete ({selectedExpenseIds.length})</span>
                </button>
            )}
            <button onClick={handleCreateClick} className={styles.addButton}>
                <Plus size={20} strokeWidth={2.5} />
                <span>Add Expense</span>
            </button>
        </div>
      </div>

      <div className={styles.mainContainer}>
        {isLoading ? (
           <div className={styles.emptyState}>
              <Loader2 className={styles.spinner} size={48} color="#dcb158" />
              <p>Loading records...</p>
           </div>
        ) : filteredExpenses.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.iconWrapper}><FileText size={48} className={styles.emptyIcon} /></div>
            <h3>{expenses.length === 0 ? "No expenses recorded yet" : "No matches found"}</h3>
            {expenses.length === 0 && <p>Click "Add Expense" to create your first entry</p>}
          </div>
        ) : (
            <>
                <div className={styles.listToolbar}>
                    <button className={styles.selectAllBtn} onClick={handleSelectAll}>
                        {allSelected ? <CheckSquare size={20} color="#0d3512" /> : <Square size={20} color="#6b7280" />}
                        <span>Select All</span>
                    </button>
                    <span className={styles.countText}>{selectedExpenseIds.length} Selected</span>
                </div>
                
                <div className={styles.scrollArea}>
                    <div className={styles.grid}>
                        {filteredExpenses.map(expense => {
                        const isSelected = selectedExpenseIds.includes(expense._id);
                        return (
                            <div 
                                key={expense._id} 
                                className={`${styles.cardWrapper} ${isSelected ? styles.cardSelected : ''}`} 
                                onClick={() => toggleSelection(expense._id)}
                            >
                                <div className={styles.cardHeaderStrip} onClick={(e) => e.stopPropagation()}>
                                    <label className={styles.checkboxContainer}>
                                        <input 
                                            type="checkbox" 
                                            checked={isSelected}
                                            onChange={() => toggleSelection(expense._id)}
                                            className={styles.cardCheckbox}
                                        />
                                        <span className={styles.checkboxLabel}>Select</span>
                                    </label>
                                </div>
                                <div className={styles.cardInner}>
                                    <ExpenseCard
                                        expense={expense}
                                        expenseTypeName={expenseTypesMap[expense.expenseTypeId] || 'General'} 
                                        onEdit={handleEditClick}
                                        onDelete={handleDeleteClick}
                                    />
                                </div>
                            </div>
                        );
                        })}
                    </div>
                    
                    <div className={styles.footerSection}>
                        <Footer />
                    </div>
                </div>
            </>
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
          onClose={() => { if (!isDeleting) { setExpenseToDelete(null); setIsBatchDelete(false); }}} 
          onConfirm={confirmDelete} 
          isLoading={isDeleting}
          message={isBatchDelete ? `Delete ${selectedExpenseIds.length} items?` : "Are you sure you want to remove this record?"} 
      />
      <SuccessModal isOpen={successData.isOpen} message={successData.message} onClose={() => setSuccessData({ ...successData, isOpen: false })} />
      
      {/* --- ADDED NOTIFICATION MODAL --- */}
      <NotificationModal isOpen={notification.isOpen} message={notification.message} onClose={() => setNotification({ ...notification, isOpen: false })} />
    </div>
  );
};

export default ExpenseList;