import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import './Dashboard.css';

interface DashboardProps {
  onLogout: () => void;
}

const Dashboard = ({ onLogout }: DashboardProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const handleMenuClick = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="dashboard-container">
      <Header onMenuClick={handleMenuClick} onLogout={handleLogout} />
      
      <div className="dashboard-layout">
        <Sidebar isCollapsed={sidebarCollapsed} />
        
        <main className="dashboard-main">
          <div className="dashboard-content">
            <h2>Welcome to Publisher Central</h2>
            <p>Left navigation panel is now functional with collapse/expand capability.</p>
            <p className="status-text">
              Sidebar status: {sidebarCollapsed ? 'Collapsed (icons only)' : 'Expanded (icons + labels)'}
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
