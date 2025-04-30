import React from 'react';
import './Sidebar.css';

function Sidebar({ projects }) {
  return (
    <div className="sidebar">
      <div className="sidebar-title">Projection</div>
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