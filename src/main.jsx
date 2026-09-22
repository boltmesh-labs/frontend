import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Global Stylesheet Injection Layer
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';

import './styles/App.css';

// Mount the React application core directly onto the root DOM node
const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
