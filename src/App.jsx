import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setExpenseTypes, setPaymentModes, clearMasterData } from './store/masterDataSlice';
import { logout } from './store/authSlice';

import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import LoginPage from './components/Login/LoginPage';
import ForgotPasswordPage from './components/Login/ForgotPasswordPage';
import HomePage from './components/Home/HomePage'; 
import ExpenseList from './components/ExpenseList/ExpenseList'; 
import AdminDashboard from './components/Admin/AdminDashboard'; 
import styles from './App.module.css';

function App() {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { lastFetched } = useSelector((state) => state.masterData);
  const dispatch = useDispatch();

  const [authView, setAuthView] = useState('home'); 
  const [totalExpenses, setTotalExpenses] = useState(0);

  // --- MASTER DATA FETCHING LOGIC ---
  useEffect(() => {
    const fetchMasterData = async () => {
      const TWO_HOURS = 2 * 60 * 60 * 1000;
      const now = Date.now();
      const isStale = !lastFetched || (now - lastFetched > TWO_HOURS);

      if (isAuthenticated && user?.EmployeeID && isStale) {
        try {
          const typesRes = await fetch(`http://127.0.0.1:8000/expense-type/by-user/${user.EmployeeID}`);
          if (typesRes.ok) {
            const typesData = await typesRes.json();
            dispatch(setExpenseTypes(typesData));
          }

          const modesRes = await fetch(`http://127.0.0.1:8000/payment-mode/by-user/${user.EmployeeID}`);
          if (modesRes.ok) {
             const modesData = await modesRes.json();
             dispatch(setPaymentModes(modesData));
          }
        } catch (e) {
          console.error("Error fetching master data:", e);
        }
      }
    };
    fetchMasterData();
  }, [isAuthenticated, lastFetched, dispatch, user]);

  const handleLogout = () => {
    dispatch(logout());
    dispatch(clearMasterData());
    setAuthView('home');
    setTotalExpenses(0);
  };

  const navigateToLogin = () => setAuthView('login');
  const navigateToForgot = () => setAuthView('forgot');
  const navigateToHome = () => setAuthView('home');

  if (isAuthenticated) {
    const isAdmin = user?.Role === 'Admin' || user?.role === 'admin' || user?.isAdmin === true;
    return (
      <div className={styles.app}>
        <Header totalExpenses={totalExpenses} user={user} onLogout={handleLogout} />
        <main className={styles.main}>
          {isAdmin ? <AdminDashboard onTotalChange={setTotalExpenses} /> : <ExpenseList user={user} onTotalChange={setTotalExpenses} />}
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <>
      {authView === 'home' && (
        <HomePage onNavigateLogin={navigateToLogin} />
      )}
      
      {authView === 'login' && (
        <LoginPage 
            onForgotPassword={navigateToForgot} 
            onNavigateHome={navigateToHome} // --- ADDED PROP HERE ---
        />
      )}
      
      {authView === 'forgot' && (
        <ForgotPasswordPage onNavigateLogin={navigateToLogin} />
      )}
    </>
  );
}

export default App;