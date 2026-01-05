import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, Save, X, Loader2, CheckCircle, XCircle, Users, Search, Briefcase } from 'lucide-react';
import DeleteConfirmationModal from '../Delete/DeleteConfirmationModal';
import SuccessModal from '../Success/SuccessModal';
import NotificationModal from '../Notification/NotificationModal'; 
import Footer from '../Footer/Footer'; 
import styles from './ManageMasterData.module.css';

const ManageMasterData = ({ onBack }) => {
    // Tabs: expenseTypes | paymentModes | users | userGroups | assignments
    const [activeTab, setActiveTab] = useState('expenseTypes');

    const [dataList, setDataList] = useState([]);
    const [employeeList, setEmployeeList] = useState([]);
    const [groupList, setGroupList] = useState([]); 
    const [isLoading, setIsLoading] = useState(false);
    
    // Operation Loading States
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    
    // Assignment State
    const [selectedGroupUsers, setSelectedGroupUsers] = useState([]);
    const [memberSearchQuery, setMemberSearchQuery] = useState('');
    const [assignmentTargetType, setAssignmentTargetType] = useState('USER'); 
    const [assignmentTargetId, setAssignmentTargetId] = useState(''); 
    const [selectedExpenseTypes, setSelectedExpenseTypes] = useState([]);
    const [selectedPaymentModes, setSelectedPaymentModes] = useState([]);
    
    // Change Detection
    const [initialExpenseTypes, setInitialExpenseTypes] = useState([]);
    const [initialPaymentModes, setInitialPaymentModes] = useState([]);

    // Search States
    const [expenseSearchQuery, setExpenseSearchQuery] = useState('');
    const [paymentSearchQuery, setPaymentSearchQuery] = useState('');
    
    const [activeExpenseTypes, setActiveExpenseTypes] = useState([]);
    const [activePaymentModes, setActivePaymentModes] = useState([]);

    const [itemToDelete, setItemToDelete] = useState(null);
    const [successData, setSuccessData] = useState({ isOpen: false, message: '' });
    const [notification, setNotification] = useState({ isOpen: false, message: '' });

    // --- 1. FETCH DATA ---
    const fetchData = async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'userGroups' || activeTab === 'assignments') {
                const empRes = await fetch('http://127.0.0.1:8000/employee/all');
                if (empRes.ok) {
                    const empData = await empRes.json();
                    setEmployeeList(empData.employees || []);
                }
            }

            if (activeTab === 'assignments') {
                const grpRes = await fetch('http://127.0.0.1:8000/user-groups/all');
                if (grpRes.ok) {
                    const grpData = await grpRes.json();
                    setGroupList(grpData.groups || []);
                }
                const expRes = await fetch('http://127.0.0.1:8000/expense-type/all');
                if (expRes.ok) {
                    const expData = await expRes.json();
                    setActiveExpenseTypes(expData.filter(i => i.IsActive));
                }
                const payRes = await fetch('http://127.0.0.1:8000/payment-mode/all');
                if (payRes.ok) {
                    const payData = await payRes.json();
                    setActivePaymentModes(payData.filter(i => i.isActive));
                }
                return; 
            }

            let url = '';
            if (activeTab === 'expenseTypes') url = 'http://127.0.0.1:8000/expense-type/all';
            if (activeTab === 'paymentModes') url = 'http://127.0.0.1:8000/payment-mode/all';
            if (activeTab === 'users') url = 'http://127.0.0.1:8000/employee/all';
            if (activeTab === 'userGroups') url = 'http://127.0.0.1:8000/user-groups/all';

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (activeTab === 'users') setDataList(data.employees || []);
                else if (activeTab === 'userGroups') setDataList(data.groups || []);
                else setDataList(data);
            }
        } catch (error) { console.error("Fetch Error:", error); } 
        finally { setIsLoading(false); }
    };

    useEffect(() => {
        fetchData();
        setFormData({});
        setSelectedGroupUsers([]);
        setMemberSearchQuery('');
        setExpenseSearchQuery('');
        setPaymentSearchQuery('');
        setAssignmentTargetId('');
        setSelectedExpenseTypes([]);
        setSelectedPaymentModes([]);
        setInitialExpenseTypes([]);
        setInitialPaymentModes([]);
    }, [activeTab]);

    // --- 2. ASSIGNMENT LOGIC ---
    const handleAssignmentTargetSelect = (targetId) => {
        setAssignmentTargetId(targetId);
        if (assignmentTargetType === 'USER') {
            const user = employeeList.find(e => e.EmployeeID === targetId);
            if (user) {
                const currentExpenses = user.AssignedExpenseTypeIds || [];
                const currentPayments = user.AssignedPaymentModeIds || [];
                setSelectedExpenseTypes(currentExpenses);
                setSelectedPaymentModes(currentPayments);
                setInitialExpenseTypes(currentExpenses);
                setInitialPaymentModes(currentPayments);
            }
        } else {
            setSelectedExpenseTypes([]);
            setSelectedPaymentModes([]);
            setInitialExpenseTypes([]);
            setInitialPaymentModes([]);
        }
    };

    const areArraysEqual = (arr1, arr2) => {
        if (!arr1 || !arr2) return false;
        if (arr1.length !== arr2.length) return false;
        const s1 = [...arr1].sort();
        const s2 = [...arr2].sort();
        return s1.every((val, index) => val === s2[index]);
    };

    const handleApplyAssignment = async () => {
        if (!assignmentTargetId) {
            setNotification({ isOpen: true, message: "Please select a User or Group first." });
            return;
        }
        
        const expensesUnchanged = areArraysEqual(selectedExpenseTypes, initialExpenseTypes);
        const paymentsUnchanged = areArraysEqual(selectedPaymentModes, initialPaymentModes);

        if (expensesUnchanged && paymentsUnchanged) {
            setNotification({ isOpen: true, message: "No changes made to current assignment." });
            return;
        }

        setIsSaving(true); 
        try {
            const payload = {
                targetType: assignmentTargetType,
                targetId: assignmentTargetId,
                role: null, 
                AssignedExpenseTypeIds: selectedExpenseTypes,
                AssignedPaymentModeIds: selectedPaymentModes
            };
            const res = await fetch('http://127.0.0.1:8000/employee/apply', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const data = await res.json();
                setSuccessData({ isOpen: true, message: `Successfully updated ${data.affectedEmployees} employees.` });
                setInitialExpenseTypes(selectedExpenseTypes);
                setInitialPaymentModes(selectedPaymentModes);
                fetchData();
            } else {
                const err = await res.json();
                setNotification({ isOpen: true, message: `Assignment Failed: ${err.detail}` });
            }
        } catch (e) {
            console.error(e);
            setNotification({ isOpen: true, message: "Network Error" });
        } finally {
            setIsSaving(false);
        }
    };

    const toggleAssignmentSelection = (setter, list, id) => {
        setter(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const filteredExpenseTypes = activeExpenseTypes.filter(exp => exp.ExpenseTypeName.toLowerCase().includes(expenseSearchQuery.toLowerCase()));
    const filteredPaymentModes = activePaymentModes.filter(mode => mode.paymentModeName.toLowerCase().includes(paymentSearchQuery.toLowerCase()));
    const filteredTargets = assignmentTargetType === 'USER' 
        ? employeeList.filter(emp => emp.EmployeeName.toLowerCase().includes(memberSearchQuery.toLowerCase()) || emp.Email.toLowerCase().includes(memberSearchQuery.toLowerCase()))
        : groupList.filter(grp => grp.groupName.toLowerCase().includes(memberSearchQuery.toLowerCase()));


    // --- 3. CRUD HANDLERS ---
    const handleCreate = () => { setEditingItem(null); setFormData({ isActive: true }); setSelectedGroupUsers([]); setMemberSearchQuery(''); setIsFormOpen(true); };
    
    const handleEdit = (item) => {
        setEditingItem(item);
        if (activeTab === 'expenseTypes') setFormData({ name: item.ExpenseTypeName, description: item.Description, isActive: item.IsActive });
        else if (activeTab === 'paymentModes') setFormData({ name: item.paymentModeName, isActive: item.isActive });
        else if (activeTab === 'users') setFormData({ name: item.EmployeeName, email: item.Email, mobile: item.MobileNO || item.MobileNo || '', isActive: item.isActive, password: '' });
        else if (activeTab === 'userGroups') {
            setFormData({ name: item.groupName, description: item.description, isActive: item.isActive });
            setSelectedGroupUsers(item.users || []);
            setMemberSearchQuery('');
        }
        setIsFormOpen(true);
    };

    const handleDeleteClick = (id) => { setItemToDelete(id); };

    const confirmDelete = async () => { 
        if (!itemToDelete) return;
        setIsDeleting(true); 
        try {
            let url = '';
            if (activeTab === 'expenseTypes') url = `http://127.0.0.1:8000/expense-type/remove/${itemToDelete}`;
            if (activeTab === 'paymentModes') url = `http://127.0.0.1:8000/payment-mode/remove/${itemToDelete}`;
            if (activeTab === 'users') url = `http://127.0.0.1:8000/employee/remove/${itemToDelete}`;
            if (activeTab === 'userGroups') url = `http://127.0.0.1:8000/user-groups/delete/${itemToDelete}`;
            const res = await fetch(url, { method: 'DELETE' });
            if (res.ok) { 
                setItemToDelete(null); 
                fetchData(); 
                setSuccessData({ isOpen: true, message: "Item deleted successfully." }); 
            }
            else { 
                const err = await res.json(); 
                setNotification({ isOpen: true, message: `Failed to delete: ${err.detail || 'Unknown error'}` });
            }
        } catch (e) { console.error(e); }
        finally { setIsDeleting(false); }
    };

    const handleSave = async (e) => { 
        e.preventDefault();
        setIsSaving(true);
        try {
            let url = ''; let method = editingItem ? 'PUT' : 'POST'; let bodyData = {};
            if (activeTab === 'expenseTypes') {
                url = editingItem ? `http://127.0.0.1:8000/expense-type/update/${editingItem._id}` : `http://127.0.0.1:8000/expense-type/add`;
                bodyData = { ExpenseTypeName: formData.name, Description: formData.description || "", IsActive: formData.isActive };
            }
            else if (activeTab === 'paymentModes') {
                url = editingItem ? `http://127.0.0.1:8000/payment-mode/update/${editingItem._id}` : `http://127.0.0.1:8000/payment-mode/create`;
                bodyData = { paymentModeName: formData.name, isActive: formData.isActive };
            }
            else if (activeTab === 'users') {
                if (editingItem) { url = `http://127.0.0.1:8000/employee/update/${editingItem.EmployeeID}`; bodyData = { EmployeeName: formData.name, Email: formData.email, MobileNo: formData.mobile, isActive: formData.isActive }; }
                else { url = `http://127.0.0.1:8000/employee/add`; bodyData = { EmployeeName: formData.name, Email: formData.email, MobileNO: formData.mobile, Password: formData.password }; }
            }
            else if (activeTab === 'userGroups') {
                url = editingItem ? `http://127.0.0.1:8000/user-groups/update/${editingItem.groupId}` : `http://127.0.0.1:8000/user-groups/create`;
                bodyData = { groupName: formData.name, description: formData.description || "", users: selectedGroupUsers, isActive: formData.isActive };
            }
            const res = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyData) });
            if (res.ok) { setIsFormOpen(false); fetchData(); setSuccessData({ isOpen: true, message: editingItem ? "Updated successfully." : "Created successfully." }); }
            else { 
                const err = await res.json(); 
                setNotification({ isOpen: true, message: `Operation failed: ${err.detail || 'Unknown error'}` });
            }
        } catch (e) { console.error(e); }
        finally { setIsSaving(false); }
    };

    // Helper functions
    const toggleGroupUser = (empId) => setSelectedGroupUsers(prev => prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]);
    const filteredEmployees = employeeList.filter(emp => emp.EmployeeName.toLowerCase().includes(memberSearchQuery.toLowerCase()) || emp.Email.toLowerCase().includes(memberSearchQuery.toLowerCase()));

    const renderTableRows = () => { 
        if (dataList.length === 0) return <tr><td colSpan={activeTab === 'users' ? 7 : 4} className={styles.noData}>No records found</td></tr>;
        return dataList.map((item, index) => {
             let isActive = item.isActive !== undefined ? item.isActive : item.IsActive;
             let deleteId = item._id;
             if(activeTab === 'users') deleteId = item.EmployeeID;
             if(activeTab === 'userGroups') deleteId = item.groupId;

             if (activeTab === 'users') {
                 const mobile = item.MobileNO || item.MobileNo || '-';
                 return (
                     <tr key={item._id || index}>
                         <td style={{textAlign: 'center'}}>{index + 1}</td>
                         <td className={styles.nameText}>{item.EmployeeName}</td>
                         <td><span className={styles.idBadge}>{item.EmployeeID}</span></td>
                         <td className={styles.emailText}>{item.Email}</td>
                         <td>{mobile}</td>
                         <td><span className={`${styles.statusBadge} ${isActive ? styles.active : styles.inactive}`}>{isActive ? <CheckCircle size={12}/> : <XCircle size={12}/>} {isActive ? 'Active' : 'Inactive'}</span></td>
                         <td className={styles.actionsCell}><button className={styles.actionBtn} onClick={() => handleEdit(item)}><Edit2 size={16} /></button><button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDeleteClick(deleteId)}><Trash2 size={16} /></button></td>
                     </tr>
                 );
             }
             if (activeTab === 'userGroups') {
                return (
                    <tr key={item._id || index}>
                        <td style={{textAlign: 'center'}}>{index + 1}</td>
                        <td>
                            <div className={styles.nameCell}>
                                <div style={{display:'flex', alignItems:'center', gap: '0.5rem'}}><span className={styles.mainText}>{item.groupName}</span><span className={styles.idBadge} style={{fontSize:'0.75rem'}}>{item.groupId}</span></div>
                                {item.description && <span className={styles.subText}>{item.description}</span>}
                                <span className={styles.memberCount}><Users size={12} /> {item.users ? item.users.length : 0} Members</span>
                            </div>
                        </td>
                        <td><span className={`${styles.statusBadge} ${isActive ? styles.active : styles.inactive}`}>{isActive ? <CheckCircle size={12}/> : <XCircle size={12}/>} {isActive ? 'Active' : 'Inactive'}</span></td>
                        <td className={styles.actionsCell}><button className={styles.actionBtn} onClick={() => handleEdit(item)}><Edit2 size={16} /></button><button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDeleteClick(deleteId)}><Trash2 size={16} /></button></td>
                    </tr>
                );
             }
             let name = activeTab === 'expenseTypes' ? item.ExpenseTypeName : item.paymentModeName;
             let desc = activeTab === 'expenseTypes' ? item.Description : null;
             return (
                 <tr key={item._id || index}>
                     <td style={{textAlign: 'center'}}>{index + 1}</td>
                     <td><div className={styles.nameCell}><span className={styles.mainText}>{name}</span>{desc && <span className={styles.subText}>{desc}</span>}</div></td>
                     <td><span className={`${styles.statusBadge} ${isActive ? styles.active : styles.inactive}`}>{isActive ? <CheckCircle size={12}/> : <XCircle size={12}/>} {isActive ? 'Active' : 'Inactive'}</span></td>
                     <td className={styles.actionsCell}><button className={styles.actionBtn} onClick={() => handleEdit(item)}><Edit2 size={16} /></button><button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDeleteClick(deleteId)}><Trash2 size={16} /></button></td>
                 </tr>
             );
        });
    };

    return (
        <div className={styles.container}>
            {/* FIXED HEADER & TABS */}
            <div className={styles.fixedTopSection}>
                <div className={styles.header}>
                    <button onClick={onBack} className={styles.backButton}><ArrowLeft size={20} /> Back to Dashboard</button>
                    <h2 className={styles.title}>Manage Master Data</h2>
                </div>
                <div className={styles.tabs}>
                    <button className={`${styles.tab} ${activeTab === 'expenseTypes' ? styles.activeTab : ''}`} onClick={() => setActiveTab('expenseTypes')}>Expense Types</button>
                    <button className={`${styles.tab} ${activeTab === 'paymentModes' ? styles.activeTab : ''}`} onClick={() => setActiveTab('paymentModes')}>Payment Methods</button>
                    <button className={`${styles.tab} ${activeTab === 'users' ? styles.activeTab : ''}`} onClick={() => setActiveTab('users')}>Users</button>
                    <button className={`${styles.tab} ${activeTab === 'userGroups' ? styles.activeTab : ''}`} onClick={() => setActiveTab('userGroups')}>User Groups</button>
                    <button className={`${styles.tab} ${activeTab === 'assignments' ? styles.activeTab : ''}`} onClick={() => setActiveTab('assignments')}>Assignment</button>
                </div>
            </div>

            {/* SCROLLABLE AREA */}
            <div className={styles.scrollArea}>
                
                {/* --- 1. WHITE CARD CONTENT (Boxed) --- */}
                <div className={styles.cardContent}>
                    {activeTab === 'assignments' ? (
                        <div className={styles.assignmentContainer}>
                            <h3 className={styles.sectionTitle}>Assign Expenses & Payment Modes</h3>
                            <div className={styles.assignmentGrid}>
                                <div className={styles.assignColumn}>
                                    <h4>1. Select Target</h4>
                                    <div className={styles.targetTypeSwitch}>
                                        <button className={`${styles.switchBtn} ${assignmentTargetType === 'USER' ? styles.switchActive : ''}`} onClick={() => { setAssignmentTargetType('USER'); setAssignmentTargetId(''); setMemberSearchQuery(''); setSelectedExpenseTypes([]); setSelectedPaymentModes([]); }}><Users size={16} /> Individual User</button>
                                        <button className={`${styles.switchBtn} ${assignmentTargetType === 'GROUP' ? styles.switchActive : ''}`} onClick={() => { setAssignmentTargetType('GROUP'); setAssignmentTargetId(''); setMemberSearchQuery(''); setSelectedExpenseTypes([]); setSelectedPaymentModes([]); }}><Briefcase size={16} /> User Group</button>
                                    </div>
                                    <div className={styles.searchWrapper}>
                                        <Search size={16} className={styles.searchIcon} />
                                        <input type="text" placeholder={`Search ${assignmentTargetType === 'USER' ? 'User' : 'Group'}...`} className={styles.searchInput} value={memberSearchQuery} onChange={(e) => setMemberSearchQuery(e.target.value)} />
                                    </div>
                                    <div className={styles.targetList}>
                                        {filteredTargets.map(item => {
                                            const id = assignmentTargetType === 'USER' ? item.EmployeeID : item.groupId;
                                            const name = assignmentTargetType === 'USER' ? item.EmployeeName : item.groupName;
                                            const sub = assignmentTargetType === 'USER' ? item.Email : item.description;
                                            const isSelected = assignmentTargetId === id;
                                            return (
                                                <div key={id} className={`${styles.targetItem} ${isSelected ? styles.targetSelected : ''}`} onClick={() => handleAssignmentTargetSelect(id)}>
                                                    <div className={styles.targetRadio}><div className={isSelected ? styles.radioInner : ''}></div></div>
                                                    <div className={styles.targetInfo}><span className={styles.targetName}>{name}</span><span className={styles.targetId} style={{fontSize: '0.75rem', color: '#6b7280'}}>{sub}</span></div>
                                                </div>
                                            )
                                        })}
                                        {filteredTargets.length === 0 && <div className={styles.noDataSmall}>No matches found</div>}
                                    </div>
                                </div>
                                <div className={styles.assignColumn}>
                                    <h4>2. Assign Expense Types</h4>
                                    <div className={styles.searchWrapper} style={{borderRadius: '0.5rem', marginBottom: '0.5rem'}}>
                                        <Search size={16} className={styles.searchIcon} />
                                        <input type="text" placeholder="Search Expense Type..." className={styles.searchInput} value={expenseSearchQuery} onChange={(e) => setExpenseSearchQuery(e.target.value)} />
                                    </div>
                                    <div className={styles.checklistScroll}>
                                        {filteredExpenseTypes.length > 0 ? filteredExpenseTypes.map(exp => (
                                            <label key={exp._id} className={styles.checkItem}>
                                                <input type="checkbox" checked={selectedExpenseTypes.includes(exp._id)} onChange={() => toggleAssignmentSelection(setSelectedExpenseTypes, selectedExpenseTypes, exp._id)} />
                                                <span>{exp.ExpenseTypeName}</span>
                                            </label>
                                        )) : <div className={styles.noDataSmall}>No matching expense types</div>}
                                    </div>
                                </div>
                                <div className={styles.assignColumn}>
                                    <h4>3. Assign Payment Modes</h4>
                                    <div className={styles.searchWrapper} style={{borderRadius: '0.5rem', marginBottom: '0.5rem'}}>
                                        <Search size={16} className={styles.searchIcon} />
                                        <input type="text" placeholder="Search Payment Mode..." className={styles.searchInput} value={paymentSearchQuery} onChange={(e) => setPaymentSearchQuery(e.target.value)} />
                                    </div>
                                    <div className={styles.checklistScroll}>
                                        {filteredPaymentModes.length > 0 ? filteredPaymentModes.map(mode => (
                                            <label key={mode._id} className={styles.checkItem}>
                                                <input type="checkbox" checked={selectedPaymentModes.includes(mode._id)} onChange={() => toggleAssignmentSelection(setSelectedPaymentModes, selectedPaymentModes, mode._id)} />
                                                <span>{mode.paymentModeName}</span>
                                            </label>
                                        )) : <div className={styles.noDataSmall}>No matching payment modes</div>}
                                    </div>
                                </div>
                            </div>
                            <div className={styles.assignmentFooter}>
                                <div className={styles.summaryText}>
                                    {assignmentTargetId ? ( <>Assigning <b>{selectedExpenseTypes.length}</b> Expense Types & <b>{selectedPaymentModes.length}</b> Payment Modes to <b>{assignmentTargetType === 'USER' ? employeeList.find(e=>e.EmployeeID===assignmentTargetId)?.EmployeeName : groupList.find(g=>g.groupId===assignmentTargetId)?.groupName}</b></> ) : ( <span>Please select a target first.</span> )}
                                </div>
                                <button className={styles.applyBtn} onClick={handleApplyAssignment} disabled={!assignmentTargetId || isSaving}>
                                    {isSaving ? <Loader2 className={styles.spinner} size={18}/> : <Save size={18}/>} Apply Assignments
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className={styles.listHeader}>
                                <h3>{activeTab === 'expenseTypes' ? 'Existing Expense Types' : activeTab === 'paymentModes' ? 'Existing Payment Modes' : activeTab === 'users' ? 'Existing Employees' : 'Existing User Groups'}</h3>
                                <button className={styles.addButton} onClick={handleCreate}><Plus size={18} /> Add New</button>
                            </div>
                            <div className={styles.tableWrapper}>
                                <table className={styles.table}>
                                    <thead>
                                        {activeTab === 'users' ? ( <tr><th style={{ width: '50px', textAlign: 'center' }}>Sr No</th><th>Name</th><th>ID</th><th>Email</th><th>Contact</th><th>Status</th><th>Actions</th></tr> ) : ( <tr><th style={{ width: '60px', textAlign: 'center' }}>#</th><th>Name / Detail</th><th style={{ width: '120px' }}>Status</th><th style={{ width: '100px' }}>Actions</th></tr> )}
                                    </thead>
                                    <tbody>
                                        {isLoading ? <tr><td colSpan={activeTab === 'users' ? 7 : 4} style={{ textAlign: 'center', padding: '2rem' }}><Loader2 className={styles.spinner} /></td></tr> : renderTableRows()}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div> 
                {/* --- END OF WHITE CARD --- */}

                {/* --- 2. FOOTER (Transparent background, Outside Card) --- */}
                <div className={styles.footerWrapper}>
                    <Footer />
                </div>

            </div>

            {/* --- MODAL (CREATE/EDIT) --- */}
            {isFormOpen && (
                <div className={styles.modalOverlay} onClick={() => !isSaving && setIsFormOpen(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                         <div className={styles.modalHeader}>
                            <h3>{editingItem ? 'Edit Item' : 'Add New Item'}</h3>
                            <button onClick={() => setIsFormOpen(false)} disabled={isSaving} style={{opacity: isSaving?0.5:1}}><X size={20} /></button>
                        </div>
                        <div className={styles.formBody}>
                            <form id="masterForm" onSubmit={handleSave} className={styles.form}>
                                {activeTab === 'userGroups' && (
                                    <>
                                        <div className={styles.inputGroup}><label>Group Name</label><input type="text" required value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} disabled={isSaving} /></div>
                                        <div className={styles.inputGroup}><label>Description</label><textarea rows="2" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} disabled={isSaving} /></div>
                                        <div className={styles.inputGroup}>
                                            <label>Select Members</label>
                                            <div className={styles.searchWrapper}><Search size={16} className={styles.searchIcon} /><input type="text" placeholder="Search by name or email..." className={styles.searchInput} value={memberSearchQuery} onChange={(e) => setMemberSearchQuery(e.target.value)} disabled={isSaving} /></div>
                                            <div className={styles.multiSelectBox}>
                                                {filteredEmployees.map(emp => ( <label key={emp.EmployeeID} className={styles.multiSelectItem}><input type="checkbox" checked={selectedGroupUsers.includes(emp.EmployeeID)} onChange={() => toggleGroupUser(emp.EmployeeID)} disabled={isSaving} /><div className={styles.itemTextGroup}><span className={styles.itemName}>{emp.EmployeeName}</span><span className={styles.itemSub}>{emp.EmployeeID} • {emp.Email}</span></div></label> ))}
                                                {filteredEmployees.length === 0 && <span style={{padding:'1rem', textAlign:'center', color:'#999'}}>No users found.</span>}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>{selectedGroupUsers.length} users selected</div>
                                        </div>
                                        <div className={styles.checkboxGroup}><input type="checkbox" id="isActiveCheckGrp" checked={formData.isActive || false} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} disabled={isSaving} /><label htmlFor="isActiveCheckGrp">Is Active?</label></div>
                                    </>
                                )}
                                {activeTab === 'users' && (
                                    <>
                                        <div className={styles.inputGroup}><label>Employee Name</label><input type="text" required value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} disabled={isSaving} /></div>
                                        <div className={styles.inputGroup}><label>Email</label><input type="email" required value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} disabled={isSaving} /></div>
                                        <div className={styles.inputGroup}><label>Mobile No</label><input type="text" required value={formData.mobile || ''} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} disabled={isSaving} /></div>
                                        {!editingItem && <div className={styles.inputGroup}><label>Password</label><input type="password" required value={formData.password || ''} onChange={(e) => setFormData({ ...formData, password: e.target.value })} disabled={isSaving} /></div>}
                                        <div className={styles.checkboxGroup}><input type="checkbox" id="isActiveCheckUser" checked={formData.isActive || false} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} disabled={isSaving} /><label htmlFor="isActiveCheckUser">Is Active?</label></div>
                                    </>
                                )}
                                {(activeTab === 'expenseTypes' || activeTab === 'paymentModes') && (
                                    <>
                                        <div className={styles.inputGroup}><label>Name</label><input type="text" required value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} disabled={isSaving} /></div>
                                        {activeTab === 'expenseTypes' && <div className={styles.inputGroup}><label>Description</label><textarea rows="3" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} disabled={isSaving} /></div>}
                                        <div className={styles.checkboxGroup}><input type="checkbox" id="isActiveCheck" checked={formData.isActive || false} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} disabled={isSaving} /><label htmlFor="isActiveCheck">Is Active?</label></div>
                                    </>
                                )}
                            </form>
                        </div>
                        <div className={styles.modalFooter}>
                            <button type="submit" form="masterForm" className={styles.saveButton} disabled={isSaving}>
                                {isSaving ? <><Loader2 size={18} className={styles.spinner} /> Saving...</> : <><Save size={18} /> Save Changes</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <DeleteConfirmationModal isOpen={!!itemToDelete} onClose={() => { if(!isDeleting) setItemToDelete(null); }} onConfirm={confirmDelete} isLoading={isDeleting} />
            <SuccessModal isOpen={successData.isOpen} message={successData.message} onClose={() => setSuccessData({ ...successData, isOpen: false })} />
            
            {/* --- ADDED NOTIFICATION MODAL --- */}
            <NotificationModal isOpen={notification.isOpen} message={notification.message} onClose={() => setNotification({ ...notification, isOpen: false })} />
        </div>
    );
};

export default ManageMasterData;