import React, { useState, useRef, useEffect } from 'react';
import { formatCurrency } from '../../utils/formatters';
import styles from './Header.module.css';
import logo from "../../assets/logo.png";
import { User, LogOut, ChevronDown } from 'lucide-react';

const Header = ({ totalExpenses, user, onLogout }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Safe access to user data
  const userName = user?.EmployeeName || 'Guest User';
  const userEmail = user?.EmailId || user?.Email || 'user@rataagroup.com'; 

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        
        {/* Logo Section */}
        <div className={styles.logoSection}>
          <img
            src={logo}
            alt="Rataa Group Logo"
            className={styles.logoImage}
          />
          <p className={styles.subtitle}>Mining Services - Expense Management</p>
        </div>

        {/* Right Section: Stats + User Profile */}
        <div className={styles.rightSection}>
          
          {/* Stats Card Section (Big Gold Text) */}
          <div className={styles.statsCard}>
            <p className={styles.statsLabel}>Total Expenses</p>
            <p className={styles.statsValue}>{formatCurrency(totalExpenses)}</p>
          </div>

          <div className={styles.separator}></div>

          {/* User Profile Section */}
          <div className={styles.profileContainer} ref={dropdownRef}>
            <button 
              className={`${styles.profileButton} ${isDropdownOpen ? styles.active : ''}`} 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              title="User Profile"
            >
              <div className={styles.avatarCircle}>
                <User size={24} color="#dcb158" /> {/* Gold Icon */}
              </div>
              <ChevronDown size={16} className={styles.chevron} />
            </button>

            {/* Dropdown Popup */}
            {isDropdownOpen && (
              <div className={styles.dropdown}>
                
                {/* Profile Header (Avatar + Info) */}
                <div className={styles.dropdownHeader}>
                  <div className={styles.largeAvatar}>
                      <User size={40} color="#6b7280" />
                  </div>
                  <h3 className={styles.profileName}>{userName}</h3>
                  <p className={styles.profileEmail}>{userEmail}</p>
                </div>

                <div className={styles.divider}></div>

                {/* Actions */}
                <div className={styles.dropdownFooter}>
                  <button 
                    className={styles.logoutButton}
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onLogout();
                    }}
                  >
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};

export default Header;