import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Issues from './pages/Issues';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    // Reset any issue-related state here when implemented
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login onLogin={handleLogin} />
            )
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            isAuthenticated ? (
              <Dashboard onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/issues" 
          element={
            isAuthenticated ? (
              <Issues onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
