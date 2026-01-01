import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Download, Settings, Filter, Search, Loader2, ChevronDown } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters'; 
import * as XLSX from 'xlsx'; 
import NotificationModal from '../Notification/NotificationModal'; 
import ManageMasterData from './ManageMasterData'; // Component for CRUD operations
import styles from './AdminDashboard.module.css';

// Accept onTotalChange prop from App.jsx to update Header
const AdminDashboard = ({ onTotalChange }) => {
  // --- VIEW STATE (Dashboard vs Manage) ---
  const [viewMode, setViewMode] = useState('dashboard');

  // --- REDUX DATA ---
  const { expenseTypes = [], paymentModes = [] } = useSelector((state) => state.masterData || {});

  // --- LOCAL STATE ---
  const [allExpenses, setAllExpenses] = useState([]);
  const [employees, setEmployees] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);

  // --- FILTER STATES ---
  const [selectedUsers, setSelectedUsers] = useState([]); 
  const [selectedTypes, setSelectedTypes] = useState([]); 
  const [selectedPaymentModes, setSelectedPaymentModes] = useState([]); 

  // --- SEARCH STATES ---
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [typeSearchTerm, setTypeSearchTerm] = useState(''); 
  const [paymentSearchTerm, setPaymentSearchTerm] = useState(''); 

  // --- DROPDOWN VISIBILITY STATE ---
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  
  // --- NOTIFICATION MODAL STATE ---
  const [notification, setNotification] = useState({ isOpen: false, message: '' });

  // --- 1. FETCH DATA ON MOUNT ---
  useEffect(() => {
    const fetchData = async () => {
      // Only fetch if we are in dashboard mode to save resources
      if (viewMode !== 'dashboard') return;

      setIsLoading(true);
      try {
        const expRes = await fetch('http://127.0.0.1:8000/expense/all');
        if (expRes.ok) {
           const expData = await expRes.json();
           setAllExpenses(expData);
        }

        const empRes = await fetch('http://127.0.0.1:8000/employee/all'); 
        if (empRes.ok) {
           const empData = await empRes.json();
           setEmployees(empData.employees || []);
        }
      } catch (error) {
        console.error("Admin Fetch Error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [viewMode]);

  // --- 2. FILTER LOGIC ---
  
  // Dropdown Filtering
  const filteredEmployeesList = employees.filter(emp => 
    emp.EmployeeName.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
    emp.Email.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const filteredExpenseTypesList = expenseTypes.filter(type => 
    type.ExpenseTypeName.toLowerCase().includes(typeSearchTerm.toLowerCase())
  );

  const filteredPaymentModesList = paymentModes.filter(mode => 
    mode.paymentModeName.toLowerCase().includes(paymentSearchTerm.toLowerCase())
  );

  // Main Data Filtering
  const filteredData = useMemo(() => {
    return allExpenses.filter(item => {
      const userMatch = selectedUsers.length === 0 || selectedUsers.includes(item.userEmail);
      const typeName = expenseTypes.find(t => t._id === item.expenseTypeId)?.ExpenseTypeName;
      const typeMatch = selectedTypes.length === 0 || selectedTypes.includes(typeName);
      const paymentMatch = selectedPaymentModes.length === 0 || selectedPaymentModes.includes(item.paymentMode);

      return userMatch && typeMatch && paymentMatch;
    });
  }, [allExpenses, selectedUsers, selectedTypes, selectedPaymentModes, expenseTypes]);


  // --- 3. CALCULATE HEADER TOTAL ---
  useEffect(() => {
    if (onTotalChange && viewMode === 'dashboard') {
        const total = filteredData.reduce((sum, item) => {
            const amt = parseFloat(item.amount);
            return sum + (isNaN(amt) ? 0 : amt);
        }, 0);
        onTotalChange(total);
    }
  }, [filteredData, onTotalChange, viewMode]);


  // --- 4. EXCEL DOWNLOAD HELPER ---
  const autoFitColumns = (json, worksheet) => {
    const objectMaxLength = []; 
    const keys = Object.keys(json[0]);
    keys.forEach((key) => {
       let maxLen = key.length; 
       json.forEach((d) => {
          const value = d[key] ? String(d[key]) : "";
          if (value.length > maxLen) maxLen = value.length;
       });
       objectMaxLength.push({ wch: maxLen + 2 }); 
    });
    worksheet['!cols'] = objectMaxLength;
  };

  const handleDownload = () => {
    if (filteredData.length === 0) {
        setNotification({
            isOpen: true,
            message: "There is no data available to download based on your current filters."
        });
        return;
    }

    const workbook = XLSX.utils.book_new();

    // --- A. MAIN SUMMARY SHEET ---
    const summaryData = filteredData.map((item, index) => {
        const typeName = expenseTypes.find(t => t._id === item.expenseTypeId)?.ExpenseTypeName || 'N/A';
        const expId = `EXP${String(index + 1).padStart(4, '0')}`; 
        const empObj = employees.find(e => e.Email === item.userEmail);
        const employeeName = empObj ? empObj.EmployeeName : item.userEmail;

        return {
            "Expense ID": expId,
            "Date": item.date.split('T')[0],
            "Title": item.title,
            "Amount": parseFloat(item.amount),
            "Type": typeName,
            "Employee": employeeName,
            "Payment Mode": item.paymentMode,
            
            // Additional Details
            "Description": item.description || '-',
            "Vehicle No": item.carNumber || '-',
            "Service Type": item.serviceType || '-',
            "Location": item.location || '-',
            "Equipment Name": item.equipmentName || '-',
            "Equipment Type": item.equipmentType || '-',

            "Attachments": item.attachments?.length || 0
        };
    });

    const mainSheet = XLSX.utils.json_to_sheet(summaryData);
    autoFitColumns(summaryData, mainSheet);
    XLSX.utils.book_append_sheet(workbook, mainSheet, "All Expenses");

    // --- B. INDIVIDUAL ATTACHMENT SHEETS ---
    filteredData.forEach((item, index) => {
        if (item.attachments && item.attachments.length > 0) {
            const expId = `EXP${String(index + 1).padStart(4, '0')}`;
            
            const attachmentRows = item.attachments.map((file, fileIndex) => ({
                "File #": fileIndex + 1,
                "File Name": file.filename || file.name,
                "Download Link": "Click to Download", 
                "url_hidden": `http://127.0.0.1:8000/expense/attachment/${file.id}` 
            }));

            const sheetRows = attachmentRows.map(({ url_hidden, ...rest }) => rest);
            const detailSheet = XLSX.utils.json_to_sheet(sheetRows);

            const range = XLSX.utils.decode_range(detailSheet['!ref']);
            for (let R = range.s.r + 1; R <= range.e.r; ++R) {
                const fileUrl = attachmentRows[R-1]["url_hidden"];
                const cellAddress = XLSX.utils.encode_cell({r: R, c: 2}); 
                if (detailSheet[cellAddress]) {
                    detailSheet[cellAddress].l = { Target: fileUrl };
                }
            }
            
            autoFitColumns(sheetRows, detailSheet);
            XLSX.utils.book_append_sheet(workbook, detailSheet, expId);
        }
    });

    XLSX.writeFile(workbook, "Expense_Report_Full.xlsx");
  };

  // --- 5. SWITCH TO MANAGE VIEW ---
  const handleManage = () => {
    setViewMode('manage'); 
  };

  const toggleSelection = (setter, list, value) => {
    setter(prev => prev.includes(value) ? prev.filter(i => i !== value) : [...prev, value]);
  };

  // --- RENDER CONDITION: MANAGE VS DASHBOARD ---
  if (viewMode === 'manage') {
      return (
        <ManageMasterData 
            onBack={() => {
                setViewMode('dashboard');
                // Optional: Re-trigger total calculation or fetch if needed
            }} 
        />
      );
  }

  return (
    <div className={styles.adminContainer}>
      
      <div className={styles.topBar}>
        <h2 className={styles.pageTitle}>Admin Dashboard</h2>
        <div className={styles.actionButtons}>
           <button onClick={handleManage} className={styles.manageButton}>
             <Settings size={18} /> Manage
           </button>
           <button onClick={handleDownload} className={styles.downloadButton}>
             <Download size={18} /> Download Excel
           </button>
        </div>
      </div>

      <div className={styles.filterSection}>
        <div className={styles.filterRow}>
            
            {/* 1. Users Filter */}
            <div className={styles.filterColumn}>
                <label className={styles.filterLabel}><Filter size={14}/> Filter Users:</label>
                <div 
                    className={styles.dropdownButton} 
                    onClick={() => { setShowUserDropdown(!showUserDropdown); setShowTypeDropdown(false); setShowPaymentDropdown(false); }}
                >
                    <span>{selectedUsers.length === 0 ? "All Users" : `${selectedUsers.length} User(s)`}</span>
                    <ChevronDown size={16} />
                </div>
                {showUserDropdown && (
                    <div className={styles.dropdownContent}>
                        <div className={styles.searchWrapper}>
                            <Search size={14} className={styles.searchIcon}/>
                            <input type="text" placeholder="Search user..." className={styles.searchInput} value={userSearchTerm} onChange={(e) => setUserSearchTerm(e.target.value)} onClick={(e) => e.stopPropagation()} />
                        </div>
                        {filteredEmployeesList.length === 0 ? <div className={styles.dropdownItem} style={{color:'#999'}}>No matches found</div> : 
                            filteredEmployeesList.map(emp => (
                            <label key={emp._id} className={styles.dropdownItem}>
                                <input type="checkbox" className={styles.checkbox} checked={selectedUsers.includes(emp.Email)} onChange={() => toggleSelection(setSelectedUsers, selectedUsers, emp.Email)} />
                                <div className={styles.itemTextGroup}>
                                    <span className={styles.itemName}>{emp.EmployeeName}</span>
                                    <span className={styles.itemSub}>{emp.Email}</span>
                                </div>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* 2. Expense Types Filter */}
            <div className={styles.filterColumn}>
                <label className={styles.filterLabel}><Filter size={14}/> Filter Types:</label>
                 <div 
                    className={styles.dropdownButton} 
                    onClick={() => { setShowTypeDropdown(!showTypeDropdown); setShowUserDropdown(false); setShowPaymentDropdown(false); }}
                >
                    <span>{selectedTypes.length === 0 ? "All Types" : `${selectedTypes.length} Type(s)`}</span>
                    <ChevronDown size={16} />
                </div>
                {showTypeDropdown && (
                    <div className={styles.dropdownContent}>
                        <div className={styles.searchWrapper}>
                            <Search size={14} className={styles.searchIcon}/>
                            <input type="text" placeholder="Search type..." className={styles.searchInput} value={typeSearchTerm} onChange={(e) => setTypeSearchTerm(e.target.value)} onClick={(e) => e.stopPropagation()} />
                        </div>
                        {filteredExpenseTypesList.length === 0 ? <div className={styles.dropdownItem} style={{color:'#999'}}>No matches found</div> :
                            filteredExpenseTypesList.map(type => (
                            <label key={type._id} className={styles.dropdownItem}>
                                <input type="checkbox" className={styles.checkbox} checked={selectedTypes.includes(type.ExpenseTypeName)} onChange={() => toggleSelection(setSelectedTypes, selectedTypes, type.ExpenseTypeName)} />
                                <span className={styles.itemLabel}>{type.ExpenseTypeName}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* 3. Payment Mode Filter */}
            <div className={styles.filterColumn}>
                <label className={styles.filterLabel}><Filter size={14}/> Payment Mode:</label>
                 <div 
                    className={styles.dropdownButton} 
                    onClick={() => { setShowPaymentDropdown(!showPaymentDropdown); setShowUserDropdown(false); setShowTypeDropdown(false); }}
                >
                    <span>{selectedPaymentModes.length === 0 ? "All Modes" : `${selectedPaymentModes.length} Mode(s)`}</span>
                    <ChevronDown size={16} />
                </div>
                {showPaymentDropdown && (
                    <div className={styles.dropdownContent}>
                        <div className={styles.searchWrapper}>
                            <Search size={14} className={styles.searchIcon}/>
                            <input type="text" placeholder="Search mode..." className={styles.searchInput} value={paymentSearchTerm} onChange={(e) => setPaymentSearchTerm(e.target.value)} onClick={(e) => e.stopPropagation()} />
                        </div>
                        {filteredPaymentModesList.length === 0 ? <div className={styles.dropdownItem} style={{color:'#999'}}>No matches found</div> : 
                            filteredPaymentModesList.map(mode => (
                            <label key={mode._id} className={styles.dropdownItem}>
                                <input type="checkbox" className={styles.checkbox} checked={selectedPaymentModes.includes(mode.paymentModeName)} onChange={() => toggleSelection(setSelectedPaymentModes, selectedPaymentModes, mode.paymentModeName)} />
                                <span className={styles.itemLabel}>{mode.paymentModeName}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

        </div>
      </div>

      {/* Data Table */}
      <div className={styles.tableCard}>
        {isLoading ? (
            <div className={styles.loadingState}><Loader2 className={styles.spinner} /> Loading Data...</div>
        ) : (
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Exp ID</th>
                            <th>Date</th>
                            <th>Employee</th>
                            <th>Title</th>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Payment Mode</th>
                            <th>Attachments</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.length > 0 ? filteredData.map((exp, index) => {
                             const typeName = expenseTypes.find(t => t._id === exp.expenseTypeId)?.ExpenseTypeName || '-';
                             const expId = `EXP${String(index + 1).padStart(4, '0')}`;
                             const empObj = employees.find(e => e.Email === exp.userEmail);
                             const displayName = empObj ? empObj.EmployeeName : exp.userEmail;

                             return (
                                <tr key={exp._id}>
                                    <td><span className={styles.expIdCell}>{expId}</span></td>
                                    <td>{new Date(exp.date).toLocaleDateString()}</td>
                                    <td>
                                        <div className={styles.userCell}>
                                            <span className={styles.userName}>{displayName}</span>
                                            {empObj && <span className={styles.userEmailSmall}>{exp.userEmail}</span>}
                                        </div>
                                    </td>
                                    <td className={styles.titleCell}>{exp.title}</td>
                                    <td><span className={styles.typeBadge}>{typeName}</span></td>
                                    <td className={styles.amountCell}>{formatCurrency(exp.amount)}</td>
                                    <td>{exp.paymentMode}</td>
                                    <td>{exp.attachments?.length || 0} Files</td>
                                </tr>
                             );
                        }) : (
                            <tr>
                                <td colSpan="8" className={styles.noRows}>No expenses match your filters.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        )}
        <div className={styles.tableFooter}>
            Showing {filteredData.length} records
        </div>
      </div>

      <NotificationModal 
        isOpen={notification.isOpen}
        message={notification.message}
        onClose={() => setNotification({ ...notification, isOpen: false })}
      />
    </div>
  );
};

export default AdminDashboard;