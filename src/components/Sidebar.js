import React from 'react';
import './Sidebar.css';

function Sidebar({ projects, onNewChat }) {
  return (
    <div className="sidebar">
      <div className="sidebar-title">Projection</div>
      <button className="new-chat-button" onClick={onNewChat}>
        + New Project
      </button>
      <div className="sidebar-label">YOUR PROJECTS</div>
      <div className="project-list">
        {projects.map(project => (
          <div key={project.id} className="project-item">
            {project.name}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Sidebar; 