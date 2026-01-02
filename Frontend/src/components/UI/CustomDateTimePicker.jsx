import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import styles from './CustomDateTimePicker.module.css';

const CustomDateTimePicker = ({ label, value, onChange, error }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse initial value or default to Now
  const initialDate = value ? new Date(value) : new Date();
  
  // State for the picker
  const [viewDate, setViewDate] = useState(initialDate); // For navigating months
  const [selectedDate, setSelectedDate] = useState(value ? initialDate : null);
  const [selectedHour, setSelectedHour] = useState(initialDate.getHours());
  const [selectedMinute, setSelectedMinute] = useState(initialDate.getMinutes());

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Calendar Logic ---
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDateClick = (day) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    newDate.setHours(selectedHour);
    newDate.setMinutes(selectedMinute);
    
    setSelectedDate(newDate);
    // Format to YYYY-MM-DDTHH:mm for HTML datetime-local compatibility
    const isoString = newDate.toISOString().slice(0, 16); 
    onChange(isoString);
  };

  // --- Time Logic ---
  const handleTimeChange = (type, val) => {
    let h = selectedHour;
    let m = selectedMinute;

    if (type === 'hour') {
        h = val;
        setSelectedHour(val);
    } else {
        m = val;
        setSelectedMinute(val);
    }

    if (selectedDate) {
        const newDate = new Date(selectedDate);
        newDate.setHours(h);
        newDate.setMinutes(m);
        setSelectedDate(newDate);
        onChange(newDate.toISOString().slice(0, 16)); // YYYY-MM-DDTHH:mm - ISO string
    }
  };

  // --- Formatting for Display ---
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return 'Select Date & Time';
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', { 
      day: '2-digit', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit', hour12: true 
    });
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
  const firstDay = getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());
  const daysArray = [...Array(daysInMonth).keys()].map(i => i + 1);
  const emptySlots = [...Array(firstDay).keys()];

  // Time Arrays
  const hours = [...Array(24).keys()];
  const minutes = [...Array(12).keys()].map(i => i * 5); // 0, 5, 10...

  return (
    <div className={styles.container} ref={containerRef}>
      <label className={styles.label}>
        <CalendarIcon size={14} className={styles.labelIcon} /> {label}
      </label>

      {/* Trigger Input */}
      <div 
        className={`${styles.trigger} ${isOpen ? styles.activeTrigger : ''} ${error ? styles.errorBorder : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={!selectedDate ? styles.placeholder : styles.valueText}>
            {formatDateDisplay(value)}
        </span>
        <Clock size={16} className={styles.clockIcon} />
      </div>
      {error && <p className={styles.errorText}>{error}</p>}

      {/* Dropdown Popup */}
      {isOpen && (
        <div className={styles.popup}>
          
          {/* Calendar Section (Left) */}
          <div className={styles.calendarSection}>
            <div className={styles.header}>
              <span className={styles.monthTitle}>
                {months[viewDate.getMonth()]}, {viewDate.getFullYear()}
              </span>
              <div className={styles.navButtons}>
                <button onClick={handlePrevMonth} className={styles.navBtn}><ChevronLeft size={18}/></button>
                <button onClick={handleNextMonth} className={styles.navBtn}><ChevronRight size={18}/></button>
              </div>
            </div>

            <div className={styles.weekDays}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <span key={d}>{d}</span>
              ))}
            </div>

            <div className={styles.daysGrid}>
              {emptySlots.map(i => <div key={`empty-${i}`} />)}
              {daysArray.map(day => {
                const isSelected = selectedDate && 
                  selectedDate.getDate() === day && 
                  selectedDate.getMonth() === viewDate.getMonth() && 
                  selectedDate.getFullYear() === viewDate.getFullYear();
                
                const isToday = 
                  new Date().getDate() === day && 
                  new Date().getMonth() === viewDate.getMonth() && 
                  new Date().getFullYear() === viewDate.getFullYear();

                return (
                  <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`${styles.dayBtn} ${isSelected ? styles.selectedDay : ''} ${isToday ? styles.today : ''}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Section (Right) */}
          <div className={styles.timeSection}>
            <div className={styles.timeHeader}>Time</div>
            <div className={styles.timeColumns}>
                {/* Hours */}
                <div className={styles.scrollColumn}>
                    <div className={styles.colLabel}>Hr</div>
                    {hours.map(h => (
                        <button 
                            key={h} 
                            className={`${styles.timeBtn} ${selectedHour === h ? styles.selectedTime : ''}`}
                            onClick={() => handleTimeChange('hour', h)}
                        >
                            {h.toString().padStart(2, '0')}
                        </button>
                    ))}
                </div>
                {/* Minutes */}
                <div className={styles.scrollColumn}>
                    <div className={styles.colLabel}>Min</div>
                    {minutes.map(m => (
                        <button 
                            key={m} 
                            className={`${styles.timeBtn} ${selectedMinute === m ? styles.selectedTime : ''}`}
                            onClick={() => handleTimeChange('minute', m)}
                        >
                            {m.toString().padStart(2, '0')}
                        </button>
                    ))}
                </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default CustomDateTimePicker;