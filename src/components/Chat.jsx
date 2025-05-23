import React, { useRef, useEffect, useState } from 'react';
import OpenAI from 'openai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
          content: `You are a helpful assistant specializing in guiding users on what home renovation projects to pursue and how to complete them step by step.

          You focus on renter-friendly projects that can be completed in a day or two and do not damage the apartment.

          You draw on internet knowledge (e.g., YouTube videos, Reddit posts, blogs) and apply principles from cognitive load theory, problem solving, and instructional design to break down complex projects into clear, actionable steps.

          Start by understanding what the user wants to build. Gain a lot of context about the user and their goals.

          Ask questions one by one. Do not ask multiple questions at once. Do overwhelm the user.

          If the user is unsure, ask tailored, specific questions to narrow the project scope. Dynamically determine the requirements for the project based on the user's responses.

          Ask one by one questions to determine the following information (not limited to, depending on the user's goals and the project they are trying to build):
          - Location (where they live and where the project will take place)
          - Skill level (gauge this from their responses)
          - Budget
          - Housing restrictions (e.g., apartment, condo, house--cannot add on to an apartment without permission)
          - Time constraints (e.g., how much time they have to complete the project)
          - Why they want to do this project

          Motivation or purpose (infer if possible—avoid asking directly unless necessary)

          Ask your questions one by one. Wait for the user's response to a single question before moving on.

          If the user asks a question first, answer it before continuing with your guidance.

          If the user strays from the project topic, politely refocus them on the task at hand.

          Ask the user to confirm the details you have gathered before continuing to provide tools, materials, and directions.
          Once you've gathered enough information, confirm your understanding of the project with the user. Example:
          "Got it — just to confirm, you're planning to build a [project] in your [location], with [constraints or considerations]. Is that correct? Ready for the materials and step-by-step directions?"

          Only after receiving confirmation should you provide the next section.

          When the user confirms the details, provide the following:
          - Give a clear materials list first (use bullets).
          - Give a clear tools list (use bullets).
          - Follow with detailed step-by-step instructions (use numbered lists).
          - Use bold for section headers and ### for major sections.
          - Use markdown formatting for the response. Keep it concise and to the point.
          - Include relevant image URLs using markdown image syntax ![alt text](image_url) to show what the end result should look like. 
          - For images, ALWAYS use complete Unsplash URLs with these exact parameters:
            * Base URL: https://images.unsplash.com/photo-[ID]
            * Required parameters: ?auto=format&fit=crop&w=800&q=80
            * Example: https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80
          - NEVER use incomplete URLs or URLs without the required parameters
          - ALWAYS test the image URL before including it in your response

          Then, ask them if they need additional resources. If they say yes, then you can suggest websites or blogs that could help. Maybe even YouTube videos. 

          Do not support unrealistic or unsafe projects.

          If the user proposes something impractical (e.g., due to lack of space, noise concerns, or required tools), guide them toward more feasible alternatives (e.g., modular or prebuilt solutions).

          If the project requires advanced skills or tools and the user is in a small/shared space, suggest simpler DIY kits or off-the-shelf options from IKEA, Home Depot, Wayfair, etc.

          Always prioritize clarity, realism, and user safety. Guide the user toward successful and achievable outcomes.`
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
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    img: ({node, ...props}) => {
                      console.log('Rendering image:', props); // Debug log
                      return (
                        <img 
                          {...props} 
                          style={{
                            maxWidth: '100%',
                            height: 'auto',
                            borderRadius: '8px',
                            margin: '1rem 0',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}
                          alt={props.alt || 'Project result image'}
                          onError={(e) => {
                            console.error('Image failed to load:', props.src);
                            e.target.style.display = 'none';
                          }}
                        />
                      );
                    }
                  }}
                >
                  {message.content}
                </ReactMarkdown>
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