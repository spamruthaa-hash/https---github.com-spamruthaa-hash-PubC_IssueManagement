import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Issues from './pages/Issues';
import IssueSchedule from './pages/IssueSchedule';
import IssueDetails from './pages/IssueDetails';
import MyTasks from './pages/MyTasks';
import { clearStoredJournalSchedules } from './hooks/useJournalSchedules';
import { clearStoredIssues } from './hooks/useIssues';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    // Per product requirement: created issues and uploaded schedules persist across
    // reloads but are wiped when the user signs out so the next session starts fresh.
    clearStoredIssues();
    clearStoredJournalSchedules();
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
          path="/tasks"
          element={
            isAuthenticated ? (
              <MyTasks onLogout={handleLogout} />
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
          path="/issues/schedule"
          element={
            isAuthenticated ? (
              <IssueSchedule onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/issues/:issueId"
          element={
            isAuthenticated ? (
              <IssueDetails onLogout={handleLogout} />
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
