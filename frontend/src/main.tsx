import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import { StrictMode } from 'react'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthProvider.tsx';

import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
