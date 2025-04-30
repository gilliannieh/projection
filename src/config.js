const config = {
  apiKey: process.env.REACT_APP_API_KEY
};

// Debug: Log whether the API key is present when the config is loaded
if (!config.apiKey) {
  console.error('API Key is missing. Please check your .env file.');
} else {
  console.log('Config loaded with API key: Present');
}

export default config; 