import React, { useState, useEffect } from 'react';
import './Chat.css';
import config from '../config';

function Chat({ onNewProject, onUpdateProject }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [currentProject, setCurrentProject] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const analyzeTopic = async (text, isUpdate = false) => {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{
            role: "system",
            content: isUpdate 
              ? "You are a helpful assistant that extracts the main topic or project name from a conversation. Consider the entire context and respond with just the most relevant topic name, no additional text."
              : "You are a helpful assistant that extracts the main topic or project name from a user's message. Respond with just the topic name, no additional text."
          }, {
            role: "user",
            content: text
          }],
          temperature: 0.7,
          max_tokens: 50
        })
      });

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error analyzing topic:', error);
      return null;
    }
  };

  const updateProjectTopic = async () => {
    if (!currentProject) return;
    
    setIsLoading(true);
    try {
      // Combine all messages into a single context
      const conversationContext = messages
        .map(msg => `${msg.sender}: ${msg.text}`)
        .join('\n');
      
      const newTopic = await analyzeTopic(conversationContext, true);
      if (newTopic && newTopic !== currentProject.name) {
        onUpdateProject(currentProject.id, newTopic);
        setCurrentProject({ ...currentProject, name: newTopic });
      }
    } catch (error) {
      console.error('Error updating project topic:', error);
    }
    setIsLoading(false);
  };

  // Update project topic after every 3 messages
  useEffect(() => {
    if (messages.length > 0 && messages.length % 3 === 0) {
      updateProjectTopic();
    }
  }, [messages.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (input.trim()) {
      setIsLoading(true);
      
      if (!currentProject) {
        // Analyze the topic for the first message
        const topic = await analyzeTopic(input);
        if (topic) {
          const newProject = {
            id: Date.now(),
            name: topic
          };
          onNewProject(topic);
          setCurrentProject(newProject);
        }
      }
      
      setMessages([...messages, { text: input, sender: 'user' }]);
      setInput('');
      
      // Simulate AI response
      setTimeout(() => {
        setMessages(prev => [...prev, { text: 'This is a response from Projection', sender: 'assistant' }]);
        setIsLoading(false);
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
            placeholder={currentProject ? "Continue your conversation" : "Tell us about your project"}
            className="chat-input"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            className="send-button" 
            aria-label="Send"
            disabled={isLoading}
          >
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