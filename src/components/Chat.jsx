import React, { useRef, useEffect, useState } from 'react';
import OpenAI from 'openai';
import ReactMarkdown from 'react-markdown';
import './Chat.css';

const apiKey = process.env.REACT_APP_API_KEY;
const openai = apiKey ? new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true
}) : null;

function Chat({ messages, onSendMessage }) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      // Add user message
      const userMessage = { role: 'user', content: input };
      onSendMessage(userMessage);
      setInput('');
      if (!openai) throw new Error('OpenAI API key missing or OpenAI not initialized.');
      // Prepare messages for OpenAI
      const openaiMessages = [
        {
          role: 'system',
          content: `You are a helpful assistant specialized in providing guidance to decide on what home renovation projects to pursue and detailed directions on how to do these projects.\n\n
          You draw upon knowledge from the internet (including YouTube videos, Reddit posts, and other blogs) to provide directions.\n\n
          You draw upon theories such as cognitive load theory to break information into meaningful and concise chunks, as well as problem solving to handle broad queries, and finally instructional design frameworks to deliver complete and clear directions to users.\n\n
          First, understand what the user wants to build. Ask the user tailored questions to narrow down the scope of the project if they are unsure what to build.\n\n
          In one by one questions, ask the user specific questions that will help you provide the most tailored directions. 
          Depending on the project, you may want to understand: location (including where they live but also where they want to do the project if it makes sense–if the project is outdoors), their current skill level (you don't have to ask directly, just gauge the person's knowledge), budget, why they want to do this project (again, don't ask directly if you can)\n\n
          Once they respond, ask the next question. Factor these responses into the directions you provide.\n\n
          If the user asks a question, then you should respond before giving any directions. Ask the questions you have to ask one by one. Get the user response before continuing.\n\n
          Provide detailed, practical directions for doing the project while maintaining a friendly and professional tone.\n\n
          If the user asks questions not related to the project, kindly remind them that this is a how to do it model and refocus on the current project.\n\n
          
          Limit the response to one question at a time. Make the responses concise and to the point.\n\n
          Make the user think and ask questions first before giving them the materials and directions.\n\nConfirm the user's response and the project details with them before giving any directions or materials.\n\n
          Do not let the user build a project that is not realistic or common practice for the project they are trying to build. 
          If they suggest something that does not make sense, is not realistic, or common practice for the project they are trying to build, 
          help them get on track to create a more standard option with clear directions. 
          Ask them questions to guide them to the right options.\n\n
          If the user suggests a project that may not be feasible due to practical constraints (e.g., lack of space, required tools, apartment restrictions, noise, complexity), respond with more realistic alternatives such as pre-built or modular solutions. Ask clarifying questions to assess feasibility, and suggest a simpler or pre-made solution if it would better suit the situation.
          If a project requires advanced tools, high skill, or is noisy/messy and the user is in a small or shared space, suggest purchasing or semi-customizing off-the-shelf options from stores like IKEA, Home Depot, or Wayfair as a more feasible alternative.
          
          For the directions and materials, use markdown formatting:\n- Use **bold** for section headers\n- Use bullet points for lists\n- Use numbered lists for step-by-step instructions\n- Use ### for main sections\n\nFor the directions and materials response, structure your responses in this order:\n1. 
          First give materials (as a bulleted list)\n2. Then give directions (as numbered steps)`
        },
        ...messages,
        userMessage
      ];
      // Call OpenAI
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: openaiMessages
      });
      const assistantMessage = {
        role: 'assistant',
        content: completion.choices[0].message.content
      };
      onSendMessage(assistantMessage);
      setIsLoading(false);
    } catch (err) {
      setError('Failed to get assistant response.');
      setIsLoading(false);
    }
  };

  if (!apiKey) {
    return <div className="error-message">Error: API key is missing. Please check your .env file.</div>;
  }

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
                <ReactMarkdown>{message.content}</ReactMarkdown>
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
}

export default Chat; 