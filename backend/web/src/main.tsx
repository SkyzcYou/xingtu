import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import 'tdesign-react/es/style/index.css';
import './styles/global.scss';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
