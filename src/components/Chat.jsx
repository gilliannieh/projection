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

function downloadPDF(planText, title) {
  const doc = new jsPDF();
  let y = 15;
  const lineHeight = 8;
  const maxWidth = 180;
  const pageHeight = 270;
  const margin = 10;

  // Split by lines for simple markdown parsing
  const lines = planText.split('\n');
  doc.setFont('helvetica');

  // Add title
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text(`${title} Plan`, margin, y);
  y += lineHeight * 2;
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');

  // Extract and format sections
  let currentSection = '';
  let sectionContent = [];
  let skipSection = true;

  const addNewPage = () => {
    doc.addPage();
    y = margin;
  };

  const processText = (text, x, y) => {
    // Split text by bold markers
    const parts = text.split(/(\*\*.*?\*\*)/g);
    let currentY = y;

    parts.forEach(part => {
      if (part.startsWith('**') && part.endsWith('**')) {
        // Bold text
        const boldText = part.slice(2, -2);
        doc.setFont(undefined, 'bold');
        const wrapped = doc.splitTextToSize(boldText, maxWidth);
        
        // Check if we need a new page
        if (currentY + (wrapped.length * lineHeight) > pageHeight) {
          addNewPage();
          currentY = margin;
        }
        
        doc.text(wrapped, x, currentY);
        currentY += wrapped.length * lineHeight;
      } else if (part.trim()) {
        // Regular text
        doc.setFont(undefined, 'normal');
        const wrapped = doc.splitTextToSize(part, maxWidth);
        
        // Check if we need a new page
        if (currentY + (wrapped.length * lineHeight) > pageHeight) {
          addNewPage();
          currentY = margin;
        }
        
        doc.text(wrapped, x, currentY);
        currentY += wrapped.length * lineHeight;
      }
    });

    return currentY;
  };

  lines.forEach((line, idx) => {
    const trimmedLine = line.trim();
    
    // Check for section headers
    if (trimmedLine.startsWith('###') || /^\*\*(.+)\*\*$/.test(trimmedLine)) {
      // Process previous section if it was materials, tools, directions, or steps
      if (!skipSection && sectionContent.length > 0) {
        // Check if we need a new page for the section header
        if (y + lineHeight * 3 > pageHeight) {
          addNewPage();
        }

        // Add section header
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        const wrapped = doc.splitTextToSize(currentSection, maxWidth);
        doc.text(wrapped, margin, y);
        y += lineHeight * wrapped.length + 2;
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');

        // Add section content
        sectionContent.forEach(content => {
          if (content.trim() === '') {
            y += lineHeight;
            if (y > pageHeight) {
              addNewPage();
            }
          } else if (/^\d+\./.test(content.trim())) {
            // Numbered list - keep number and content together
            y = processText(content, margin, y);
          } else if (/^[-*]\s/.test(content.trim())) {
            // Bulleted list
            const bulletContent = '• ' + content.replace(/^[-*]\s/, '');
            y = processText(bulletContent, margin, y);
          } else {
            // Regular text
            y = processText(content, margin, y);
          }
        });
        y += lineHeight;
      }

      // Start new section
      currentSection = trimmedLine.replace(/^###\s*|\*\*/g, '');
      sectionContent = [];
      
      // Determine if we should include this section
      const lowerSection = currentSection.toLowerCase();
      skipSection = !(
        lowerSection.includes('options') ||
        lowerSection.includes('materials') ||
        lowerSection.includes('tools') ||
        lowerSection.includes('directions') ||
        lowerSection.includes('instructions') ||
        lowerSection.includes('steps') || 
        lowerSection.includes('step') ||
        lowerSection.includes('safety')
      );
    } else if (!skipSection) {
      sectionContent.push(line);
    }
  });

  // Process the last section
  if (!skipSection && sectionContent.length > 0) {
    // Check if we need a new page for the section header
    if (y + lineHeight * 3 > pageHeight) {
      addNewPage();
    }

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    const wrapped = doc.splitTextToSize(currentSection, maxWidth);
    doc.text(wrapped, margin, y);
    y += lineHeight * wrapped.length + 2;
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');

    sectionContent.forEach(content => {
      if (content.trim() === '') {
        y += lineHeight;
        if (y > pageHeight) {
          addNewPage();
        }
      } else if (/^\d+\./.test(content.trim())) {
        // Numbered list - keep number and content together
        y = processText(content, margin, y);
      } else if (/^[-*]\s/.test(content.trim())) {
        // Bulleted list
        const bulletContent = '• ' + content.replace(/^[-*]\s/, '');
        y = processText(bulletContent, margin, y);
      } else {
        // Regular text
        y = processText(content, margin, y);
      }
    });
  }

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

// Save project to local storage
function saveProjectToHistory(project) {
  const history = JSON.parse(localStorage.getItem('projectHistory') || '[]');
  history.push(project);
  localStorage.setItem('projectHistory', JSON.stringify(history));
}

// Read project history
function getProjectHistory() {
  return JSON.parse(localStorage.getItem('projectHistory') || '[]');
}

function Chat({ messages, onSendMessage, convTitle }) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const hasProjectPlan = () => {
    // Check if there are any assistant messages
    const assistantMessages = messages.filter(msg => msg.role === 'assistant');
    if (assistantMessages.length === 0) return false;

    // Get the last assistant message
    const lastMessage = assistantMessages[assistantMessages.length - 1].content.toLowerCase();
    
    // Check if the message contains materials, tools, and steps
    const hasMaterials = lastMessage.includes('materials') || lastMessage.includes('tools');
    const hasSteps = lastMessage.includes('step') || lastMessage.includes('instructions');
    
    return hasMaterials && hasSteps;
  };

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
      // Get project history for personalization
      const projectHistory = getProjectHistory();
      const historySummary = projectHistory.length > 0
        ? projectHistory.map(p => p.title).join(', ')
        : '';
      // Prepare messages for OpenAI
      const openaiMessages = [
        {
          role: 'system',
          content: `You are a safety-conscious and practical home renovation assistant. Your job is to help users make smart, safe, and feasible decisions about their projects.

Known information from the conversation so far:
${knownInfoSummary || 'None yet.'}

User's project history: ${historySummary || 'No previous projects.'}

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

**Shopping List Links:**
- When providing shopping links, use search URLs for the store and product (e.g., "https://www.ikea.com/us/en/search/?query=desk" or "https://www.amazon.com/s?k=desk") instead of direct product links, unless you are certain the direct link is valid.

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

      // Check if this is a complete project plan and save to history
      const hasMaterials = assistantResponse.toLowerCase().includes('materials') || assistantResponse.toLowerCase().includes('tools');
      const hasSteps = assistantResponse.toLowerCase().includes('step') || assistantResponse.toLowerCase().includes('instructions');
      
      if (hasMaterials && hasSteps) {
        // Extract title from the first line or use a default
        const firstLine = assistantResponse.split('\n')[0].replace(/[#*]+/g, '').trim();
        const title = firstLine || (convTitle || 'Project');
        
        saveProjectToHistory({
          title: title,
          content: assistantResponse,
          timestamp: new Date().toISOString()
        });
        
        // Dispatch event to update history in Sidebar
        window.dispatchEvent(new Event('projectHistoryUpdate'));
      }

      setIsLoading(false);
    } catch (err) {
      setError('Failed to get assistant response.');
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    // Get the last assistant message that contains the project plan
    const assistantMessages = messages
      .filter(msg => msg.role === 'assistant')
      .map(msg => msg.content);
    
    const lastMessage = assistantMessages[assistantMessages.length - 1];
    
    if (lastMessage) {
      // Use convTitle if available, otherwise use "Project"
      console.log("Title: ",convTitle);
      const title = convTitle || "Project";
      downloadPDF(lastMessage, title);
    }
  };

  if (!apiKey) {
    return <div className="error-message">Error: API key is missing. Please check your .env file.</div>;
  }

  return (
    <div className="chat-outer-container">
      <div className="chat-inner-container">
        {hasProjectPlan() && (
          <div className="chat-header">
            <button 
              className="download-pdf-button"
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
                      m.content.toLowerCase().includes('shopping list') ||
                      m.content.toLowerCase().includes('here is your shopping list')
                    )
                );
                // Fallback: if nothing matches, use the last assistant message
                const pdfContent = relevantMessages.length > 0
                  ? relevantMessages.map(m => m.content).join('\n\n---\n\n')
                  : (messages.slice().reverse().find(m => m.role === 'assistant')?.content || 'No project plan available yet.');
                // Save project to history if there is content
                if (relevantMessages.length > 0) {
                  saveProjectToHistory({
                    title: relevantMessages[0].content.split('\n')[0].replace(/[#*]+/g, '').trim().slice(0, 50),
                    content: pdfContent,
                    timestamp: new Date().toISOString()
                  });
                }
                downloadPDF(pdfContent, convTitle || "Project");
              }}
              title="Download project plan as PDF"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15V3M12 15L8 11M12 15L16 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L2 21C2 21.5523 2.44772 22 3 22L21 22C21.5523 22 22 21.5523 22 21L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Download Project Plan
            </button>
          </div>
        )}
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
      </div>
    </div>
  );
}

export default Chat;