const config = {
  apiKey: process.env.REACT_APP_OPENAI_API_KEY
};

// Debug: Log whether the API key is present when the config is loaded
console.log('Config loaded with API key:', process.env.REACT_APP_OPENAI_API_KEY ? 'Present' : 'Missing');

export default config; 