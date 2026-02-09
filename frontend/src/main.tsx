import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import { StrictMode } from 'react'
import App from './App.tsx'
import Layout from './components/Layout/Layout.tsx';

import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
    <Layout>
        <App />
    </Layout>
    </BrowserRouter>
  </StrictMode>,
)
