import React from 'react';
import './Sidebar.css';

function Sidebar({ conversations, activeConversation, onSelectConversation, onNewChat, onDeleteConversation }) {
  // Helper to get the title for a conversation
  const getTitle = (conv) => {
    return conv.title ? conv.title : 'Project';
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
    </div>
  );
}

export default Sidebar; 