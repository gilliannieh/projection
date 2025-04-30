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
    const newProject = {
      id: projects.length + 1,
      name: projectName
    };
    setProjects([...projects, newProject]);
  };

  // You can use config.apiKey here or in any API calls
  console.log('API Key loaded:', config.apiKey ? 'Yes' : 'No');

  return (
    <div className="App">
      <Sidebar projects={projects} />
      <Chat onNewProject={addNewProject} />
    </div>
  );
}

export default App;
