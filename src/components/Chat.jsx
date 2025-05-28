import React, { useRef, useEffect, useState } from 'react';
import OpenAI from 'openai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './Chat.css';
import jsPDF from 'jspdf';

const apiKey = process.env.REACT_APP_API_KEY;
const openai = apiKey ? new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true
}) : null;

function downloadPDF(planText) {
  const doc = new jsPDF();
  let y = 15;
  const lineHeight = 8;
  const maxWidth = 180;

  // Split by lines for simple markdown parsing
  const lines = planText.split('\n');
  doc.setFont('helvetica');

  lines.forEach((line, idx) => {
    // Section headers (### or **Header**)
    if (line.trim().startsWith('###')) {
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      const wrapped = doc.splitTextToSize(line.replace(/^###\s*/, ''), maxWidth);
      doc.text(wrapped, 10, y);
      y += lineHeight * wrapped.length + 2;
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
    } else if (/^\*\*(.+)\*\*$/.test(line.trim())) {
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      const wrapped = doc.splitTextToSize(line.replace(/^\*\*|\*\*$/g, ''), maxWidth);
      doc.text(wrapped, 10, y);
      y += lineHeight * wrapped.length;
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
    } else if (/^\d+\./.test(line.trim())) {
      // Numbered list
      const wrapped = doc.splitTextToSize(line, maxWidth);
      doc.text(wrapped, 15, y);
      y += lineHeight * wrapped.length;
    } else if (/^[-*]\s/.test(line.trim())) {
      // Bulleted list
      const wrapped = doc.splitTextToSize('• ' + line.replace(/^[-*]\s/, ''), maxWidth);
      doc.text(wrapped, 15, y);
      y += lineHeight * wrapped.length;
    } else if (line.trim() === '---') {
      // Section divider
      y += 4;
      doc.setDrawColor(150);
      doc.line(10, y, 200, y);
      y += 6;
    } else if (line.trim() === '') {
      y += 2;
    } else {
      // Regular text
      const wrapped = doc.splitTextToSize(line, maxWidth);
      doc.text(wrapped, 10, y);
      y += lineHeight * wrapped.length;
    }
    // Add new page if needed
    if (y > 270 && idx < lines.length - 1) {
      doc.addPage();
      y = 15;
    }
  });

  doc.save('project-plan.pdf');
}

// Add a function to extract known info from user messages
function extractKnownInfo(messages) {
  const info = {
    livingSituation: null,
    physicalLimitations: null,
    tools: null,
    noiseRestrictions: null,
    experience: null,
    goals: null,
  };

  messages.forEach(msg => {
    if (msg.role === 'user') {
      const text = msg.content.toLowerCase();
      if (text.includes('apartment') || text.includes('rental') || text.includes('owned')) {
        info.livingSituation = msg.content;
      }
      if (text.includes('no physical limitations') || text.includes('i am') || text.includes('injury') || text.includes('old')) {
        info.physicalLimitations = msg.content;
      }
      if (text.includes('tools') || text.includes('have a drill') || text.includes('saw')) {
        info.tools = msg.content;
      }
      if (text.includes('noise')) {
        info.noiseRestrictions = msg.content;
      }
      if (text.includes('diy') || text.includes('experience')) {
        info.experience = msg.content;
      }
      if (text.includes('goal') || text.includes('want to') || text.includes('my project is')) {
        info.goals = msg.content;
      }
    }
  });

  let summary = '';
  if (info.livingSituation) summary += `Living situation: ${info.livingSituation}\n`;
  if (info.physicalLimitations) summary += `Physical limitations: ${info.physicalLimitations}\n`;
  if (info.tools) summary += `Tools: ${info.tools}\n`;
  if (info.noiseRestrictions) summary += `Noise restrictions: ${info.noiseRestrictions}\n`;
  if (info.experience) summary += `Experience: ${info.experience}\n`;
  if (info.goals) summary += `Goals: ${info.goals}\n`;

  return summary.trim();
}

function Chat({ messages, onSendMessage, convTitle }) {
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
      // Extract known info from conversation
      const knownInfoSummary = extractKnownInfo([...messages, userMessage]);
      // Prepare messages for OpenAI
      const openaiMessages = [
        {
          role: 'system',
          content: `You are a safety-conscious and practical home renovation assistant. Your job is to help users make smart, safe, and feasible decisions about their projects.

Known information from the conversation so far:
${knownInfoSummary || 'None yet.'}

**Conversational Guidelines:**
- Ask only one clarifying question at a time.
- Wait for the user's answer before asking the next question.
- If the user says "I'm not sure" or gives a vague answer, ask a follow-up question to help them clarify (e.g., "Can you tell me more about your living space?" or "What are your main goals for this project?").
- Keep narrowing down the idea until you have enough information to make a safe, practical recommendation.
- If the user continues to be unsure, gently suggest options or examples to help them decide.
- Only after you have gathered enough details, summarize your understanding and ask for confirmation before generating a project plan.

**Safety and Feasibility:**
- Always assess project feasibility and user safety.
- If a project is unsafe or impractical, explain why and suggest safer alternatives.
- Consider the user's living situation (apartment, rental, owned home), physical capabilities and age, available space and tools, noise restrictions, building codes, and potential property damage.

**Strict Safety and Feasibility Policy:**
- If the user proposes a project that is likely to be impractical, unsafe, or disruptive (such as building large furniture from scratch in an apartment, or any project that could cause noise, damage, or require specialized tools), you must:
  - Clearly explain why this is not recommended.
  - Strongly discourage proceeding with the original idea.
  - Offer safer, more practical alternatives (such as buying a flat-pack desk, using a makerspace, or hiring a professional).
  - Only proceed with planning if the user insists and confirms they understand the risks and limitations.
- Never encourage or support projects that could violate building codes, rental agreements, or pose safety risks.

**When ready to generate a plan:**
- Confirm the details with the user.
- Provide a clear, step-by-step project plan with materials, tools, and instructions.
- Break down into clear, manageable steps
- Highlight safety precautions
- Suggest appropriate tools and materials
- Provide alternative approaches for different skill levels
- Include relevant safety warnings and precautions
- Always prioritize user safety, property protection, legal compliance, practical feasibility, and cost-effectiveness.

**Examples of good responses:**
- "Building a desk from scratch in an apartment might be challenging due to space constraints and noise. Instead, I'd recommend:
   a) Purchasing a flat-pack desk from IKEA or similar
   b) Visiting a local makerspace or woodshop
   c) Hiring a carpenter for custom work
  Which option interests you most?"

- "As an 80-year-old, building a gazebo might be physically demanding. Instead, consider:
   a) Hiring a contractor
   b) Purchasing a pre-assembled gazebo
   c) Enlisting help from family or community services
  Would you like to explore any of these options?"

- "Storing plates in a hole in the backyard isn't recommended due to moisture and pest issues. Instead, consider:
   a) Installing proper kitchen cabinets
   b) Using a storage unit
   c) Donating unused items
  What would work best for your situation?"

**When the user confirms the details, provide the following:**
- Give a clear materials list first (use bullets)
- Give a clear tools list (use bullets)
- Follow with detailed step-by-step instructions (use numbered lists)
- Use bold for section headers and ### for major sections
- Use markdown formatting for the response

Then, ask them if they need additional resources. If they say yes, then you can suggest websites or blogs that could help. Maybe even YouTube videos. Also ask them if they want a shopping list. If they do, then you can suggest a shopping list with links to the items after asking their preferred store.`
        },
        ...messages,
        userMessage
      ];
      // Call OpenAI
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: openaiMessages
      });

      const assistantResponse = completion.choices[0].message.content;

      // Send message
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
        <button
          onClick={() => {
            // Gather all assistant messages that are part of the project plan or shopping list
            const relevantMessages = messages.filter(
              m =>
                m.role === 'assistant' &&
                (
                  m.content.toLowerCase().includes('materials') ||
                  m.content.toLowerCase().includes('tools') ||
                  m.content.toLowerCase().includes('step-by-step') ||
                  m.content.toLowerCase().includes('project plan') ||
                  m.content.toLowerCase().includes('shopping list')
                )
            );
            // Fallback: if nothing matches, use the last assistant message
            const pdfContent = relevantMessages.length > 0
              ? relevantMessages.map(m => m.content).join('\n\n---\n\n')
              : (messages.slice().reverse().find(m => m.role === 'assistant')?.content || 'No project plan available yet.');
            downloadPDF(pdfContent);
          }}
        >
          Download Project Plan as PDF
        </button>
      </div>
    </div>
  );
}

export default Chat;