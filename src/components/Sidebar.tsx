import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar.css';
import dashboardIcon from '../assets/icons/dashboard.svg';
import tasksIcon from '../assets/icons/tasks.svg';
import conversationsIcon from '../assets/icons/conversations.svg';
import analyticsIcon from '../assets/icons/analytics.svg';
import issuesIcon from '../assets/icons/issues.svg';
import articlesIcon from '../assets/icons/articles.svg';

interface SidebarProps {
  isCollapsed: boolean;
}

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  hasNotification?: boolean;
  path?: string;
}

const Sidebar = ({ isCollapsed }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeItem, setActiveItem] = useState('dashboard');

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: dashboardIcon, path: '/dashboard' },
    { id: 'my-tasks', label: 'My Tasks', icon: tasksIcon, path: '/tasks' },
    { id: 'conversations', label: 'Conversations', icon: conversationsIcon },
    { id: 'insight', label: 'Insight', icon: analyticsIcon, hasNotification: true },
    { id: 'issues', label: 'Issues', icon: issuesIcon, path: '/issues' },
    { id: 'articles', label: 'Articles', icon: articlesIcon },
  ];

  // Update active item based on current route
  useEffect(() => {
    const currentPath = location.pathname;
    const currentItem = menuItems.find(item =>
      item.path === currentPath ||
      (item.path !== '/' && item.path !== undefined && currentPath.startsWith(`${item.path}/`))
    );
    if (currentItem) {
      setActiveItem(currentItem.id);
    }
  }, [location.pathname]);

  const handleItemClick = (item: MenuItem) => {
    if (item.path) {
      navigate(item.path);
    }
    setActiveItem(item.id);
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}>
      <div className="sidebar-content">
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeItem === item.id ? 'nav-item-active' : ''}`}
              onClick={() => handleItemClick(item)}
              title={isCollapsed ? item.label : undefined}
            >
              <img src={item.icon} alt="" className="nav-icon" />
              {!isCollapsed && (
                <span className="nav-label">
                  {item.label}
                  {item.hasNotification && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="notification-icon">
                      <mask id="mask0_307_83474" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="0" y="0" width="16" height="16">
                        <rect width="16" height="16" fill="#D9D9D9"/>
                      </mask>
                      <g mask="url(#mask0_307_83474)">
                        <path d="M12.6666 5.99971L11.8333 4.16638L9.99996 3.33305L11.8333 2.49972L12.6666 0.666382L13.5 2.49972L15.3333 3.33305L13.5 4.16638L12.6666 5.99971ZM12.6666 15.333L11.8333 13.4997L9.99996 12.6664L11.8333 11.833L12.6666 9.99971L13.5 11.833L15.3333 12.6664L13.5 13.4997L12.6666 15.333ZM5.99996 13.333L4.33329 9.66638L0.666626 7.99971L4.33329 6.33305L5.99996 2.66638L7.66663 6.33305L11.3333 7.99971L7.66663 9.66638L5.99996 13.333ZM5.99996 10.0997L6.66663 8.66638L8.09996 7.99971L6.66663 7.33305L5.99996 5.89971L5.33329 7.33305L3.89996 7.99971L5.33329 8.66638L5.99996 10.0997Z" fill="url(#paint0_linear_307_83474)"/>
                        <path d="M5.99996 10.0997L6.66663 8.66638L8.09996 7.99971L6.66663 7.33305L5.99996 5.89971L5.33329 7.33305L3.89996 7.99971L5.33329 8.66638L5.99996 10.0997Z" fill="url(#paint1_linear_307_83474)"/>
                      </g>
                      <defs>
                        <linearGradient id="paint0_linear_307_83474" x1="0.666626" y1="0.666382" x2="18.2414" y2="9.63312" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#5D7DF6"/>
                          <stop offset="0.5001" stopColor="#1C40CA"/>
                          <stop offset="1" stopColor="#2C52DE"/>
                        </linearGradient>
                        <linearGradient id="paint1_linear_307_83474" x1="0.666626" y1="0.666382" x2="18.2414" y2="9.63312" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#5D7DF6"/>
                          <stop offset="0.5001" stopColor="#1C40CA"/>
                          <stop offset="1" stopColor="#2C52DE"/>
                        </linearGradient>
                      </defs>
                    </svg>
                  )}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
