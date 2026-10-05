import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // 1. हे इम्पोर्ट करा
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter> {/* 2. इथे <BrowserRouter> ने रैप करा */}
      <App />
    </BrowserRouter>
  </React.StrictMode>
);