import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Download, Settings, Filter, Search, Loader2, ChevronDown, Trash2, CheckSquare, XSquare, ChevronUp } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters'; 
import * as XLSX from 'xlsx'; 
import NotificationModal from '../Notification/NotificationModal'; 
import DeleteConfirmationModal from '../Delete/DeleteConfirmationModal';
import ManageMasterData from './ManageMasterData'; 
import Footer from '../Footer/Footer'; 
import styles from './AdminDashboard.module.css';

const AdminDashboard = ({ onTotalChange }) => {
  const [viewMode, setViewMode] = useState('dashboard');
  const { expenseTypes = [], paymentModes = [] } = useSelector((state) => state.masterData || {});
  const [allExpenses, setAllExpenses] = useState([]);
  const [employees, setEmployees] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const [selectedUsers, setSelectedUsers] = useState([]); 
  const [selectedTypes, setSelectedTypes] = useState([]); 
  const [selectedPaymentModes, setSelectedPaymentModes] = useState([]); 
  
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [typeSearchTerm, setTypeSearchTerm] = useState(''); 
  const [paymentSearchTerm, setPaymentSearchTerm] = useState(''); 

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  
  const userDropdownRef = useRef(null);
  const typeDropdownRef = useRef(null);
  const paymentDropdownRef = useRef(null);

  const [selectedExpenseIds, setSelectedExpenseIds] = useState([]);
  const [notification, setNotification] = useState({ isOpen: false, message: '' });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: null });

  // --- 1. FETCH DATA ---
  const fetchData = async () => {
    if (viewMode !== 'dashboard') return;
    setIsLoading(true);
    try {
      const expRes = await fetch('http://127.0.0.1:8000/expense/all');
      if (expRes.ok) { const expData = await expRes.json(); setAllExpenses(expData); }
      const empRes = await fetch('http://127.0.0.1:8000/employee/all'); 
      if (empRes.ok) { const empData = await empRes.json(); setEmployees(empData.employees || []); }
    } catch (error) { console.error("Admin Fetch Error:", error); } 
    finally { setIsLoading(false); }
  };
  useEffect(() => { fetchData(); }, [viewMode]);

  // --- 2. CLICK OUTSIDE LOGIC ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) setShowUserDropdown(false);
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target)) setShowTypeDropdown(false);
      if (paymentDropdownRef.current && !paymentDropdownRef.current.contains(event.target)) setShowPaymentDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- 3. FILTERING LOGIC ---
  const filteredEmployeesList = employees.filter(emp => emp.EmployeeName.toLowerCase().includes(userSearchTerm.toLowerCase()) || emp.Email.toLowerCase().includes(userSearchTerm.toLowerCase()));
  const filteredExpenseTypesList = expenseTypes.filter(type => type.ExpenseTypeName.toLowerCase().includes(typeSearchTerm.toLowerCase()));
  const filteredPaymentModesList = paymentModes.filter(mode => mode.paymentModeName.toLowerCase().includes(paymentSearchTerm.toLowerCase()));

  const filteredData = useMemo(() => {
    return allExpenses.filter(item => {
      const userMatch = selectedUsers.length === 0 || selectedUsers.includes(item.userEmail);
      const typeName = expenseTypes.find(t => t._id === item.expenseTypeId)?.ExpenseTypeName;
      const typeMatch = selectedTypes.length === 0 || selectedTypes.includes(typeName);
      const paymentMatch = selectedPaymentModes.length === 0 || selectedPaymentModes.includes(item.paymentMode);
      return userMatch && typeMatch && paymentMatch;
    });
  }, [allExpenses, selectedUsers, selectedTypes, selectedPaymentModes, expenseTypes]);

  useEffect(() => {
    if (onTotalChange && viewMode === 'dashboard') {
        const total = filteredData.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        onTotalChange(total);
    }
  }, [filteredData, onTotalChange, viewMode]);

  // --- 4. SELECTION ---
  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedExpenseIds(filteredData.map(item => item._id));
    else setSelectedExpenseIds([]);
  };
  const handleSelectRow = (id) => { setSelectedExpenseIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); };
  const toggleSelectionList = (setter, list, value) => { setter(prev => prev.includes(value) ? prev.filter(i => i !== value) : [...prev, value]); };

  // --- 5. DELETE HANDLERS ---
  const handleDeleteClick = (type) => {
    if (type === 'selected' && selectedExpenseIds.length === 0) { setNotification({ isOpen: true, message: "Please select expenses to delete." }); return; }
    if (type === 'all' && allExpenses.length === 0) { setNotification({ isOpen: true, message: "No expenses available to delete." }); return; }
    setDeleteModal({ isOpen: true, type });
  };

  const confirmDelete = async () => {
    let idsToDelete = [];
    if (deleteModal.type === 'selected') idsToDelete = selectedExpenseIds;
    else if (deleteModal.type === 'all') idsToDelete = allExpenses.map(item => item._id);
    setIsDeleting(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/expense/delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expenseIds: idsToDelete }) });
      const data = await res.json();
      if (res.ok) {
        setDeleteModal({ isOpen: false, type: null }); setSelectedExpenseIds([]); await fetchData(); 
        setNotification({ isOpen: true, message: `Successfully deleted ${data.deletedCount} expenses.` });
      } else { alert(`Delete failed: ${data.detail || 'Unknown error'}`); }
    } catch (e) { console.error(e); alert("Network error during deletion."); } 
    finally { setIsDeleting(false); }
  };

  // --- 6. EXCEL DOWNLOAD LOGIC (FIXED) ---
  const getAutoColumnWidths = (data, headerKeys) => {
    return headerKeys.map(key => {
      let maxLen = key.length; 
      data.forEach(row => {
        const val = row[key] ? String(row[key]) : "";
        if (val.length > maxLen) maxLen = val.length;
      });
      return { wch: Math.min(maxLen + 5, 50) }; 
    });
  };

  const handleDownload = () => {
    if (filteredData.length === 0) {
      setNotification({ isOpen: true, message: "There is no data available to download." });
      return;
    }

    const workbook = XLSX.utils.book_new();

    // --- SHEET 1: ALL EXPENSES ---
    const summaryData = filteredData.map((item, index) => {
        const typeName = expenseTypes.find(t => t._id === item.expenseTypeId)?.ExpenseTypeName || 'N/A';
        const expId = `EXP${String(index + 1).padStart(4, '0')}`;
        item._generatedId = expId; 
        
        const empObj = employees.find(e => e.Email === item.userEmail);
        const employeeName = empObj ? empObj.EmployeeName : item.userEmail;

        return {
            "Expense ID": expId, "Date": item.date.split('T')[0], "Title": item.title, "Amount": parseFloat(item.amount),
            "Type": typeName, "Employee": employeeName, "Payment Mode": item.paymentMode,
            "Description": item.description || '-', "Vehicle No": item.carNumber || '-', "Service Type": item.serviceType || '-',
            "Location": item.location || '-', "Equipment Name": item.equipmentName || '-', "Equipment Type": item.equipmentType || '-', "Attachments": item.attachments?.length || 0
        };
    });

    const mainSheet = XLSX.utils.json_to_sheet(summaryData);
    const mainHeaders = Object.keys(summaryData[0]);
    mainSheet['!cols'] = getAutoColumnWidths(summaryData, mainHeaders);
    XLSX.utils.book_append_sheet(workbook, mainSheet, "All Expenses");

    // --- SHEET 2: ATTACHMENTS (FIXED COLUMNS) ---
    const attachmentRows = [];
    const attachmentUrls = []; // Store URLs separately to hide them
    const merges = []; 
    let rowIndex = 1; 

    filteredData.forEach((item) => {
      if (item.attachments && item.attachments.length > 0) {
        const startRow = rowIndex;
        item.attachments.forEach((att) => {
          // 1. Create Visible Row Data (Only 3 Columns)
          attachmentRows.push({
            "Expense ID": item._generatedId,
            "Attachment Name": att.filename || att.name || "Unknown File",
            "Download": "Click here to Download"
          });
          // 2. Store URL for linkage
          attachmentUrls.push(`http://127.0.0.1:8000/expense/attachment/${att.id}`);
          rowIndex++;
        });

        if (item.attachments.length > 1) {
          merges.push({ s: { r: startRow, c: 0 }, e: { r: rowIndex - 1, c: 0 } });
        }
      }
    });

    if (attachmentRows.length > 0) {
      const attachSheet = XLSX.utils.json_to_sheet(attachmentRows);
      
      // 3. Apply Hyperlinks from our separate array
      attachmentUrls.forEach((url, i) => {
          const rowInSheet = i + 1; // +1 because row 0 is header
          // Column C is index 2
          const cellRef = XLSX.utils.encode_cell({ r: rowInSheet, c: 2 });
          if (attachSheet[cellRef]) {
              attachSheet[cellRef].l = { Target: url, Tooltip: "Download File" };
          }
      });

      // 4. Apply Bold to Headers (Try standard method)
      const range = XLSX.utils.decode_range(attachSheet['!ref']);
      for (let C = range.s.c; C <= range.e.c; ++C) {
          const headerRef = XLSX.utils.encode_cell({ r: 0, c: C });
          if (attachSheet[headerRef]) {
              attachSheet[headerRef].s = { font: { bold: true } }; // Adds styling object
          }
      }

      attachSheet['!merges'] = merges;
      const attachHeaders = ["Expense ID", "Attachment Name", "Download"];
      attachSheet['!cols'] = getAutoColumnWidths(attachmentRows, attachHeaders);
      
      XLSX.utils.book_append_sheet(workbook, attachSheet, "Attachments");
    }

    XLSX.writeFile(workbook, "Expense_Report_Full.xlsx");
  };

  if (viewMode === 'manage') { return <ManageMasterData onBack={() => { setViewMode('dashboard'); }} />; }

  return (
    <div className={styles.adminContainer}>
      
      {/* 1. FIXED TOP BAR */}
      <div className={styles.topBar}>
        <h2 className={styles.pageTitle}>Admin Dashboard</h2>
        <div className={styles.actionButtons}>
           <div className={styles.deleteGroup}>
              <button className={styles.deleteMainBtn}> <Trash2 size={18} /> Delete Options <ChevronDown size={14} style={{marginLeft:'4px'}}/></button>
              <div className={styles.deleteDropdown}>
                <button onClick={() => handleDeleteClick('selected')}> <CheckSquare size={16} /> Delete Selected ({selectedExpenseIds.length}) </button>
                <button onClick={() => handleDeleteClick('all')} className={styles.dangerOption}> <XSquare size={16} /> Delete All (Unfiltered) </button>
              </div>
           </div>
           <button onClick={() => setViewMode('manage')} className={styles.manageButton}> <Settings size={18} /> Manage </button>
           <button onClick={handleDownload} className={styles.downloadButton}> <Download size={18} /> Download Excel </button>
        </div>
      </div>

      {/* 2. SCROLLABLE CONTENT AREA */}
      <div className={styles.scrollContent}>
          
          {/* Filter Section */}
          <div className={styles.filterSection}>
            <div className={styles.mobileFilterToggle} onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}>
                <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
                    <Filter size={16} /> <span>Filter Options</span>
                </div>
                {isMobileFiltersOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
            </div>

            <div className={`${styles.filterRow} ${isMobileFiltersOpen ? styles.showFilters : ''}`}>
                {/* User Filter */}
                <div className={styles.filterColumn} ref={userDropdownRef}>
                    <label className={styles.filterLabel}><Filter size={14}/> Filter Users:</label>
                    <div className={styles.dropdownButton} onClick={() => { setShowUserDropdown(!showUserDropdown); setShowTypeDropdown(false); setShowPaymentDropdown(false); }}>
                        <span>{selectedUsers.length === 0 ? "All Users" : `${selectedUsers.length} User(s)`}</span> <ChevronDown size={16} />
                    </div>
                    {showUserDropdown && (
                        <div className={styles.dropdownContent}>
                            <div className={styles.searchWrapper}><Search size={14} className={styles.searchIcon}/><input type="text" placeholder="Search user..." className={styles.searchInput} value={userSearchTerm} onChange={(e) => setUserSearchTerm(e.target.value)} onClick={(e) => e.stopPropagation()} /></div>
                            {filteredEmployeesList.map(emp => (
                                <label key={emp._id} className={styles.dropdownItem}>
                                    <input type="checkbox" className={styles.checkbox} checked={selectedUsers.includes(emp.Email)} onChange={() => toggleSelectionList(setSelectedUsers, selectedUsers, emp.Email)} />
                                    <div className={styles.itemTextGroup}><span className={styles.itemName}>{emp.EmployeeName}</span><span className={styles.itemSub}>{emp.Email}</span></div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
                {/* Type Filter */}
                <div className={styles.filterColumn} ref={typeDropdownRef}>
                    <label className={styles.filterLabel}><Filter size={14}/> Filter Types:</label>
                    <div className={styles.dropdownButton} onClick={() => { setShowTypeDropdown(!showTypeDropdown); setShowUserDropdown(false); setShowPaymentDropdown(false); }}>
                        <span>{selectedTypes.length === 0 ? "All Types" : `${selectedTypes.length} Type(s)`}</span> <ChevronDown size={16} />
                    </div>
                    {showTypeDropdown && (
                        <div className={styles.dropdownContent}>
                            <div className={styles.searchWrapper}><Search size={14} className={styles.searchIcon}/><input type="text" placeholder="Search type..." className={styles.searchInput} value={typeSearchTerm} onChange={(e) => setTypeSearchTerm(e.target.value)} onClick={(e) => e.stopPropagation()} /></div>
                            {filteredExpenseTypesList.map(type => (
                                <label key={type._id} className={styles.dropdownItem}>
                                    <input type="checkbox" className={styles.checkbox} checked={selectedTypes.includes(type.ExpenseTypeName)} onChange={() => toggleSelectionList(setSelectedTypes, selectedTypes, type.ExpenseTypeName)} />
                                    <span className={styles.itemLabel}>{type.ExpenseTypeName}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
                {/* Payment Filter */}
                <div className={styles.filterColumn} ref={paymentDropdownRef}>
                    <label className={styles.filterLabel}><Filter size={14}/> Payment Mode:</label>
                    <div className={styles.dropdownButton} onClick={() => { setShowPaymentDropdown(!showPaymentDropdown); setShowUserDropdown(false); setShowTypeDropdown(false); }}>
                        <span>{selectedPaymentModes.length === 0 ? "All Modes" : `${selectedPaymentModes.length} Mode(s)`}</span> <ChevronDown size={16} />
                    </div>
                    {showPaymentDropdown && (
                        <div className={styles.dropdownContent}>
                            <div className={styles.searchWrapper}><Search size={14} className={styles.searchIcon}/><input type="text" placeholder="Search mode..." className={styles.searchInput} value={paymentSearchTerm} onChange={(e) => setPaymentSearchTerm(e.target.value)} onClick={(e) => e.stopPropagation()} /></div>
                            {filteredPaymentModesList.map(mode => (
                                <label key={mode._id} className={styles.dropdownItem}>
                                    <input type="checkbox" className={styles.checkbox} checked={selectedPaymentModes.includes(mode.paymentModeName)} onChange={() => toggleSelectionList(setSelectedPaymentModes, selectedPaymentModes, mode.paymentModeName)} />
                                    <span className={styles.itemLabel}>{mode.paymentModeName}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>
          </div>

          {/* Table Section */}
          <div className={styles.tableCard}>
            {isLoading ? ( <div className={styles.loadingState}><Loader2 className={styles.spinner} /> Loading Data...</div> ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{width: '40px', textAlign: 'center'}}> <input type="checkbox" className={styles.headCheckbox} checked={filteredData.length > 0 && selectedExpenseIds.length === filteredData.length} onChange={handleSelectAll} /> </th>
                                <th>Exp ID</th><th>Date</th><th>Employee</th><th>Title</th><th>Type</th><th>Amount</th><th>Payment Mode</th><th>Attachments</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.length > 0 ? filteredData.map((exp, index) => {
                                const typeName = expenseTypes.find(t => t._id === exp.expenseTypeId)?.ExpenseTypeName || '-';
                                const expId = `EXP${String(index + 1).padStart(4, '0')}`;
                                const empObj = employees.find(e => e.Email === exp.userEmail);
                                const isSelected = selectedExpenseIds.includes(exp._id);
                                return (
                                    <tr key={exp._id} className={isSelected ? styles.selectedRow : ''}>
                                        <td style={{textAlign: 'center'}}><input type="checkbox" className={styles.rowCheckbox} checked={isSelected} onChange={() => handleSelectRow(exp._id)} /></td>
                                        <td><span className={styles.expIdCell}>{expId}</span></td>
                                        <td>{new Date(exp.date).toLocaleDateString()}</td>
                                        <td><div className={styles.userCell}><span className={styles.userName}>{empObj ? empObj.EmployeeName : exp.userEmail}</span>{empObj && <span className={styles.userEmailSmall}>{exp.userEmail}</span>}</div></td>
                                        <td className={styles.titleCell}>{exp.title}</td>
                                        <td><span className={styles.typeBadge}>{typeName}</span></td>
                                        <td className={styles.amountCell}>{formatCurrency(exp.amount)}</td>
                                        <td>{exp.paymentMode}</td>
                                        <td>{exp.attachments?.length || 0} Files</td>
                                    </tr>
                                );
                            }) : ( <tr><td colSpan="9" className={styles.noRows}>No expenses match your filters.</td></tr> )}
                        </tbody>
                    </table>
                </div>
            )}
            <div className={styles.tableFooter}>Showing {filteredData.length} records</div>
          </div>

          {/* 3. FOOTER AT BOTTOM */}
          <div className={styles.footerWrapper}>
            <Footer />
          </div>
      </div>

      <NotificationModal isOpen={notification.isOpen} message={notification.message} onClose={() => setNotification({ ...notification, isOpen: false })} />
      <DeleteConfirmationModal isOpen={deleteModal.isOpen} onClose={() => { if(!isDeleting) setDeleteModal({ isOpen: false, type: null }); }} onConfirm={confirmDelete} isLoading={isDeleting} message={deleteModal.type === 'all' ? `WARNING: Delete ALL ${allExpenses.length} expenses?` : `Delete ${selectedExpenseIds.length} selected?`} />
    </div>
  );
};
export default AdminDashboard;