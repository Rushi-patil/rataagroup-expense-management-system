import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../store/authSlice';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'; // --- IMPORT ArrowLeft ---
import NotificationModal from '../Notification/NotificationModal'; 
import styles from './LoginPage.module.css';
import rataaLogo from '../../assets/logo.png'; 

const LoginPage = ({ onForgotPassword, onNavigateHome }) => { // --- ACCEPT PROP ---
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [notification, setNotification] = useState({ isOpen: false, message: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://127.0.0.1:8000/employee/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Email: email, Password: password }),
      });

      const data = await response.json();

      if (response.ok) {
        dispatch(loginSuccess({
            EmployeeID: data.EmployeeID,
            EmployeeName: data.EmployeeName,
            Email: data.Email,
            Role: data.Role,
        }));
      } else if (response.status === 403) {
        setNotification({
            isOpen: true,
            message: "Your account is inactive. Please contact the admin team."
        });
      } else if (response.status === 401) {
        setError(data.detail || 'Invalid email or password');
      } else {
        setError(data.detail || 'An error occurred. Please try again later.');
      }
    } catch (err) {
      console.error('Login Error:', err);
      setError('Network error. Unable to connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      
      {/* --- BACK TO HOME BUTTON --- */}
      <button className={styles.backButton} onClick={onNavigateHome}>
        <ArrowLeft size={20} /> Back to Home
      </button>

      <div className={styles.loginCard}>
        <div className={styles.logoContainer}>
          <img src={rataaLogo} alt="RATAA GROUP Logo" className={styles.logo} />
        </div>

        <h1 className={styles.title}>Welcome to RATAA GROUP!</h1>
        <p className={styles.subtitle}>Sign in to continue</p>

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputContainer}>
            <label htmlFor="email" className={styles.label}>Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="janedoe@gmail.com"
              required
            />
          </div>

          <div className={styles.inputContainer}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <div className={styles.passwordWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={20} className={styles.eyeIcon} /> : <Eye size={20} className={styles.eyeIcon} />}
              </button>
            </div>
          </div>

          {error && <p className={styles.errorMessage} style={{ color: '#dc2626', fontSize: '0.875rem', fontWeight: 600, textAlign: 'left', margin: '-0.5rem 0 0 0.5rem' }}>{error}</p>}

          <button 
            type="submit" 
            className={styles.loginButton}
            disabled={isLoading}
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          >
            {isLoading ? <Loader2 className={styles.spinner} size={20} style={{ animation: 'spin 1s linear infinite' }} /> : 'LOGIN'}
          </button>

          <button 
            type="button" 
            className={styles.forgotPassword}
            onClick={onForgotPassword}
            disabled={isLoading}
          >
            Forgot password?
          </button>
        </form>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            Don't have an account?{' '}
            <button type="button" className={styles.registerLink}>
              Register!
            </button>
          </p>
        </div>
      </div>
      
      <NotificationModal 
        isOpen={notification.isOpen}
        message={notification.message}
        onClose={() => setNotification({ ...notification, isOpen: false })}
      />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;