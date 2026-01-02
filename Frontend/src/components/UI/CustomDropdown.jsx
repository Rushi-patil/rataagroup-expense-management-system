import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import styles from './CustomDropdown.module.css';

const CustomDropdown = ({ 
  label, 
  icon: Icon, 
  options, 
  value, 
  onChange, 
  placeholder = "Select...", 
  error 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div className={styles.container} ref={dropdownRef}>
      {label && (
        <label className={styles.label}>
          {Icon && <Icon size={14} className={styles.labelIcon} />} 
          {label}
        </label>
      )}

      <div className={styles.dropdownWrapper}>
        {/* Trigger Button (Looks like input) */}
        <button 
          type="button" // Prevent form submission
          className={`${styles.trigger} ${isOpen ? styles.open : ''} ${error ? styles.errorBorder : ''}`} 
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className={value ? styles.selectedValue : styles.placeholder}>
            {value || placeholder}
          </span>
          <ChevronDown 
            size={18} 
            className={`${styles.arrow} ${isOpen ? styles.rotate : ''}`} 
          />
        </button>

        {/* Dropdown Menu (The Popup) */}
        {isOpen && (
          <div className={styles.menu}>
            {options.map((option, index) => (
              <div 
                key={index} 
                className={`${styles.item} ${value === option ? styles.selected : ''}`}
                onClick={() => handleSelect(option)}
              >
                {option}
                {value === option && <Check size={16} className={styles.checkIcon} />}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
};

export default CustomDropdown;