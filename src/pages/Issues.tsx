import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import CreateIssueModal, { IssueFormData } from '../components/CreateIssueModal';
import './Issues.css';

interface IssuesProps {
  onLogout: () => void;
}

const Issues = ({ onLogout }: IssuesProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const handleMenuClick = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleCreateIssue = () => {
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
  };

  const handleSubmitIssue = (issueData: IssueFormData) => {
    console.log('Issue created:', issueData);
    // TODO: Implement issue creation logic
  };

  return (
    <div className="dashboard-container">
      <Header onMenuClick={handleMenuClick} onLogout={handleLogout} />
      
      <div className="dashboard-layout">
        <Sidebar isCollapsed={sidebarCollapsed} />
        
        <main className="dashboard-main">
          <div className="issues-container">
            {/* Page Header */}
            <div className="issues-header">
              <h1 className="issues-title">Issues</h1>
              <div 
                className="upload-schedule-button-wrapper"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <button className="upload-schedule-button" disabled>
                  <span className="upload-schedule-text">Upload Schedule</span>
                  <span className="upcoming-badge">Upcoming</span>
                </button>
                
                {/* Tooltip */}
                {showTooltip && (
                  <div className="schedule-tooltip">
                    <div className="tooltip-arrow"></div>
                    <div className="tooltip-content">
                      <p className="tooltip-main">See all your issue details and timelines in one place.</p>
                      <p className="tooltip-sub">Upload your schedule to manage deadlines across all journals and get notified when action is needed.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Empty State */}
            <div className="issues-empty-state">
              <div className="empty-state-content">
                <img 
                  src="/assets/issue-empty-state.png" 
                  alt="Empty issues" 
                  className="empty-state-image"
                />
                <div className="empty-state-text">
                  <h2 className="empty-state-title">Get Publish-Ready in clicks</h2>
                  <p className="empty-state-description">
                    Compile articles and get your issue published in few clicks.
                  </p>
                </div>
                <button className="create-issue-button" onClick={handleCreateIssue}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="white"/>
                  </svg>
                  <span>Create Issue</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Create Issue Modal */}
      <CreateIssueModal 
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        onSubmit={handleSubmitIssue}
      />
    </div>
  );
};

export default Issues;
