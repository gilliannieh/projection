import React, { useRef, useEffect, useState } from 'react';
import OpenAI from 'openai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getImageUrl } from '../services/unsplash';
import './Chat.css';

const apiKey = process.env.REACT_APP_API_KEY;
const openai = apiKey ? new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true
}) : null;

// Create a proper React component for image rendering
const ImageComponent = ({ alt }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchImage = async () => {
      setIsLoading(true);
      setError(null);
      const url = await getImageUrl(alt || 'home renovation');
      if (url) setImageUrl(url);
      else setError('No image found');
      setIsLoading(false);
    };
    fetchImage();
  }, [alt]);

  if (isLoading) return <p style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '8px' }}>Loading image...</p>;
  if (error) return <p style={{ background: '#fff5f5', color: 'red', padding: '1rem', borderRadius: '8px' }}>{error}</p>;

  return (
    <img
      src={imageUrl}
      alt={alt || 'Project image'}
      style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', margin: '2 rem 0', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
    />
  );
};

function Chat({ messages, onSendMessage, convTitle }) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [projectContext, setProjectContext] = useState({
    location: null,   // e.g., "apartment", "backyard", "balcony"
    type: null,       // e.g., "planter", "bookshelf"
  });
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

          Start by understanding what the user wants to build one by one. Gain a lot of context by asking one by one questions about the user and their goals.

          Ask one by one questions to determine requirements and restrcitions for the project depending on the user's goals and the project they are trying to build.

          If the user is unsure, ask the user guided questions one by one. Dynamically determine the requirements for the project based on the user's responses.

          Be comprehensive. Get as much information as possible about the user and their goals.

          Ask your questions one by one. Wait for the user's response to a single question before moving on.

          If the user asks a question first, answer it before continuing with your guidance.

          If the user strays from the project topic, politely refocus them on the task at hand.

          Ask the user to confirm the details you have gathered before continuing to provide tools, materials, and directions.
          Once you've gathered enough information, confirm your understanding of the project with the user. Example:
          "Got it — just to confirm, you're planning to build a [project] in your [location], with [constraints or considerations]. Is that correct? Ready for the materials and step-by-step directions?"

          Only after asking for confirmation of the details should you provide the next section. 

          When the user confirms the details, provide the following:
          - Give a clear materials list first (use bullets).
          - Give a clear tools list (use bullets).
          - Follow with detailed step-by-step instructions (use numbered lists).
          - Use bold for section headers and ### for major sections.
          - Use markdown formatting for the response. Keep it concise and to the point.
          - Include relevant images using markdown image syntax ![alt text](image_url) to show what the end result should look like.
          - For images, use descriptive alt text that will help find relevant images (e.g., "modern kitchen renovation with white cabinets" or "small apartment balcony garden with herbs")
          - The system will automatically fetch appropriate images from Unsplash based on the alt text.

          Always include a placeholder like: {{unsplash:<search_term>}} in markdown format when providing the directions and materials.
          The system will replace this placeholder with a real Unsplash image during rendering.

          Then, ask them if they need additional resources. If they say yes, then you can suggest websites or blogs that could help. Maybe even YouTube videos. 
          Also ask them if they want a shopping list. If they do, then you can suggest a shopping list with links to the items after asking their preferred store.

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

    let assistantResponse = completion.choices[0].message.content;

    // 1: Extract context from response
    const extractProjectContext = (content) => {
      const locationMatch = content.match(/(?:apartment|backyard|balcony|living room|bedroom|kitchen|deck|patio|garden|home|office)/i);
      const typeMatch = content.match(/(?:build|make|create|design|plan) (?:a|an)?\s?([a-zA-Z\s]+)/i);

      return {
        location: locationMatch?.[0]?.toLowerCase() || null,
        type: typeMatch?.[1]?.toLowerCase().trim() || null,
      };
    };

    const context = extractProjectContext(assistantResponse);
    setProjectContext(prev => ({ ...prev, ...context }));

    // 2: Build a smarter search term
    const searchTerm = `${context.type || convTitle || 'home renovation'} in a ${context.location || 'small space'}`;

    // 3: Fetch from Unsplash
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchTerm)}&client_id=${process.env.REACT_APP_UNSPLASH_API_KEY}`
    );
    const data = await response.json();
    const imageUrl = data.results[0]?.urls?.regular;

    // 4: Replace placeholder
    assistantResponse = assistantResponse.replace(
      /\{\{unsplash:(.+?)\}\}/i,
      `![${searchTerm}](${imageUrl})`
    );

    // 5: Send message
    const assistantMessage = {
      role: 'assistant',
      content: assistantResponse
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
              <p className="welcome-subtitle">Ask me anything about home renovation, interior design, or project planning.</p>
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
                    img: ({ alt }) => <ImageComponent alt={alt} />,
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#3a6b41', textDecoration: 'underline' }}
                      >
                        {children}
                      </a>
                    )
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
                <span></span><span></span><span></span>
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 2L11 13" stroke="#3a6b41" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#3a6b41" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

export default Chat;