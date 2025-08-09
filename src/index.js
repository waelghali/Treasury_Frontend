import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Import the global styles and Tailwind directives
import App from './App'; // Import the main App component

// React Entry Point
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
