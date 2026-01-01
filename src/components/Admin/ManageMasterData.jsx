import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, Save, X, Loader2, CheckCircle, XCircle } from 'lucide-react';
import DeleteConfirmationModal from '../Delete/DeleteConfirmationModal'; 
import SuccessModal from '../Success/SuccessModal'; 
import styles from './ManageMasterData.module.css';

const ManageMasterData = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('expenseTypes'); 
  const [dataList, setDataList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  const [itemToDelete, setItemToDelete] = useState(null); 
  const [successData, setSuccessData] = useState({ isOpen: false, message: '' });

  // --- 1. FETCH DATA ---
  const fetchData = async () => {
    setIsLoading(true);
    try {
      let url = '';
      if (activeTab === 'expenseTypes') url = 'http://127.0.0.1:8000/expense-type/all';
      if (activeTab === 'paymentModes') url = 'http://127.0.0.1:8000/payment-mode/all';
      if (activeTab === 'users') url = 'http://127.0.0.1:8000/employee/all';

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (activeTab === 'users') {
            setDataList(data.employees || []);
        } else {
            setDataList(data);
        }
      }
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setFormData({});
  }, [activeTab]);

  // --- 2. FORM HANDLERS ---
  const handleCreate = () => {
    setEditingItem(null);
    setFormData({ isActive: true }); 
    setIsFormOpen(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    
    if (activeTab === 'expenseTypes') {
        setFormData({ 
            name: item.ExpenseTypeName, 
            description: item.Description,
            isActive: item.IsActive 
        });
    }
    else if (activeTab === 'paymentModes') {
        setFormData({ 
            name: item.paymentModeName,
            isActive: item.isActive 
        });
    }
    else if (activeTab === 'users') {
        setFormData({ 
            name: item.EmployeeName, 
            email: item.Email, 
            mobile: item.MobileNO || item.MobileNo || '', 
            isActive: item.isActive, 
            password: '' 
        });
    }
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id) => {
    setItemToDelete(id); 
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
        let url = '';
        if (activeTab === 'expenseTypes') url = `http://127.0.0.1:8000/expense-type/remove/${itemToDelete}`;
        if (activeTab === 'paymentModes') url = `http://127.0.0.1:8000/payment-mode/remove/${itemToDelete}`;
        if (activeTab === 'users') url = `http://127.0.0.1:8000/employee/remove/${itemToDelete}`; 

        const res = await fetch(url, { method: 'DELETE' });
        if (res.ok) {
            setItemToDelete(null); 
            fetchData(); 
            setSuccessData({ isOpen: true, message: "Item deleted successfully." });
        } else {
            alert("Failed to delete item.");
        }
    } catch (e) { console.error(e); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
        let url = '';
        let method = editingItem ? 'PUT' : 'POST';
        let bodyData = {};

        if (activeTab === 'expenseTypes') {
            url = editingItem 
                ? `http://127.0.0.1:8000/expense-type/update/${editingItem._id}` 
                : `http://127.0.0.1:8000/expense-type/add`;
            bodyData = { ExpenseTypeName: formData.name, Description: formData.description || "", IsActive: formData.isActive }; 
        } 
        else if (activeTab === 'paymentModes') {
            url = editingItem 
                ? `http://127.0.0.1:8000/payment-mode/update/${editingItem._id}` 
                : `http://127.0.0.1:8000/payment-mode/create`;
            bodyData = { paymentModeName: formData.name, isActive: formData.isActive };
        } 
        else if (activeTab === 'users') {
            if (editingItem) {
                url = `http://127.0.0.1:8000/employee/update/${editingItem.EmployeeID}`;
                bodyData = { EmployeeName: formData.name, Email: formData.email, MobileNo: formData.mobile, isActive: formData.isActive };
            } else {
                url = `http://127.0.0.1:8000/employee/add`;
                bodyData = { EmployeeName: formData.name, Email: formData.email, MobileNO: formData.mobile, Password: formData.password };
            }
        }

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });

        if (res.ok) {
            setIsFormOpen(false);
            fetchData();
            setSuccessData({ isOpen: true, message: editingItem ? "Updated successfully." : "Created successfully." });
        } else {
            const err = await res.json();
            alert(`Operation failed: ${err.detail || 'Unknown error'}`);
        }
    } catch (e) { console.error(e); }
  };

  // --- 3. RENDER TABLE ROWS (UPDATED) ---
  const renderTableRows = () => {
    if (dataList.length === 0) return <tr><td colSpan={activeTab === 'users' ? 7 : 4} className={styles.noData}>No records found</td></tr>;

    return dataList.map((item, index) => {
        let isActive = item.isActive !== undefined ? item.isActive : item.IsActive;
        let deleteId = activeTab === 'users' ? item.EmployeeID : item._id;

        // --- A. USERS TAB ROW ---
        if (activeTab === 'users') {
            const mobile = item.MobileNO || item.MobileNo || '-';
            return (
                <tr key={item._id || index}>
                    <td style={{textAlign: 'center'}}>{index + 1}</td>
                    <td className={styles.nameText}>{item.EmployeeName}</td>
                    <td><span className={styles.idBadge}>{item.EmployeeID}</span></td>
                    <td className={styles.emailText}>{item.Email}</td>
                    <td>{mobile}</td>
                    <td>
                        <span className={`${styles.statusBadge} ${isActive ? styles.active : styles.inactive}`}>
                            {isActive ? <CheckCircle size={12}/> : <XCircle size={12}/>}
                            {isActive ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td className={styles.actionsCell}>
                        <button className={styles.actionBtn} onClick={() => handleEdit(item)}><Edit2 size={16} /></button>
                        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDeleteClick(deleteId)}><Trash2 size={16} /></button>
                    </td>
                </tr>
            );
        }

        // --- B. OTHER TABS ROW (Expense Types / Payment Modes) ---
        let name = activeTab === 'expenseTypes' ? item.ExpenseTypeName : item.paymentModeName;
        let desc = activeTab === 'expenseTypes' ? item.Description : null;

        return (
            <tr key={item._id || index}>
                <td style={{textAlign: 'center'}}>{index + 1}</td>
                <td>
                    <div className={styles.nameCell}>
                        <span className={styles.mainText}>{name}</span>
                        {desc && <span className={styles.subText}>{desc}</span>}
                    </div>
                </td>
                <td>
                    <span className={`${styles.statusBadge} ${isActive ? styles.active : styles.inactive}`}>
                        {isActive ? <CheckCircle size={12}/> : <XCircle size={12}/>}
                        {isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td className={styles.actionsCell}>
                    <button className={styles.actionBtn} onClick={() => handleEdit(item)}><Edit2 size={16} /></button>
                    <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDeleteClick(deleteId)}><Trash2 size={16} /></button>
                </td>
            </tr>
        );
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={onBack} className={styles.backButton}>
            <ArrowLeft size={20} /> Back to Dashboard
        </button>
        <h2 className={styles.title}>Manage Master Data</h2>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'expenseTypes' ? styles.activeTab : ''}`} onClick={() => setActiveTab('expenseTypes')}>Expense Types</button>
        <button className={`${styles.tab} ${activeTab === 'paymentModes' ? styles.activeTab : ''}`} onClick={() => setActiveTab('paymentModes')}>Payment Methods</button>
        <button className={`${styles.tab} ${activeTab === 'users' ? styles.activeTab : ''}`} onClick={() => setActiveTab('users')}>Users</button>
      </div>

      <div className={styles.content}>
        <div className={styles.listHeader}>
            <h3>Existing {activeTab === 'expenseTypes' ? 'Expense Types' : activeTab === 'paymentModes' ? 'Payment Modes' : 'Employees'}</h3>
            <button className={styles.addButton} onClick={handleCreate}>
                <Plus size={18} /> Add New
            </button>
        </div>

        <div className={styles.tableWrapper}>
            <table className={styles.table}>
                <thead>
                    {activeTab === 'users' ? (
                        // --- UPDATED HEADER FOR USERS ---
                        <tr>
                            <th style={{width: '50px', textAlign: 'center'}}>Sr No</th>
                            <th>Name</th>
                            <th>ID</th>
                            <th>Email</th>
                            <th>Contact</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    ) : (
                        // --- STANDARD HEADER FOR OTHERS ---
                        <tr>
                            <th style={{width: '60px', textAlign: 'center'}}>#</th>
                            <th>Name / Detail</th>
                            <th style={{width: '120px'}}>Status</th>
                            <th style={{width: '100px'}}>Actions</th>
                        </tr>
                    )}
                </thead>
                <tbody>
                    {isLoading ? <tr><td colSpan={activeTab === 'users' ? 7 : 4} style={{textAlign:'center', padding:'2rem'}}><Loader2 className={styles.spinner}/></td></tr> : renderTableRows()}
                </tbody>
            </table>
        </div>
      </div>

      {/* ADD/EDIT MODAL */}
      {isFormOpen && (
        <div className={styles.modalOverlay}>
            <div className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h3>{editingItem ? 'Edit Item' : 'Add New Item'}</h3>
                    <button onClick={() => setIsFormOpen(false)}><X size={20} /></button>
                </div>
                <form onSubmit={handleSave} className={styles.form}>
                    {activeTab === 'users' ? (
                        <>
                            <div className={styles.inputGroup}>
                                <label>Employee Name</label>
                                <input type="text" required value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div className={styles.inputGroup}>
                                <label>Email</label>
                                <input type="email" required value={formData.email || ''} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                            </div>
                            <div className={styles.inputGroup}>
                                <label>Mobile No</label>
                                <input type="text" required value={formData.mobile || ''} onChange={(e) => setFormData({...formData, mobile: e.target.value})} />
                            </div>
                            {!editingItem && (
                                <div className={styles.inputGroup}>
                                    <label>Password</label>
                                    <input type="password" required value={formData.password || ''} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                                </div>
                            )}
                            <div className={styles.checkboxGroup}>
                                <input type="checkbox" id="isActiveCheckUser" checked={formData.isActive || false} onChange={(e) => setFormData({...formData, isActive: e.target.checked})} />
                                <label htmlFor="isActiveCheckUser">Is Active?</label>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className={styles.inputGroup}>
                                <label>Name</label>
                                <input type="text" required value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                            </div>
                            {activeTab === 'expenseTypes' && (
                                <div className={styles.inputGroup}>
                                    <label>Description</label>
                                    <textarea rows="3" value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                                </div>
                            )}
                            <div className={styles.checkboxGroup}>
                                <input type="checkbox" id="isActiveCheck" checked={formData.isActive || false} onChange={(e) => setFormData({...formData, isActive: e.target.checked})} />
                                <label htmlFor="isActiveCheck">Is Active?</label>
                            </div>
                        </>
                    )}
                    <button type="submit" className={styles.saveButton}><Save size={18} /> Save Changes</button>
                </form>
            </div>
        </div>
      )}

      <DeleteConfirmationModal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} onConfirm={confirmDelete} />
      <SuccessModal isOpen={successData.isOpen} message={successData.message} onClose={() => setSuccessData({ ...successData, isOpen: false })} />
    </div>
  );
};

export default ManageMasterData;