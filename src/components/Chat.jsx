import React, { useState, useRef, useEffect } from 'react';
import OpenAI from 'openai';
import './Chat.css';

// Initialize OpenAI client once outside the component
const apiKey = process.env.REACT_APP_API_KEY;
console.log('API Key loaded:', apiKey ? 'Yes' : 'No');

if (!apiKey) {
  console.error('Error: API key is missing. Please check your .env file.');
}

const openai = new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true
});

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!apiKey) {
    return (
      <div className="error-message">
        Error: API key is missing. Please check your .env file.
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      console.log('Sending request to OpenAI...');
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant specialized in beginner home renovation projects. ' + 
            'You draw upon knowledge from the internet (including YouTube videos, Reddit posts, and other blogs) to provide directions.' +
            'You draw upon theories such as cognitive load theory to break information into meaningful and concise chunks, as well as problem solving to handle broad queries, and finally instructional design frameworks to deliver complete and clear directions to users.' +
            'Provide detailed, practical directions for doing the project while maintaining a friendly and professional tone.' +
            'If the user asks a question, then you should respond before giving any directions. Ask the questions you have to ask one by one. Get the user response before continuing.' +
            'First ask the user one by one to determine the purpose of the project, location (including where they live but also where they want to do the project if it makes sense–if the project is outdoors), skills/level of the user,and budget. Once they respond, ask the next question. Then factor these into the directions you provide.',
          },
          ...messages.map((msg) => ({ role: msg.role, content: msg.content })),
          userMessage,
        ],
      });

      console.log('OpenAI response:', completion);

      const assistantMessage = {
        role: 'assistant',
        content: completion.choices[0].message.content,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Detailed error:', err);
      setError(`Error: ${err.message || 'Failed to process request'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-outer-container">
      <div className="chat-inner-container">
        <div className="messages">
          {messages.length === 0 ? (
            <div className="welcome-message">
              <h1 className="welcome-title">Welcome to Your Home Renovation Assistant</h1>
              <p className="welcome-subtitle">
                Ask me anything about home renovation, interior design, or project planning.
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`message ${message.role} ${isLoading && index === messages.length - 1 ? 'loading' : ''}`}
              >
                {message.content}
              </div>
            ))
          )}
          {isLoading && (
            <div className="message assistant loading">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          {error && <div className="error-message">{error}</div>}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSubmit} className="input-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your home renovation project..."
            className="chat-input"
          />
          <button type="submit" className="send-button">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22 2L11 13"
                stroke="#3a6b41"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M22 2L15 22L11 13L2 9L22 2Z"
                stroke="#3a6b41"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat; 