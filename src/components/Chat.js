import React, { useState } from 'react';
import './Chat.css';

function Chat({ onNewProject }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [currentProject, setCurrentProject] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      if (!currentProject) {
        // If this is the first message, create a new project
        const projectName = input.length > 20 ? input.substring(0, 20) + '...' : input;
        onNewProject(projectName);
        setCurrentProject(projectName);
      }
      
      setMessages([...messages, { text: input, sender: 'user' }]);
      setInput('');
      // Here you would typically make an API call to get the response
      setTimeout(() => {
        setMessages(prev => [...prev, { text: 'This is a response from Projection', sender: 'assistant' }]);
      }, 1000);
    }
  };

  return (
    <div className="chat-outer-container">
      <div className="chat-inner-container">
        <div className="messages">
          {messages.length === 0 ? (
            <div className="welcome-message">
              <div className="welcome-title">Where your home renovation projects become a reality.</div>
              <div className="welcome-subtitle">Start with an idea and leave with a plan.</div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className={`message ${message.sender}`}>
                {message.text}
              </div>
            ))
          )}
        </div>
        <form className="input-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={currentProject ? "What's your idea?" : "Tell us about your project"}
            className="chat-input"
          />
          <button type="submit" className="send-button" aria-label="Send">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="12" fill="#3a6b41"/>
              <path d="M8 12L16 12M16 12L13 9M16 12L13 15" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

export default Chat; 