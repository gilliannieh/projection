import './App.css';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import config from './config';
import { useState } from 'react';

function App() {
  const [projects, setProjects] = useState([
    { id: 1, name: 'Gazebo' },
    { id: 2, name: 'Garden shed' },
    { id: 3, name: 'Beach watercolor' },
  ]);

  const addNewProject = (projectName) => {
    // Generate a unique ID based on timestamp
    const newId = Date.now();
    const newProject = {
      id: newId,
      name: projectName
    };
    setProjects(prevProjects => [...prevProjects, newProject]);
  };

  const updateProject = (projectId, newName) => {
    setProjects(prevProjects => 
      prevProjects.map(project => 
        project.id === projectId ? { ...project, name: newName } : project
      )
    );
  };

  const handleNewChat = () => {
    // Generate a new project with a default name
    const newId = Date.now();
    const newProject = {
      id: newId,
      name: 'New Chat'
    };
    setProjects(prevProjects => [...prevProjects, newProject]);
  };

  // You can use config.apiKey here or in any API calls
  console.log('API Key loaded:', config.apiKey ? 'Yes' : 'No');

  return (
    <div className="App">
      <Sidebar projects={projects} onNewChat={handleNewChat} />
      <Chat onNewProject={addNewProject} onUpdateProject={updateProject} />
    </div>
  );
}

export default App;
