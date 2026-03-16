import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AddCustomer from './pages/AddCustomer';
import Layout from './components/Layout';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem('auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login onLogin={() => setIsAuthenticated(true)} />} />
        
        {isAuthenticated ? (
          <Route element={<Layout onLogout={() => setIsAuthenticated(false)} />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/add" element={<AddCustomer />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </Router>
  );
}

