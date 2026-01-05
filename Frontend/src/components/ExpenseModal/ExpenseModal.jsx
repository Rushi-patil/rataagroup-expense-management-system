import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { 
  X, Upload, Paperclip, Calendar, DollarSign, 
  Tag, Type, CreditCard, FileText, Truck, 
  Utensils, Wrench, Home, Loader2, Eye 
} from 'lucide-react';

import CustomDropdown from '../UI/CustomDropdown'; 
import CustomDateTimePicker from '../UI/CustomDateTimePicker'; 
import styles from './ExpenseModal.module.css';

const ExpenseModal = ({ editingExpense, onClose, onSubmit, userEmail }) => {
  // ... (Keep existing State and Redux selections) ...
  const { expenseTypes = [], paymentModes = [] } = useSelector((state) => state.masterData || {});
  
  const expenseTypeOptions = (expenseTypes || []).map(item => item.ExpenseTypeName);
  const paymentModeOptions = (paymentModes || []).map(item => item.paymentModeName);

  const formatDateToLocalInput = (dateObj) => {
    if (!dateObj) return '';
    const d = new Date(dateObj);
    const pad = (num) => String(num).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [formData, setFormData] = useState({
    expenseType: '', 
    title: '', 
    date: formatDateToLocalInput(new Date()), 
    amount: '', 
    paymentMode: '', 
    billAvailable: 'No', 
    description: '',
    carNumber: '', 
    serviceType: '', 
    location: '', 
    equipmentName: '', 
    equipmentType: ''
  });

  const [attachments, setAttachments] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const SERVICE_TYPES = ['Food', 'Accommodation', 'Both'];
  const PLANT_EQUIPMENT_TYPES = ['Electrical', 'Mechanical', 'Heavy Machinery', 'Tools', 'Other'];

  // ... (Keep existing useEffect for Edit Data Loading) ...
  useEffect(() => {
    if (editingExpense && expenseTypes.length > 0) {
      const typeObj = expenseTypes.find(t => t._id === editingExpense.expenseTypeId);
      const typeName = typeObj ? typeObj.ExpenseTypeName : '';
      const billValue = editingExpense.billAvailable === true ? 'Yes' : 'No';

      setFormData({
        expenseType: typeName, 
        title: editingExpense.title || '',
        date: editingExpense.date ? formatDateToLocalInput(editingExpense.date) : formatDateToLocalInput(new Date()),
        amount: editingExpense.amount || '',
        paymentMode: editingExpense.paymentMode || '', 
        billAvailable: billValue, 
        description: editingExpense.description || '',
        carNumber: editingExpense.carNumber || '',
        serviceType: editingExpense.serviceType || '',
        location: editingExpense.location || '',
        equipmentName: editingExpense.equipmentName || '',
        equipmentType: editingExpense.equipmentType || ''
      });

      if (editingExpense.attachments && Array.isArray(editingExpense.attachments)) {
        const existingFiles = editingExpense.attachments.map((fileObj) => ({
            id: fileObj.id, 
            name: fileObj.filename, 
            type: 'existing', 
            isExisting: true
        }));
        setAttachments(existingFiles);
      } else {
        setAttachments([]);
      }
    }
  }, [editingExpense, expenseTypes]);

  // ... (Keep validateForm) ...
  const validateForm = () => {
    const newErrors = {};
    if (!formData.expenseType) newErrors.expenseType = 'Expense Type is required';
    if (!formData.title.trim()) newErrors.title = 'Purpose/Title is required';
    if (!formData.date) newErrors.date = 'Date & Time is required';
    if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = 'Valid amount is required';
    if (!formData.paymentMode) newErrors.paymentMode = 'Mode of Payment is required';

    if (formData.billAvailable === 'Yes' && attachments.length === 0) {
        newErrors.attachments = 'Bill upload is mandatory when Bill is Available';
    }
    
    if (formData.expenseType === 'Company Vehicle Diesel' && !formData.carNumber.trim()) newErrors.carNumber = 'Car Number is required';
    if (formData.expenseType === 'Food & Accommodation' && !formData.serviceType) newErrors.serviceType = 'Service Type is required';
    if (formData.expenseType === 'Plant Expenses' && !formData.equipmentName.trim()) newErrors.equipmentName = 'Equipment Name is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    // --- 1. SET LOADING STATE ---
    setIsSubmitting(true);

    try {
        const selectedTypeObj = expenseTypes.find(item => item.ExpenseTypeName === formData.expenseType);
        const typeId = selectedTypeObj ? selectedTypeObj._id : '';

        const payload = new FormData();
        payload.append('expenseTypeId', typeId);
        payload.append('title', formData.title);
        payload.append('date', formData.date); 
        payload.append('amount', formData.amount);
        payload.append('paymentMode', formData.paymentMode);
        payload.append('billAvailable', formData.billAvailable === 'Yes' ? 'true' : 'false');
        payload.append('userEmail', userEmail || '');
        payload.append('description', formData.description || '');
        payload.append('carNumber', formData.carNumber || '');
        payload.append('serviceType', formData.serviceType || '');
        payload.append('location', formData.location || '');
        payload.append('equipmentName', formData.equipmentName || '');
        payload.append('equipmentType', formData.equipmentType || '');

        // ... (Keep Attachment Logic) ...
        if (formData.billAvailable === 'Yes') {
            if (editingExpense) {
                const keptAttachments = attachments.filter(att => att.isExisting).map(att => att.id);
                payload.append('keptAttachments', JSON.stringify(keptAttachments));
                attachments.forEach((fileObj) => {
                    if (!fileObj.isExisting && fileObj.file) {
                        payload.append('newAttachments', fileObj.file);
                    }
                });
            } else {
                attachments.forEach((fileObj) => {
                    if (fileObj.file) {
                        payload.append('attachments', fileObj.file);
                    }
                });
            }
        } else if (editingExpense) {
            payload.append('keptAttachments', JSON.stringify([]));
        }

        let response;
        let actionType = 'create';

        if (editingExpense) {
            actionType = 'update';
            response = await fetch(`http://127.0.0.1:8000/expense/update/${editingExpense._id}`, {
                method: 'PUT',
                body: payload,
            });
        } else {
            response = await fetch('http://127.0.0.1:8000/expense/create', {
                method: 'POST',
                body: payload,
            });
        }

        if (response.ok) {
            const result = await response.json();
            onSubmit(result, actionType); 
            onClose();
        } else {
            const errData = await response.json();
            console.error("API Error:", errData);
            alert("Operation failed. Please try again.");
        }

    } catch (error) {
        console.error("Network Error:", error);
        alert("An error occurred. Please check your connection.");
    } finally {
        // --- 2. RESET LOADING STATE ---
        setIsSubmitting(false);
    }
  };

  // ... (Keep existing Handlers for Change, File, etc.) ...
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const newAttachments = files.map((file) => ({
      file: file, 
      name: file.name,
      size: file.size,
      type: file.type,
      id: Date.now() + Math.random(),
      isExisting: false
    }));
    setAttachments([...attachments, ...newAttachments]);
    if (errors.attachments) setErrors(prev => ({ ...prev, attachments: null }));
  };

  const removeAttachment = (fileObj) => {
    setAttachments(prev => prev.filter(att => att.id !== fileObj.id));
  };

  const openExistingFile = (id) => {
    window.open(`http://127.0.0.1:8000/expense/attachment/${id}`, '_blank');
  };

  const renderConditionalFields = () => {
      // ... (Keep existing render logic) ...
      switch (formData.expenseType) {
        case 'Guest House Expenses': 
          return (
            <div className={styles.sectionBlock}>
               <h4 className={styles.sectionTitle}><Home size={16}/> Guest House Details</h4>
               <div className={styles.formGroup}>
                  <label className={styles.label}>Description</label>
                  <textarea value={formData.description} onChange={(e) => handleChange('description', e.target.value)} className={styles.textarea} rows="2" placeholder="Enter details..." />
               </div>
            </div>
          );
        case 'Company Vehicle Diesel':
          return (
            <div className={styles.sectionBlock}>
              <h4 className={styles.sectionTitle}><Truck size={16}/> Vehicle & Fuel Details</h4>
              <div className={styles.formGroup}>
                <label className={styles.label}>Car Number *</label>
                <input type="text" value={formData.carNumber} onChange={(e) => handleChange('carNumber', e.target.value)} className={styles.input} placeholder="e.g. MH12AB1234" />
                {errors.carNumber && <p className={styles.error}>{errors.carNumber}</p>}
              </div>
            </div>
          );
        case 'Food & Accommodation':
          return (
            <div className={styles.sectionBlock}>
              <h4 className={styles.sectionTitle}><Utensils size={16}/> Food & Stay Details</h4>
              <div className={styles.row}>
                  <div style={{ flex: 1 }}>
                      <CustomDropdown label="Service Type *" value={formData.serviceType} onChange={(val) => handleChange('serviceType', val)} options={SERVICE_TYPES} placeholder="Select Type" error={errors.serviceType} />
                  </div>
                  <div className={styles.formGroup} style={{ marginBottom: '1.25rem' }}>
                      <label className={styles.label}>Location (Optional)</label>
                      <input type="text" value={formData.location} onChange={(e) => handleChange('location', e.target.value)} className={styles.input} placeholder="City or Hotel Name" />
                  </div>
              </div>
            </div>
          );
        case 'Plant Expenses':
          return (
            <div className={styles.sectionBlock}>
              <h4 className={styles.sectionTitle}><Wrench size={16}/> Equipment Details</h4>
              <div className={styles.row}>
                  <div className={styles.formGroup} style={{ marginBottom: '1.25rem' }}>
                      <label className={styles.label}>Equipment Name *</label>
                      <input type="text" value={formData.equipmentName} onChange={(e) => handleChange('equipmentName', e.target.value)} className={styles.input} placeholder="e.g. Generator 500kVA" />
                      {errors.equipmentName && <p className={styles.error}>{errors.equipmentName}</p>}
                  </div>
                  <div style={{ flex: 1 }}>
                      <CustomDropdown label="Type (Optional)" value={formData.equipmentType} onChange={(val) => handleChange('equipmentType', val)} options={PLANT_EQUIPMENT_TYPES} placeholder="Select Type" />
                  </div>
              </div>
            </div>
          );
        default: return null;
      }
  };

  return (
    // Prevent close on overlay click if submitting
    <div className={styles.modalOverlay} onClick={!isSubmitting ? onClose : undefined}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</h2>
          {/* DISABLE X BUTTON */}
          <button 
            className={styles.closeButton} 
            onClick={onClose} 
            disabled={isSubmitting}
            style={{ opacity: isSubmitting ? 0.5 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
          >
            <X size={24} />
          </button>
        </div>
        <div className={styles.modalBody}>
          
          <CustomDropdown label="Expense Type *" icon={Tag} value={formData.expenseType} onChange={(val) => handleChange('expenseType', val)} options={expenseTypeOptions} placeholder="Select Expense Type" error={errors.expenseType} />
          
          <div className={styles.divider}></div>
          <div className={styles.formGroup}>
            <label className={styles.label}><Type size={14} className={styles.labelIcon}/> Purpose / Title *</label>
            <input type="text" value={formData.title} onChange={(e) => handleChange('title', e.target.value)} className={styles.input} placeholder="Enter purpose" />
            {errors.title && <p className={styles.error}>{errors.title}</p>}
          </div>
          <div className={styles.row}>
            <div style={{ flex: 1 }}>
                <CustomDateTimePicker label="Date & Time *" value={formData.date} onChange={(val) => handleChange('date', val)} error={errors.date} />
            </div>
            <div className={styles.formGroup}>
                <label className={styles.label}><DollarSign size={14} className={styles.labelIcon}/> Amount (₹) *</label>
                <input type="number" step="0.01" value={formData.amount} onChange={(e) => handleChange('amount', e.target.value)} className={styles.input} placeholder="0.00" />
                {errors.amount && <p className={styles.error}>{errors.amount}</p>}
            </div>
          </div>
          
          <div className={styles.formGroup}>
             <CustomDropdown 
                label="Mode of Payment *" 
                icon={CreditCard}
                value={formData.paymentMode} 
                onChange={(val) => handleChange('paymentMode', val)} 
                options={paymentModeOptions} 
                placeholder="Select Payment Mode" 
                error={errors.paymentMode} 
             />
          </div>

          {formData.expenseType && renderConditionalFields()}
          <div className={styles.divider}></div>
          <div className={styles.formGroup}>
             <label className={styles.label}><FileText size={14} className={styles.labelIcon}/> Bill Available? *</label>
             <div className={styles.radioGroup}>
                <label className={`${styles.radioLabel} ${formData.billAvailable === 'Yes' ? styles.checked : ''}`}>
                    <input type="radio" name="billAvailable" value="Yes" checked={formData.billAvailable === 'Yes'} onChange={(e) => handleChange('billAvailable', e.target.value)} /> Yes
                </label>
                <label className={`${styles.radioLabel} ${formData.billAvailable === 'No' ? styles.checked : ''}`}>
                    <input type="radio" name="billAvailable" value="No" checked={formData.billAvailable === 'No'} onChange={(e) => handleChange('billAvailable', e.target.value)} /> No
                </label>
             </div>
          </div>
          {formData.billAvailable === 'Yes' && (
            <div className={styles.formGroup}>
                <label className={styles.label}>Upload Bill {editingExpense ? '(Add New)' : '*'}</label>
                <div className={`${styles.uploadArea} ${errors.attachments ? styles.uploadError : ''}`}>
                <input type="file" multiple id="fileUpload" className={styles.fileInput} onChange={handleFileChange} />
                <label htmlFor="fileUpload" className={styles.uploadLabel}>
                    <Upload size={32} strokeWidth={1.5} className={styles.uploadIcon} />
                    <p className={styles.uploadText}>Click to upload files</p>
                    <p className={styles.uploadSubtext}>PDF, JPG, PNG (Max 5MB)</p>
                </label>
                </div>
                {errors.attachments && <p className={styles.error}>{errors.attachments}</p>}
                
                {attachments.length > 0 && (
                <div className={styles.attachmentList}>
                    {attachments.map((att) => (
                    <div key={att.id} className={styles.attachmentItem}>
                        <div className={styles.attachmentName}>
                            <Paperclip size={14} /> 
                            <span className={styles.fileName}>{att.name}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {att.isExisting && (
                                <button type="button" onClick={() => openExistingFile(att.id)} className={styles.viewButton} title="View File">
                                    <Eye size={14} color="#0d3512"/>
                                </button>
                            )}
                            <button type="button" onClick={() => removeAttachment(att)} className={styles.removeButton}>
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                    ))}
                </div>
                )}
            </div>
          )}
        </div>
        <div className={styles.modalActions}>
          {/* DISABLE CANCEL */}
          <button 
            className={styles.cancelButton} 
            onClick={onClose} 
            disabled={isSubmitting}
          >
            Cancel
          </button>
          
          {/* DISABLE SUBMIT + LOADER */}
          <button 
            className={styles.submitButton} 
            onClick={handleSubmit} 
            disabled={isSubmitting}
          >
            {isSubmitting ? <><Loader2 className={styles.spinner} size={18} /> Processing...</> : (editingExpense ? 'Save Changes' : 'Create Expense')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseModal;