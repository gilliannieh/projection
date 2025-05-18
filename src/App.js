import './App.css';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import { useState } from 'react';
import OpenAI from 'openai';

const apiKey = process.env.REACT_APP_API_KEY;
const openai = apiKey ? new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true
}) : null;

const initialConversation = () => ({
  messages: [],
  timestamp: new Date().toISOString(),
  title: undefined
});

function App() {
  const [conversations, setConversations] = useState([initialConversation()]);
  const [activeConversation, setActiveConversation] = useState(0);

  const handleNewChat = () => {
    setConversations(prev => [initialConversation(), ...prev]);
    setActiveConversation(0);
  };

  const handleSelectConversation = (index) => {
    setActiveConversation(index);
  };

  // Add a message (user or assistant) to the active conversation
  const handleAddMessage = async (msg) => {
    setConversations(prev => {
      const updated = [...prev];
      updated[activeConversation] = {
        ...updated[activeConversation],
        messages: [...updated[activeConversation].messages, msg]
      };
      return updated;
    });

    // If this is the first assistant response, generate a title
    if (msg.role === 'assistant') {
      const conv = conversations[activeConversation];
      if (!conv.title) {
        try {
          if (!openai) return;
          const userMsg = conv.messages.find(m => m.role === 'user');
          if (!userMsg) return;
          const titlePrompt = `Summarize the following home renovation conversation in 3 words or less for a sidebar title. Be specific (e.g., 'Gazebo Renovation', 'Kitchen Remodel', 'Bathroom Tile').\n\nConversation:\n${userMsg.content}`;
          const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: 'You are a helpful assistant that creates short, specific sidebar titles for home renovation conversations.' },
              { role: 'user', content: titlePrompt }
            ],
            max_tokens: 12,
            temperature: 0.5
          });
          const aiTitle = completion.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
          setConversations(prev => {
            const updated = [...prev];
            updated[activeConversation] = {
              ...updated[activeConversation],
              title: aiTitle
            };
            return updated;
          });
        } catch (err) {
          // Fallback: do nothing if title generation fails
        }
      }
    }
  };

  // Delete a conversation and update activeConversation if needed
  const handleDeleteConversation = (idx) => {
    setConversations(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      if (updated.length === 0) {
        setActiveConversation(0);
      } else if (idx === activeConversation) {
        setActiveConversation(0);
      } else if (idx < activeConversation) {
        setActiveConversation(activeConversation - 1);
      }
      return updated;
    });
  };

  return (
    <div className="App">
      <Sidebar
        conversations={conversations}
        activeConversation={activeConversation}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
      />
      <Chat
        messages={conversations[activeConversation]?.messages || []}
        onSendMessage={handleAddMessage}
      />
    </div>
  );
}

export default App;
