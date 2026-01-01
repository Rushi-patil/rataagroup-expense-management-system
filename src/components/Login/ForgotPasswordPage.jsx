import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Loader2, Eye, EyeOff } from 'lucide-react';
import styles from './ForgotPasswordPage.module.css';
import rataaLogo from '../../assets/logo.png'; // Ensure correct path

const ForgotPasswordPage = ({ onNavigateLogin }) => {
  // State for steps: 1 = Email/Captcha, 2 = OTP/New Password
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form Data
  const [email, setEmail] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [generatedCaptcha, setGeneratedCaptcha] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Error handling
  const [error, setError] = useState('');

  // Generate random captcha on mount
  useEffect(() => {
    generateNewCaptcha();
  }, []);

  const generateNewCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedCaptcha(result);
  };

  // Step 1: Handle Send OTP via API
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');

    // 1. Client-side Captcha Validation
    if (captchaInput.toUpperCase() !== generatedCaptcha) {
      setError('Incorrect Captcha. Please try again.');
      generateNewCaptcha();
      setCaptchaInput('');
      return;
    }

    setIsLoading(true);

    try {
      // 2. API Call: Request OTP
      const response = await fetch('http://127.0.0.1:8000/employee/forgot-password/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Email: email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success (200): "OTP sent to email successfully"
        console.log('OTP Sent:', data);
        setStep(2); // Move to Step 2
      } else if (response.status === 404) {
        // Error (404): "Employee not found"
        setError(data.detail || 'Email address not found.');
      } else {
        // Other errors
        setError('Failed to send OTP. Please try again later.');
      }
    } catch (err) {
      console.error('Network Error:', err);
      setError('Unable to connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Handle Reset Password via API
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // 3. API Call: Verify OTP & Reset Password
      const response = await fetch('http://127.0.0.1:8000/employee/forgot-password/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Email: email,       // From state (preserved from step 1)
          NewPassword: newPassword,
          OTP: otp,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success (200): "Password reset successfully"
        alert('Password reset successfully! Redirecting to login...');
        
        // Navigate back to login page
        if (onNavigateLogin) onNavigateLogin();
      } else if (response.status === 400) {
        // Error (400): "Invalid OTP"
        setError(data.detail || 'Invalid OTP. Please check and try again.');
      } else if (response.status === 404) {
        // Error (404): "Employee not found"
        setError(data.detail || 'Employee record not found.');
      } else {
        // Other errors
        setError('Something went wrong. Please try again.');
      }
    } catch (err) {
      console.error('Network Error:', err);
      setError('Unable to connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        
        {/* Back to Login Header */}
        <div className={styles.headerNav}>
          <button 
            onClick={onNavigateLogin} 
            className={styles.backButton}
            type="button"
          >
            <ArrowLeft size={20} /> Back to Login
          </button>
        </div>

        {/* Logo */}
        <div className={styles.logoContainer}>
          <img src={rataaLogo} alt="RATAA GROUP" className={styles.logo} />
        </div>

        <h1 className={styles.title}>
          {step === 1 ? 'Forgot Password?' : 'Reset Password'}
        </h1>
        <p className={styles.subtitle}>
          {step === 1 
            ? 'Enter your email to receive an OTP' 
            : 'Enter the OTP sent to your email'}
        </p>

        {/* STEP 1: Email & Captcha */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className={styles.form}>
            
            {/* Email Input */}
            <div className={styles.inputContainer}>
              <label className={styles.label}>Email Address</label>
              <input
                type="email"
                className={styles.input}
                placeholder="janedoe@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Captcha Section */}
            <div className={styles.captchaGroup}>
              <div className={styles.inputContainer}>
                <label className={styles.label}>Enter Captcha</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Captcha"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  required
                />
              </div>
              
              {/* Visual Captcha Display */}
              <div className={styles.captchaDisplay}>
                <span className={styles.captchaText}>{generatedCaptcha}</span>
                <button 
                  type="button" 
                  onClick={generateNewCaptcha}
                  className={styles.refreshButton}
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            {error && <p className={styles.errorMessage}>{error}</p>}

            <button 
              type="submit" 
              className={styles.submitButton} 
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className={styles.spinner} size={20} /> : 'Send OTP'}
            </button>
          </form>
        )}

        {/* STEP 2: OTP & New Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className={styles.form}>
            
            {/* OTP Input */}
            <div className={styles.inputContainer}>
              <label className={styles.label}>Enter OTP</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Ex: 1234"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>

            {/* New Password Input */}
            <div className={styles.inputContainer}>
              <label className={styles.label}>New Password</label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={styles.input}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className={styles.eyeButton}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && <p className={styles.errorMessage}>{error}</p>}

            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className={styles.spinner} size={20} /> : 'Submit'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default ForgotPasswordPage;