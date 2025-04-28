import './App.css';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import config from './config';

function App() {
  // You can use config.apiKey here or in any API calls
  console.log('API Key loaded:', config.apiKey ? 'Yes' : 'No');

  return (
    <div className="App">
      <Sidebar />
      <Chat />
    </div>
  );
}

export default App;
