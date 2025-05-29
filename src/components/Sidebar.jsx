import React, { useState, useEffect } from 'react';
import './Sidebar.css';
import jsPDF from 'jspdf';

function Sidebar({ conversations, activeConversation, onSelectConversation, onNewChat, onDeleteConversation }) {
  const [history, setHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Helper to get the title for a conversation
  const getTitle = (conv) => {
    return conv.title ? conv.title : 'Project';
  };

  // Get project history from localStorage
  const getProjectHistory = () => {
    return JSON.parse(localStorage.getItem('projectHistory') || '[]');
  };

  // Update history when storage changes
  useEffect(() => {
    const updateHistory = () => {
      setHistory(getProjectHistory());
    };

    // Initial load
    updateHistory();

    // Listen for storage changes
    window.addEventListener('storage', updateHistory);
    window.addEventListener('projectHistoryUpdate', updateHistory);

    return () => {
      window.removeEventListener('storage', updateHistory);
      window.removeEventListener('projectHistoryUpdate', updateHistory);
    };
  }, []);

  // Function to delete a project
  const deleteProject = (idx) => {
    const updatedHistory = [...history];
    updatedHistory.splice(idx, 1);
    localStorage.setItem('projectHistory', JSON.stringify(updatedHistory));
    setHistory(updatedHistory);
    // Dispatch custom event for other components
    window.dispatchEvent(new Event('projectHistoryUpdate'));
  };

  // Function to view a project
  const viewProject = (project) => {
    alert(project.content);
  };

  // Function to download project as PDF
  const downloadPDF = (content, title) => {
    const doc = new jsPDF();
    let y = 15;
    const lineHeight = 8;
    const maxWidth = 180;
    const pageHeight = 270;
    const margin = 10;

    // Add title
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text(`${title} Plan`, margin, y);
    y += lineHeight * 2;
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');

    // Add content
    const lines = content.split('\n');
    lines.forEach(line => {
      if (y > pageHeight) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    });

    doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}-plan.pdf`);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <button className="new-chat-button" onClick={onNewChat}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          New Project
        </button>
      </div>
      <div className="project-list">
        {conversations.map((conv, idx) => (
          <div
            key={idx}
            className={`project-item${activeConversation === idx ? ' active' : ''}`}
            onClick={() => onSelectConversation(idx)}
            style={{ fontWeight: activeConversation === idx ? 'bold' : 'normal', background: activeConversation === idx ? '#ece8df' : undefined, position: 'relative' }}
          >
            {getTitle(conv)}
            <button
              className="erase-chat-btn"
              onClick={e => { e.stopPropagation(); onDeleteConversation(idx); }}
              title="Erase chat"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
      <button className="history-button" onClick={() => setShowHistoryModal(true)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
        </svg>
        Project History
      </button>

      {showHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Project History</h3>
              <button className="close-button" onClick={() => setShowHistoryModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {history.length > 0 ? (
                <div className="history-list">
                  {history.map((proj, idx) => (
                    <div key={proj.timestamp} className="history-item">
                      <div className="history-item-header">
                        <span className="history-item-title">{proj.title}</span>
                        <span className="history-item-date">
                          {new Date(proj.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="history-item-actions">
                        <button onClick={() => viewProject(proj)} className="history-btn view-btn">View</button>
                        <button onClick={() => downloadPDF(proj.content, proj.title)} className="history-btn download-btn">PDF</button>
                        <button onClick={() => deleteProject(idx)} className="history-btn delete-btn">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="history-empty">
                  No saved projects yet. Your project plans will appear here.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sidebar; 